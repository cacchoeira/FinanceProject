import express from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const createCheckoutSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

// Create checkout session
router.post('/checkout', 
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const { priceId, successUrl, cancelUrl } = createCheckoutSchema.parse(req.body);

    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    // Get or create Stripe customer
    let customerId: string;
    
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('stripe_customer_id')
      .limit(1)
      .single();

    if (account?.stripe_customer_id) {
      customerId = account.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          user_id: req.user.id,
        },
      });
      customerId = customer.id;

      // Update account with Stripe customer ID
      await supabase
        .from('accounts')
        .update({ stripe_customer_id: customerId })
        .eq('id', account?.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: req.user.id,
      },
    });

    res.json({ url: session.url });
  })
);

// Handle Stripe webhooks
router.post('/webhook', 
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const sig = req.headers['stripe-signature']!;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send('Webhook signature verification failed');
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionChange(event.data.object as Stripe.Subscription);
          break;
          
        case 'customer.subscription.deleted':
          await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
          break;
          
        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
          
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook handler error:', error);
      return res.status(500).send('Webhook handler failed');
    }

    res.json({ received: true });
  })
);

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('accounts')
    .update({
      subscription_status: subscription.status.toUpperCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', subscription.customer as string);

  if (error) {
    console.error('Failed to update subscription status:', error);
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('accounts')
    .update({
      subscription_status: 'CANCELED',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', subscription.customer as string);

  if (error) {
    console.error('Failed to update subscription status:', error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Handle successful payment
  console.log('Payment succeeded for invoice:', invoice.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Handle failed payment
  console.log('Payment failed for invoice:', invoice.id);
  
  const { error } = await supabase
    .from('accounts')
    .update({
      subscription_status: 'PAST_DUE',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', invoice.customer as string);

  if (error) {
    console.error('Failed to update account status:', error);
  }
}

export { router as billingRoutes };