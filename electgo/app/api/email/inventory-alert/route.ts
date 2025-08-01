import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { email, alerts } = await request.json();

    if (!email || !alerts || !Array.isArray(alerts)) {
      return NextResponse.json(
        { error: 'Email and alerts array are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email service is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return NextResponse.json(
        { error: 'Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env.local' },
        { status: 500 }
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Generate inventory alert email content
    const emailContent = generateInventoryAlertContent(alerts);

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"CyberSmater Alerts" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Inventory Alert - Low Stock Items',
      html: emailContent,
    });

    return NextResponse.json({ message: 'Inventory alert sent successfully' });
  } catch (error) {
    console.error('Error sending inventory alert:', error);
    return NextResponse.json(
      { error: 'Failed to send inventory alert' },
      { status: 500 }
    );
  }
}

function generateInventoryAlertContent(alerts: any[]): string {
  const baseStyle = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f9fafb; }
      .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      .alert-item { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px; }
      .critical { background: #fee2e2; border-left: 4px solid #ef4444; }
      .warning { background: #fef3c7; border-left: 4px solid #f59e0b; }
      .info { background: #dbeafe; border-left: 4px solid #3b82f6; }
      .alert-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .alert-table th, .alert-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
      .alert-table th { background: #f3f4f6; font-weight: bold; }
      .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
      .status-out { background: #fee2e2; color: #dc2626; }
      .status-low { background: #fef3c7; color: #d97706; }
      .status-ok { background: #d1fae5; color: #059669; }
    </style>
  `;

  const getStatusClass = (quantity: number, threshold: number) => {
    if (quantity === 0) return 'status-out';
    if (quantity <= threshold) return 'status-low';
    return 'status-ok';
  };

  const getStatusText = (quantity: number, threshold: number) => {
    if (quantity === 0) return 'OUT OF STOCK';
    if (quantity <= threshold) return 'LOW STOCK';
    return 'IN STOCK';
  };

  const alertRows = alerts.map(alert => `
    <tr>
      <td>${alert.itemName}</td>
      <td>${alert.currentQuantity}</td>
      <td>${alert.threshold}</td>
      <td><span class="status ${getStatusClass(alert.currentQuantity, alert.threshold)}">${getStatusText(alert.currentQuantity, alert.threshold)}</span></td>
      <td>${alert.category || 'N/A'}</td>
    </tr>
  `).join('');

  return `
    ${baseStyle}
    <div class="container">
      <div class="header">
        <h1>🚨 Inventory Alert</h1>
        <p>Low Stock Items Detected</p>
      </div>
      <div class="content">
        <div class="alert-item">
          <h2>Inventory Status Update</h2>
          <p>The following items require your attention due to low stock levels:</p>
        </div>
        
        <table class="alert-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Current Quantity</th>
              <th>Threshold</th>
              <th>Status</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            ${alertRows}
          </tbody>
        </table>
        
        <div class="alert-item">
          <h3>Recommended Actions:</h3>
          <ul>
            <li>Review items marked as "OUT OF STOCK" and restock immediately</li>
            <li>Plan restocking for items marked as "LOW STOCK"</li>
            <li>Update inventory records after restocking</li>
            <li>Consider adjusting reorder thresholds based on sales patterns</li>
          </ul>
        </div>
      </div>
      <div class="footer">
        <p>This alert was generated by CyberSmater Business Management System</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
    </div>
  `;
} 