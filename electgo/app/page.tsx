"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaBoxOpen, FaDesktop, FaCashRegister, FaReceipt } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState({
    inventory: false,
    cybercafe: false,
    sales: false,
    expenses: false
  });

  const handleNavigation = (path: string, button: keyof typeof loading) => {
    setLoading({ ...loading, [button]: true });
    router.push(path);
  };

  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-between p-8 sm:p-20 bg-sea-blue pt-24">
      <header className="w-full flex flex-col items-center mb-10">
        <Image
          className="dark:invert mb-4"
          src="/cybersmater.png"
          alt="CyberSmater Logo"
          width={500}
          height={500}
          priority
        />
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">
          Electronics Inventory & Cyber Cafe Management
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center max-w-2xl">
          Manage your electronics inventory, cyber cafe operations, sales, and expenses seamlessly from one platform.
        </p>
      </header>

      <main className="flex flex-col sm:flex-row gap-8 w-full max-w-6xl justify-center items-stretch flex-wrap">
        {/* Electronics Inventory Management Card */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 flex flex-col items-center min-w-[280px]"
        >
          <FaBoxOpen className="text-5xl text-blue-600 dark:text-blue-400 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Electronics Inventory</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
            Track, manage, and analyze your electronics stock. Add, edit, and monitor inventory levels with ease.
          </p>
          <button
            onClick={() => handleNavigation("/inventory", "inventory")}
            disabled={loading.inventory}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-full transition disabled:opacity-75 flex items-center justify-center gap-2"
          >
            {loading.inventory ? (
              <span className="inline-block animate-spin">↻</span>
            ) : (
              "Go to Inventory"
            )}
          </button>
        </motion.div>

        {/* Cyber Cafe Management Card */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 flex flex-col items-center min-w-[280px]"
        >
          <FaDesktop className="text-5xl text-green-600 dark:text-green-400 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Cyber Cafe Management</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
            Manage computer usage, track sessions, and handle billing for your cyber cafe efficiently.
          </p>
          <button
            onClick={() => handleNavigation("/cybercafe", "cybercafe")}
            disabled={loading.cybercafe}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-full transition disabled:opacity-75 flex items-center justify-center gap-2"
          >
            {loading.cybercafe ? (
              <span className="inline-block animate-spin">↻</span>
            ) : (
              "Go to Cyber Cafe"
            )}
          </button>
        </motion.div>
        
        {/* Sales Tracker Card */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 flex flex-col items-center min-w-[280px]"
        >
          <FaCashRegister className="text-5xl text-yellow-600 dark:text-yellow-400 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Sales & Services Tracker</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
            Track sales, services offered, and monitor revenue and transactions.
          </p>
          <button
            onClick={() => handleNavigation("/sales", "sales")}
            disabled={loading.sales}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium px-6 py-2 rounded-full transition disabled:opacity-75 flex items-center justify-center gap-2"
          >
            {loading.sales ? (
              <span className="inline-block animate-spin">↻</span>
            ) : (
              "Go to Sales Tracker"
            )}
          </button>
        </motion.div>

        {/* Expenses Tracker Card */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 flex flex-col items-center min-w-[280px]"
        >
          <FaReceipt className="text-5xl text-red-600 dark:text-red-400 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Expenses Tracker</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
            Track business expenses, categorize costs, and monitor spending patterns.
          </p>
          <button
            onClick={() => handleNavigation("/expenses", "expenses")}
            disabled={loading.expenses}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2 rounded-full transition disabled:opacity-75 flex items-center justify-center gap-2"
          >
            {loading.expenses ? (
              <span className="inline-block animate-spin">↻</span>
            ) : (
              "Go to Expenses"
            )}
          </button>
        </motion.div>
      </main>

      <footer className="mt-16 flex gap-6 flex-wrap items-center justify-center text-gray-500 text-sm">
        <span>© {new Date().getFullYear()} Electronics & Cyber Cafe Management</span>
        <a
          href="https://nextjs.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Built with Next.js
        </a>
      </footer>
    </div>
  );
}
