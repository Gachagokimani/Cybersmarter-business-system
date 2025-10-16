"use client";
import Link from "next/link";
import { FaDesktop } from 'react-icons/fa';
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { FaHome, FaBoxOpen, FaReceipt, FaChartBar, FaExclamationTriangle, FaChevronDown, FaDollarSign } from "react-icons/fa";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false);

  // Determine dashboard URL based on user role
  const getDashboardUrl = () => {
    if (!session?.user?.role) return '/auth/login';
    return session.user.role === 'ADMIN' 
      ? '/admin/dashboard' 
      : session.user.role === 'MANAGER' 
        ? '/supervisor/dashboard' 
        : '/staff/dashboard'; // Staff members go to staff dashboard
  };

  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: FaHome,
      description: "Return to main dashboard"
    },
    {
      name: "Sales",
      href: "/sales",
      icon: FaDollarSign,
      description: "Track sales and services"
    },
    {
      name: "Inventory",
      href: "/inventory",
      icon: FaBoxOpen,
      description: "View and manage stock levels"
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: FaReceipt,
      description: "Track and manage expenses"
    }
  ];

  const stockLevelItems = [
    {
      name: "Low Stock Alerts",
      href: "/inventory?filter=low",
      icon: FaExclamationTriangle,
      description: "Items with low stock levels",
      alert: true
    },
    {
      name: "Stock Overview",
      href: "/inventory",
      icon: FaChartBar,
      description: "Complete inventory overview"
    },
    {
      name: "Add New Item",
      href: "/inventory?action=add",
      icon: FaBoxOpen,
      description: "Add new inventory item"
    }
  ];

  return (
    <nav className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg border-b-2 border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <Image
                src="/cybersmater.png"
                alt="CyberSmater Logo (check /public/cybersmater.png exists)"
                width={40}
                height={40}
                className="mr-3 bg-white"
                onError={(e) => {
                  // fallback to text if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const sibling = target.nextElementSibling;
                  if (sibling) sibling.textContent = "CyberSmater";
                }}
              />
              <span className="text-lg font-bold text-white hidden sm:block">
                CyberSmater
              </span>
            </Link>
          </div>
          {/* Dashboard Button by Role */}
          {session?.user?.role && (
            <Link
              href={getDashboardUrl()}
              className={`
                flex items-center px-1 py-2 rounded-md text-sm font-semibold transition-all duration-200
                ${
                  pathname === getDashboardUrl()
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                    : 'text-slate-200 hover:bg-gradient-to-r hover:from-purple-600 hover:to-purple-700 hover:text-white'
                }
              `}
              title={
                session.user.role === "ADMIN" ? "Admin Dashboard" :
                session.user.role === "MANAGER" ? "Supervisor Dashboard" :
                "Staff Dashboard"
              }
              style={{ marginRight: 16 }}
            >
              <FaDesktop className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">
                {session.user.role === "ADMIN" ? "Admin" : 
                 session.user.role === "MANAGER" ? "Supervisor" : "Staff"}
              </span>
            </Link>
          )}
          
          {/* Navigation Items */}
          <div className="flex items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-1 py-2 rounded-md text-sm font-semibold transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' 
                      : 'text-slate-200 hover:bg-gradient-to-r hover:from-burgundy-medium hover:to-burgundy-dark hover:text-white'
                    }
                  `}
                  title={item.description}
                >
                  <Icon className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              );
            })}

            {/* Stock Levels Dropdown */}
            <div className="relative">
              <button
                onClick={() => setStockDropdownOpen(!stockDropdownOpen)}
                className={`
                  flex items-center px-1 py-2 rounded-md text-sm font-semibold transition-all duration-200
                  ${pathname.includes('/inventory') 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' 
                    : 'text-slate-200 hover:bg-gradient-to-r hover:from-burgundy-medium hover:to-burgundy-dark hover:text-white'
                  }
                `}
                title="Stock levels and alerts"
              >
                <FaChartBar className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Stock Levels</span>
                <FaChevronDown className={`ml-1 h-3 w-3 transition-transform ${stockDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {stockDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gradient-to-b from-slate-800 to-slate-900 rounded-md shadow-xl py-1 z-50 border-2 border-slate-600">
                  {stockLevelItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-gradient-to-r hover:from-burgundy-medium hover:to-burgundy-dark hover:text-white font-medium"
                        onClick={() => setStockDropdownOpen(false)}
                        title={item.description}
                      >
                        <Icon className={`mr-2 h-4 w-4 ${item.alert ? 'text-red-400' : ''}`} />
                        {item.name}
                        {item.alert && (
                          <span className="ml-auto bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                            Alert
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Auth actions */}
            {session?.user ? (
              <button
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                className="ml-3 text-slate-200 hover:text-white hover:underline"
                title="Sign out"
              >
                Sign out
              </button>
            ) : (
              <Link href="/auth/login" className="ml-3 text-slate-200 hover:text-white hover:underline" title="Sign in">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {stockDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setStockDropdownOpen(false)}
        />
      )}
    </nav>
  );
}