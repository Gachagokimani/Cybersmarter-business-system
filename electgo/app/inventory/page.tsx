"use client";
import { useState, useEffect } from "react";
import { FaBoxOpen, FaTrashAlt, FaPlus, FaEdit, FaChartBar, FaWarehouse, FaBoxes, FaShieldAlt, FaClipboardList } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Spinner from "../components/Spinner";
import { useInventory, useAddInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem } from "../hooks/useInventory";

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  category: string;
  unitPrice: number;
  buyingPrice?: number;
  status: string;
}

export default function InventoryPage() {
  const [item, setItem] = useState({ 
    name: "", 
    quantity: 1, 
    category: "Electronics", 
    unitPrice: 0, 
    buyingPrice: 0, 
    status: "IN_STOCK" 
  });
  const [error, setError] = useState("");
  const [deletingItems, setDeletingItems] = useState<Set<number>>(new Set());

  // Add state for editing
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: "", 
    quantity: 1, 
    category: "Electronics", 
    unitPrice: 0, 
    buyingPrice: 0, 
    status: "IN_STOCK" 
  });

  // React Query hooks
  const { data: inventory = [], isLoading: inventoryLoading, error: inventoryError } = useInventory();
  const addItemMutation = useAddInventoryItem();
  const updateItemMutation = useUpdateInventoryItem();
  const deleteItemMutation = useDeleteInventoryItem();

  // Update status when quantity changes in edit form
  useEffect(() => {
    if (editingItem) {
      const newStatus = editForm.quantity <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK';
      setEditForm(prev => ({ ...prev, status: newStatus }));
    }
  }, [editForm.quantity, editingItem]);

  const addItem = async () => {
    if (!item.name || item.unitPrice <= 0) return;
    
    try {
      // Set status based on quantity
      const status = item.quantity <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK';
      
      await addItemMutation.mutateAsync({
        name: item.name,
        category: item.category,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        buyingPrice: Number(item.buyingPrice),
        status: status
      });

      setItem({ name: "", quantity: 1, category: "Electronics", unitPrice: 0, buyingPrice: 0, status: "IN_STOCK" });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    }
  };

  const updateItem = async () => {
    if (!editingItem || !editForm.name || editForm.unitPrice <= 0) {
      setError("Please fill all required fields");
      return;
    }
    
    try {
      await updateItemMutation.mutateAsync({
        id: editingItem.id,
        name: editForm.name,
        category: editForm.category,
        quantity: Number(editForm.quantity),
        unitPrice: Number(editForm.unitPrice),
        buyingPrice: Number(editForm.buyingPrice),
        status: editForm.status
      });

      setEditingItem(null);
      setEditForm({ name: "", quantity: 1, category: "Electronics", unitPrice: 0, buyingPrice: 0, status: "IN_STOCK" });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      quantity: item.quantity,
      category: item.category,
      unitPrice: item.unitPrice,
      buyingPrice: item.buyingPrice || 0,
      status: item.status
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditForm({ name: "", quantity: 1, category: "Electronics", unitPrice: 0, buyingPrice: 0, status: "IN_STOCK" });
  };

  const deleteItem = async (id: number) => {
    try {
      setDeletingItems(prev => new Set(prev).add(id));
      await deleteItemMutation.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Calculate stock levels
  const getStockLevels = () => {
    const outOfStock = inventory.filter(item => item.quantity === 0).length;
    const lowStock = inventory.filter(item => item.quantity > 0 && item.quantity <= 5).length;
    const inStock = inventory.filter(item => item.quantity > 5).length;
    
    return { outOfStock, lowStock, inStock };
  };

  // Calculate total inventory worth
  const getTotalInventoryWorth = () => {
    return inventory.reduce((total, item) => {
      return total + (item.unitPrice * item.quantity);
    }, 0);
  };

  // Calculate total inventory cost
  const getTotalInventoryCost = () => {
    return inventory.reduce((total, item) => {
      const buyingPrice = item.buyingPrice || 0;
      return total + (buyingPrice * item.quantity);
    }, 0);
  };

  const stockLevels = getStockLevels();
  const totalInventoryWorth = getTotalInventoryWorth();
  const totalInventoryCost = getTotalInventoryCost();

  if (inventoryLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto bg-sea-blue min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto bg-sea-blue min-h-screen">
      {/* Header */}
      <div className="mb-4">
          <h1 className="text-2xl font-bold">
            <FaWarehouse className="inline mr-2" /> Inventory Management
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total Items Card */}
        <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-300 dark:border-blue-700">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Total Items</h3>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {inventory.length}
              </p>
            </div>
            <FaBoxes className="text-3xl text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Inventory Worth Card */}
        <div className="bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4 border border-green-300 dark:border-green-700">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-200">Inventory Worth</h3>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                KES {totalInventoryWorth.toLocaleString()}
              </p>
            </div>
            <FaChartBar className="text-3xl text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Inventory Cost Card */}
        <div className="bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-lg p-4 border border-red-300 dark:border-red-700">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">Inventory Cost</h3>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                KES {totalInventoryCost.toLocaleString()}
              </p>
            </div>
            <FaBoxOpen className="text-3xl text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Low Stock Alert Card */}
        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-lg p-4 border border-yellow-300 dark:border-yellow-700">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Low Stock</h3>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {stockLevels.lowStock + stockLevels.outOfStock}
              </p>
            </div>
            <FaShieldAlt className="text-3xl text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded shadow p-4 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Inventory Overview</h2>
          <FaChartBar className="text-2xl text-blue-600" />
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={inventory}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="quantity" fill="#3182ce">
              {inventory.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={
                    entry.category === 'Electronics' ? '#3B82F6' :
                    entry.category === 'Computers' ? '#10B981' :
                    entry.category === 'Accessories' ? '#F59E0B' :
                    entry.category === 'Paddlocks' ? '#EF4444' :
                    '#8B5CF6' // Default purple
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
            <span className="text-sm">Electronics</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
            <span className="text-sm">Computers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
            <span className="text-sm">Accessories</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }}></div>
            <span className="text-sm">Paddlocks</span>
          </div>
        </div>
      </div>

      {/* Add Item */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Add New Item</h2>
                      <p className="text-sm text-gray-600 mt-1">
            Note: Services (like Software Installation, KRA iTax, etc.) are managed in the Sales page and don&apos;t appear in inventory. Only physical items are tracked here.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Item Name</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Item name"
              value={item.name}
              onChange={e => setItem({ ...item, name: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={item.category}
              onChange={e => setItem({ ...item, category: e.target.value })}
            >
              <option value="Electronics">Electronics</option>
              <option value="Computers">Computers</option>
              <option value="Accessories">Accessories</option>
              <option value="Paddlocks">Paddlocks</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input
              className="border rounded px-3 py-2 w-full"
              type="number"
              min={1}
              value={item.quantity}
              onChange={e => setItem({ ...item, quantity: Number(e.target.value) })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Unit Price (KES)</label>
            <input
              className="border rounded px-3 py-2 w-full"
              type="number"
              min={0}
              step={0.01}
              value={item.unitPrice}
              onChange={e => setItem({ ...item, unitPrice: Number(e.target.value) })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Buying Price (KES)</label>
            <input
              className="border rounded px-3 py-2 w-full"
              type="number"
              min={0}
              step={0.01}
              value={item.buyingPrice}
              onChange={e => setItem({ ...item, buyingPrice: Number(e.target.value) })}
            />
          </div>
        </div>
        
        <button
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-70"
          onClick={addItem}
          disabled={addItemMutation.isPending || !item.name || item.unitPrice <= 0}
        >
          {addItemMutation.isPending ? (
            <>
              <Spinner /> Adding...
            </>
          ) : (
            <>
              <FaPlus /> Add Item
            </>
          )}
        </button>
      </div>

      {/* Inventory List */}
      <div className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Inventory Items</h2>
        {inventory.length === 0 ? (
          <p className="text-center py-4 text-gray-500">No items in inventory</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buying Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit/Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inventory.map(item => {
                  const buyingPrice = item.buyingPrice || 0;
                  const profitPerUnit = item.unitPrice - buyingPrice;
                  const profitColor = profitPerUnit >= 0 ? 'text-green-600' : 'text-red-600';
                  
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 whitespace-nowrap">{item.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.category}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.quantity}</td>
                      <td className="px-4 py-3 whitespace-nowrap">KES {item.unitPrice.toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap">KES {buyingPrice.toLocaleString()}</td>
                      <td className={`px-4 py-3 whitespace-nowrap font-semibold ${profitColor}`}>
                        KES {profitPerUnit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.status === 'IN_STOCK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            className="text-blue-600 hover:text-blue-800"
                            onClick={() => startEdit(item)}
                            title="Edit item"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className={`text-red-600 hover:text-red-800 ${
                              deletingItems.has(item.id) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            onClick={() => deleteItem(item.id)}
                            disabled={deletingItems.has(item.id)}
                            title="Delete item"
                          >
                            {deletingItems.has(item.id) ? (
                              <Spinner />
                            ) : (
                              <FaTrashAlt />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Item</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Item Name</label>
                <input
                  className="border rounded px-3 py-2 w-full dark:bg-gray-700"
                  placeholder="Item name"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  className="border rounded px-3 py-2 w-full dark:bg-gray-700"
                  value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Computers">Computers</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Paddlocks">Paddlocks</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  className="border rounded px-3 py-2 w-full dark:bg-gray-700"
                  type="number"
                  min={1}
                  value={editForm.quantity}
                  onChange={e => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Unit Price (KES)</label>
                <input
                  className="border rounded px-3 py-2 w-full dark:bg-gray-700"
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.unitPrice}
                  onChange={e => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Buying Price (KES)</label>
                <input
                  className="border rounded px-3 py-2 w-full dark:bg-gray-700"
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.buyingPrice}
                  onChange={e => setEditForm({ ...editForm, buyingPrice: Number(e.target.value) })}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-70"
                onClick={updateItem}
                disabled={updateItemMutation.isPending || !editForm.name || editForm.unitPrice <= 0}
              >
                {updateItemMutation.isPending ? (
                  <>
                    <Spinner /> Updating...
                  </>
                ) : (
                  <>
                    <FaEdit /> Update Item
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
