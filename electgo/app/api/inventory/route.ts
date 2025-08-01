import { NextResponse } from "next/server";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Filter out service items (category = 'Service') from inventory
    const products = await prisma.product.findMany({
      where: {
        NOT: {
          category: 'Service'
        }
      }
    });
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, category, quantity, unitPrice, buyingPrice } = await request.json();

    const newProduct = await prisma.product.create({
      data: {
        name,
        category,
        quantity,
        unitPrice,
        buyingPrice: buyingPrice || null,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...updateData } = await request.json();

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    
    // First check if record exists
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    });

    if (!product) {
      return NextResponse.json({ 
        message: "Product not found or already deleted" 
      });
    }

    // Auto-delete if invalid
    if (product.quantity < 0 || !product.name) {
      await prisma.product.delete({ where: { id: parseInt(id) } });
      return NextResponse.json({ 
        message: "Invalid product auto-deleted" 
      });
    }

    // Normal deletion for valid records
    await prisma.product.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: "Product deleted successfully" });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: "Deletion failed" },
      { status: 500 }
    );
  }
} 