// Supabase Edge Function for moderators to verify emergency posts
// Implements the Two-Step Red Alert System

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyPostRequest {
  postId: string;
}

interface User {
  id: string;
  is_moderator: boolean;
  metro_area_id: string;
}

interface Post {
  id: string;
  category: string;
  metro_area_id: string;
  title: string;
  fields: {
    verified?: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    redAlertSent?: boolean;
    emergencyType?: string;
    urgency?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client with the user's auth token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const { postId }: VerifyPostRequest = await req.json();

    if (!postId) {
      throw new Error("Post ID is required");
    }

    // Check if user is a moderator
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, is_moderator, metro_area_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      throw new Error("User not found");
    }

    const moderator = userData as User;

    if (!moderator.is_moderator) {
      throw new Error("Only moderators can verify emergency posts");
    }

    console.log(`Moderator ${moderator.id} verifying post ${postId}`);

    // Get the post
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      throw new Error("Post not found");
    }

    const emergencyPost = post as Post;

    // Verify it's an emergency post
    if (emergencyPost.category !== "emergency") {
      throw new Error("Only emergency posts can be verified");
    }

    // Check if already verified
    if (emergencyPost.fields?.verified) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Post is already verified",
          postId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Update post as verified
    const now = new Date().toISOString();
    const updatedFields = {
      ...emergencyPost.fields,
      verified: true,
      verifiedBy: moderator.id,
      verifiedAt: now,
      redAlertSent: false, // Will be sent by separate notification system
    };

    const { error: updateError } = await supabase
      .from("posts")
      .update({
        fields: updatedFields,
        updated_at: now,
      })
      .eq("id", postId);

    if (updateError) {
      console.error("Error updating post:", updateError);
      throw updateError;
    }

    console.log(`Post ${postId} verified successfully`);

    // TODO: Trigger Red Alert notification to all users in metro area
    // This would be handled by a separate notification service or Edge Function
    // For now, we just mark it as verified

    // Get all users in the same metro area for notification count
    const { count: usersInMetro } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("metro_area_id", emergencyPost.metro_area_id)
      .neq("is_banned", true);

    console.log(
      `Would send Red Alert to ${usersInMetro} users in ${emergencyPost.metro_area_id}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Emergency post verified successfully",
        postId,
        verifiedBy: moderator.id,
        verifiedAt: now,
        metroArea: emergencyPost.metro_area_id,
        potentialRecipients: usersInMetro || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in verify-emergency-post function:", error);

    const statusCode = error.message === "Unauthorized" ? 401 :
                       error.message === "Only moderators can verify emergency posts" ? 403 :
                       error.message === "Post ID is required" ? 400 :
                       error.message === "Post not found" ? 404 : 500;

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
  }
});
