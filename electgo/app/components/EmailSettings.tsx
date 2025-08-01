"use client";
import { useState } from "react";
import { FaEnvelope, FaCog, FaFlask, FaCheck, FaTimes } from "react-icons/fa";
import Spinner from "./Spinner";

interface EmailSettingsProps {
  onClose?: () => void;
}

export default function EmailSettings({ onClose }: EmailSettingsProps) {
  const [email, setEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const testEmail = async () => {
    if (!email) {
      setTestResult({ success: false, message: "Please enter an email address" });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: 'Test Email - CyberSmater',
          type: 'notification',
          data: {
            title: 'Email Test Successful',
            message: 'This is a test email to verify that your email configuration is working correctly. If you received this email, your nodemailer setup is functioning properly.'
          }
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: 'Test email sent successfully! Check your inbox.' });
      } else {
        setTestResult({ success: false, message: result.error || 'Failed to send test email' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Network error. Please check your connection.' });
    } finally {
      setIsTesting(false);
    }
  };

  const sendInventoryAlert = async () => {
    if (!email) {
      setTestResult({ success: false, message: "Please enter an email address" });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/email/inventory-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          alerts: [
            {
              itemName: "Sample Product 1",
              currentQuantity: 0,
              threshold: 5,
              category: "Electronics"
            },
            {
              itemName: "Sample Product 2", 
              currentQuantity: 2,
              threshold: 5,
              category: "Office Supplies"
            },
            {
              itemName: "Sample Product 3",
              currentQuantity: 8,
              threshold: 5,
              category: "Accessories"
            }
          ]
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResult({ success: true, message: 'Inventory alert email sent successfully! Check your inbox.' });
      } else {
        setTestResult({ success: false, message: result.error || 'Failed to send inventory alert' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Network error. Please check your connection.' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FaEnvelope className="text-blue-600" />
          Email Settings
        </h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FaCog className="text-xl" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Email Address</label>
          <input
            type="email"
            placeholder="Enter email for testing"
            className="w-full border rounded px-3 py-2 dark:bg-gray-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={testEmail}
            disabled={isTesting || !email}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isTesting ? (
              <>
                <Spinner /> Testing...
              </>
            ) : (
              <>
                <FaFlask /> Test Email
              </>
            )}
          </button>
          
          <button
            onClick={sendInventoryAlert}
            disabled={isTesting || !email}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isTesting ? (
              <>
                <Spinner /> Sending...
              </>
            ) : (
              <>
                <FaEnvelope /> Test Alert
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            testResult.success 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {testResult.success ? (
              <FaCheck className="text-green-600" />
            ) : (
              <FaTimes className="text-red-600" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {showSettings && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold mb-3">Email Configuration</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Service:</strong> Gmail (configured in .env.local)</p>
              <p><strong>From Address:</strong> CyberSmater Reports</p>
              <p><strong>Features:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Sales Reports</li>
                <li>Inventory Alerts</li>
                <li>General Notifications</li>
                <li>Daily Summaries</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-500 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded"
        >
          Close
        </button>
      )}
    </div>
  );
} 