// Supabase Edge Function to expire old posts
// Runs daily via cron job or external scheduler

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Post {
  id: string;
  title: string;
  expiry_date: string;
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting post expiration job...");

    // Find all active posts that have expired
    const now = new Date().toISOString();

    const { data: expiredPosts, error: fetchError } = await supabase
      .from("posts")
      .select("id, title, expiry_date, status")
      .eq("status", "active")
      .lte("expiry_date", now);

    if (fetchError) {
      console.error("Error fetching expired posts:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredPosts?.length || 0} expired posts`);

    if (!expiredPosts || expiredPosts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No posts to expire",
          count: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Update posts to expired status
    const postIds = expiredPosts.map((post: Post) => post.id);

    const { data: updatedPosts, error: updateError } = await supabase
      .from("posts")
      .update({ status: "expired" })
      .in("id", postIds)
      .select("id");

    if (updateError) {
      console.error("Error updating posts:", updateError);
      throw updateError;
    }

    console.log(`Successfully expired ${updatedPosts?.length || 0} posts`);

    // Log expired posts for debugging
    expiredPosts.forEach((post: Post) => {
      console.log(`Expired post: ${post.id} - ${post.title}`);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Expired ${updatedPosts?.length || 0} posts`,
        count: updatedPosts?.length || 0,
        expiredPostIds: postIds,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in expire-posts function:", error);

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
