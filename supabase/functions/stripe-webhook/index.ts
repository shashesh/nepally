// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events to activate or cancel promotions.
// Events: payment_intent.succeeded, checkout.session.completed, checkout.session.expired

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`Received webhook event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        // Mobile Payment Sheet flow
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const promotionId = paymentIntent.metadata?.promotion_id;

        if (!promotionId) {
          console.log('PaymentIntent has no promotion_id metadata, skipping');
          break;
        }

        await activatePromotion(supabase, promotionId);
        console.log(`Activated promotion ${promotionId} via payment_intent.succeeded`);
        break;
      }

      case 'checkout.session.completed': {
        // Web Checkout flow
        const session = event.data.object as Stripe.Checkout.Session;
        const promotionId = session.metadata?.promotion_id;

        if (!promotionId) {
          console.log('Checkout session has no promotion_id metadata, skipping');
          break;
        }

        // Also store the payment intent ID from the checkout session
        if (session.payment_intent) {
          await supabase
            .from('listing_promotions')
            .update({ stripe_payment_intent_id: session.payment_intent as string })
            .eq('id', promotionId);
        }

        await activatePromotion(supabase, promotionId);
        console.log(`Activated promotion ${promotionId} via checkout.session.completed`);
        break;
      }

      case 'checkout.session.expired': {
        // Checkout abandoned — cancel the pending promotion
        const session = event.data.object as Stripe.Checkout.Session;
        const promotionId = session.metadata?.promotion_id;

        if (!promotionId) break;

        const { error } = await supabase
          .from('listing_promotions')
          .update({ status: 'cancelled' })
          .eq('id', promotionId)
          .eq('status', 'pending');

        if (error) {
          console.error(`Failed to cancel promotion ${promotionId}:`, error);
        } else {
          console.log(`Cancelled expired checkout for promotion ${promotionId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in stripe-webhook:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/**
 * Activate a promotion: set status, dates, and snapshot views_at_start.
 * Idempotent — skips if already active.
 */
async function activatePromotion(
  supabase: ReturnType<typeof createClient>,
  promotionId: string
): Promise<void> {
  // Fetch the pending promotion
  const { data: promotion, error: fetchError } = await supabase
    .from('listing_promotions')
    .select('id, listing_id, duration_days, status')
    .eq('id', promotionId)
    .single();

  if (fetchError || !promotion) {
    console.error(`Promotion ${promotionId} not found:`, fetchError);
    return;
  }

  // Idempotent: skip if already active
  if (promotion.status === 'active') {
    console.log(`Promotion ${promotionId} is already active, skipping`);
    return;
  }

  // Snapshot current views_count from the listing
  const { data: listing } = await supabase
    .from('marketplace_listings')
    .select('views_count')
    .eq('id', promotion.listing_id)
    .single();

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + promotion.duration_days);

  const { error: updateError } = await supabase
    .from('listing_promotions')
    .update({
      status: 'active',
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      views_at_start: listing?.views_count ?? 0,
    })
    .eq('id', promotionId);

  if (updateError) {
    console.error(`Failed to activate promotion ${promotionId}:`, updateError);
    throw updateError;
  }
}
