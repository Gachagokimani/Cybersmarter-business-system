import { useQuery } from '@tanstack/react-query';

interface RevenueData {
  grossRevenue: number;
  netRevenue: number;
  totalExpenses: number;
}

// Fetch revenue data
export const useRevenue = () => {
  return useQuery({
    queryKey: ['revenue'],
    queryFn: async (): Promise<RevenueData> => {
      const response = await fetch('/api/revenue');
      if (!response.ok) {
        throw new Error('Failed to fetch revenue data');
      }
      return response.json();
    },
  });
}; 