import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { email, reportData } = await request.json();

    if (!email || !reportData) {
      return NextResponse.json(
        { error: 'Email and report data are required' },
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

    // Create transporter (you'll need to configure this with your email service)
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Create email content
    const emailContent = `
      <h2>Sales Report</h2>
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <tr>
          <th style="padding: 8px;">Date</th>
          <th style="padding: 8px;">Item</th>
          <th style="padding: 8px;">Price</th>
          <th style="padding: 8px;">Quantity</th>
          <th style="padding: 8px;">Total</th>
        </tr>
        ${reportData.map((sale: any) => `
          <tr>
            <td style="padding: 8px;">${sale.date}</td>
            <td style="padding: 8px;">${sale.item}</td>
            <td style="padding: 8px;">KES ${sale.price}</td>
            <td style="padding: 8px;">${sale.quantity}</td>
            <td style="padding: 8px;">KES ${sale.price * sale.quantity}</td>
          </tr>
        `).join('')}
      </table>
      <p><strong>Total Revenue: KES ${reportData.reduce((sum: number, sale: any) => sum + (sale.price * sale.quantity), 0)}</strong></p>
    `;

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"CyberSmater Reports" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Sales Report',
      html: emailContent,
    });

    return NextResponse.json({ message: 'Report sent successfully' });
  } catch (error) {
    console.error('Error sending report:', error);
    return NextResponse.json(
      { error: 'Failed to send report' },
      { status: 500 }
    );
  }
} 