import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { canCreateSale, canDeleteSale, canManageSales, canViewSales, type UserRole } from "../lib/roleUtils";

interface Sale {
  id: number;
  item: string;
  price: number; // Required number type
  quantity: number;
  date: string;
  buyingPrice?: number;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session || !session.user || !role || !canViewSales(role as UserRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const sales = await prisma.transaction.findMany({
      where: { type: 'SALE' },
      select: {
        id: true,
        quantity: true,
        timestamp: true,
        chargedPrice: true,
        product: {
          select: {
            name: true,
            unitPrice: true,
            buyingPrice: true,
          }
        }
      }
    });

    // Validate and transform data
    const validatedSales: Sale[] = sales.map(sale => {
      const productName = sale.product?.name || "Unknown Item";
      const price = (sale.chargedPrice ?? null) != null
        ? Number(sale.chargedPrice)
        : (sale.product?.unitPrice ?? 0);
      const timestamp = sale.timestamp instanceof Date ? sale.timestamp : (sale as any).timestamp ? new Date((sale as any).timestamp) : null;
      const dateStr = timestamp && !isNaN(timestamp.getTime())
        ? timestamp.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const buyingPrice = Number(sale.product?.buyingPrice ?? 0);
      return ({
        id: sale.id,
        item: productName,
        price: price,
        quantity: sale.quantity,
        date: dateStr,
        buyingPrice,
      });
    });

    return NextResponse.json(validatedSales);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Database operation failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role2 = session?.user?.role;
  if (!session || !session.user || !role2 || !canCreateSale(role2 as UserRole)) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
  try {
    const { item, price, quantity, date, runningCost } = await request.json();

    if (!item || price === undefined || quantity === undefined || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Define service items that should not affect inventory
    const serviceItems = [
      "Internet Time (per hour)",
      "Photocopying B/W",
      "Photocopying Colour", 
      "Printing B/W",
      "Printing Colour",
      "Software Installation",
      "Data Recovery",
      "Network Setup",
      "KRA iTax",
      "eCitizen",
      "NTSA Services",
      "Social Health Authority (SHA)",
      "Printing Services",
      "Internet Access",
      "Scanning Services",
      "Passport Application",
      "Passport Photo",
      "KRA PIN retrieval",
      "Business Registration",
      "sim replacement/registration",
      "Other Service"
    ];

    const isService = serviceItems.includes(item);

    if (isService) {
      // For services: Create or find a service product (with 0 quantity)
      let serviceProduct = await prisma.product.findFirst({
        where: { name: item }
      });

      if (!serviceProduct) {
        // Create a service product with 0 quantity (doesn't affect inventory)
        serviceProduct = await prisma.product.create({
          data: {
            name: item,
            category: 'Service',
            quantity: 0, // Services don't have physical inventory
            unitPrice: parseFloat(price),
            status: 'IN_STOCK'
          }
        });
      } else {
        // Update service price if different
        if (serviceProduct.unitPrice !== parseFloat(price)) {
          serviceProduct = await prisma.product.update({
            where: { id: serviceProduct.id },
            data: { unitPrice: parseFloat(price) }
          });
        }
      }

      // Create the sale transaction for service
      const sale = await prisma.transaction.create({
        data: {
          productId: serviceProduct.id,
          quantity: parseInt(quantity),
          chargedPrice: parseFloat(price), // Store the actual charged price
          type: 'SALE',
          timestamp: new Date(date)
        },
        include: {
          product: true
        }
      });

      // Transform the response for services
      const transformedSale = {
        id: sale.id,
        item: sale.product.name,
        price: parseFloat(price), // Use the actual charged price (includes discount)
        quantity: sale.quantity,
        date: sale.timestamp.toISOString().split('T')[0],
        // Echo runningCost back (not persisted) to enable UI/report profit calculations
        runningCost: typeof runningCost === 'number' ? runningCost : (runningCost ? Number(runningCost) : 0),
      };

      // Calculate updated revenue after adding sale
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
        sale: transformedSale,
        revenue: {
          grossRevenue: totalSalesRevenue,
          totalExpenses: totalExpenses,
          netRevenue: netRevenue
        }
      }, { status: 201 });
    } else {
      // For inventory items: Find existing product and deduct from inventory
      const product = await prisma.product.findFirst({
        where: { name: item }
      });

      if (!product) {
        return NextResponse.json(
          { error: "Item not found in inventory" },
          { status: 404 }
        );
      }

      // Check if enough inventory is available
      if (product.quantity < parseInt(quantity)) {
        return NextResponse.json(
          { error: `Insufficient inventory. Available: ${product.quantity}, Requested: ${quantity}` },
          { status: 400 }
        );
      }

      // Deduct from inventory
      const updatedProduct = await prisma.product.update({
        where: { id: product.id },
        data: { 
          quantity: product.quantity - parseInt(quantity),
          status: (product.quantity - parseInt(quantity)) <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK'
        }
      });

      // Create the sale transaction
      const sale = await prisma.transaction.create({
        data: {
          productId: product.id,
          quantity: parseInt(quantity),
          chargedPrice: parseFloat(price), // Store the actual charged price
          type: 'SALE',
          timestamp: new Date(date)
        },
        include: {
          product: true
        }
      });

      // Transform the response to match frontend expectations
      const transformedSale = {
        id: sale.id,
        item: sale.product.name,
        price: parseFloat(price), // Use the actual charged price (includes discount)
        quantity: sale.quantity,
        date: sale.timestamp.toISOString().split('T')[0]
      };

      // Calculate updated revenue after adding sale
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
        sale: transformedSale,
        revenue: {
          grossRevenue: totalSalesRevenue,
          totalExpenses: totalExpenses,
          netRevenue: netRevenue
        }
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role3 = session?.user?.role;
  if (!session || !session.user || !role3 || !canManageSales(role3 as UserRole)) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
  try {
    const { id, item, price, quantity, date } = await request.json();

    if (!id || !item || price === undefined || quantity === undefined || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: { product: true }
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Sale not found" },
        { status: 404 }
      );
    }

    // Update the product if the item name changed
    if (transaction.product.name !== item) {
      let product = await prisma.product.findFirst({
        where: { name: item }
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            name: item,
            category: 'Service',
            quantity: 0,
            unitPrice: parseFloat(price),
            status: 'IN_STOCK'
          }
        });
      }

      // Update the transaction with new product and charged price
      await prisma.transaction.update({
        where: { id: parseInt(id) },
        data: {
          productId: product.id,
          quantity: parseInt(quantity),
          chargedPrice: parseFloat(price), // Store the actual charged price
          timestamp: new Date(date)
        }
      });
    } else {
      // Update the transaction with same product but new charged price
      await prisma.transaction.update({
        where: { id: parseInt(id) },
        data: {
          quantity: parseInt(quantity),
          chargedPrice: parseFloat(price), // Store the actual charged price
          timestamp: new Date(date)
        }
      });

      // Update the product price if it changed (for reference)
      if (transaction.product.unitPrice !== parseFloat(price)) {
        await prisma.product.update({
          where: { id: transaction.productId },
          data: { unitPrice: parseFloat(price) }
        });
      }
    }

    return NextResponse.json({ message: "Sale updated successfully" });
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json(
      { error: "Failed to update sale" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role4 = session?.user?.role;
  if (!session || !session.user || !role4 || !canDeleteSale(role4 as UserRole)) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: "Missing sale ID" },
        { status: 400 }
      );
    }
    
    // First check if record exists and is invalid
    const sale = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: { product: true }
    });

    if (!sale) {
      return NextResponse.json(
        { error: "Sale not found" },
        { status: 404 }
      );
    }

    // Auto-delete if invalid
    if (sale.quantity <= 0 || !sale.product) {
      await prisma.transaction.delete({ where: { id: parseInt(id) } });
      return NextResponse.json({ 
        message: "Invalid sale auto-deleted" 
      });
    }

    // Normal deletion for valid records
    await prisma.transaction.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: "Sale deleted successfully" });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: "Deletion failed" },
      { status: 500 }
    );
  }
}