"use client";
import { useState } from "react";
import { FaEnvelope, FaCheck, FaTimes, FaArrowLeft } from "react-icons/fa";
import Link from "next/link";
import EmailSettings from "../components/EmailSettings";
import Spinner from "../components/Spinner";

export default function EmailTestPage() {
  const [showEmailSettings, setShowEmailSettings] = useState(false);

  return (
    <div className="p-8 max-w-4xl mx-auto bg-sea-blue min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <FaArrowLeft /> Back to Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold mt-4">
          <FaEnvelope className="inline mr-2" /> Email Functionality Test
        </h1>
        <p className="text-gray-600 mt-2">
          Test and verify your nodemailer email configuration
        </p>
      </div>

      {/* Setup Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-yellow-800 mb-3">Setup Required</h2>
        <div className="space-y-3 text-sm text-yellow-700">
          <p><strong>1. Create Environment File:</strong> Create a `.env.local` file in the electgo directory with:</p>
          <pre className="bg-yellow-100 p-3 rounded text-xs overflow-x-auto">
{`EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
EMAIL_SERVICE=gmail
EMAIL_FROM=CyberSmater Reports <your-email@gmail.com>`}
          </pre>
          
          <p><strong>2. Gmail Setup:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Enable 2-Factor Authentication on your Google Account</li>
            <li>Generate an App Password (Google Account → Security → App passwords)</li>
            <li>Use the 16-character app password in your .env.local file</li>
          </ul>
          
          <p><strong>3. Restart Development Server:</strong> After creating .env.local, restart your dev server</p>
        </div>
      </div>

      {/* Email Settings Component */}
      <div className="mb-8">
        <button
          onClick={() => setShowEmailSettings(!showEmailSettings)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded flex items-center gap-2"
        >
          <FaEnvelope />
          {showEmailSettings ? 'Hide Email Settings' : 'Show Email Settings'}
        </button>
      </div>

      {showEmailSettings && (
        <div className="mb-8">
          <EmailSettings />
        </div>
      )}

      {/* Test Results */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Test Results</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-gray-300"></div>
            <span>Email service configuration</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-gray-300"></div>
            <span>Test email functionality</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-gray-300"></div>
            <span>Inventory alert emails</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-gray-300"></div>
            <span>Sales report emails</span>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Next Steps</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Configure your .env.local file with Gmail credentials</li>
            <li>• Restart your development server</li>
            <li>• Use the Email Settings above to test email functionality</li>
            <li>• Check your email inbox for test messages</li>
            <li>• Once working, you can use email features throughout the app</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 