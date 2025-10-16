export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  category: string;
  unitPrice: number;
  buyingPrice: number | null;
  status: string;
}
