import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

// GET - Fetch all expenses
export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: {
        date: 'desc'
      }
    });
    
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// POST - Create new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item, amount, quantity, date, category } = body;

    if (!item || !amount || !date || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        item,
        amount: parseFloat(amount),
        quantity: parseInt(quantity) || 1,
        date,
        category
      }
    });

    // Calculate updated revenue after adding expense
    const sales = await prisma.transaction.findMany({
      where: { type: 'SALE' },
      select: {
        chargedPrice: true,
        quantity: true
      }
    });

    const totalSalesRevenue = sales.reduce((sum, sale) => {
      return sum + ((sale.chargedPrice || 0) * sale.quantity);
    }, 0);

    const expenses = await prisma.expense.findMany({
      select: {
        amount: true,
        quantity: true
      }
    });

    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + (expense.amount * expense.quantity);
    }, 0);

    const netRevenue = totalSalesRevenue - totalExpenses;

    return NextResponse.json({
      expense,
      revenue: {
        grossRevenue: totalSalesRevenue,
        totalExpenses: totalExpenses,
        netRevenue: netRevenue
      }
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}

// PUT - Update expense
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, item, amount, quantity, date, category } = body;

    if (!id || !item || !amount || !date || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        item,
        amount: parseFloat(amount),
        quantity: parseInt(quantity) || 1,
        date,
        category
      }
    });

    // Calculate updated revenue after updating expense
    const sales = await prisma.transaction.findMany({
      where: { type: 'SALE' },
      select: {
        chargedPrice: true,
        quantity: true
      }
    });

    const totalSalesRevenue = sales.reduce((sum, sale) => {
      return sum + ((sale.chargedPrice || 0) * sale.quantity);
    }, 0);

    const expenses = await prisma.expense.findMany({
      select: {
        amount: true,
        quantity: true
      }
    });

    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + (expense.amount * expense.quantity);
    }, 0);

    const netRevenue = totalSalesRevenue - totalExpenses;

    return NextResponse.json({
      expense,
      revenue: {
        grossRevenue: totalSalesRevenue,
        totalExpenses: totalExpenses,
        netRevenue: netRevenue
      }
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// DELETE - Delete expense
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing expense ID' },
        { status: 400 }
      );
    }

    await prisma.expense.delete({
      where: { id: parseInt(id) }
    });

    // Calculate updated revenue after deleting expense
    const sales = await prisma.transaction.findMany({
      where: { type: 'SALE' },
      select: {
        chargedPrice: true,
        quantity: true
      }
    });

    const totalSalesRevenue = sales.reduce((sum, sale) => {
      return sum + ((sale.chargedPrice || 0) * sale.quantity);
    }, 0);

    const expenses = await prisma.expense.findMany({
      select: {
        amount: true,
        quantity: true
      }
    });

    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + (expense.amount * expense.quantity);
    }, 0);

    const netRevenue = totalSalesRevenue - totalExpenses;

    return NextResponse.json({ 
      message: 'Expense deleted successfully',
      revenue: {
        grossRevenue: totalSalesRevenue,
        totalExpenses: totalExpenses,
        netRevenue: netRevenue
      }
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
} 