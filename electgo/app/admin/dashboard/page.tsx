"use client";

import { ReactNode, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Package, 
  ShoppingCart, 
  Activity,
  Settings,
  Server,
  Database,
  FileText,
  Cpu,
  HardDrive,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  Shield
} from "lucide-react";

type SystemStats = {
  totalUsers: number;
  activeProducts: number;
  monthlySales: number;
  systemHealth: number;
  activeSessions: number;
  storageUsed: number;
  responseTime: number;
  databaseSize: string;
  uptime: string;
  pendingApprovals: number;
};

type Alert = {
  time: ReactNode;
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  read: boolean;
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeProducts: 0,
    monthlySales: 0,
    systemHealth: 0,
    activeSessions: 0,
    storageUsed: 0,
    responseTime: 0,
    databaseSize: '0 MB',
    uptime: '0d 0h 0m',
    pendingApprovals: 0
  });

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [processingAlertId, setProcessingAlertId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const fetchSystemStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch system stats');
      }
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching system stats:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/admin/alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      router.replace('/auth/login');
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchSystemStats(), fetchAlerts()]);
    };

    loadData();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchSystemStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session, status, router]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSystemStats();
  };

  const performAlertAction = async (alertId: string, action: 'approve' | 'reject') => {
    setProcessingAlertId(alertId);
    setProcessingAction(action);
    try {
      const res = await fetch('/api/admin/alerts/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Action failed');

      // Mark the alert as read locally (or refetch alerts)
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
    } catch (e) {
      console.error('Alert action error:', e);
    } finally {
      setProcessingAlertId(null);
      setProcessingAction(null);
      // refresh alerts to load any new messages created by action
      fetchAlerts();
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (isLoading || status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
        <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-600">Admin privileges required</p>
      </div>
    </div>;
  }

  const statCards = [
    { 
      title: "Total Users", 
      value: stats.totalUsers, 
      icon: Users,
      color: "bg-blue-100 text-blue-600"
    },
    { 
      title: "System Health", 
      value: `${stats.systemHealth}%`, 
      icon: Activity,
      color: stats.systemHealth > 90 ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
    },
    { 
      title: "Active Sessions", 
      value: stats.activeSessions, 
      icon: Users,
      color: "bg-purple-100 text-purple-600"
    },
    { 
      title: "Response Time", 
      value: stats.responseTime, 
      icon: Clock,
      color: "bg-amber-100 text-amber-600"
    }
  ];

  return (
    <div className="min-h-screen bg-[#191970] py-6 px-4 sm:px-6 lg:px-8 transition-colors duration-700">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <span>System Overview</span>
              {lastUpdated && (
                <span className="ml-2 flex items-center text-xs text-gray-400">
                  <Clock className="h-3 w-3 mr-1" />
                  Updated {lastUpdated}
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <span className="px-3 py-1.5 text-sm bg-green-50 text-green-800 font-medium rounded-full flex items-center">
              <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
              System Online
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ delay: index * 0.08, duration: 0.6, type: 'spring', stiffness: 120 }}
              className="bg-white/90 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all border-l-4 border-blue-500 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Settings className="mr-2 h-5 w-5 text-blue-600" />
                System Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => router.push('/admin/users')}
                  className="p-4 border rounded-lg hover:bg-gray-50 text-left"
                >
                  <Users className="h-6 w-6 text-blue-600 mb-2" />
                  <h3 className="font-medium">Manage Users</h3>
                  <p className="text-sm text-gray-500 mt-1">View and manage system users</p>
                </button>
                <button 
                  onClick={() => router.push('/admin/settings')}
                  className="p-4 border rounded-lg hover:bg-gray-50 text-left"
                >
                  <Settings className="h-6 w-6 text-purple-600 mb-2" />
                  <h3 className="font-medium">System Settings</h3>
                  <p className="text-sm text-gray-500 mt-1">Configure system preferences</p>
                </button>
                <button 
                  onClick={() => router.push('/admin/backup')}
                  className="p-4 border rounded-lg hover:bg-gray-50 text-left"
                >
                  <Database className="h-6 w-6 text-green-600 mb-2" />
                  <h3 className="font-medium">Backup & Restore</h3>
                  <p className="text-sm text-gray-500 mt-1">Manage system backups</p>
                </button>
                <button 
                  onClick={() => router.push('/admin/logs')}
                  className="p-4 border rounded-lg hover:bg-gray-50 text-left"
                >
                  <FileText className="h-6 w-6 text-amber-600 mb-2" />
                  <h3 className="font-medium">System Logs</h3>
                  <p className="text-sm text-gray-500 mt-1">View system activity</p>
                </button>
              </div>
            </div>

            {/* System Resources */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Cpu className="mr-2 h-5 w-5 text-gray-700" />
                System Resources
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Storage</span>
                    <span className="text-sm text-gray-500">{stats.storageUsed}% used</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${stats.storageUsed}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">CPU Usage</span>
                    <span className="text-sm text-gray-500">24%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '24%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Memory</span>
                    <span className="text-sm text-gray-500">3.2/8 GB</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <AlertCircle className="mr-2 h-5 w-5 text-amber-500" />
                System Alerts
              </h2>
              <div className="space-y-4">
                {alerts.length > 0 ? (
                  alerts.map(alert => {
                    // Try to parse structured payload if present
                    let humanText = alert.message || '';
                    let payload: any = null;
                    try {
                      const parts = (alert.message || '').split('\nPAYLOAD:');
                      humanText = parts[0] || humanText;
                      if (parts[1]) {
                        payload = JSON.parse(parts[1]);
                      }
                    } catch (e) {
                      // leave humanText as-is if parsing fails
                      payload = null;
                    }

                    // Extract a short summary line (first line of humanText)
                    const summaryLine = humanText.split('\n')[0];

                    return (
                      <div key={alert.id} className={`p-3 rounded-lg border ${alert.read ? 'bg-gray-50 border-gray-200' : 'bg-amber-50 border-amber-100'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <AlertCircle className={`h-5 w-5 ${alert.type === 'error' ? 'text-red-500' : alert.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{summaryLine}</p>
                              {/* show remaining human message (if any) */}
                              {humanText.split('\n').slice(1).map((line, idx) => (
                                line ? <p key={idx} className="text-xs text-gray-500 mt-1">{line}</p> : null
                              ))}

                              {/* If payload exists, show structured details */}
                              {payload && (
                                <div className="mt-2 bg-white border rounded p-2 text-sm">
                                  {payload.staff && (
                                    <div className="mb-2">
                                      <div className="text-xs text-gray-600">Requested by</div>
                                      <div className="font-medium">{payload.staff.name ?? payload.staff.email}</div>
                                      {payload.staff.email && <div className="text-xs text-gray-500">{payload.staff.email}</div>}
                                    </div>
                                  )}

                                  {payload.type && (
                                    <div className="mb-2 text-xs text-gray-600">Type: <span className="font-medium text-gray-800">{payload.type}</span></div>
                                  )}

                                  {payload.suggested && (
                                    <div className="mt-2">
                                      <div className="text-xs text-gray-600 mb-1">Suggested changes</div>
                                      <table className="w-full text-sm">
                                        <tbody>
                                          {typeof payload.suggested.buyingPrice !== 'undefined' && (
                                            <tr><td className="text-gray-600">Buying Price</td><td className="font-medium text-gray-800">{payload.suggested.buyingPrice ?? '—'}</td></tr>
                                          )}
                                          {typeof payload.suggested.sellingPrice !== 'undefined' && (
                                            <tr><td className="text-gray-600">Selling Price</td><td className="font-medium text-gray-800">{payload.suggested.sellingPrice ?? '—'}</td></tr>
                                          )}
                                          {typeof payload.suggested.quantity !== 'undefined' && (
                                            <tr><td className="text-gray-600">Quantity</td><td className="font-medium text-gray-800">{payload.suggested.quantity ?? '—'}</td></tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {/* If full payload contains target info, show it */}
                                  {payload.targetName && (
                                    <div className="mt-2 text-xs text-gray-600">Target: <span className="font-medium text-gray-800">{payload.targetName}</span></div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Approve/Reject quick actions for admin */}
                            <button
                              disabled={alert.read || processingAlertId === alert.id}
                              onClick={() => performAlertAction(alert.id, 'approve')}
                              className={`px-2 py-1 text-sm rounded ${alert.read ? 'bg-gray-200 text-gray-600' : 'bg-green-600 text-white hover:bg-green-700'}`}
                              title="Approve and apply suggested edit"
                            >
                              {processingAlertId === alert.id && processingAction === 'approve' ? 'Applying...' : 'Approve'}
                            </button>
                            <button
                              disabled={alert.read || processingAlertId === alert.id}
                              onClick={() => performAlertAction(alert.id, 'reject')}
                              className={`px-2 py-1 text-sm rounded ${alert.read ? 'bg-gray-200 text-gray-600' : 'bg-red-600 text-white hover:bg-red-700'}`}
                              title="Reject suggestion"
                            >
                              {processingAlertId === alert.id && processingAction === 'reject' ? 'Rejecting...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No active alerts</p>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
              <div className="space-y-2">
                <a href="/admin/documentation" className="flex items-center p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                  <FileText className="h-4 w-4 mr-2 text-gray-500" />
                  Documentation
                </a>
                <a href="/admin/support" className="flex items-center p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                  <Shield className="h-4 w-4 mr-2 text-gray-500" />
                  Support Center
                </a>
                <a href="/admin/updates" className="flex items-center p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                  <Server className="h-4 w-4 mr-2 text-gray-500" />
                  System Updates
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}