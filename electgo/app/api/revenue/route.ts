import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

// GET - Calculate net revenue (total sales - total expenses)
export async function GET() {
  try {
    // Get total sales revenue
    const sales = await prisma.transaction.findMany({
      where: { type: 'SALE' },
      select: {
        chargedPrice: true,
        quantity: true,
        product: {
          select: {
            name: true,
            unitPrice: true
          }
        }
      }
    });

    const totalSalesRevenue = sales.reduce((sum, sale) => {
      // Use chargedPrice if available, otherwise fall back to product unitPrice
      const price = sale.chargedPrice || sale.product?.unitPrice || 0;
      return sum + (price * sale.quantity);
    }, 0);

    console.log('Revenue API - Sales count:', sales.length);
    console.log('Revenue API - Sales details:', sales.map(s => ({
      price: s.chargedPrice || s.product?.unitPrice || 0,
      quantity: s.quantity,
      item: s.product?.name
    })));
    console.log('Revenue API - Total sales revenue:', totalSalesRevenue);

    // Get total expenses
    const expenses = await prisma.expense.findMany({
      select: {
        amount: true,
        quantity: true
      }
    });

    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + (expense.amount * expense.quantity);
    }, 0);

    console.log('Revenue API - Expenses count:', expenses.length);
    console.log('Revenue API - Total expenses:', totalExpenses);

    // Calculate net revenue
    const netRevenue = totalSalesRevenue - totalExpenses;

    console.log('Revenue API - Net revenue:', netRevenue);

    return NextResponse.json({
      grossRevenue: totalSalesRevenue,
      totalExpenses: totalExpenses,
      netRevenue: netRevenue
    });
  } catch (error) {
    console.error('Error calculating revenue:', error);
    return NextResponse.json(
      { error: 'Failed to calculate revenue' },
      { status: 500 }
    );
  }
} 