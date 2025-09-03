import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { Transaction } from '../types';

export function useTransactions(businessId?: string) {
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>(
    ['transactions', businessId],
    async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, color)
        `)
        .eq('business_id', businessId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    {
      enabled: !!businessId,
    }
  );

  const createTransactionMutation = useMutation(
    async (transaction: Partial<Transaction>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['transactions', businessId]);
      },
    }
  );

  const updateTransactionMutation = useMutation(
    async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['transactions', businessId]);
      },
    }
  );

  const deleteTransactionMutation = useMutation(
    async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['transactions', businessId]);
      },
    }
  );

  const importTransactionsMutation = useMutation(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('business_id', businessId!);

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['transactions', businessId]);
      },
    }
  );

  return {
    transactions,
    isLoading,
    createTransaction: createTransactionMutation.mutate,
    updateTransaction: updateTransactionMutation.mutate,
    deleteTransaction: deleteTransactionMutation.mutate,
    importTransactions: importTransactionsMutation.mutate,
    isCreating: createTransactionMutation.isLoading,
    isUpdating: updateTransactionMutation.isLoading,
    isDeleting: deleteTransactionMutation.isLoading,
    isImporting: importTransactionsMutation.isLoading,
  };
}