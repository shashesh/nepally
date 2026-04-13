// Supabase Edge Function: expire-promotions
// Runs hourly via cron to expire paid promotions past their end date.
// Premium-perk promotions (source = 'premium_perk') have end_date IS NULL
// and are never touched by this job — they are managed by the user premium
// cascade trigger in migration 023.

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

    // Find active paid promotions past their end date.
    // Premium_perk rows are excluded explicitly by source filter.
    const { data: expired, error: fetchError } = await supabase
      .from('listing_promotions')
      .select('id')
      .eq('status', 'active')
      .eq('source', 'paid')
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

    console.log(`Found ${expired.length} expired paid promotions`);

    const expiredIds = expired.map((p) => p.id);

    const { error: updateError } = await supabase
      .from('listing_promotions')
      .update({ status: 'expired' })
      .in('id', expiredIds);

    if (updateError) {
      console.error('Error expiring promotions:', updateError);
      throw updateError;
    }

    // No is_featured write-back: featured status is derived on read via
    // marketplace_listings_view. Updating promotion status alone is enough.

    console.log(`Successfully expired ${expiredIds.length} paid promotions`);

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
