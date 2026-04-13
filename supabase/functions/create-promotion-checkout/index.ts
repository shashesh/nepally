// Supabase Edge Function: create-promotion-checkout
// Creates a pending promotion row and returns Stripe payment details.
// Mobile: PaymentIntent → { clientSecret, publishableKey, promotionId }
// Web: Checkout Session → { checkoutUrl, promotionId }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROMOTION_TIERS = {
  featured_listing: { name: 'Featured Listing', daily_cost_cents: 199 },
  sponsored_feed: { name: 'Sponsored Feed', daily_cost_cents: 299 },
  sticky_business: { name: 'Sticky Business', daily_cost_cents: 499 },
} as const;

type PromotionType = keyof typeof PROMOTION_TIERS;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripePublishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!stripeSecretKey || !stripePublishableKey) {
      throw new Error('Stripe keys not configured');
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    // Service role client — used for privileged DB operations and JWT verification
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Authenticate user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Extract raw JWT and verify via admin client (more reliable than global-header override)
    const jwt = authHeader.replace(/^Bearer\s+/i, '');

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      console.error(
        'Auth error in create-promotion-checkout:',
        authError?.message ?? 'no user returned'
      );
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 2. Parse and validate input
    const body = await req.json();
    const { listing_id, promotion_type, duration_days, platform } = body;

    if (!listing_id || !promotion_type || !duration_days || !platform) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: listing_id, promotion_type, duration_days, platform',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!['featured_listing', 'sponsored_feed', 'sticky_business'].includes(promotion_type)) {
      return new Response(JSON.stringify({ error: 'Invalid promotion_type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!Number.isInteger(duration_days) || duration_days < 1 || duration_days > 90) {
      return new Response(JSON.stringify({ error: 'duration_days must be between 1 and 90' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!['mobile', 'web'].includes(platform)) {
      return new Response(JSON.stringify({ error: "platform must be 'mobile' or 'web'" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 3. Verify user owns the listing
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('marketplace_listings')
      .select('id, owner_id, title, views_count')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (listing.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'You can only promote your own listings' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // 4. Verify trust level >= 1
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('trust_level')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.trust_level < 1) {
      return new Response(
        JSON.stringify({ error: 'Account must be verified (Trust Level 1+) to promote listings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // 5. Check no active promotion of same type on this listing
    const { data: existingPromo } = await supabaseAdmin
      .from('listing_promotions')
      .select('id')
      .eq('listing_id', listing_id)
      .eq('promotion_type', promotion_type)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (existingPromo) {
      return new Response(
        JSON.stringify({ error: 'This listing already has an active promotion of this type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // 6-7. Compute pricing
    const tier = PROMOTION_TIERS[promotion_type as PromotionType];
    const daily_cost_cents = tier.daily_cost_cents;
    const total_cost_cents = daily_cost_cents * duration_days;

    // 8. Insert pending promotion
    const { data: promotion, error: insertError } = await supabaseAdmin
      .from('listing_promotions')
      .insert({
        listing_id,
        user_id: user.id,
        promotion_type,
        status: 'pending',
        duration_days,
        daily_cost_cents,
        total_cost_cents,
      })
      .select('id')
      .single();

    if (insertError || !promotion) {
      console.error('Failed to insert promotion:', insertError);
      throw new Error('Failed to create promotion record');
    }

    const metadata = {
      promotion_id: promotion.id,
      listing_id,
      user_id: user.id,
    };

    // 9. Branch by platform
    if (platform === 'mobile') {
      // Mobile: create PaymentIntent for Payment Sheet
      const paymentIntent = await stripe.paymentIntents.create({
        amount: total_cost_cents,
        currency: 'usd',
        metadata,
        automatic_payment_methods: { enabled: true },
      });

      // Store payment intent ID on promotion row
      await supabaseAdmin
        .from('listing_promotions')
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq('id', promotion.id);

      return new Response(
        JSON.stringify({
          promotionId: promotion.id,
          clientSecret: paymentIntent.client_secret,
          publishableKey: stripePublishableKey,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      // Web: create Checkout Session
      const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: total_cost_cents,
              product_data: {
                name: `${tier.name} — ${duration_days} day${duration_days > 1 ? 's' : ''}`,
                description: `Promote "${listing.title}" on Nepally`,
              },
            },
            quantity: 1,
          },
        ],
        metadata,
        success_url: `${siteUrl}/marketplace/listing/promote/success?promotion_id=${promotion.id}`,
        cancel_url: `${siteUrl}/marketplace/listing/${listing_id}/promote?cancelled=true`,
      });

      // Store checkout session ID on promotion row
      await supabaseAdmin
        .from('listing_promotions')
        .update({ stripe_checkout_session_id: session.id })
        .eq('id', promotion.id);

      return new Response(
        JSON.stringify({
          promotionId: promotion.id,
          checkoutUrl: session.url,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
  } catch (error) {
    console.error('Error in create-promotion-checkout:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
