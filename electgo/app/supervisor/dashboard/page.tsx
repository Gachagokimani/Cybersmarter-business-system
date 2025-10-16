"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Spinner from "../../components/Spinner";
import RequireAuth from "../../components/RequireAuth";
import { motion } from 'framer-motion';
import { UserCheck, Users, Activity } from 'lucide-react';

interface Staff {
  id: string;
  name: string;
  workId: string;
  email: string;
  createdAt: string;
  isActive: boolean;
}

export default function SupervisorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState<Staff[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    if (
      status === "authenticated" &&
      session &&
      session.user &&
      (session.user?.role === "MANAGER" || session.user?.role === "ADMIN")
    ) {
      fetchData();
    } else if (status === "authenticated" && session && session.user) {
      setError("Unauthorized: Only supervisors can access this page.");
    }
  }, [status, session]);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [pendingRes, staffRes] = await Promise.all([
        fetch("/api/supervisor/pending-staff").then(r => r.json()),
        fetch("/api/supervisor/staff").then(r => r.json()),
      ]);
      setPending(pendingRes);
      setStaff(staffRes);
    } catch (e) {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(staffId: string) {
    setActionMsg("");
    const res = await fetch("/api/supervisor/approve-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId }),
    });
    const data = await res.json();
    setActionMsg(data.message || data.error);
    fetchData();
  }

  async function handleDeactivate(staffId: string) {
    setActionMsg("");
    const res = await fetch("/api/supervisor/deactivate-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId }),
    });
    const data = await res.json();
    setActionMsg(data.message || data.error);
    fetchData();
  }

  async function handleReactivate(staffId: string) {
    setActionMsg("");
    const res = await fetch("/api/supervisor/reactivate-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId }),
    });
    const data = await res.json();
    setActionMsg(data.message || data.error);
    fetchData();
  }

  if (status === "loading" || loading) return <div className="flex justify-center items-center min-h-screen"><Spinner /></div>;
  if (error) return <div className="text-red-600 p-8">{error}</div>;

  return (
    <RequireAuth allowedRoles={["ADMIN","MANAGER"]}>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Supervisor Dashboard</h1>
              <p className="text-gray-600">Welcome back, {session?.user?.name || session?.user?.email}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {session?.user?.role === 'MANAGER' ? 'Supervisor' : 'Admin'}
              </span>
            </div>
          </div>

          {/* Team Management Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Pending Approvals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <UserCheck className="mr-2 h-5 w-5 text-blue-600" />
                Pending Approvals
              </h2>
              {pending.length > 0 ? (
                <div className="space-y-3">
                  {pending.map((staff) => (
                    <div key={staff.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium">{staff.name}</p>
                        <p className="text-sm text-gray-500">{staff.workId}</p>
                      </div>
                      <button
                        onClick={() => handleApprove(staff.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Approve
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No pending approvals</p>
              )}
            </motion.div>

            {/* Team Members */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Users className="mr-2 h-5 w-5 text-green-600" />
                Team Members
              </h2>
              <div className="space-y-3">
                {staff.map((member) => (
                  <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                    <div className="flex space-x-2">
                      {member.isActive ? (
                        <button
                          onClick={() => handleDeactivate(member.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-md hover:bg-red-200 transition-colors"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(member.id)}
                          className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-md hover:bg-green-200 transition-colors"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Activity className="mr-2 h-5 w-5 text-purple-600" />
                Quick Actions
              </h2>
              <div className="space-y-3">
                <button className="w-full text-left p-3 hover:bg-purple-50 rounded-lg transition-colors border border-purple-100">
                  View Team Schedule
                </button>
                <button className="w-full text-left p-3 hover:bg-purple-50 rounded-lg transition-colors border border-purple-100">
                  Send Announcement
                </button>
                <button className="w-full text-left p-3 hover:bg-purple-50 rounded-lg transition-colors border border-purple-100">
                  Generate Reports
                </button>
              </div>
            </motion.div>
          </div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {staff.slice(0, 3).map((member) => (
                <div key={member.id} className="flex items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium flex-shrink-0">
                    {member.name.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-gray-500">
                      {member.isActive ? 'Active' : 'Inactive'} • {new Date(member.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </RequireAuth>
  );
}