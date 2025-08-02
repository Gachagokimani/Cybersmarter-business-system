import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Expense {
  id: number;
  item: string;
  amount: number;
  quantity: number;
  date: string;
  category: string;
}

interface NewExpense {
  item: string;
  amount: number;
  quantity: number;
  date: string;
  category: string;
}

interface UpdateExpense extends NewExpense {
  id: number;
}

// Fetch expenses
export const useExpenses = () => {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async (): Promise<Expense[]> => {
      const response = await fetch('/api/expenses');
      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }
      return response.json();
    },
  });
};

// Add expense mutation
export const useAddExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newExpense: NewExpense): Promise<{ expense: Expense; revenue: any }> => {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newExpense),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add expense');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch expenses
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      // Also invalidate revenue data
      queryClient.invalidateQueries({ queryKey: ['revenue'] });
      
      // Small delay to ensure database is updated before sales page refreshes
      setTimeout(() => {
        // This will trigger a refresh of revenue data on the sales page
        window.dispatchEvent(new CustomEvent('expenseUpdated'));
      }, 100);
    },
  });
};

// Update expense mutation
export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updateData: UpdateExpense): Promise<Expense> => {
      const response = await fetch('/api/expenses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update expense');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch expenses
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      // Also invalidate revenue data
      queryClient.invalidateQueries({ queryKey: ['revenue'] });
    },
  });
};

// Delete expense mutation
export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`/api/expenses/${id}`, { 
        method: 'DELETE' 
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch expenses
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      // Also invalidate revenue data
      queryClient.invalidateQueries({ queryKey: ['revenue'] });
    },
  });
}; 