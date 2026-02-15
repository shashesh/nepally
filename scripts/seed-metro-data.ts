/**
 * Seed metro_areas and metro_area_zipcodes from Census Bureau + HUD APIs.
 *
 * Strategy (fast — ~390 API calls instead of 41k):
 *   1. Census ACS API → all Metropolitan Statistical Areas (name + population)
 *   2. HUD USPS Crosswalk API type=7 (CBSA→ZIP) → ZIP codes per CBSA
 *   3. Deduplicate ZIPs spanning multiple CBSAs (highest residential ratio wins)
 *   4. UPSERT metro_areas, TRUNCATE + bulk INSERT metro_area_zipcodes in Supabase
 *
 * Required env vars (see .env.example):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CENSUS_API_KEY, HUD_API_TOKEN
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const CENSUS_API_KEY = requireEnv("CENSUS_API_KEY");
const HUD_API_TOKEN = requireEnv("HUD_API_TOKEN");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// HUD API rate limit — use conservative delay to avoid 429s
const HUD_DELAY_MS = 200;
const HUD_MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CbsaEntry {
  cbsa: string; // e.g. "19100"
  name: string; // e.g. "Dallas-Fort Worth-Arlington, TX"
  state: string; // primary state abbreviation
  population: number;
}

interface ZipMapping {
  zip: string;
  cbsa: string;
  resRatio: number; // residential address ratio (0-1)
}

// ---------------------------------------------------------------------------
// Census ACS API — fetch all Metropolitan Statistical Areas
// ---------------------------------------------------------------------------

async function fetchMetroAreas(): Promise<CbsaEntry[]> {
  // ACS 5-Year detailed tables — B01003_001E = total population
  // Try years newest-first; Census sometimes takes down older datasets
  const years = ["2024", "2023", "2022"];

  let rows: string[][] | null = null;

  for (const year of years) {
    const url = new URL(`https://api.census.gov/data/${year}/acs/acs5`);
    url.searchParams.set("get", "NAME,B01003_001E");
    url.searchParams.set("for", "metropolitan statistical area/micropolitan statistical area:*");
    url.searchParams.set("key", CENSUS_API_KEY);

    console.log(`Trying Census ACS ${year}... (${url.toString()})`);
    const res = await fetch(url.toString());

    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
      console.warn(`  ${year}: HTTP ${res.status}, trying next year...`);
      continue;
    }

    if (!contentType.includes("json")) {
      const body = await res.text();
      console.warn(`  ${year}: Got ${contentType} instead of JSON. First 200 chars:`);
      console.warn(`  ${body.slice(0, 200)}`);
      continue;
    }

    rows = await res.json();
    console.log(`  Success with ACS ${year}`);
    break;
  }

  if (!rows) {
    throw new Error(
      "Census API returned HTML for all attempted years. " +
      "The API may be temporarily down — check https://api.census.gov/data.html and try again later."
    );
  }
  // First row is headers: ["NAME","B01003_001E","metropolitan statistical area/micropolitan statistical area"]
  const [, ...dataRows] = rows;

  const metros: CbsaEntry[] = [];

  for (const row of dataRows) {
    const [fullName, popStr, cbsa] = row;
    const population = parseInt(popStr, 10) || 0;

    // Filter to Metropolitan only (name contains "Metro Area")
    if (!fullName.includes("Metro Area")) continue;

    // Extract primary state from name like "Dallas-Fort Worth-Arlington, TX Metro Area"
    // or "New York-Newark-Jersey City, NY-NJ-PA Metro Area"
    const nameWithoutSuffix = fullName.replace(/ Metro Area$/, "").trim();
    const commaIdx = nameWithoutSuffix.lastIndexOf(",");
    const shortName = commaIdx >= 0 ? nameWithoutSuffix.slice(0, commaIdx).trim() : nameWithoutSuffix;
    const statesPart = commaIdx >= 0 ? nameWithoutSuffix.slice(commaIdx + 1).trim() : "";
    // Take first state abbreviation
    const state = statesPart.split("-")[0].trim() || "US";

    metros.push({ cbsa, name: shortName, state, population });
  }

  console.log(`Found ${metros.length} Metropolitan Statistical Areas`);
  return metros;
}

// ---------------------------------------------------------------------------
// HUD USPS Crosswalk API — fetch ZIP codes for a single CBSA
// ---------------------------------------------------------------------------

async function fetchZipsForCbsa(cbsa: string): Promise<ZipMapping[]> {
  // Type 8 = CBSA → ZIP (type 7 is County → ZIP)
  const url = `https://www.huduser.gov/hudapi/public/usps?type=8&query=${cbsa}`;

  for (let attempt = 1; attempt <= HUD_MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${HUD_API_TOKEN}` },
    });

    if (res.status === 429) {
      const backoff = attempt * 5000;
      console.warn(`  Rate limited on CBSA ${cbsa}, retrying in ${backoff / 1000}s (attempt ${attempt}/${HUD_MAX_RETRIES})...`);
      await sleep(backoff);
      continue;
    }

    if (!res.ok) {
      if (res.status === 404 || res.status === 400) {
        console.warn(`  HUD API returned ${res.status} for CBSA ${cbsa}, skipping`);
        return [];
      }
      throw new Error(`HUD API error for CBSA ${cbsa}: ${res.status}`);
    }

    const json = await res.json();

    const results: any[] = Array.isArray(json.data) ? json.data : json.data?.results ?? [];

    return results.map((r: any) => ({
      zip: r.geoid,
      cbsa,
      resRatio: parseFloat(r.res_ratio) || 0,
    }));
  }

  console.warn(`  Exhausted retries for CBSA ${cbsa}, skipping`);
  return [];
}

// ---------------------------------------------------------------------------
// Deduplicate ZIPs across CBSAs — highest residential ratio wins
// ---------------------------------------------------------------------------

function deduplicateZips(allMappings: ZipMapping[]): ZipMapping[] {
  const best = new Map<string, ZipMapping>();

  for (const m of allMappings) {
    const existing = best.get(m.zip);
    if (!existing || m.resRatio > existing.resRatio) {
      best.set(m.zip, m);
    }
  }

  return Array.from(best.values());
}

// ---------------------------------------------------------------------------
// Supabase upsert
// ---------------------------------------------------------------------------

async function upsertMetroAreas(metros: CbsaEntry[]) {
  console.log(`Upserting ${metros.length} metro areas...`);

  // Supabase upsert in chunks of 500
  const chunkSize = 500;
  for (let i = 0; i < metros.length; i += chunkSize) {
    const chunk = metros.slice(i, i + chunkSize).map((m) => ({
      id: m.cbsa,
      name: m.name,
      state: m.state,
      population: m.population,
      cbsa_type: "metropolitan",
    }));

    const { error } = await supabase.from("metro_areas").upsert(chunk, {
      onConflict: "id",
    });

    if (error) throw new Error(`metro_areas upsert error: ${error.message}`);
  }

  console.log("Metro areas upserted.");
}

async function insertZipMappings(mappings: ZipMapping[]) {
  console.log(`Inserting ${mappings.length} ZIP mappings...`);

  // Truncate existing ZIP mappings first
  const { error: truncErr } = await supabase
    .from("metro_area_zipcodes")
    .delete()
    .neq("id", 0); // delete all rows (RLS bypassed with service role)

  if (truncErr) {
    console.warn(`Could not clear existing ZIP mappings: ${truncErr.message}`);
    console.warn("Proceeding with upsert instead...");
  }

  // Insert in chunks of 1000
  const chunkSize = 1000;
  let inserted = 0;

  for (let i = 0; i < mappings.length; i += chunkSize) {
    const chunk = mappings.slice(i, i + chunkSize).map((m) => ({
      metro_area_id: m.cbsa,
      zip_code: m.zip,
    }));

    const { error } = await supabase.from("metro_area_zipcodes").upsert(chunk, {
      onConflict: "zip_code",
    });

    if (error) throw new Error(`metro_area_zipcodes insert error at offset ${i}: ${error.message}`);

    inserted += chunk.length;
    if (inserted % 5000 === 0 || inserted === mappings.length) {
      console.log(`  ${inserted}/${mappings.length} ZIP mappings inserted`);
    }
  }

  console.log("ZIP mappings inserted.");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== NUSA Metro Area Seeding Script ===\n");

  // 1. Fetch all metro areas from Census
  const metros = await fetchMetroAreas();

  // 2. Fetch ZIP codes from HUD for each CBSA
  console.log(`\nFetching ZIP codes for ${metros.length} CBSAs from HUD API...`);
  const allMappings: ZipMapping[] = [];
  let completed = 0;

  for (const metro of metros) {
    const zips = await fetchZipsForCbsa(metro.cbsa);
    allMappings.push(...zips);
    completed++;

    if (completed % 50 === 0 || completed === metros.length) {
      console.log(`  ${completed}/${metros.length} CBSAs fetched (${allMappings.length} total ZIPs so far)`);
    }

    // Rate limit delay
    await sleep(HUD_DELAY_MS);
  }

  // 3. Deduplicate ZIPs
  console.log(`\nDeduplicating ${allMappings.length} raw ZIP mappings...`);
  const uniqueMappings = deduplicateZips(allMappings);
  console.log(`Deduplicated to ${uniqueMappings.length} unique ZIPs`);

  // 4. Write to Supabase
  console.log("\nWriting to Supabase...");
  await upsertMetroAreas(metros);
  await insertZipMappings(uniqueMappings);

  console.log("\n=== Seeding complete! ===");
  console.log(`  Metro areas: ${metros.length}`);
  console.log(`  ZIP codes:   ${uniqueMappings.length}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Missing required env var: ${name}`);
    console.error("See scripts/.env.example for required variables.");
    process.exit(1);
  }
  return val;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("\nSeeding failed:", err);
  process.exit(1);
});
