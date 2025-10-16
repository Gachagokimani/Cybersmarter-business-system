import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryItem } from '../types/inventory';

// Fetch inventory
export const useInventory = () => {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async (): Promise<InventoryItem[]> => {
      const response = await fetch('/api/inventory');
      if (!response.ok) {
        throw new Error('Failed to fetch inventory');
      }
      return response.json();
    },
  });
};

// Add inventory item mutation
export const useAddInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newItem: InventoryItem): Promise<InventoryItem> => {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItem),
      });

      if (!response.ok) {
        throw new Error('Failed to add item');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch inventory
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

// Update inventory item mutation
export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updateData: InventoryItem): Promise<InventoryItem> => {
      const response = await fetch('/api/inventory', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update item');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch inventory
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

// Delete inventory item mutation
export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`/api/inventory/${id}`, { 
        method: 'DELETE' 
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch inventory
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}; 