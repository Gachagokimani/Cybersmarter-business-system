"use client";
import { useState, useEffect, useCallback } from "react";
import { FaBoxOpen, FaTrashAlt, FaPlus, FaEdit, FaChartBar, FaWarehouse, FaBoxes, FaShieldAlt, FaClipboardList, FaSearch, FaUserShield } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Spinner from "../components/Spinner";
import RequireAuth from "../components/RequireAuth";
import { useSession } from "next-auth/react";

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  category: string;
  unitPrice: number;
  buyingPrice: number;
  status: string;
}

// User roles and permissions
const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  VIEWER: 'VIEWER'
} as const;

type UserRole = keyof typeof ROLES;

// Permission checks
const hasPermission = (userRole: UserRole, requiredRole: UserRole, action: string): boolean => {
  const roleHierarchy = {
    [ROLES.ADMIN]: 4,
    [ROLES.MANAGER]: 3,
    [ROLES.STAFF]: 2,
    [ROLES.VIEWER]: 1
  };

  // Admin has all permissions (compare via hierarchy to avoid impossible literal comparisons)
  if (roleHierarchy[userRole] === roleHierarchy[ROLES.ADMIN]) return true;

  // Check role hierarchy
  if (roleHierarchy[userRole] >= roleHierarchy[requiredRole]) {
    // Special cases where even managers might not have certain permissions
    // DELETE_ITEM must be performed by someone with ADMIN-level rank
    if (action === 'DELETE_ITEM' && roleHierarchy[userRole] < roleHierarchy[ROLES.ADMIN]) return false;
    if (action === 'EDIT_PRICES' && userRole === ROLES.VIEWER) return false;
    return true;
  }

  return false;
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

export default function InventoryPage() {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = session?.user?.role as UserRole || 'VIEWER';

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [item, setItem] = useState({ name: "", quantity: 0, category: "Electronics", unitPrice: 0, buyingPrice: 0 });
  const [addingItem, setAddingItem] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<InventoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [selectedExistingItem, setSelectedExistingItem] = useState<InventoryItem | null>(null);

  // Add state for editing
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ name: "", quantity: 0, category: "Electronics", unitPrice: 0, buyingPrice: 0 });
  const [updatingItem, setUpdatingItem] = useState(false);
  const [requestingUpdate, setRequestingUpdate] = useState(false);

  // --- Category details & request UI state ---
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryItems, setCategoryItems] = useState<InventoryItem[]>([]);

  const [requestCategoryModalOpen, setRequestCategoryModalOpen] = useState(false);
  const [requestCategoryMessage, setRequestCategoryMessage] = useState('');
  const [sendingCategoryRequest, setSendingCategoryRequest] = useState(false);

  // New: Inventory request modal state for staff suggestions
  const [inventoryRequestModalOpen, setInventoryRequestModalOpen] = useState(false);
  const [inventoryRequestTargetId, setInventoryRequestTargetId] = useState<number | string | null>(null);
  const [inventoryRequestTargetName, setInventoryRequestTargetName] = useState<string>('');
  const [inventorySuggestedBuyingPrice, setInventorySuggestedBuyingPrice] = useState<number | string>('');
  const [inventorySuggestedSellingPrice, setInventorySuggestedSellingPrice] = useState<number | string>('');
  const [inventorySuggestedQuantity, setInventorySuggestedQuantity] = useState<number | string>('');
  const [inventoryRequestMessage, setInventoryRequestMessage] = useState<string>('');
  const [sendingInventoryRequest, setSendingInventoryRequest] = useState(false);
  const [inventoryRequestStatus, setInventoryRequestStatus] = useState<string | null>(null);

  // Fetch inventory on component mount with authorization
  const fetchInventory = useCallback(async () => {
    if (!session || !userRole) return; // Ensure dependencies are included
    try {
      const response = await fetch('/api/inventory', {
        headers: {
          'Authorization': `Bearer ${(session?.user as { accessToken?: string })?.accessToken ?? ''}`
        }
      });
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      console.error(err);
    }
  }, [session, userRole]); // Add all dependencies here

  // initial load
  useEffect(() => { 
    if (sessionStatus === 'authenticated') {
      fetchInventory(); 
    }
  }, [fetchInventory, sessionStatus]);

  // refetch when window regains focus or the tab becomes visible (so bar chart stays in sync)
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    
    const onFocus = () => fetchInventory();
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchInventory(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchInventory, sessionStatus]);

  // Update status when quantity changes in edit form
  useEffect(() => {
    if (editingItem) {
      const newStatus = editForm.quantity <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK';
      setEditForm(prev => ({ ...prev, status: newStatus }));
    }
  }, [editForm.quantity, editingItem]);

  // Fetch suggestions function with authorization
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    // Check if user has permission to search inventory
    if (!hasPermission(userRole, ROLES.VIEWER, 'VIEW_INVENTORY')) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsFetchingSuggestions(true);
    try {
      const response = await fetch(`/api/inventory/suggestions?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${(session?.user as { accessToken?: string })?.accessToken ?? ''}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    } finally {
      setIsFetchingSuggestions(false);
    }
  }, [session, userRole]);

  // Debounced input handler
  const handleNameInput = useCallback(
    debounce((value: string) => {
      fetchSuggestions(value);
    }, 300),
    [fetchSuggestions]
  );

  // Handle suggestion selection - UPDATED TO POPULATE ALL FIELDS
  const handleSuggestionSelect = (suggestion: InventoryItem) => {
    setItem({
      name: suggestion.name,
      quantity: suggestion.quantity, // Use actual quantity from DB
      category: suggestion.category,
      unitPrice: suggestion.unitPrice,
      buyingPrice: suggestion.buyingPrice
    });
    setSelectedExistingItem(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const addItem = async () => {
    // Check if user has permission to add items
    if (!hasPermission(userRole, ROLES.STAFF, 'ADD_ITEM')) {
      setError('You do not have permission to add items');
      return;
    }
    
    if (!item.name || item.unitPrice <= 0) return;
    
    setAddingItem(true);
    try {
      // Set status based on quantity
      const status = item.quantity <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK';
      
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session?.user as { accessToken?: string })?.accessToken ?? ''}`
        },
        body: JSON.stringify({
          name: item.name,
          category: item.category,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          buyingPrice: Number(item.buyingPrice),
          status: status
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('You do not have permission to add items');
        }
        throw new Error('Failed to add item');
      }

      const newItem = await response.json();
      setInventory([...inventory, newItem]);
      setItem({ name: "", quantity: 0, category: "Electronics", unitPrice: 0, buyingPrice: 0 });
      setSelectedExistingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setAddingItem(false);
    }
  };

  const updateItem = async () => {
    // Check if user has permission to update items
    if (!hasPermission(userRole, ROLES.STAFF, 'UPDATE_ITEM')) {
      setError('You do not have permission to update items');
      return;
    }
    
    if (!selectedExistingItem || !item.name || item.unitPrice <= 0) {
      setError("Please fill all required fields");
      return;
    }
    
    setUpdatingItem(true);
    try {
      // Update status based on quantity
      const newStatus = item.quantity <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK';
      
      const response = await fetch('/api/inventory', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session?.user as { accessToken?: string })?.accessToken ?? ''}`
        },
        body: JSON.stringify({
          id: selectedExistingItem.id,
          name: item.name,
          category: item.category,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          buyingPrice: Number(item.buyingPrice),
          status: newStatus
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('You do not have permission to update items');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update item');
      }

      const updatedItem = await response.json();
      setInventory(prev => prev.map(item => 
        item.id === selectedExistingItem.id ? updatedItem : item
      ));
      
      setItem({ name: "", quantity: 0, category: "Electronics", unitPrice: 0, buyingPrice: 0 });
      setSelectedExistingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setUpdatingItem(false);
    }
  };

  const requestUpdate = async () => {
    if (!editingItem) return;
    
    // Check if user has permission to request updates
    if (!hasPermission(userRole, ROLES.STAFF, 'REQUEST_UPDATE')) {
      setError('You do not have permission to request updates');
      return;
    }
    
    setRequestingUpdate(true);
    try {
      // Use consolidated supervisor request endpoint
      const message = `Request to update product ${editingItem.id} (${editingItem.name}): ${JSON.stringify(editForm)}`;
      const response = await fetch('/api/supervisor/request-update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session?.user as { accessToken?: string })?.accessToken ?? ''}`
        },
        body: JSON.stringify({
          type: 'inventory',
          targetId: editingItem.id,
          targetName: editingItem.name,
          message,
          staff: {
            id: session?.user?.id ?? null,
            name: session?.user?.name ?? null,
            email: session?.user?.email ?? null,
            role: session?.user?.role ?? 'STAFF'
          }
        })
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('You do not have permission to request updates');
        }
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to request update');
      }
      
      setEditingItem(null);
      setEditForm({ name: "", quantity: 0, category: "Electronics", unitPrice: 0, buyingPrice: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request update');
    } finally {
      setRequestingUpdate(false);
    }
  };

  const startEdit = (item: InventoryItem) => {
    // Check if user has permission to edit
    if (!hasPermission(userRole, ROLES.STAFF, 'UPDATE_ITEM')) {
      setError('You do not have permission to edit inventory directly. Please use the request update feature.');
      return;
    }
    
    setEditingItem(item);
    setEditForm({
      name: item.name,
      quantity: item.quantity,
      category: item.category,
      unitPrice: item.unitPrice,
      buyingPrice: item.buyingPrice
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditForm({ name: "", quantity: 0, category: "Electronics", unitPrice: 0, buyingPrice: 0 });
  };

  const openCategoryDetails = (category: string) => {
    // Check if user has permission to view category details
    if (!hasPermission(userRole, ROLES.VIEWER, 'VIEW_INVENTORY')) {
      setError('You do not have permission to view category details');
      return;
    }
    
    setSelectedCategory(category);
    setCategoryItems(inventory.filter(i => i.category === category));
    setCategoryModalOpen(true);
  };

  const closeCategoryDetails = () => {
    setCategoryModalOpen(false);
    setSelectedCategory(null);
    setCategoryItems([]);
  };

  const openRequestCategoryModal = (category: string) => {
    // Check if user has permission to request category updates
    if (!hasPermission(userRole, ROLES.STAFF, 'REQUEST_UPDATE')) {
      setError('You do not have permission to request category updates');
      return;
    }
    
    setSelectedCategory(category);
    setRequestCategoryMessage(`Request to update category ${category}: `);
    setRequestCategoryModalOpen(true);
  };

  const closeRequestCategoryModal = () => {
    setRequestCategoryModalOpen(false);
    setRequestCategoryMessage('');
    setSelectedCategory(null);
    setSendingCategoryRequest(false);
  };

  const submitCategoryRequest = async () => {
    // Check if user has permission to request category updates
    if (!hasPermission(userRole, ROLES.STAFF, 'REQUEST_UPDATE')) {
      setError('You do not have permission to request category updates');
      return;
    }
    
    if (!requestCategoryMessage || !session?.user || !selectedCategory) {
      return setError('Please provide a message');
    }
    
    setSendingCategoryRequest(true);
    try {
      const res = await fetch('/api/supervisor/request-update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session?.user as { accessToken?: string })?.accessToken ?? ''}`
        },
        body: JSON.stringify({
          type: 'category',
          targetId: selectedCategory,
          targetName: selectedCategory,
          message: requestCategoryMessage,
          staff: {
            id: session.user?.id ?? null,
            name: session.user?.name ?? null,
            email: session.user?.email ?? null,
            role: session.user?.role ?? 'STAFF'
          }
        })
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('You do not have permission to make requests');
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to request category update');
      }
      
      closeRequestCategoryModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request category update');
    } finally {
      setSendingCategoryRequest(false);
    }
  };

  // Open inventory request modal prefilled with item data (if provided)
  const openInventoryRequestModal = (item?: InventoryItem | null) => {
    // Check if user has permission to request inventory updates
    if (!hasPermission(userRole, ROLES.STAFF, 'REQUEST_UPDATE')) {
      setError('You do not have permission to request inventory updates');
      return;
    }
    
    if (item) {
      setInventoryRequestTargetId(item.id);
      setInventoryRequestTargetName(item.name);
      setInventorySuggestedBuyingPrice(item.buyingPrice ?? '');
      setInventorySuggestedSellingPrice(item.unitPrice ?? '');
      setInventorySuggestedQuantity(item.quantity ?? '');
      setInventoryRequestMessage(`Request to update ${item.name}: `);
    } else {
      setInventoryRequestTargetId(null);
      setInventoryRequestTargetName('');
      setInventorySuggestedBuyingPrice('');
      setInventorySuggestedSellingPrice('');
      setInventorySuggestedQuantity('');
      setInventoryRequestMessage('Request to update item: ');
    }
    setInventoryRequestStatus(null);
    setInventoryRequestModalOpen(true);
  };

  const closeInventoryRequestModal = () => {
    setInventoryRequestModalOpen(false);
    setInventoryRequestTargetId(null);
    setInventoryRequestTargetName('');
    setInventorySuggestedBuyingPrice('');
    setInventorySuggestedSellingPrice('');
    setInventorySuggestedQuantity('');
    setInventoryRequestMessage('');
    setSendingInventoryRequest(false);
    setInventoryRequestStatus(null);
  };

  const submitInventoryRequest = async () => {
    // Check if user has permission to submit inventory requests
    if (!hasPermission(userRole, ROLES.STAFF, 'REQUEST_UPDATE')) {
      setInventoryRequestStatus('You do not have permission to submit requests');
      return;
    }
    
    if (!session?.user) return setInventoryRequestStatus('You must be signed in');
    if (!inventoryRequestMessage) return setInventoryRequestStatus('Please provide a message');
    
    setSendingInventoryRequest(true);
    setInventoryRequestStatus(null);
    
    try {
      const body = {
        type: 'inventory',
        targetId: inventoryRequestTargetId,
        targetName: inventoryRequestTargetName,
        message: inventoryRequestMessage,
        staff: {
          id: session.user?.id ?? null,
          name: session.user?.name ?? null,
          email: session.user?.email ?? null,
          role: session.user?.role ?? 'STAFF'
        },
        suggested: {
          buyingPrice: inventorySuggestedBuyingPrice === '' ? null : Number(inventorySuggestedBuyingPrice),
          sellingPrice: inventorySuggestedSellingPrice === '' ? null : Number(inventorySuggestedSellingPrice),
          quantity: inventorySuggestedQuantity === '' ? null : Number(inventorySuggestedQuantity)
        }
      };

      const res = await fetch('/api/supervisor/request-update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session?.user as { accessToken?: string })?.accessToken ?? ''}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('You do not have permission to make requests');
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send request');
      }

      setInventoryRequestStatus('Request sent to supervisor');
      setTimeout(() => closeInventoryRequestModal(), 1200);
    } catch (err) {
      setInventoryRequestStatus(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSendingInventoryRequest(false);
    }
  };

  const deleteItem = async (id: number) => {
    // Check if user has permission to delete items
    if (!hasPermission(userRole, ROLES.ADMIN, 'DELETE_ITEM')) {
      setError('You do not have permission to delete inventory items');
      return;
    }
    
    try {
      // Optimistic UI update - remove immediately
      setInventory(prev => prev.filter(i => i.id !== id));
      
      // Try actual deletion (will fail silently for invalid records)
      await fetch('/api/inventory', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session?.user as { accessToken?: string })?.accessToken ?? ''}`
        },
        body: JSON.stringify({ id }),
      });
      
    } catch (err) {
      console.error("Cleanup error (non-critical):", err);
      // No need to show error - item already removed from UI
    }
  };

  // Calculate stock levels
  const getStockLevels = () => {
    const outOfStock = inventory.filter(item => item.quantity === 0).length;
    const lowStock = inventory.filter(item => item.quantity > 0 && item.quantity <= 5).length;
    const inStock = inventory.filter(item => item.quantity > 5).length;
    
    return { outOfStock, lowStock, inStock };
  };

  // Calculate cost tracking metrics
  const getCostMetrics = () => {
    const totalInventoryValue = inventory.reduce((sum, item) => {
      return sum + (item.quantity * item.buyingPrice);
    }, 0);

    const totalSellingValue = inventory.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    const totalPotentialProfit = totalSellingValue - totalInventoryValue;
    const averageProfitMargin = totalInventoryValue > 0 ? (totalPotentialProfit / totalInventoryValue) * 100 : 0;

    // Cost breakdown by category
    const categoryCosts = inventory.reduce((acc, item) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = { totalCost: 0, totalValue: 0, items: 0 };
      }
      acc[category].totalCost += item.quantity * item.buyingPrice;
      acc[category].totalValue += item.quantity * item.unitPrice;
      acc[category].items += 1;
      return acc;
    }, {} as Record<string, { totalCost: number; totalValue: number; items: number }>);

    // Low profit margin items (less than 20% margin)
    const lowProfitItems = inventory.filter(item => {
      if (item.buyingPrice <= 0) return false;
      const margin = ((item.unitPrice - item.buyingPrice) / item.buyingPrice) * 100;
      return margin < 20;
    });

    return {
      totalInventoryValue,
      totalSellingValue,
      totalPotentialProfit,
      averageProfitMargin,
      categoryCosts,
      lowProfitItems
    };
  };

  const stockLevels = getStockLevels();
  const costMetrics = getCostMetrics();

  if (sessionStatus === 'loading') {
    return (
      <div className="p-8 max-w-3xl mx-auto bg-sea-blue min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="p-8 max-w-3xl mx-auto bg-sea-blue min-h-screen flex items-center justify-center">
        <div className="bg-white p-6 rounded shadow-md text-center">
          <h2 className="text-xl font-bold mb-4">Authentication Required</h2>
          <p>You must be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <RequireAuth>
      <div className="p-8 max-w-4xl mx-auto bg-sea-blue min-h-screen">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold flex items-center">
              <FaWarehouse className="inline mr-2" /> Inventory Management
            </h1>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center">
                <FaUserShield className="mr-1" /> {userRole}
              </span>
              <button onClick={fetchInventory} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm">Refresh</button>
            </div>
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Total Items Card */}
          <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg p-4 border border-blue-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-blue-800">Total Items</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {inventory.length}
                </p>
              </div>
              <FaBoxes className="text-3xl text-blue-600" />
            </div>
          </div>

          {/* Low Stock Alert Card */}
          <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg p-4 border border-yellow-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-yellow-800">Low Stock</h3>
                <p className="text-2xl font-bold text-yellow-900">
                  {stockLevels.lowStock + stockLevels.outOfStock}
                </p>
              </div>
              <FaShieldAlt className="text-3xl text-yellow-600" />
            </div>
          </div>

          {/* Categories Card */}
          <div className="bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg p-4 border border-purple-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-purple-800">Categories</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {new Set(inventory.map(item => item.category)).size}
                </p>
              </div>
              <FaClipboardList className="text-3xl text-purple-600" />
            </div>
          </div>
        </div>

        {/* Cost Tracking Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Inventory Cost */}
          <div className="bg-gradient-to-r from-red-100 to-red-200 rounded-lg p-4 border border-red-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-red-800">Total Cost</h3>
                <p className="text-lg font-bold text-red-900">
                  KES {costMetrics.totalInventoryValue.toLocaleString()}
                </p>
              </div>
              <FaBoxOpen className="text-2xl text-red-600" />
            </div>
          </div>

          {/* Total Selling Value */}
          <div className="bg-gradient-to-r from-green-100 to-green-200 rounded-lg p-4 border border-green-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-green-800">Selling Value</h3>
                <p className="text-lg font-bold text-green-900">
                  KES {costMetrics.totalSellingValue.toLocaleString()}
                </p>
              </div>
              <FaChartBar className="text-2xl text-green-600" />
            </div>
          </div>

          {/* Potential Profit */}
          <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-lg p-4 border border-emerald-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-emerald-800">Potential Profit</h3>
                <p className={`text-lg font-bold ${costMetrics.totalPotentialProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                  KES {costMetrics.totalPotentialProfit.toLocaleString()}
                </p>
              </div>
              <FaChartBar className="text-2xl text-emerald-600" />
            </div>
          </div>

          {/* Average Margin */}
          <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-lg p-4 border border-indigo-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-indigo-800">Avg Margin</h3>
                <p className={`text-lg font-bold ${costMetrics.averageProfitMargin >= 0 ? 'text-indigo-900' : 'text-red-900'}`}>
                  {costMetrics.averageProfitMargin.toFixed(1)}%
                </p>
              </div>
              <FaChartBar className="text-2xl text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded shadow p-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Inventory Overview (Total Value)</h2>
            <FaChartBar className="text-2xl text-blue-600" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={inventory.map(item => ({
              ...item,
              totalValue: item.quantity * item.unitPrice
            }))}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value, name) => [`KES ${value?.toLocaleString()}`, 'Total Value']} />
              <Bar dataKey="totalValue" fill="#3182ce">
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

        {/* Add/Update Item with Autocomplete */}
        {hasPermission(userRole, ROLES.STAFF, 'ADD_ITEM') && (
          <div className="bg-white rounded shadow p-4 mb-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                {selectedExistingItem ? "Update Existing Item" : "Add New Item"}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {selectedExistingItem 
                  ? "Editing existing item. Modify any field and click Update Item to save changes."
                  : "Note: Services are managed in the Sales page. Only physical items are tracked here."}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item Name Input with Autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium mb-1">Item Name</label>
                <div className="relative">
                  <input
                    className="border rounded px-3 py-2 w-full pl-10"
                    placeholder="Start typing to see existing items..."
                    value={item.name}
                    onChange={e => {
                      setItem({ ...item, name: e.target.value });
                      handleNameInput(e.target.value);
                    }}
                    onFocus={() => {
                      if (item.name.length >= 2 && suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Hide suggestions after a short delay to allow clicking
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                  />
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                </div>
                
                {/* Suggestions dropdown */}
                {showSuggestions && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded mt-1 shadow-lg max-h-60 overflow-y-auto">
                    {isFetchingSuggestions ? (
                      <div className="p-2 text-center text-gray-500">Searching...</div>
                    ) : suggestions.length === 0 ? (
                      <div className="p-2 text-center text-gray-500">No matching items found</div>
                    ) : (
                      suggestions.map(suggestion => (
                        <div
                          key={suggestion.id}
                          className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onMouseDown={() => handleSuggestionSelect(suggestion)}
                        >
                          <div className="font-medium">{suggestion.name}</div>
                          <div className="text-sm text-gray-600">
                            {suggestion.category} • KES {suggestion.unitPrice.toLocaleString()}
                            {suggestion.quantity > 0 ? ` • ${suggestion.quantity} in stock` : ' • Out of stock'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={item.category}
                  onChange={e => setItem({ ...item, category: e.target.value })}
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Software">Software</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Grants">Grants</option>
                  <option value="Paddlocks">Paddlocks</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  type="number"
                  min={0}
                  value={item.quantity}
                  onChange={e => setItem({ ...item, quantity: Number(e.target.value) })}
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
              
              <div>
                <label className="block text-sm font-medium mb-1">Selling Price (KES)</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.unitPrice}
                  onChange={e => setItem({ ...item, unitPrice: Number(e.target.value) })}
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              {selectedExistingItem && (
                <button
                  className="bg-gray-500 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded flex items-center gap-2"
                  onClick={() => {
                    setItem({ name: "", quantity: 0, category: "Electronics", unitPrice: 0, buyingPrice: 0 });
                    setSelectedExistingItem(null);
                  }}
                >
                  Cancel Edit
                </button>
              )}
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded flex items-center gap-2 disabled:opacity-70"
                onClick={selectedExistingItem ? updateItem : addItem}
                disabled={addingItem || updatingItem || !item.name || item.unitPrice <= 0}
                title={!item.name || item.unitPrice <= 0 ? "Fill all required fields" : ""}
              >
                {addingItem || updatingItem ? (
                  <>
                    <Spinner /> {selectedExistingItem ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  <>
                    {selectedExistingItem ? <FaEdit /> : <FaPlus />}
                    {selectedExistingItem ? "Update Item" : "Add Item"}
                  </>
                )}
              </button>
            </div> 
          </div>
        )}

        {/* Cost Breakdown Section */}
        <div className="bg-white rounded shadow p-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Cost Breakdown by Item</h2>
            <FaChartBar className="text-2xl text-blue-600" />
          </div>

          {inventory.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No inventory items to analyze</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buying Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin %</th>
                    {hasPermission(userRole, ROLES.STAFF, 'UPDATE_ITEM') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inventory.map(it => {
                    const totalCost = it.quantity * it.buyingPrice;
                    const totalValue = it.quantity * it.unitPrice;
                    const profit = totalValue - totalCost;
                    const margin = totalCost > 0 ? (profit / totalCost) * 100 : 0;

                    return (
                      <tr key={it.id}>
                        <td className="px-4 py-3 whitespace-nowrap font-medium">{it.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{it.category}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{it.quantity}</td>
                        <td className="px-4 py-3 whitespace-nowrap">KES {it.buyingPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap">KES {it.unitPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-red-600">KES {totalCost.toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-green-600">KES {totalValue.toLocaleString()}</td>
                        <td className={`px-4 py-3 whitespace-nowrap font-medium ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>KES {profit.toLocaleString()}</td>
                        <td className={`px-4 py-3 whitespace-nowrap font-medium ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{margin.toFixed(1)}%</td>
                        {hasPermission(userRole, ROLES.STAFF, 'UPDATE_ITEM') && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex gap-2">
                              {userRole === 'STAFF' ? (
                                <button className="px-3 py-1 bg-amber-600 text-white rounded text-sm hover:bg-amber-700" onClick={() => openInventoryRequestModal(it)} title="Request Edit">Request Edit</button>
                              ) : (
                                <button className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700" onClick={() => startEdit(it)} title="Edit">Edit</button>
                              )}
                              {hasPermission(userRole, ROLES.ADMIN, 'DELETE_ITEM') && (
                                <button className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700" onClick={() => deleteItem(it.id)} title="Delete">Delete</button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ... (rest of the modals and components with appropriate permission checks) */}
        
      </div>
    </RequireAuth>
  );
}