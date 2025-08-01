"use client";
import { useState, useEffect, useRef } from "react";
import { FaDollarSign, FaPlus, FaTrashAlt, FaChartLine, FaEnvelope, FaEdit, FaTrophy, FaArrowUp, FaCoins, FaFire, FaCrown, FaStar, FaBoxes, FaExclamationCircle, FaShieldAlt, FaMoneyBillWave } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Spinner from "../components/Spinner";
import { useSales, useAddSale, useUpdateSale, useDeleteSale } from "../hooks/useSales";
import { useInventory } from "../hooks/useInventory";
import { useRevenue } from "../hooks/useRevenue";
import type { Sale } from "../types/sales";

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  buyingPrice?: number;
  status: string;
}
const serviceOptions = [
  "Internet Time (per hour)",
  "Photocopying B/W",
  "Photocopying Colour", 
  "Printing B/W",
  "Printing Colour",
  "Software Installation",
  "Data Recovery",
  "Network Setup",
  "KRA iTax",
  "eCitizen",
  "NTSA Services",
  "Social Health Authority (SHA)",
  "KRA PIN retrieval",
  "Internet Access",
  "Scanning Services",
  "Passport Application",
  "Business Registration",
  "Passport Photo"
];

const fixedPrices: Record<string, number> = {
  "KRA iTax": 250,
  "eCitizen": 300,
  "NTSA Services": 500,
  "Passport Application": 600,
  "Photocopying B/W": 5,
  "Photocopying Colour": 10,
  "Printing B/W": 10,
  "Printing Colour": 20,
  "KRA PIN retrieval": 150,
  "Passport Photo": 100, 
  "Internet Access": 1000,
  "Scanning Services": 40,
  "Business Registration": 1000,
  "Data Recovery": 1000,
  "Network Setup": 1000,
  "Social Health Authority (SHA)": 500,
  "Internet Time (per hour)": 10,

};

