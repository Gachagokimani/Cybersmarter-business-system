"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Sale {
  id: string;
  amount: number;
  createdAt: string;
}
interface InventoryAction {
  id: string;
  itemName: string;
  action: string;
  createdAt: string;
}

export default function StaffDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventory, setInventory] = useState<InventoryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New: full inventory items list for dropdown suggestions
  const [inventoryItems, setInventoryItems] = useState<Array<{id: string; name: string; buyingPrice?: number; sellingPrice?: number; quantity?: number}>>([]);

  // Suggested edits state
  const [suggestedBuyingPrice, setSuggestedBuyingPrice] = useState<number | string>('');
  const [suggestedSellingPrice, setSuggestedSellingPrice] = useState<number | string>('');
  const [suggestedQuantity, setSuggestedQuantity] = useState<number | string>('');

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "STAFF") {
      router.replace("/auth/login");
      return;
    }
    fetchStaffData();
  }, [session, status, router]);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const [salesRes, inventoryRes, itemsRes] = await Promise.all([
        fetch("/api/staff/sales"),
        fetch("/api/staff/inventory"),
        fetch("/api/inventory") // fetch full inventory for dropdown
      ]);
      if (!salesRes.ok || !inventoryRes.ok || !itemsRes.ok) throw new Error("Failed to fetch data");
      setSales(await salesRes.json());
      setInventory(await inventoryRes.json());
      setInventoryItems(await itemsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // --- Request update modal state and handlers ---
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<'inventory' | 'sale' | 'general' | null>(null);
  const [requestTargetId, setRequestTargetId] = useState<string | number | null>(null);
  const [requestTargetName, setRequestTargetName] = useState<string>('');
  const [requestMessage, setRequestMessage] = useState<string>('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  const handleOpenRequest = (type: 'inventory' | 'sale' | 'general', id: string | number | null, name: string) => {
    setRequestType(type);
    setRequestTargetId(id);
    setRequestTargetName(name);

    // If opening for inventory and we have items loaded, prefill suggested fields
    if (type === 'inventory') {
      // try to find the item in inventoryItems by id or name
      const found = id ? inventoryItems.find(i => String(i.id) === String(id)) : inventoryItems.find(i => i.name === name);
      if (found) {
        setSuggestedBuyingPrice(found.buyingPrice ?? '');
        setSuggestedSellingPrice(found.sellingPrice ?? '');
        setSuggestedQuantity(found.quantity ?? '');
        setRequestTargetId(found.id);
        setRequestTargetName(found.name);
        setRequestMessage(`Request to update ${found.name}: `);
      } else {
        setSuggestedBuyingPrice('');
        setSuggestedSellingPrice('');
        setSuggestedQuantity('');
        setRequestMessage(`Request to update ${name}: `);
      }
    } else {
      setSuggestedBuyingPrice('');
      setSuggestedSellingPrice('');
      setSuggestedQuantity('');
      setRequestMessage(`Request to update ${name}: `);
    }

    setRequestStatus(null);
    setRequestModalOpen(true);
  };

  const handleCloseRequest = () => {
    setRequestModalOpen(false);
    setRequestType(null);
    setRequestTargetId(null);
    setRequestTargetName('');
    setRequestMessage('');
    setSuggestedBuyingPrice('');
    setSuggestedSellingPrice('');
    setSuggestedQuantity('');
    setSendingRequest(false);
    setRequestStatus(null);
  };

  const submitRequest = async () => {
    if (!requestMessage || !session?.user) {
      setRequestStatus('Please provide a message');
      return;
    }
    setSendingRequest(true);
    setRequestStatus(null);
    try {
      const body = {
        type: requestType,
        targetId: requestTargetId,
        targetName: requestTargetName,
        message: requestMessage,
        staff: {
          id: session.user?.id ?? null,
          name: session.user?.name ?? null,
          email: session.user?.email ?? null,
          role: session.user?.role ?? 'STAFF'
        },
        // include suggested edits when inventory suggestion
        suggested: requestType === 'inventory' ? {
          buyingPrice: suggestedBuyingPrice === '' ? null : Number(suggestedBuyingPrice),
          sellingPrice: suggestedSellingPrice === '' ? null : Number(suggestedSellingPrice),
          quantity: suggestedQuantity === '' ? null : Number(suggestedQuantity)
        } : undefined
      };

      const res = await fetch('/api/supervisor/request-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send request to supervisor');
      }
      setRequestStatus('Request sent to your supervisor');
      // Optionally close modal after short delay
      setTimeout(() => handleCloseRequest(), 1400);
    } catch (err) {
      setRequestStatus(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSendingRequest(false);
    }
  };

  // Suggest edit workflow (simplified)
  const handleSuggestEdit = async () => {
    // Open inventory suggestion modal so staff can choose item and propose new values
    setRequestType('inventory');
    setRequestTargetId(null);
    setRequestTargetName('');
    setRequestMessage('Suggestion to update inventory item: ');
    setSuggestedBuyingPrice('');
    setSuggestedSellingPrice('');
    setSuggestedQuantity('');
    setRequestStatus(null);
    setRequestModalOpen(true);
  };

  // Schedule off workflow (simplified)
  const handleScheduleOff = async () => {
    // Keep existing simple UX while staff schedule feature is pending
    alert('Schedule off workflow coming soon!');
  };

  if (loading) return <div className="text-center py-10 text-white">Loading staff dashboard...</div>;
  if (error) return <div className="text-center py-10 text-red-400">{error}</div>;

  return (
    <div className="min-h-screen bg-[#1a237e] py-8 px-4 sm:px-8 lg:px-16">
      <h1 className="text-3xl font-bold text-white mb-8">Welcome, {session?.user?.name || "Staff"}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white/90 rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-[#1a237e]">Your Sales</h2>
          <ul>
            {sales.length === 0 ? (
              <li className="text-gray-500">No sales recorded yet.</li>
            ) : (
              sales.map(sale => (
                <li key={sale.id} className="mb-2 flex items-center justify-between border-b pb-1 last:border-none gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">Sale #{sale.id}</span>
                      <span className="text-xs text-gray-400">{new Date(sale.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-gray-700 mt-1">Amount: <span className="font-semibold">${sale.amount.toFixed(2)}</span></div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenRequest('sale', sale.id, `Sale #${sale.id}`)}
                      className="px-2 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                      title="Request supervisor to update this sale"
                    >
                      Request Update
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="bg-white/90 rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-[#1a237e]">Inventory Actions</h2>
          <ul>
            {inventory.length === 0 ? (
              <li className="text-gray-500">No inventory actions yet.</li>
            ) : (
              inventory.map(action => (
                <li key={action.id} className="mb-2 flex items-center justify-between border-b pb-1 last:border-none gap-4">
                  <div className="flex-1">
                    <div className="font-medium">{action.action}: {action.itemName}</div>
                    <div className="text-xs text-gray-400">{new Date(action.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handleOpenRequest('inventory', action.id, action.itemName)}
                      className="px-2 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                      title="Request supervisor to update this inventory record"
                    >
                      Request Update
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mb-8">
        <button onClick={handleSuggestEdit} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition">Suggest Edit</button>
        <button onClick={handleScheduleOff} className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition">Schedule Off</button>
        <a href="/staff/dashboard" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">Staff Dashboard</a>
        {/* Add more staff UAC actions here as needed */}
      </div>
      <div className="bg-white/80 rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-2 text-[#1a237e]">Staff Quick Actions</h2>
        <ul className="flex flex-wrap gap-4">
          <li><a href="/sales" className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition">Record Sale</a></li>
          <li><a href="/inventory/add" className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition">Add Inventory</a></li>
          {/* More creative actions can be added here */}
        </ul>
      </div>

      {/* Request Update Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-black/50 absolute inset-0" onClick={handleCloseRequest}></div>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full z-10">
            <h3 className="text-lg font-semibold mb-4 text-[#1a237e]">Request Update</h3>
            <p className="text-sm text-gray-500 mb-4">Compose your request to the supervisor below:</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
              <input
                type="text"
                value={requestType === 'inventory' ? 'Inventory Update' : requestType === 'sale' ? 'Sale Update' : 'General Request'}
                readOnly
                className="block w-full p-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            {/* If inventory request, show dropdown to pick an item and suggested fields */}
            {requestType === 'inventory' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Item</label>
                  <select
                    value={requestTargetId ?? ''}
                    onChange={(e) => {
                      const id = e.target.value;
                      setRequestTargetId(id);
                      const item = inventoryItems.find(i => String(i.id) === String(id));
                      if (item) {
                        setRequestTargetName(item.name);
                        setSuggestedBuyingPrice(item.buyingPrice ?? '');
                        setSuggestedSellingPrice(item.sellingPrice ?? '');
                        setSuggestedQuantity(item.quantity ?? '');
                        setRequestMessage(`Request to update ${item.name}: `);
                      } else {
                        setRequestTargetName('');
                        setSuggestedBuyingPrice('');
                        setSuggestedSellingPrice('');
                        setSuggestedQuantity('');
                        setRequestMessage('Request to update item: ');
                      }
                    }}
                    className="block w-full p-2 border border-gray-300 rounded-md bg-white"
                  >
                    <option value="">-- Select an item --</option>
                    {inventoryItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Buying Price</label>
                    <input
                      type="number"
                      value={suggestedBuyingPrice}
                      onChange={(e) => setSuggestedBuyingPrice(e.target.value)}
                      className="block w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Selling Price</label>
                    <input
                      type="number"
                      value={suggestedSellingPrice}
                      onChange={(e) => setSuggestedSellingPrice(e.target.value)}
                      className="block w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Quantity</label>
                    <input
                      type="number"
                      value={suggestedQuantity}
                      onChange={(e) => setSuggestedQuantity(e.target.value)}
                      className="block w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                      step="1"
                      min="0"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                className="block w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                rows={3}
              />
            </div>

            {requestStatus && (
              <div className="mb-4">
                <span className={`text-sm ${requestStatus.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>{requestStatus}</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCloseRequest}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitRequest}
                disabled={sendingRequest}
                className={`px-4 py-2 rounded transition ${sendingRequest ? 'bg-gray-400 text-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {sendingRequest ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
