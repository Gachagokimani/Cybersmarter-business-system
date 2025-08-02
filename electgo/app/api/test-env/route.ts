import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    emailUser: process.env.EMAIL_USER ? 'SET' : 'NOT SET',
    emailPassword: process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET',
    emailService: process.env.EMAIL_SERVICE || 'gmail',
    emailFrom: process.env.EMAIL_FROM || 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
    message: 'Check the values above to see if your .env.local file is being loaded correctly'
  });
} 