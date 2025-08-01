import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  category: string;
  unitPrice: number;
  buyingPrice?: number;
  status: string;
}

interface NewInventoryItem {
  name: string;
  quantity: number;
  category: string;
  unitPrice: number;
  buyingPrice: number;
  status: string;
}

interface UpdateInventoryItem extends NewInventoryItem {
  id: number;
}

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
    mutationFn: async (newItem: NewInventoryItem): Promise<InventoryItem> => {
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
    mutationFn: async (updateData: UpdateInventoryItem): Promise<InventoryItem> => {
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