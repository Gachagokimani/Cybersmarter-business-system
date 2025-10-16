import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

export async function GET() {
  try {
    const testQuery = await prisma.$queryRaw`SELECT 1+1 as result`;
    return NextResponse.json({ success: true, testQuery });
  } catch (error: any) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Unknown error' 
    }, { status: 500 });
  }
} 