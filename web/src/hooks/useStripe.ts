// src/hooks/useStripe.ts

import { useState } from 'react';
import { supabase } from '../config/supabase';
import toast from 'react-hot-toast';

export function useStripe() {
  const [loading, setLoading] = useState(false);

  const createCheckoutSession = async (priceId: string) => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      });

      if (!response.ok) {
        // --- ADDED: More detailed error handling for better debugging ---
        const errorData = await response.json().catch(() => ({ message: 'No error message available from backend' }));
        const errorMessage = `Failed to create checkout session: ${errorData.message || response.statusText}`;
        throw new Error(errorMessage);
      }

      const { url } = await response.json();
      
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      // Ensure the error message is user-friendly and not the full backend response
      toast.error('Failed to start checkout process');
    } finally {
      setLoading(false);
    }
  };

  const createPortalSession = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dashboard/settings`,
        }),
      });

      if (!response.ok) {
        // --- ADDED: More detailed error handling for portal session ---
        const errorData = await response.json().catch(() => ({ message: 'No error message available from backend' }));
        const errorMessage = `Failed to create portal session: ${errorData.message || response.statusText}`;
        throw new Error(errorMessage);
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  };

  return {
    createCheckoutSession,
    createPortalSession,
    loading,
  };
}