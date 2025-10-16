import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get basic stats
    const productCount = await prisma.product.count();
    const transactionCount = await prisma.transaction.count();
    const expenseCount = await prisma.expense.count();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      stats: {
        products: productCount,
        transactions: transactionCount,
        expenses: expenseCount
      }
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error?.message || 'Unknown error'
    }, { status: 500 });
  }
} 