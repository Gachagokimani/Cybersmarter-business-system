export interface Sale {
  id: number;
  item: string;
  price: number;
  quantity: number;
  date: string;
}

export interface NewSale {
  item: string;
  price: number;
  quantity: number;
  date: string;
}

export interface UpdateSale extends NewSale {
  id: number;
}

export interface SalesResponse {
  sale: Sale;
  revenue: {
    grossRevenue: number;
    totalExpenses: number;
    netRevenue: number;
  };
}

export interface ApiError {
  error: string;
  message?: string;
} 