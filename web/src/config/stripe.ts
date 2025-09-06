import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn('Stripe publishable key not found. Stripe functionality will be disabled.');
}

export const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export const STRIPE_PRICE_IDS = {
  FREE: 'prod_T0CfBGKatoyRxx',
  PRO: 'prod_T0CXuskYTb24vt', // Replace with actual Stripe price ID
  ENTERPRISE: 'prod_T0CdvIcteXTmlU', // Replace with actual Stripe price ID
} as const;

export const PLAN_FEATURES = {
  FREE: {
    businesses: 1,
    transactions: 100,
    forecasting: false,
    support: 'email',
  },
  PRO: {
    businesses: 5,
    transactions: 'unlimited',
    forecasting: true,
    support: 'priority',
  },
  ENTERPRISE: {
    businesses: 'unlimited',
    transactions: 'unlimited',
    forecasting: true,
    support: 'dedicated',
  },
} as const;