export default function SalesPage() {
  const [newSale, setNewSale] = useState({ item: "", price: 0, quantity: 1, date: new Date().toISOString().split('T')[0] });
  const [chartData, setChartData] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState('');

  // Add state for inventory items
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [userEnteredPrice, setUserEnteredPrice] = useState(false);

  // Add state for editing
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editForm, setEditForm] = useState({ item: "", price: 0, quantity: 1, date: "" });

  // React Query hooks
  const { data: sales = [], isLoading: salesLoading, error: salesError } = useSales();
  const { data: inventoryItems = [] } = useInventory();
  const { data: revenueData } = useRevenue();
  const addSaleMutation = useAddSale();
  const updateSaleMutation = useUpdateSale();
  const deleteSaleMutation = useDeleteSale();

  // Extract revenue data
  const totalRevenue = revenueData?.grossRevenue || 0;
  const netRevenue = revenueData?.netRevenue || 0;
  const totalExpenses = revenueData?.totalExpenses || 0;

  // Use ref to track the current item to prevent infinite loops
  const currentItemRef = useRef<string>("");

  // Merge static and dynamic options, removing duplicates
  const allOptions = [
    ...serviceOptions,
    ...inventoryItems.map((item: InventoryItem) => item.name).filter((name: string) => !serviceOptions.includes(name))
  ];

  // Update price when item changes
  useEffect(() => {
    if (!userEnteredPrice && newSale.item) {
      let newPrice = 0;
      if (fixedPrices[newSale.item]) {
        // This is a service item with fixed price
        newPrice = fixedPrices[newSale.item];
      } else {
        // This is an inventory item - look it up
        const inventoryItem = inventoryItems.find(item => item.name === newSale.item);
        if (inventoryItem) {
          newPrice = inventoryItem.unitPrice;
        }
      }
      setNewSale(prev => ({ ...prev, price: newPrice }));
      setDiscount(0);
    }
  }, [newSale.item, inventoryItems, userEnteredPrice]);

  // Calculate discount when selling price changes
  useEffect(() => {
    if (sellingPrice > 0 && sellingPrice < newSale.price) {
      setDiscount(Math.round(((newSale.price - sellingPrice) / newSale.price) * 100));
    } else {
      setDiscount(0);
    }
  }, [sellingPrice, newSale.price]);

  // Process sales data for chart
  useEffect(() => {
    if (sales.length === 0) {
      setChartData([]);
      return;
    }

    // Group sales by date and item
    const salesByDate = sales.reduce((acc, sale) => {
      const date = sale.date;
      if (!acc[date]) {
        acc[date] = {};
      }
      acc[date][sale.item] = (acc[date][sale.item] || 0) + (sale.price * sale.quantity);
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Convert to chart data format
    const chart = Object.entries(salesByDate).map(([date, items]) => ({
      date,
      ...items
    }));

    setChartData(chart);
  }, [sales]);

  const addSale = async () => {
    if (!newSale.item || newSale.price <= 0 || newSale.quantity <= 0) {
      setError("Item, price, and quantity must be valid");
      return;
    }
    
    try {
      // Use selling price if discount is applied, otherwise use original price
      const finalPrice = sellingPrice > 0 ? sellingPrice : newSale.price;
      
      await addSaleMutation.mutateAsync({
        ...newSale,
        price: finalPrice
      });

      // Refresh revenue data to ensure consistency
      // The useRevenue hook will automatically refetch
      
      setNewSale({ 
        item: "", 
        price: 0, 
        quantity: 1, 
        date: new Date().toISOString().split('T')[0] 
      });
      setSellingPrice(0);
      setDiscount(0);
      setShowDiscountInput(false);
      setUserEnteredPrice(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add sale');
    }
  };

  const deleteSale = async (id: number) => {
    try {
      // Optimistic UI update - remove immediately
      // The useSales hook will automatically refetch
      
      // Try actual deletion (will fail silently for invalid records)
      await deleteSaleMutation.mutateAsync(id);
      
      // Refresh revenue data to ensure consistency
      // The useRevenue hook will automatically refetch
      
    } catch (err) {
      console.error("Cleanup error (non-critical):", err);
      // No need to show error - record already removed from UI
    }
  };

  const updateSale = async () => {
    if (!editingSale || !editForm.item || editForm.price <= 0 || editForm.quantity <= 0) {
      setError("Please fill all required fields");
      return;
    }
    
    try {
      await updateSaleMutation.mutateAsync({
        id: editingSale.id,
        ...editForm
      });

      // Update the sale in the local state
      // The useSales hook will automatically refetch
      
      // Refresh revenue data to ensure consistency
      // The useRevenue hook will automatically refetch
      
      setEditingSale(null);
      setEditForm({ item: "", price: 0, quantity: 1, date: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sale');
    }
  };

  const startEdit = (sale: Sale) => {
    setEditingSale(sale);
    setEditForm({
      item: sale.item,
      price: sale.price,
      quantity: sale.quantity,
      date: sale.date
    });
  };

  const cancelEdit = () => {
    setEditingSale(null);
    setEditForm({ item: "", price: 0, quantity: 1, date: "" });
  };

  // Calculate stock levels
  const getStockLevels = () => {
    const outOfStock = inventoryItems.filter((item: InventoryItem) => item.quantity === 0).length;
    const lowStock = inventoryItems.filter((item: InventoryItem) => item.quantity > 0 && item.quantity <= 5).length;
    const inStock = inventoryItems.filter((item: InventoryItem) => item.quantity > 5).length;
    
    return { outOfStock, lowStock, inStock };
  };

  const stockLevels = getStockLevels();

  // Calculate best sellers
  const getBestSellers = () => {
    const itemSales = sales.reduce((acc: Record<string, number>, sale: Sale) => {
      acc[sale.item] = (acc[sale.item] || 0) + sale.quantity;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(itemSales)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([item]) => item);
  };

  const bestSellers = getBestSellers();

  const sendReport = async () => {
    if (!email) {
      setSendStatus('Please enter a valid email address');
      return;
    }
    
    setIsSending(true);
    setSendStatus('Sending report...');
    
    try {
      const response = await fetch('/api/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          reportData: sales
        }),
      });
      
      const result = await response.json();
      setSendStatus(result.message);
    } catch (error) {
      console.error('Error sending report:', error);
      setSendStatus('Failed to send report');
    } finally {
      setIsSending(false);
    }
  };

  if (salesLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto bg-sea-blue min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (salesError) {
    return (
      <div className="p-8 max-w-4xl mx-auto bg-sea-blue min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading sales: {salesError.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto bg-sea-blue min-h-screen">
      {/* Header */}
      <div className="mb-6">
          <h1 className="text-2xl font-bold">
            <FaDollarSign className="inline mr-2" /> Sales & Services Tracker
        </h1>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button 
            onClick={() => setError("")}
            className="float-right font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Gross Revenue Card */}
        <div className="bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-6 border border-green-300 dark:border-green-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">Gross Revenue</h2>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                KES {totalRevenue.toLocaleString()}
              </p>
            </div>
            <FaCoins className="text-4xl text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Net Revenue Card */}
        <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Net Revenue</h2>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                KES {netRevenue.toLocaleString()}
              </p>
            </div>
            <FaChartLine className="text-4xl text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-lg p-6 border border-red-300 dark:border-red-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">Total Expenses</h2>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                KES {totalExpenses.toLocaleString()}
              </p>
            </div>
            <FaMoneyBillWave className="text-4xl text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Best Sellers Card */}
        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-lg p-6 border border-yellow-300 dark:border-yellow-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Top Sellers</h2>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {bestSellers.length > 0 ? bestSellers[0] : 'No sales yet'}
              </p>
            </div>
            <FaCrown className="text-4xl text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Add Sale Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Record New Sale/Service</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Services (like Software Installation, KRA iTax) don&apos;t affect inventory. Physical items will be deducted from inventory when sold.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Service/Item</label>
            <select
              className="w-full border rounded px-3 py-2 dark:bg-gray-700"
              value={newSale.item}
              onChange={(e) => {
                const selectedItem = e.target.value;
                setNewSale(prev => ({ ...prev, item: selectedItem }));
                setUserEnteredPrice(false);
                
                // Auto-fill price immediately when item is selected
                if (selectedItem) {
                  let newPrice = 0;
                  if (fixedPrices[selectedItem]) {
                    // Service item with fixed price
                    newPrice = fixedPrices[selectedItem];
                  } else {
                    // Inventory item - look it up
                    const inventoryItem = inventoryItems.find(item => item.name === selectedItem);
                    if (inventoryItem) {
                      newPrice = inventoryItem.unitPrice;
                    }
                  }
                  setNewSale(prev => ({ ...prev, price: newPrice }));
                  setDiscount(0);
                }
              }}
            >
              <option value="">Select a service/item</option>
              {allOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Price (KES)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                className="flex-1 border rounded px-3 py-2 dark:bg-gray-700"
                value={newSale.price}
                onChange={e => {
                  setNewSale({ ...newSale, price: Number(e.target.value) });
                  setUserEnteredPrice(true);
                }}
                placeholder={
                  newSale.item 
                    ? fixedPrices[newSale.item]
                      ? `Service price: KES ${fixedPrices[newSale.item]}`
                      : inventoryItems.find(item => item.name === newSale.item)
                      ? `Inventory price: KES ${inventoryItems.find(item => item.name === newSale.item)?.unitPrice}`
                      : "Enter price"
                    : "Select an item first"
                }
              />
              <button
                type="button"
                onClick={() => setShowDiscountInput(!showDiscountInput)}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Discount
              </button>
            </div>
          </div>
          
          {showDiscountInput && (
            <div>
              <label className="block text-sm font-medium mb-1">Selling Price (KES)</label>
              <input
                type="number"
                min="0"
                className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                value={sellingPrice}
                onChange={e => setSellingPrice(Number(e.target.value))}
                placeholder="Enter selling price"
              />
              {discount > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  Discount: {discount}% (KES {newSale.price - sellingPrice} saved)
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700"
              value={newSale.quantity}
              onChange={(e) => setNewSale({...newSale, quantity: Number(e.target.value)})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700"
              value={newSale.date}
              onChange={(e) => setNewSale({...newSale, date: e.target.value})}
            />
          </div>
        </div>
        
        <button
          className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium px-4 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-70"
          onClick={addSale}
          disabled={addSaleMutation.isPending || !newSale.item || newSale.price <= 0}
        >
          {addSaleMutation.isPending ? (
            <>
              <Spinner /> Adding...
            </>
          ) : (
            <>
              <FaPlus /> Add Sale
            </>
          )}
        </button>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Revenue Trend</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value, name) => [`KES ${value}`, name]} />
              {sales.length > 0 && [...new Set(sales.map((sale: Sale) => sale.item))].map((item: string, index: number) => {
                const colorPalette = [
                  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
                ];
                return (
                  <Bar 
                    key={item} 
                    dataKey={item} 
                    fill={colorPalette[index % colorPalette.length]}
                    stackId="a"
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        {sales.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {[...new Set(sales.map((sale: Sale) => sale.item))].map((item: string, index: number) => {
              const colorPalette = [
                '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
              ];
              return (
                <div key={item} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: colorPalette[index % colorPalette.length] }}
                  />
                  <span className="text-sm">{item}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Report Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Email Report</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="Enter email for report"
            className="flex-1 border rounded px-3 py-2 dark:bg-gray-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded flex items-center gap-2 disabled:opacity-70"
            onClick={sendReport}
            disabled={isSending}
          >
            <FaEnvelope /> 
            {isSending ? 'Sending...' : 'Send Report'}
          </button>
        </div>
        {sendStatus && (
          <p className={`mt-2 ${sendStatus.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {sendStatus}
          </p>
        )}
      </div>

      {/* Sales List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Sales</h2>
        {sales.length === 0 ? (
          <p className="text-center py-4 text-gray-500">No sales recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item/Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{sale.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{sale.item}</td>
                    <td className="px-4 py-3 whitespace-nowrap">KES {sale.price?.toLocaleString() ?? "N/A"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{sale.quantity}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold">KES {(sale.price * sale.quantity).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => startEdit(sale)}
                          title="Edit sale"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={() => deleteSale(sale.id)}
                          title="Delete sale"
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Sale</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Item/Service</label>
                <select
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                  value={editForm.item}
                  onChange={(e) => setEditForm({...editForm, item: e.target.value})}
                >
                  <option value="">Select a service/item</option>
                  {allOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Price (KES)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                  value={editForm.price}
                  onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({...editForm, quantity: Number(e.target.value)})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                  value={editForm.date}
                  onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-70"
                onClick={updateSale}
                disabled={updateSaleMutation.isPending || !editForm.item || editForm.price <= 0}
              >
                {updateSaleMutation.isPending ? (
                  <>
                    <Spinner /> Updating...
                  </>
                ) : (
                  <>
                    <FaEdit /> Update Sale
                  </>
                )}
              </button>
              <button
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}