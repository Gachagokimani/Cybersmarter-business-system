import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Sale, NewSale, UpdateSale, SalesResponse, ApiError } from '../types/sales';

// Fetch sales
export const useSales = () => {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async (): Promise<Sale[]> => {
      const response = await fetch('/api/sales');
      if (!response.ok) {
        throw new Error('Failed to fetch sales');
      }
      const data = await response.json();
      
      // Filter out invalid records and sort by recording time (most recent first)
      const validSales = data.filter((sale: Partial<Sale>) => 
        typeof sale.id === 'number' &&
        typeof sale.item === 'string' &&
        typeof sale.price === 'number' && sale.price > 0
      ).sort((a: Sale, b: Sale) => {
        // Sort by date (most recent first) and then by ID (most recent first)
        const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateComparison !== 0) return dateComparison;
        return b.id - a.id; // Secondary sort by ID (most recent first)
      });
      
      return validSales;
    },
  });
};

// Add sale mutation
export const useAddSale = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newSale: NewSale): Promise<{ sale: Sale }> => {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSale),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add sale');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch sales
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      // Also invalidate revenue data
      queryClient.invalidateQueries({ queryKey: ['revenue'] });
    },
  });
};

// Update sale mutation
export const useUpdateSale = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updateData: UpdateSale): Promise<Sale> => {
      const response = await fetch('/api/sales', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update sale');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch sales
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      // Also invalidate revenue data
      queryClient.invalidateQueries({ queryKey: ['revenue'] });
    },
  });
};

// Delete sale mutation
export const useDeleteSale = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`/api/sales/${id}`, { 
        method: 'DELETE' 
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete sale');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch sales
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      // Also invalidate revenue data
      queryClient.invalidateQueries({ queryKey: ['revenue'] });
    },
  });
}; 