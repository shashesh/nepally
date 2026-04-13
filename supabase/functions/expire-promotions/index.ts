// Supabase Edge Function: expire-promotions
// Runs hourly via cron to expire promotions past their end date.
// Resets is_featured only for non-premium listing owners.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    console.log('Starting promotion expiration job...');

    // Find active promotions past their end date
    const { data: expired, error: fetchError } = await supabase
      .from('listing_promotions')
      .select('id, listing_id, user_id, promotion_type')
      .eq('status', 'active')
      .lte('end_date', now);

    if (fetchError) {
      console.error('Error fetching expired promotions:', fetchError);
      throw fetchError;
    }

    if (!expired || expired.length === 0) {
      console.log('No promotions to expire');
      return new Response(
        JSON.stringify({ success: true, message: 'No promotions to expire', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${expired.length} expired promotions`);

    const expiredIds = expired.map((p) => p.id);

    // Batch-update all to expired status
    const { error: updateError } = await supabase
      .from('listing_promotions')
      .update({ status: 'expired' })
      .in('id', expiredIds);

    if (updateError) {
      console.error('Error expiring promotions:', updateError);
      throw updateError;
    }

    // For featured_listing promotions, reset is_featured only if owner is not premium
    const featuredPromos = expired.filter((p) => p.promotion_type === 'featured_listing');

    if (featuredPromos.length > 0) {
      // Batch 1: fetch premium status for all affected owners in one query
      const ownerIds = [...new Set(featuredPromos.map((p) => p.user_id))];
      const { data: premiumOwners } = await supabase
        .from('users')
        .select('id, is_premium')
        .in('id', ownerIds);

      const premiumOwnerSet = new Set(
        (premiumOwners ?? []).filter((u) => u.is_premium).map((u) => u.id)
      );

      // Only consider listings whose owner is not premium
      const nonPremiumListingIds = [
        ...new Set(
          featuredPromos.filter((p) => !premiumOwnerSet.has(p.user_id)).map((p) => p.listing_id)
        ),
      ];

      if (nonPremiumListingIds.length > 0) {
        // Batch 2: find listings that still have another active featured_listing promo
        const { data: stillActive } = await supabase
          .from('listing_promotions')
          .select('listing_id')
          .in('listing_id', nonPremiumListingIds)
          .eq('promotion_type', 'featured_listing')
          .eq('status', 'active');

        const stillActiveSet = new Set((stillActive ?? []).map((r) => r.listing_id));

        const listingsToUnfeature = nonPremiumListingIds.filter((id) => !stillActiveSet.has(id));

        if (listingsToUnfeature.length > 0) {
          // Single bulk update instead of one UPDATE per listing
          await supabase
            .from('marketplace_listings')
            .update({ is_featured: false })
            .in('id', listingsToUnfeature);

          console.log(
            `Reset is_featured for ${listingsToUnfeature.length} listing(s) (non-premium owners)`
          );
        }
      }
    }

    console.log(`Successfully expired ${expiredIds.length} promotions`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Expired ${expiredIds.length} promotions`,
        count: expiredIds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in expire-promotions:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
