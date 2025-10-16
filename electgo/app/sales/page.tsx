"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { canCreateSale, canManageSales, canDeleteSale } from "../api/lib/roleUtils";
import { FaDollarSign, FaPlus, FaTrashAlt, FaChartLine, FaEnvelope, FaEdit, FaTrophy, FaArrowUp, FaCoins, FaFire, FaCrown, FaStar, FaBoxes, FaExclamationCircle, FaShieldAlt, FaMoneyBillWave } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Spinner from "../components/Spinner";
import type { UserRole } from "../api/lib/roleUtils";
import RequireAuth from "../components/RequireAuth";
interface Sale {
  id: number;
  item: string;
  price: number;
  quantity: number;
  date: string;
}

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  status: string;
  unitPrice: number;
}
const serviceOptions = [
  "Passport Photo",
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
  "Typing Services",
  "sim replacement/registration"
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
  "sim replacement/registration": 100,
    };

export default function SalesPage() {
  const { data: session, status } = useSession();
  const userRole = (session?.user?.role ?? "") as UserRole;

  const [sales, setSales] = useState<Sale[]>([]);
  const [newSale, setNewSale] = useState({ item: "", price: 0, quantity: 1, date: new Date().toISOString().split('T')[0] });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [netRevenue, setNetRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [addingSale, setAddingSale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<Array<{id: string, name: string, email: string, role: string}>>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'full' | 'custom'>('full');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customStartTime, setCustomStartTime] = useState('00:00');
  const [customEndTime, setCustomEndTime] = useState('23:59');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState('');

  // Expenses for client-side revenue summaries
  const [expenses, setExpenses] = useState<Array<{ amount: number; quantity: number; date: string }>>([]);

  // Summary range controls: daily (today), monthly (this month), full (all time)
  const [summaryRange, setSummaryRange] = useState<'daily' | 'monthly' | 'full'>('monthly');

  // Add state for inventory items
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [userEnteredPrice, setUserEnteredPrice] = useState(false);
  // Running cost for services (per unit)
  const [runningCost, setRunningCost] = useState<number | string>('');
  // New state: controls for updating inventory when recording a sale
  const [deductFromInventory, setDeductFromInventory] = useState(true);
  const [inventoryDeductQuantity, setInventoryDeductQuantity] = useState(1);
  const [creatingExpense, setCreatingExpense] = useState(false);
  const [creatingExpenseForSaleId, setCreatingExpenseForSaleId] = useState<number | null>(null);

  // Add state for editing
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editForm, setEditForm] = useState({ item: "", price: 0, quantity: 1, date: "" });
  const [updatingSale, setUpdatingSale] = useState(false);

  // Staff Request Edit modal state (parity with Inventory page)
  const [saleRequestModalOpen, setSaleRequestModalOpen] = useState(false);
  const [saleRequestTargetId, setSaleRequestTargetId] = useState<number | string | null>(null);
  const [saleRequestTargetName, setSaleRequestTargetName] = useState<string>('');
  const [saleSuggestedItem, setSaleSuggestedItem] = useState<string>('');
  const [saleSuggestedPrice, setSaleSuggestedPrice] = useState<number | string>('');
  const [saleSuggestedQuantity, setSaleSuggestedQuantity] = useState<number | string>('');
  const [saleSuggestedDate, setSaleSuggestedDate] = useState<string>('');
  const [saleRequestMessage, setSaleRequestMessage] = useState<string>('');
  const [sendingSaleRequest, setSendingSaleRequest] = useState(false);
  const [saleRequestStatus, setSaleRequestStatus] = useState<string | null>(null);

  // Fetch sales on component mount
  useEffect(() => {
    if (inventoryItems.some(item => item.name === "Services")) setDeductFromInventory(false); 
    if (status === 'authenticated') {
      fetchSales();
    }
  }, [status]);

  // Fetch inventory items and users on mount
  useEffect(() => {
    const fetchInventoryItems = async () => {
      const response = await fetch('/api/inventory');
      if (response.ok) {
        const data = await response.json();
        setInventoryItems(data);
      }
    };
    
    const fetchUsers = async () => {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    };

    const fetchExpensesList = async () => {
      try {
        const res = await fetch('/api/expenses', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          // Normalize to { amount, quantity, date }
          const normalized = (Array.isArray(data) ? data : []).map((e: any) => ({
            amount: Number(e?.amount) || 0,
            quantity: Number(e?.quantity) || 0,
            date: String(e?.date || e?.createdAt || new Date().toISOString().split('T')[0]).slice(0,10)
          }));
          setExpenses(normalized);
        }
      } catch {}
    };
    
    fetchInventoryItems();
    fetchUsers();
    fetchExpensesList();
  }, []);

  // Merge static and dynamic options, removing duplicates
  const allOptions = [
    ...serviceOptions,
    ...inventoryItems.map(item => item.name).filter(name => !serviceOptions.includes(name))
  ];

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sales', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch sales');
      }
      const data = await response.json();
      console.log('Sales page - Raw sales data from API:', data);
      
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
      
      console.log('Sales page - Valid sales after filtering:', validSales);
      console.log('Sales page - Total sales value:', validSales.reduce((sum: number, sale: Sale) => sum + (sale.price * sale.quantity), 0));
      
      setSales(validSales);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all revenue data from API to ensure consistency
  const fetchRevenueData = async () => {
    try {
      const response = await fetch('/api/revenue', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        console.log('Sales page - Received revenue data:', data);
        setTotalRevenue(data.grossRevenue);
        setNetRevenue(data.netRevenue);
        setTotalExpenses(data.totalExpenses);
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    }
  };

  // Fetch revenue data on mount and when sales change
  useEffect(() => {
    fetchRevenueData();
    
    // Listen for expense updates to refresh revenue data
    const handleExpenseUpdate = () => {
      fetchRevenueData();
    };
    
    window.addEventListener('expenseUpdated', handleExpenseUpdate);
    
    return () => {
      window.removeEventListener('expenseUpdated', handleExpenseUpdate);
    };
  }, []);

  // Also refresh revenue data when sales array changes
  useEffect(() => {
    fetchRevenueData();
  }, [sales]);

  // Prepare chart data when sales change
  useEffect(() => {
    // Prepare chart data with item breakdown
    const dailyData: Record<string, { [item: string]: number }> = {};
    sales.forEach(sale => {
      if (!dailyData[sale.date]) {
        dailyData[sale.date] = {};
      }
      dailyData[sale.date][sale.item] = (dailyData[sale.date][sale.item] || 0) + (sale.price * sale.quantity);
    });
    
    // Create color palette for items
    const uniqueItems = [...new Set(sales.map(sale => sale.item))];
    const colorPalette = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#F97316', // Orange
      '#84CC16', // Lime
      '#EC4899', // Pink
      '#6366F1', // Indigo
    ];
    
    const itemColors: Record<string, string> = {};
    uniqueItems.forEach((item, index) => {
      itemColors[item] = colorPalette[index % colorPalette.length];
    });
    
    // Transform data for chart with item breakdown
    const chart = Object.entries(dailyData).map(([date, items]) => ({
      date,
      ...items,
      total: Object.values(items).reduce((sum, value) => sum + value, 0)
    }));
    
    setChartData(chart);
  }, [sales]);

  // Update price and discount when item changes
  useEffect(() => {
    // Reset user entered price flag when item changes
    setUserEnteredPrice(false);

    const matched = inventoryItems.find(i => i.name === newSale.item);

    if (fixedPrices[newSale.item]) {
      // Set fixed price for new item selection
      setNewSale(sale => ({ ...sale, price: fixedPrices[newSale.item] }));
      setDiscount(0);
      // If the selected option is an inventory item, enable deductFromInventory by default
      setDeductFromInventory(Boolean(matched));
      // For services with fixed prices, running cost left blank for user input
      if (serviceOptions.includes(newSale.item)) setRunningCost(''); else setRunningCost('');
    } else if (matched) {
      // Inventory item: use DB unit price and deduct from inventory
      setNewSale(sale => ({ ...sale, price: matched.unitPrice }));
      setDiscount(0);
      setDeductFromInventory(true);
      setRunningCost('');
    } else {
      // Reset to 0 for items without defaults
      setNewSale(sale => ({ ...sale, price: 0 }));
      setDiscount(0);
      setDeductFromInventory(false);
      setRunningCost('');
    }
  }, [newSale.item]);

  // Prevent price override when user has manually entered a price
  useEffect(() => {
    if (userEnteredPrice && newSale.price > 0) {
      // User has manually entered a price, don't override it
      return;
    }
  }, [userEnteredPrice, newSale.price]);

  // Calculate discount when selling price changes
  useEffect(() => {
    if (sellingPrice > 0 && sellingPrice < newSale.price) {
      setDiscount(Math.round(((newSale.price - sellingPrice) / newSale.price) * 100));
    } else {
      setDiscount(0);
    }
  }, [sellingPrice, newSale.price]);

  const addSale = async () => {
    if (!newSale.item || newSale.price <= 0 || newSale.quantity <= 0) {
      setError("Item, price, and quantity must be valid");
      return;
    }
    
    setAddingSale(true);
    try {
      // Use selling price if discount is applied, otherwise use original price
      const finalPrice = sellingPrice > 0 ? sellingPrice : newSale.price;
      
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newSale,
          price: finalPrice,
          // For services, include running cost per unit if provided
          runningCost: serviceOptions.includes(newSale.item) && runningCost !== '' ? Number(runningCost) : undefined,
          // inform backend whether inventory should be updated and by how much
          updateInventory: deductFromInventory,
          inventoryDeductQuantity: deductFromInventory ? Number(inventoryDeductQuantity) : 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add sale');
      }

      const data = await response.json();
      setSales([data.sale, ...sales]);
      
      // If backend returned inventory updates, sync inventoryItems (optimistic fallback)
      if (data.inventoryUpdated && data.inventoryItem) {
        setInventoryItems(prev => prev.map(it => it.id === data.inventoryItem.id ? data.inventoryItem : it));
      } else if (deductFromInventory) {
        // Try best-effort local sync: find matching inventory item and decrement
        const inv = inventoryItems.find(i => i.name === newSale.item);
        if (inv) {
          setInventoryItems(prev => prev.map(i => i.id === inv.id ? { ...i, quantity: Math.max(0, i.quantity - Number(inventoryDeductQuantity)) } : i));
        }
      }
      
      // Refresh revenue data to ensure consistency
      await fetchRevenueData();
      
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
      setInventoryDeductQuantity(1);
      setDeductFromInventory(true);
      setRunningCost('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add sale');
    } finally {
      setAddingSale(false);
    }
  };
  
  // Allow managers/admins to manually adjust inventory for a sale
  const adjustInventory = async (sale: Sale) => {
    const inv = inventoryItems.find(i => i.name === sale.item);
    if (!inv) {
      setError('No matching inventory item found for this sale');
      return;
    }

    const input = window.prompt(`Adjust inventory for ${inv.name} (current: ${inv.quantity}). Enter quantity to deduct:`,
      String(Math.min(inv.quantity, sale.quantity)));
    if (!input) return;
    const qty = Number(input);
    if (isNaN(qty) || qty <= 0) return;

    try {
      const response = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inv.id, quantity: Math.max(0, inv.quantity - qty) })
      });
      if (!response.ok) throw new Error('Failed to update inventory');
      const updated = await response.json();
      setInventoryItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust inventory');
    }
  };

  // Create an expense record derived from a sale (visible only to managers/admins)
  const createExpenseFromSale = async (sale: Sale) => {
    if (!canManageSales(userRole as UserRole)) {
      setError('Unauthorized to create expenses from sales');
      return;
    }
    setCreatingExpense(true);
    setCreatingExpenseForSaleId(sale.id);
    try {
      const body = { description: `Expense generated from sale #${sale.id}: ${sale.item}`, amount: sale.price * sale.quantity, date: sale.date };
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create expense');
      }
      // fire an event so other components can refresh revenue/expense info
      window.dispatchEvent(new Event('expenseUpdated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense');
    } finally {
      setCreatingExpense(false);
      setCreatingExpenseForSaleId(null);
    }
  };

  // Start editing a sale
  const startEdit = (sale: Sale) => {
    setEditingSale(sale);
    setEditForm({
      item: sale.item,
      price: sale.price,
      quantity: sale.quantity,
      date: sale.date,
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingSale(null);
    setEditForm({ item: "", price: 0, quantity: 1, date: "" });
  };

  // Update sale handler
  const updateSale = async () => {
    if (!editingSale) return;
    setUpdatingSale(true);
    try {
      const response = await fetch(`/api/sales/${editingSale.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update sale");
      }
      const updatedSale = await response.json();
      setSales(prev =>
        prev.map(sale => (sale.id === editingSale.id ? updatedSale : sale))
      );
      setEditingSale(null);
      setEditForm({ item: "", price: 0, quantity: 1, date: "" });
      await fetchRevenueData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update sale");
    } finally {
      setUpdatingSale(false);
    }
  };

  // Delete a sale by ID
  const deleteSale = async (saleId: number) => {
    if (!window.confirm("Are you sure you want to delete this sale?")) return;
    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete sale");
      }
      setSales(prev => prev.filter(sale => sale.id !== saleId));
      // Optionally refresh revenue data
      await fetchRevenueData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sale");
    }
  };

  // Staff: open request modal
  const openSaleRequestModal = (sale?: Sale | null) => {
    if (sale) {
      setSaleRequestTargetId(sale.id);
      setSaleRequestTargetName(sale.item);
      setSaleSuggestedItem(sale.item);
      setSaleSuggestedPrice(sale.price ?? '');
      setSaleSuggestedQuantity(sale.quantity ?? '');
      setSaleSuggestedDate(sale.date ?? '');
      setSaleRequestMessage(`Request to update sale #${sale.id} (${sale.item}): `);
    } else {
      setSaleRequestTargetId(null);
      setSaleRequestTargetName('');
      setSaleSuggestedItem('');
      setSaleSuggestedPrice('');
      setSaleSuggestedQuantity('');
      setSaleSuggestedDate('');
      setSaleRequestMessage('Request to update sale: ');
    }
    setSaleRequestStatus(null);
    setSaleRequestModalOpen(true);
  };

  const closeSaleRequestModal = () => {
    setSaleRequestModalOpen(false);
    setSaleRequestTargetId(null);
    setSaleRequestTargetName('');
    setSaleSuggestedItem('');
    setSaleSuggestedPrice('');
    setSaleSuggestedQuantity('');
    setSaleSuggestedDate('');
    setSaleRequestMessage('');
    setSendingSaleRequest(false);
    setSaleRequestStatus(null);
  };

  const submitSaleRequest = async () => {
    if (!session?.user) return setSaleRequestStatus('You must be signed in');
    if (!saleRequestMessage) return setSaleRequestStatus('Please provide a message');
    setSendingSaleRequest(true);
    setSaleRequestStatus(null);
    try {
      const body = {
        type: 'sale',
        targetId: saleRequestTargetId,
        targetName: saleRequestTargetName,
        message: saleRequestMessage,
        staff: {
          id: session.user?.id ?? null,
          name: session.user?.name ?? null,
          email: session.user?.email ?? null,
          role: session.user?.role ?? 'STAFF'
        },
        suggested: {
          item: saleSuggestedItem || null,
          price: saleSuggestedPrice === '' ? null : Number(saleSuggestedPrice),
          quantity: saleSuggestedQuantity === '' ? null : Number(saleSuggestedQuantity),
          date: saleSuggestedDate || null
        }
      };

      const res = await fetch('/api/supervisor/request-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send request');
      }

      setSaleRequestStatus('Request sent to supervisor');
      setTimeout(() => closeSaleRequestModal(), 1200);
    } catch (err) {
      setSaleRequestStatus(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSendingSaleRequest(false);
    }
  };

  // Calculate stock levels
  const getStockLevels = () => {
    const outOfStock = inventoryItems.filter(item => item.quantity === 0).length;
    const lowStock = inventoryItems.filter(item => item.quantity > 0 && item.quantity <= 5).length;
    const inStock = inventoryItems.filter(item => item.quantity > 5).length;
    
    return { outOfStock, lowStock, inStock };
  };

  const stockLevels = getStockLevels();

  // Calculate best sellers
  const getBestSellers = () => {
    const itemSales = sales.reduce((acc, sale) => {
      acc[sale.item] = (acc[sale.item] || 0) + sale.quantity;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(itemSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([item]) => item);
  };

  const bestSellers = getBestSellers();

  const sendReport = async () => {
    if (selectedUsers.length === 0) {
      setSendStatus('Please select at least one user to send the report to');
      return;
    }

    // Validate custom date range if selected
    if (reportType === 'custom') {
      if (!customStartDate || !customEndDate) {
        setSendStatus('Please select both start and end dates for custom timeline');
        return;
      }
      if (new Date(customStartDate) > new Date(customEndDate)) {
        setSendStatus('Start date cannot be after end date');
        return;
      }
    }
    
    setIsSending(true);
    setSendStatus('Generating and sending report...');
    
    try {
      const response = await fetch('/api/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedUsers,
          reportType,
          reportData: sales,
          customStartDate: reportType === 'custom' ? customStartDate : undefined,
          customEndDate: reportType === 'custom' ? customEndDate : undefined,
          customStartTime: reportType === 'custom' ? customStartTime : undefined,
          customEndTime: reportType === 'custom' ? customEndTime : undefined
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

  // Helpers: date filtering for summary
  const isSameDay = (isoDate: string, ref: Date) => {
    const d = new Date(isoDate);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
  };

  const monthPrefix = (ref: Date) => `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2,'0')}`;

  const filterByRange = <T extends { date: string }>(items: T[], range: 'daily' | 'monthly' | 'full') => {
    if (range === 'full') return items;
    const now = new Date();
    if (range === 'daily') return items.filter(i => isSameDay(i.date, now));
    const prefix = monthPrefix(now);
    return items.filter(i => String(i.date).slice(0,7) === prefix);
  };

  const filteredSales = filterByRange(sales, summaryRange);
  const filteredExpenses = filterByRange(expenses, summaryRange);

  const computedGrossRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.price) * Number(s.quantity)), 0);
  const computedTotalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) * Number(e.quantity)), 0);
  const computedNetRevenue = computedGrossRevenue - computedTotalExpenses;

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto bg-sea-blue min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <RequireAuth>

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-2">
        <div className="md:col-span-4 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium">Time span:</span>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="summaryRange" value="daily" checked={summaryRange === 'daily'} onChange={() => setSummaryRange('daily')} />
            Today
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="summaryRange" value="monthly" checked={summaryRange === 'monthly'} onChange={() => setSummaryRange('monthly')} />
            This Month
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="summaryRange" value="full" checked={summaryRange === 'full'} onChange={() => setSummaryRange('full')} />
            All Time
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Gross Revenue Card */}
        <div className="bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-6 border border-green-300 dark:border-green-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">Gross Revenue</h2>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                KES {computedGrossRevenue.toLocaleString()}
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
                KES {computedNetRevenue.toLocaleString()}
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
                KES {computedTotalExpenses.toLocaleString()}
              </p>
            </div>
            <FaMoneyBillWave className="text-4xl text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Best Sellers Card (unchanged) */}
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
            Services (like Software Installation, KRA iTax) don't affect inventory. Physical items will be deducted from inventory when sold. Quantity for services is conceptual only; availability is treated as infinite.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Service/Item</label>
            <select
              className="w-full border rounded px-3 py-2 dark:bg-gray-700"
              value={newSale.item}
              onChange={(e) => setNewSale({...newSale, item: e.target.value})}
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
                className={`flex-1 border rounded px-3 py-2 dark:bg-gray-700 ${
                  (() => {
                    const invMatch = inventoryItems.find(i => i.name === newSale.item);
                    const defaultPrice = fixedPrices[newSale.item] ?? invMatch?.unitPrice;
                    if (userEnteredPrice && defaultPrice && newSale.price !== defaultPrice) return 'border-yellow-500 bg-yellow-50';
                    if (defaultPrice && newSale.price === defaultPrice) return 'border-green-300 bg-green-50';
                    return '';
                  })()
                }`}
                value={newSale.price}
                onChange={e => {
                  setNewSale({ ...newSale, price: Number(e.target.value) });
                  setUserEnteredPrice(true);
                }}
                placeholder={(() => {
                  const invMatch = inventoryItems.find(i => i.name === newSale.item);
                  const defaultPrice = fixedPrices[newSale.item] ?? invMatch?.unitPrice;
                  return defaultPrice ? `Default: ${defaultPrice}` : "Enter price";
                })()}
              />
              {(() => {
                const invMatch = inventoryItems.find(i => i.name === newSale.item);
                const defaultPrice = fixedPrices[newSale.item] ?? invMatch?.unitPrice;
                return userEnteredPrice && defaultPrice && newSale.price !== defaultPrice ? (
                  <div className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Overriding default price of KES {defaultPrice}</span>
                  </div>
                ) : null;
              })()}
              <button
                type="button"
                onClick={() => setShowDiscountInput(!showDiscountInput)}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Discount
              </button>
            </div>
          </div>
         {serviceOptions.includes(newSale.item) && (
           <div>
             <label className="block text-sm font-medium mb-1">Running Cost (per unit, KES)</label>
             <input
               type="number"
               min="0"
               step="0.01"
               className="w-full border rounded px-3 py-2 dark:bg-gray-700"
               value={runningCost}
               onChange={e => setRunningCost(e.target.value)}
               placeholder="Enter running cost for this service"
             />
           </div>
         )}
          
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
            {serviceOptions.includes(newSale.item) && (
              <p className="text-xs text-gray-500 mt-1">Service availability is unlimited (∞). Quantity records usage units only.</p>
            )}
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
        
        {canCreateSale(userRole as UserRole) && (
           <button
             className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium px-4 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-70"
             onClick={addSale}
             disabled={addingSale || !newSale.item || newSale.price <= 0}
           >
             {addingSale ? (
               <>
                 <Spinner /> Adding...
               </>
             ) : (
               <>
                 <FaPlus /> Add Sale
               </>
             )}
           </button>
         )}
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
              {sales.length > 0 && [...new Set(sales.map(sale => sale.item))].map((item, index) => {
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
            {[...new Set(sales.map(sale => sale.item))].map((item, index) => {
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

      {/* Sales Report Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Send Sales Report</h2>
        
        {/* Report Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Report Type</label>
          <div className="flex gap-4">
            <label className="flex items-center">
          <input
                type="radio"
                name="reportType"
                value="daily"
                checked={reportType === 'daily'}
                onChange={(e) => setReportType(e.target.value as 'daily' | 'monthly' | 'full' | 'custom')}
                className="mr-2"
              />
              Daily Report (Today)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="reportType"
                value="monthly"
                checked={reportType === 'monthly'}
                onChange={(e) => setReportType(e.target.value as 'daily' | 'monthly' | 'full' | 'custom')}
                className="mr-2"
              />
              Monthly Report (Current Month)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="reportType"
                value="full"
                checked={reportType === 'full'}
                onChange={(e) => setReportType(e.target.value as 'daily' | 'monthly' | 'full' | 'custom')}
                className="mr-2"
              />
              Full Report (All Time)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="reportType"
                value="custom"
                checked={reportType === 'custom'}
                onChange={(e) => setReportType(e.target.value as 'daily' | 'monthly' | 'full' | 'custom')}
                className="mr-2"
              />
              Custom Date Range
            </label>
          </div>
        </div>

        {reportType === 'custom' && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                value={customStartTime}
                onChange={(e) => setCustomStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                value={customEndTime}
                onChange={(e) => setCustomEndTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* User Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Users to Send Report To</label>
          <div className="max-h-40 overflow-y-auto border rounded p-2">
            {users.map(user => (
              <label key={user.id} className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers([...selectedUsers, user.id]);
                    } else {
                      setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">
                  {user.name} ({user.email}) - {user.role}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Send Button */}
        <div className="flex justify-end">
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded flex items-center gap-2 disabled:opacity-70"
            onClick={sendReport}
            disabled={isSending || selectedUsers.length === 0}
          >
            <FaEnvelope /> 
            {isSending ? 'Sending...' : `Send ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`}
          </button>
        </div>
        
        {sendStatus && (
          <p className={`mt-2 ${sendStatus.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{sale.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {sale.item}
                      {serviceOptions.includes(sale.item) ? (
                        <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">Service</span>
                      ) : (
                        <span className="ml-2 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full">Product</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">KES {sale.price?.toLocaleString() ?? "N/A"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{serviceOptions.includes(sale.item) ? '∞' : sale.quantity}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold">KES {(sale.price * sale.quantity).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold">
                      {serviceOptions.includes(sale.item) ? (
                        (() => {
                          const rc = (sale as any).runningCost ?? 0;
                          const profit = (Number(sale.price) - Number(rc)) * Number(sale.quantity);
                          const cls = profit >= 0 ? 'text-emerald-600' : 'text-red-600';
                          return <span className={cls}>KES {profit.toLocaleString()}</span>;
                        })()
                      ) : (
                        (() => {
                        const buying = (sale as any).buyingPrice ?? 0;
                        const profit = (Number(sale.price) - Number(buying)) * Number(sale.quantity);
                        const cls = profit >= 0 ? 'text-emerald-600' : 'text-red-600';
                        return <span className={cls}>KES {profit.toLocaleString()}</span>;
                        })()
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        {canManageSales(userRole as UserRole) && (
                            <button
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => startEdit(sale)}
                              title="Edit sale"
                            >
                              <FaEdit />
                            </button>
                          )}
                        {canManageSales(userRole as UserRole) && (
                            <button
                              className="text-indigo-600 hover:text-indigo-800"
                              onClick={() => adjustInventory(sale)}
                              title="Adjust inventory for this sale"
                            >
                              <FaBoxes />
                            </button>
                          )}
                        {canManageSales(userRole as UserRole) && (
                            <button
                              className="text-amber-600 hover:text-amber-800"
                              onClick={() => createExpenseFromSale(sale)}
                              title="Create expense from this sale"
                              disabled={creatingExpense && creatingExpenseForSaleId === sale.id}
                            >
                              <FaCoins />
                            </button>
                          )}
                        {userRole === 'STAFF' && (
                            <button
                              className="px-2 py-1 bg-amber-600 text-white rounded text-sm hover:bg-amber-700"
                              onClick={() => openSaleRequestModal(sale)}
                              title="Request edit"
                            >
                              Request Edit
                            </button>
                          )}
                        {canDeleteSale(userRole as UserRole) && (
                            <button
                              className="text-red-600 hover:text-red-800"
                              onClick={() => deleteSale(sale.id)}
                              title="Delete sale"
                            >
                              <FaTrashAlt />
                            </button>
                          )}
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
                disabled={updatingSale || !editForm.item || editForm.price <= 0}
              >
                {updatingSale ? (
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

      {/* Staff Request Edit Modal */}
      {saleRequestModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Suggest Sale Update</h3>

            <div className="grid grid-cols-1 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item/Service</label>
                <input
                  type="text"
                  className="block w-full p-2 border rounded dark:bg-gray-700"
                  value={saleSuggestedItem}
                  onChange={e => setSaleSuggestedItem(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Price</label>
                <input
                  type="number"
                  className="block w-full p-2 border rounded dark:bg-gray-700"
                  value={saleSuggestedPrice}
                  onChange={e => setSaleSuggestedPrice(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Quantity</label>
                <input
                  type="number"
                  className="block w-full p-2 border rounded dark:bg-gray-700"
                  value={saleSuggestedQuantity}
                  onChange={e => setSaleSuggestedQuantity(e.target.value)}
                  step="1"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Date</label>
                <input
                  type="date"
                  className="block w-full p-2 border rounded dark:bg-gray-700"
                  value={saleSuggestedDate}
                  onChange={e => setSaleSuggestedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                className="w-full border rounded p-2 dark:bg-gray-700"
                rows={3}
                value={saleRequestMessage}
                onChange={e => setSaleRequestMessage(e.target.value)}
              />
            </div>

            {saleRequestStatus && <div className="mb-3 text-sm text-red-600">{saleRequestStatus}</div>}

            <div className="flex justify-end gap-2">
              <button onClick={closeSaleRequestModal} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
              <button onClick={submitSaleRequest} disabled={sendingSaleRequest} className={`px-4 py-2 rounded ${sendingSaleRequest ? 'bg-gray-400 text-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {sendingSaleRequest ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </RequireAuth>
  );
}