import { useQuery } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { Account } from '../types';

export function useAccount() {
  const { data: account, isLoading } = useQuery<Account | null>({
    // 1. The query key is now in a `queryKey` array
    queryKey: ['account'],
    
    // 2. The async function is now assigned to the `queryFn` property
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user's account through business roles
      const { data: userRoles } = await supabase
        .from('user_business_roles')
        .select(`
          account_id,
          accounts!inner(*)
        `)
        .eq('user_id', user.id)
        .limit(1)
        .single();

      return userRoles?.accounts || null;
    },
  });

  return {
    account,
    isLoading,
  };
}