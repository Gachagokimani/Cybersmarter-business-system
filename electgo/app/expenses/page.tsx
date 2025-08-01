"use client";
import { useState, useEffect } from "react";
import { FaReceipt, FaPlus, FaTrashAlt, FaEdit, FaChartBar, FaMoneyBillWave, FaCalculator } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Spinner from "../components/Spinner";
import { useExpenses, useAddExpense, useUpdateExpense, useDeleteExpense } from "../hooks/useExpenses";

interface Expense {
  id: number;
  item: string;
  amount: number;
  quantity: number;
  date: string;
  category: string;
}

const expenseCategories = [
  "Rent",
  "Utilities",
  "Internet",
  "Equipment",
  "Supplies",
  "Maintenance",
  "Marketing",
  "Insurance",
  "Transportation",
  "Other"
];

export default function ExpensesPage() {
  const [newExpense, setNewExpense] = useState({ 
    item: "", 
    amount: 0, 
    quantity: 1, 
    date: new Date().toISOString().split('T')[0],
    category: "Other"
  });
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [error, setError] = useState("");

  // Add state for editing
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({ item: "", amount: 0, quantity: 1, date: "", category: "Other" });

  // React Query hooks
  const { data: expenses = [], isLoading: expensesLoading, error: expensesError } = useExpenses();
  const addExpenseMutation = useAddExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();

  // Fetch expenses on component mount
  useEffect(() => {
    // The useExpenses hook handles fetching data, so we don't need to call fetchExpenses here
    // unless we want to re-fetch or handle specific error states.
    // For now, we'll rely on the useExpenses hook's data and error states.
  }, []);

  const addExpense = async () => {
    if (!newExpense.item || newExpense.amount <= 0) {
      setError("Item and amount must be valid");
      return;
    }
    
    try {
      await addExpenseMutation.mutateAsync({
        item: newExpense.item,
        amount: newExpense.amount,
        quantity: newExpense.quantity,
        date: newExpense.date,
        category: newExpense.category,
      });
      
      setNewExpense({ 
        item: "", 
        amount: 0, 
        quantity: 1, 
        date: new Date().toISOString().split('T')[0],
        category: "Other"
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add expense');
    }
  };

  const updateExpense = async () => {
    if (!editingExpense || !editForm.item || editForm.amount <= 0) {
      setError("Please fill all required fields");
      return;
    }
    
    try {
      await updateExpenseMutation.mutateAsync({
        id: editingExpense.id,
        item: editForm.item,
        amount: editForm.amount,
        quantity: editForm.quantity,
        date: editForm.date,
        category: editForm.category,
      });
      
      setEditingExpense(null);
      setEditForm({ item: "", amount: 0, quantity: 1, date: "", category: "Other" });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update expense');
    }
  };

  const startEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setEditForm({
      item: expense.item,
      amount: expense.amount,
      quantity: expense.quantity,
      date: expense.date,
      category: expense.category
    });
  };

  const cancelEdit = () => {
    setEditingExpense(null);
    setEditForm({ item: "", amount: 0, quantity: 1, date: "", category: "Other" });
  };

  const deleteExpense = async (id: number) => {
    try {
      await deleteExpenseMutation.mutateAsync(id);
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  // Calculate total expenses and chart data
  useEffect(() => {
    const total = expenses.reduce((sum, expense) => sum + (expense.amount * expense.quantity), 0);
    setTotalExpenses(total);
    
    // Prepare chart data by category
    const categoryData = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + (expense.amount * expense.quantity);
      return acc;
    }, {} as Record<string, number>);
    
    const chart = Object.entries(categoryData).map(([category, amount]) => ({
      category,
      amount
    }));
    
    setChartData(chart);
  }, [expenses]);

  if (expensesLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto bg-sea-blue min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (expensesError) {
    return (
      <div className="p-8 max-w-4xl mx-auto bg-sea-blue min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {expensesError.message}
          <button 
            onClick={() => setError("")}
            className="float-right font-bold"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto bg-sea-blue min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          <FaReceipt className="inline mr-2" /> Expenses Tracker
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Expenses Card */}
        <div className="bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-lg p-6 border border-red-300 dark:border-red-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">Total Expenses</h2>
              <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                KES {totalExpenses.toLocaleString()}
              </p>
            </div>
            <FaMoneyBillWave className="text-4xl text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Average Expense Card */}
        <div className="bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg p-6 border border-orange-300 dark:border-orange-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-orange-800 dark:text-orange-200">Average Expense</h2>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                KES {expenses.length > 0 ? (totalExpenses / expenses.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
              </p>
            </div>
            <FaCalculator className="text-4xl text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        {/* Categories Card */}
        <div className="bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-6 border border-purple-300 dark:border-purple-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-purple-800 dark:text-purple-200">Categories</h2>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {new Set(expenses.map(expense => expense.category)).size}
              </p>
            </div>
            <FaChartBar className="text-4xl text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Expenses Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Expenses by Category</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value) => [`KES ${value}`, 'Amount']} />
              <Bar dataKey="amount" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Add Expense Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Expense</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Expense Item</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700"
              placeholder="e.g., Internet Bill, Rent, Supplies"
              value={newExpense.item}
              onChange={(e) => setNewExpense({...newExpense, item: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className="w-full border rounded px-3 py-2 dark:bg-gray-700"
              value={newExpense.category}
              onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
            >
              {expenseCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Amount (KES)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({...newExpense, amount: Number(e.target.value)})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700"
              value={newExpense.quantity}
              onChange={(e) => setNewExpense({...newExpense, quantity: Number(e.target.value)})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700"
              value={newExpense.date}
              onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
            />
          </div>
        </div>
        
        <button
          className="mt-4 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-70"
          onClick={addExpense}
          disabled={addExpenseMutation.isPending || !newExpense.item || newExpense.amount <= 0}
        >
          {addExpenseMutation.isPending ? (
            <>
              <Spinner /> Adding...
            </>
          ) : (
            <>
              <FaPlus /> Add Expense
            </>
          )}
        </button>
      </div>

      {/* Expenses List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Expenses</h2>
        {expenses.length === 0 ? (
          <p className="text-center py-4 text-gray-500">No expenses recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {expenses.map(expense => (
                  <tr key={expense.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{expense.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{expense.item}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">KES {expense.amount?.toLocaleString() ?? "N/A"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{expense.quantity}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold">KES {(expense.amount * expense.quantity).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => startEdit(expense)}
                          title="Edit expense"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={() => deleteExpense(expense.id)}
                          title="Delete expense"
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
      {editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Expense</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Expense Item</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                  value={editForm.item}
                  onChange={(e) => setEditForm({...editForm, item: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                  value={editForm.category}
                  onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                >
                  {expenseCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Amount (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                  value={editForm.amount}
                  onChange={e => setEditForm({ ...editForm, amount: Number(e.target.value) })}
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
                onClick={updateExpense}
                disabled={updateExpenseMutation.isPending || !editForm.item || editForm.amount <= 0}
              >
                {updateExpenseMutation.isPending ? (
                  <>
                    <Spinner /> Updating...
                  </>
                ) : (
                  <>
                    <FaEdit /> Update Expense
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