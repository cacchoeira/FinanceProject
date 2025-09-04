import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { Transaction } from '../types';

export function useTransactions(businessId?: string) {
  const queryClient = useQueryClient();

  // useQuery agora recebe um único objeto de configuração
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', businessId],
    queryFn: async () => {
      // Esta verificação não é mais necessária aqui, pois `enabled: false` cuida disso
      // if (!businessId) return [];
      
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
    // O `enabled` desabilita a query se o businessId não existir
    enabled: !!businessId,
  });

  // Cada `useMutation` também recebe um único objeto
  const createTransactionMutation = useMutation({
    mutationFn: async (transaction: Partial<Transaction>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // `invalidateQueries` agora também recebe um objeto
      queryClient.invalidateQueries({ queryKey: ['transactions', businessId] });
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', businessId] });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', businessId] });
    },
  });

  const importTransactionsMutation = useMutation({
    mutationFn: async (file: File) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', businessId] });
    },
  });

  return {
    transactions,
    isLoading,
    createTransaction: createTransactionMutation.mutate,
    updateTransaction: updateTransactionMutation.mutate,
    deleteTransaction: deleteTransactionMutation.mutate,
    importTransactions: importTransactionsMutation.mutate,
    isCreating: createTransactionMutation.isPending,
    isUpdating: updateTransactionMutation.isPending,
    isDeleting: deleteTransactionMutation.isPending,
    isImporting: importTransactionsMutation.isPending,
  };
}