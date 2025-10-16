"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: string | null }>({}); // { [userId]: 'activate' | 'deactivate' | 'delete' | null }

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "ADMIN") {
      router.replace("/auth/login");
      return;
    }
    fetchUsers();
  }, [session, status, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleActivate = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'activate' }));
    await fetch(`/api/admin/users`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: true })
    });
    await fetchUsers();
    setActionLoading((prev) => ({ ...prev, [id]: null }));
  };

  const handleDeactivate = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'deactivate' }));
    await fetch(`/api/admin/users`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: false })
    });
    await fetchUsers();
    setActionLoading((prev) => ({ ...prev, [id]: null }));
  };

  const handleDelete = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'delete' }));
    await fetch(`/api/admin/users`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    await fetchUsers();
    setActionLoading((prev) => ({ ...prev, [id]: null }));
  };

  if (loading) return <div className="text-center py-10 text-white">Loading users...</div>;
  if (error) return <div className="text-center py-10 text-red-400">{error}</div>;

  return (
    <div className="min-h-screen bg-[#191970] py-8 px-4 sm:px-8 lg:px-16">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <a href="/admin/dashboard" className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition">Return to Dashboard</a>
      </div>
      <div className="overflow-x-auto rounded-lg shadow bg-white/90">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[#191970] text-white">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-none hover:bg-blue-50/50 transition-colors">
                <td className="px-4 py-2 font-medium">{user.name}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">{user.role}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2"><div className="flex flex-row gap-2">
                  {user.isActive ? (
                    <button onClick={() => handleDeactivate(user.id)} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition flex items-center min-w-[100px]" disabled={actionLoading[user.id] === 'deactivate'}>
                      {actionLoading[user.id] === 'deactivate' ? (
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      ) : null}
                      Deactivate
                    </button>
                  ) : (
                    <button onClick={() => handleActivate(user.id)} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center min-w-[100px]" disabled={actionLoading[user.id] === 'activate'}>
                      {actionLoading[user.id] === 'activate' ? (
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      ) : null}
                      Activate
                    </button>
                  )}
                  <button onClick={() => handleDelete(user.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center min-w-[80px]" disabled={actionLoading[user.id] === 'delete'}>
                    {actionLoading[user.id] === 'delete' ? (
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    ) : null}
                    Delete
                  </button>
                  </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={fetchUsers} disabled={refreshing} className="mt-6 px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition">
        {refreshing ? "Refreshing..." : "Refresh List"}
      </button>
    </div>
  );
}
