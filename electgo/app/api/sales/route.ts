import { NextResponse } from "next/server";
import { PrismaClient } from "../../generated/prisma"; // Correct path

const prisma = new PrismaClient().$extends({
  query: {
    transaction: {
      async create({ args, query }) {
        // Validate before creation
        if (args.data.quantity <= 0) {
          throw new Error("Quantity must be positive");
        }
        return query(args);
      }
    }
  }
});

interface Sale {
  id: number;
  item: string;
  price: number; // Required number type
  quantity: number;
  date: string;
}

export async function GET() {
  try {
    const sales = await prisma.transaction.findMany({
      where: { type: 'SALE' },
      include: { product: true }
    });

    // Validate and transform data
    const validatedSales = sales.map(sale => ({
      id: sale.id,
      item: sale.product?.name || "Unknown Item", // Fallback
      price: sale.chargedPrice || sale.product?.unitPrice || 0, // Use charged price if available, fallback to unit price
      quantity: sale.quantity,
      date: sale.timestamp.toISOString().split('T')[0]
    }));

    return NextResponse.json(validatedSales);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Database operation failed" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  try {
    const { item, price, quantity, date } = await request.json();

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
      "Business Registration"
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
            unitPrice: price,
            status: 'IN_STOCK'
          }
        });
      } else {
        // Update service price if different
        if (serviceProduct.unitPrice !== price) {
          serviceProduct = await prisma.product.update({
            where: { id: serviceProduct.id },
            data: { unitPrice: price }
          });
        }
      }

      // Create the sale transaction for service
      const sale = await prisma.transaction.create({
        data: {
          productId: serviceProduct.id,
          quantity: quantity,
          chargedPrice: price, // Store the actual charged price
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
        price: price, // Use the actual charged price (includes discount)
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
      if (product.quantity < quantity) {
        return NextResponse.json(
          { error: `Insufficient inventory. Available: ${product.quantity}, Requested: ${quantity}` },
          { status: 400 }
        );
      }

      // Deduct from inventory
      const updatedProduct = await prisma.product.update({
        where: { id: product.id },
        data: { 
          quantity: product.quantity - quantity,
          status: (product.quantity - quantity) <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK'
        }
      });

      // Create the sale transaction
      const sale = await prisma.transaction.create({
        data: {
          productId: product.id,
          quantity: quantity,
          chargedPrice: price, // Store the actual charged price
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
        price: price, // Use the actual charged price (includes discount)
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

export async function PUT(request: Request) {
  try {
    const { id, item, price, quantity, date } = await request.json();

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
            unitPrice: price,
            status: 'IN_STOCK'
          }
        });
      }

      // Update the transaction with new product and charged price
      await prisma.transaction.update({
        where: { id: parseInt(id) },
        data: {
          productId: product.id,
          quantity: quantity,
          chargedPrice: price, // Store the actual charged price
          timestamp: new Date(date)
        }
      });
    } else {
      // Update the transaction with same product but new charged price
      await prisma.transaction.update({
        where: { id: parseInt(id) },
        data: {
          quantity: quantity,
          chargedPrice: price, // Store the actual charged price
          timestamp: new Date(date)
        }
      });

      // Update the product price if it changed (for reference)
      if (transaction.product.unitPrice !== price) {
        await prisma.product.update({
          where: { id: transaction.productId },
          data: { unitPrice: price }
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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id; // Get ID from route params
    
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