import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Define known services: intangible with variable running costs
const SERVICE_NAMES = new Set<string>([
  'Internet Time (per hour)',
  'Photocopying B/W',
  'Photocopying Colour',
  'Printing B/W',
  'Printing Colour',
  'Software Installation',
  'Data Recovery',
  'Network Setup',
  'KRA iTax',
  'eCitizen',
  'NTSA Services',
  'Social Health Authority (SHA)',
  'KRA PIN retrieval',
  'Internet Access',
  'Scanning Services',
  'Passport Application',
]);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      selectedUsers, 
      reportType = 'full', 
      reportData,
      customStartDate,
      customEndDate,
      customStartTime,
      customEndTime
    } = await request.json();

    if (!selectedUsers || selectedUsers.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one user to send the report to' },
        { status: 400 }
      );
    }

    // Debug: Check if environment variables are loaded
    console.log('Environment variables check:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
    console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET');
    console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'gmail');

    // Check if email credentials are configured
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

    // Filter sales data based on report type and custom timeline
    let filteredData = reportData;
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    if (reportType === 'custom' && customStartDate && customEndDate) {
      // Custom timeline filtering
      const startDateTime = new Date(`${customStartDate}T${customStartTime || '00:00'}`);
      const endDateTime = new Date(`${customEndDate}T${customEndTime || '23:59'}`);
      
      filteredData = reportData.filter((sale: any) => {
        const saleDateTime = new Date(sale.date);
        return saleDateTime >= startDateTime && saleDateTime <= endDateTime;
      });
    } else if (reportType === 'daily') {
      // FIXED: Current day's sales instead of yesterday's
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const todayEnd = new Date(today.setHours(23, 59, 59, 999));
      
      filteredData = reportData.filter((sale: any) => {
        const saleDateTime = new Date(sale.date);
        return saleDateTime >= todayStart && saleDateTime <= todayEnd;
      });
    } else if (reportType === 'monthly') {
      // Current month's sales (string prefix match to avoid timezone issues)
      const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      filteredData = reportData.filter((sale: any) => {
        const d = String(sale.date || '');
        return d.startsWith(monthPrefix);
      });
    }
    // 'full' report uses all data

    // Generate HTML report
    const totalAmount = filteredData.reduce((sum: number, sale: any) => sum + (sale.price * sale.quantity), 0);
    const reportTitle = reportType === 'daily' ? 'Daily Sales Report' : 
                       reportType === 'monthly' ? 'Monthly Sales Report' : 
                       reportType === 'custom' ? 'Custom Timeline Sales Report' : 'Full Sales Report';
    
    // Look up buying prices for items to compute per-sale profit
    const uniqueItems = Array.from(new Set((filteredData || []).map((s: any) => String(s.item || '')))).filter(Boolean);
    const productPricing = uniqueItems.length > 0
      ? await prisma.product.findMany({
          where: { name: { in: uniqueItems as string[] } },
          select: { name: true, buyingPrice: true }
        })
      : [];
    const nameToBuying: Record<string, number> = {};
    productPricing.forEach(p => { nameToBuying[p.name] = Number(p.buyingPrice) || 0; });

    const rowsWithProfit = filteredData.map((sale: any) => {
      const isService = SERVICE_NAMES.has(String(sale.item));
      const serviceRunningCost = isService ? (typeof sale.runningCost === 'number' ? sale.runningCost : (sale.runningCost ? Number(sale.runningCost) : 0)) : 0;
      const buying = isService ? serviceRunningCost : (nameToBuying[String(sale.item)] ?? 0);
      const unitProfit = Number(sale.price) - buying;
      const totalProfit = unitProfit * Number(sale.quantity || 0);
      return { ...sale, isService, buyingPrice: buying, unitProfit, totalProfit };
    });

    // Include services in profit totals using provided running cost (if any)
    const totalProfitAll = rowsWithProfit.reduce((sum: number, r: any) => sum + r.totalProfit, 0);

    const getReportPeriod = () => {
      if (reportType === 'custom' && customStartDate && customEndDate) {
        const startStr = new Date(`${customStartDate}T${customStartTime || '00:00'}`).toLocaleString();
        const endStr = new Date(`${customEndDate}T${customEndTime || '23:59'}`).toLocaleString();
        return `${startStr} to ${endStr}`;
      } else if (reportType === 'daily') {
        // FIXED: Return today's date instead of yesterday's
        return today.toLocaleDateString();
      } else if (reportType === 'monthly') {
        return `${today.toLocaleString('default', { month: 'long' })} ${currentYear}`;
      }
      return 'All Time';
    };

    // Basic counts for legend
    const serviceCount = rowsWithProfit.filter(r => r.isService).length;
    const productCount = rowsWithProfit.length - serviceCount;

    // IMPROVED: Enhanced styling with system colors and better formatting + service badges
    const htmlTable = `
      <table style="border-collapse: collapse; width: 100%; margin-top: 20px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <thead>
          <tr style="background: linear-gradient(135deg, #4a90e2 0%, #2c5aa0 100%); color: white;">
            <th style="padding: 12px 16px; font-weight: 600; text-align: left; border-bottom: 2px solid #2c5aa0;">Date</th>
            <th style="padding: 12px 16px; font-weight: 600; text-align: left; border-bottom: 2px solid #2c5aa0;">Item</th>
            <th style="padding: 12px 16px; font-weight: 600; text-align: right; border-bottom: 2px solid #2c5aa0;">Selling Price</th>
            <th style="padding: 12px 16px; font-weight: 600; text-align: right; border-bottom: 2px solid #2c5aa0;">Buying Cost</th>
            <th style="padding: 12px 16px; font-weight: 600; text-align: center; border-bottom: 2px solid #2c5aa0;">Quantity</th>
            <th style="padding: 12px 16px; font-weight: 600; text-align: right; border-bottom: 2px solid #2c5aa0;">Revenue</th>
            <th style="padding: 12px 16px; font-weight: 600; text-align: right; border-bottom: 2px solid #2c5aa0;">Profit</th>
          </tr>
        </thead>
        <tbody>
          ${rowsWithProfit.map((r: any, index: number) => `
            <tr style="background-color: ${index % 2 === 0 ? '#f8fafc' : 'white'}; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 16px; color: #374151;">${r.date}</td>
              <td style="padding: 12px 16px; color: #374151; font-weight: 500;">
                ${r.item}
                ${r.isService ? '<span style="margin-left: 8px; background:#FEF3C7; color:#92400E; padding:2px 8px; border-radius:999px; font-size:12px; font-weight:600;">Service</span>' : '<span style="margin-left: 8px; background:#D1FAE5; color:#065F46; padding:2px 8px; border-radius:999px; font-size:12px; font-weight:600;">Product</span>'}
              </td>
              <td style="padding: 12px 16px; text-align: right; color: #374151; font-weight: 500;">KES ${Number(r.price).toLocaleString()}</td>
              <td style="padding: 12px 16px; text-align: right; color: #6b7280;">KES ${Number(r.buyingPrice).toLocaleString()}</td>
              <td style="padding: 12px 16px; text-align: center; color: #374151; font-weight: 500;">${r.isService ? '∞' : Number(r.quantity)}</td>
              <td style="padding: 12px 16px; text-align: right; color: #059669; font-weight: 600;">KES ${(Number(r.price) * Number(r.quantity)).toLocaleString()}</td>
              <td style="padding: 12px 16px; text-align: right; ${r.totalProfit >= 0 ? 'color:#059669' : 'color:#dc2626'}; font-weight: 600;">KES ${Number(r.totalProfit).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // IMPROVED: Enhanced email styling with system colors
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background: #ffffff; color: #374151;">
        <div style="background: linear-gradient(135deg, #4a90e2 0%, #2c5aa0 100%); padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${reportTitle}</h1>
        </div>
        
        <div style="padding: 24px; background: white;">
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #4a90e2;">
            <div style="display: flex; flex-wrap: wrap; gap: 20px;">
              <div style="flex: 1; min-width: 200px;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">REPORT PERIOD</p>
                <p style="margin: 0; color: #374151; font-size: 16px; font-weight: 600;">${getReportPeriod()}</p>
              </div>
              <div style="flex: 1; min-width: 200px;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">TOTAL TRANSACTIONS</p>
                <p style="margin: 0; color: #374151; font-size: 16px; font-weight: 600;">${filteredData.length} (Products: ${productCount}, Services: ${serviceCount})</p>
              </div>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-top: 16px;">
              <div style="flex: 1; min-width: 200px;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">TOTAL REVENUE</p>
                <p style="margin: 0; color: #059669; font-size: 18px; font-weight: 700;">KES ${totalAmount.toLocaleString()}</p>
              </div>
              <div style=\"flex: 1; min-width: 200px;\">
                <p style=\"margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;\">TOTAL PROFIT</p>
                <p style=\"margin: 0; color: ${totalProfitAll >= 0 ? '#059669' : '#dc2626'}; font-size: 18px; font-weight: 700;\">KES ${totalProfitAll.toLocaleString()}</p>
              </div>
            </div>
            <div style=\"margin-top: 12px; color:#6b7280; font-size: 13px;\">
              <p style=\"margin: 0;\">Note: Services are intangible with infinite availability; profit is computed as (Selling Price − Running Cost) × Quantity when a running cost is provided.</p>
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Report Generated: ${new Date().toLocaleString()}</p>
            </div>
          </div>

          ${htmlTable}
          
          <div style="margin-top: 32px; padding: 20px; background: #f8fafc; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              This is an automated report from <strong style="color: #4a90e2;">CyberSmater Inventory Management System</strong>
            </p>
            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
              Generated with ❤️ for better business insights
            </p>
          </div>
        </div>
      </div>
    `;

    // Send email to all selected users with HTML report
    const emailPromises = selectedUsers.map(async (userId: string) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true }
        });

        if (user?.email) {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"CyberSmater Reports" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `${reportTitle} - ${new Date().toLocaleDateString()}`,
            html: emailContent
          });
          return { userId, success: true, email: user.email };
        } else {
          return { userId, success: false, error: 'User email not found' };
        }
      } catch (error) {
        console.error(`Error sending email to user ${userId}:`, error);
        return { userId, success: false, error: 'Failed to send email' };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return NextResponse.json({ 
      message: `Report sent successfully to ${successful.length} users${failed.length > 0 ? `, failed to send to ${failed.length} users` : ''}`,
      successful,
      failed,
      reportStats: {
        totalSales: filteredData.length,
        totalRevenue: totalAmount,
        period: getReportPeriod(),
        services: serviceCount,
        products: productCount,
      }
    });
  } catch (error) {
    console.error('Error sending report:', error);
    return NextResponse.json(
      { error: 'Failed to send report' },
      { status: 500 }
    );
  }
} 