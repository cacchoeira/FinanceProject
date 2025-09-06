// api/src/routes/billing.ts

import express from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

// --- CORRIGIDO: Adicionada verificacao para a chave secreta
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

const router = express.Router();
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

const createCheckoutSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const createPortalSchema = z.object({
  returnUrl: z.string().url(),
});

const getUserBusinessInfo = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_business_roles')
    .select('business_id, user_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (error || !data) {
    throw createError('Business role not found for user', 404);
  }
  return data;
};

const getAccountByBusinessId = async (businessId: string) => {
  if (!businessId) {
    throw createError('Business ID is missing', 400);
  }
  
  const { data: businessData, error: businessError } = await supabase
    .from('businesses')
    .select(`
      id,
      account_id
    `)
    .eq('id', businessId)
    .single();

  if (businessError || !businessData || !businessData.account_id) {
    throw createError('Business not found or has no associated account', 404);
  }
  
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', businessData.account_id)
    .single();

  if (accountError || !account) {
    throw createError('Account not found', 404);
  }
  return account;
};


router.post('/checkout', 
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const { priceId, successUrl, cancelUrl } = createCheckoutSchema.parse(req.body);

    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const { business_id } = await getUserBusinessInfo(req.user.id);
    const account = await getAccountByBusinessId(business_id);
    
    let customerId: string;
    if (account.stripe_customer_id) {
      customerId = account.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          user_id: req.user.id,
          account_id: account.id,
        },
      });
      customerId = customer.id;

      await supabase
        .from('accounts')
        .update({ stripe_customer_id: customerId })
        .eq('id', account.id);
    }

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
        account_id: account.id,
      },
    });

    res.json({ url: session.url });
  })
);

router.post('/portal', 
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const { returnUrl } = createPortalSchema.parse(req.body);

    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const { business_id } = await getUserBusinessInfo(req.user.id);
    const account = await getAccountByBusinessId(business_id);

    if (!account.stripe_customer_id) {
      throw createError('No billing account found', 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  })
);

router.get('/subscription', 
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const { business_id } = await getUserBusinessInfo(req.user.id);
    const account = await getAccountByBusinessId(business_id);

    let stripeSubscription = null;
    if (account.stripe_customer_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: account.stripe_customer_id,
          status: 'all',
          limit: 1,
        });
        stripeSubscription = subscriptions.data[0] || null;
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error);
      }
    }

    res.json({
      account: account,
      subscription: stripeSubscription,
    });
  })
);

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