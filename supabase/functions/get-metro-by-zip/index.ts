// Supabase Edge Function to get metro area by ZIP code
// HTTP endpoint for ZIP to metro lookup during onboarding
// Includes HUD API fallback for ZIPs not yet in the database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MetroArea {
  id: string;
  name: string;
  state: string;
  population: number | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get ZIP code from query params or request body
    let zipCode: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      zipCode = url.searchParams.get("zip");
    } else if (req.method === "POST") {
      const body = await req.json();
      zipCode = body.zip;
    }

    // Validate ZIP code
    if (!zipCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ZIP code is required",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validate ZIP code format (5 digits)
    const zipRegex = /^\d{5}$/;
    if (!zipRegex.test(zipCode)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid ZIP code format. Must be 5 digits.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log(`Looking up metro area for ZIP code: ${zipCode}`);

    // Create Supabase client (anon for reads)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Query metro areas by ZIP code
    const { data: zipData, error: zipError } = await supabase
      .from("metro_area_zipcodes")
      .select("metro_area_id")
      .eq("zip_code", zipCode)
      .limit(1)
      .single();

    if (!zipError && zipData) {
      // Found in DB — return metro area details
      const { data: metroData, error: metroError } = await supabase
        .from("metro_areas")
        .select("*")
        .eq("id", zipData.metro_area_id)
        .single();

      if (metroError || !metroData) {
        console.error("Error fetching metro area:", metroError);
        throw new Error("Failed to fetch metro area details");
      }

      const metroArea = metroData as MetroArea;
      console.log(
        `Found metro area: ${metroArea.name} (${metroArea.id}) for ZIP ${zipCode}`
      );

      return jsonResponse(200, {
        success: true,
        zipCode,
        metroArea: {
          id: metroArea.id,
          name: metroArea.name,
          state: metroArea.state,
          population: metroArea.population,
        },
      });
    }

    // ----- HUD API Fallback -----
    console.log(`ZIP ${zipCode} not in DB, trying HUD API fallback...`);

    const hudToken = Deno.env.get("HUD_API_TOKEN");
    if (!hudToken) {
      console.warn("HUD_API_TOKEN not configured, cannot fallback");
      return jsonResponse(404, {
        success: false,
        error: "Metro area not found for ZIP code",
        zipCode,
      });
    }

    // HUD type=3: ZIP → CBSA crosswalk
    const hudUrl = `https://www.huduser.gov/hudapi/public/usps?type=3&query=${zipCode}`;
    const hudRes = await fetch(hudUrl, {
      headers: { Authorization: `Bearer ${hudToken}` },
    });

    if (!hudRes.ok) {
      console.warn(`HUD API returned ${hudRes.status} for ZIP ${zipCode}`);
      return jsonResponse(404, {
        success: false,
        error: "Metro area not found for ZIP code",
        zipCode,
      });
    }

    const hudJson = await hudRes.json();
    const hudResults: any[] = hudJson.data?.results ?? [];

    if (hudResults.length === 0) {
      return jsonResponse(404, {
        success: false,
        error: "Metro area not found for ZIP code",
        zipCode,
      });
    }

    // Pick the CBSA with the highest residential ratio
    const bestResult = hudResults.reduce((best: any, cur: any) =>
      (parseFloat(cur.res_ratio) || 0) > (parseFloat(best.res_ratio) || 0)
        ? cur
        : best
    );

    const cbsaCode = bestResult.cbsa;

    // Check if this CBSA exists in our metro_areas table
    const { data: existingMetro, error: metroLookupErr } = await supabase
      .from("metro_areas")
      .select("*")
      .eq("id", cbsaCode)
      .single();

    if (metroLookupErr || !existingMetro) {
      console.log(
        `CBSA ${cbsaCode} not in metro_areas table (may be micropolitan or unseeded)`
      );
      return jsonResponse(404, {
        success: false,
        error: "Metro area not found for ZIP code",
        zipCode,
      });
    }

    const metro = existingMetro as MetroArea;

    // Lazy-cache: insert the ZIP mapping so future lookups hit the DB
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { error: cacheErr } = await adminClient
        .from("metro_area_zipcodes")
        .upsert(
          { metro_area_id: cbsaCode, zip_code: zipCode },
          { onConflict: "zip_code" }
        );
      if (cacheErr) {
        console.warn(`Failed to cache ZIP mapping: ${cacheErr.message}`);
      } else {
        console.log(`Cached ZIP ${zipCode} → CBSA ${cbsaCode}`);
      }
    }

    console.log(
      `HUD fallback: ${metro.name} (${metro.id}) for ZIP ${zipCode}`
    );

    return jsonResponse(200, {
      success: true,
      zipCode,
      metroArea: {
        id: metro.id,
        name: metro.name,
        state: metro.state,
        population: metro.population,
      },
    });
  } catch (error) {
    console.error("Error in get-metro-by-zip function:", error);

    return jsonResponse(500, {
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
