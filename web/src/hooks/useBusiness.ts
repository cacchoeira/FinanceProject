import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { supabase } from '../config/supabase';
import { Business } from '../types';

export function useBusiness() {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const queryClient = useQueryClient();

  const { data: businesses = [], isLoading } = useQuery<Business[]>(
    'businesses',
    async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          user_business_roles!inner(role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  );

  const createBusinessMutation = useMutation(
    async (business: Partial<Business>) => {
      const { data, error } = await supabase
        .from('businesses')
        .insert([business])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('businesses');
      },
    }
  );

  const updateBusinessMutation = useMutation(
    async ({ id, ...updates }: Partial<Business> & { id: string }) => {
      const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('businesses');
      },
    }
  );

  useEffect(() => {
    if (businesses.length > 0 && !selectedBusiness) {
      setSelectedBusiness(businesses[0]);
    }
  }, [businesses, selectedBusiness]);

  return {
    businesses,
    selectedBusiness,
    setSelectedBusiness,
    isLoading,
    createBusiness: createBusinessMutation.mutate,
    updateBusiness: updateBusinessMutation.mutate,
    isCreating: createBusinessMutation.isLoading,
    isUpdating: updateBusinessMutation.isLoading,
  };
}