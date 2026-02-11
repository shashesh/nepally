// Supabase Edge Function to get metro area by ZIP code
// HTTP endpoint for ZIP to metro lookup during onboarding

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

    // Create Supabase client
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

    if (zipError || !zipData) {
      console.log(`Metro area not found for ZIP code: ${zipCode}`);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Metro area not found for ZIP code",
          zipCode,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Get metro area details
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

    return new Response(
      JSON.stringify({
        success: true,
        zipCode,
        metroArea: {
          id: metroArea.id,
          name: metroArea.name,
          state: metroArea.state,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in get-metro-by-zip function:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
