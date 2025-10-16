import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { canManageInventory, canDeleteInventory, canViewInventory } from "../lib/roleUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  
  // Handle suggestions endpoint
  if (query !== null) {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !canViewInventory(session.user.role as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      if (query.length < 2) {
        return NextResponse.json([]);
      }

      // Search logic from above
      const products = await prisma.product.findMany({
        where: {
          AND: [
            { NOT: { category: 'Service' } },
            {
              OR: [
                { name: { contains: query } },
                { category: { contains: query } }
              ]
            }
          ]
        },
        take: 10,
        orderBy: { name: 'asc' }
      });

      const inventoryItems = await prisma.inventoryItem.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { category: { contains: query } }
          ]
        },
        take: 5,
        orderBy: { name: 'asc' }
      });

      const mappedInventoryItems = inventoryItems.map(ii => ({
        id: ii.id,
        name: ii.name,
        category: ii.category ?? 'Uncategorized',
        quantity: ii.quantity ?? 0,
        unitPrice: Number(ii.unitPrice ?? 0),
        buyingPrice: 0,
        status: ii.status ?? 'IN_STOCK',
        _source: 'inventoryItem'
      }));

      const suggestions = [
        ...products.map(p => ({ ...p, _source: 'product' })),
        ...mappedInventoryItems
      ];

      return NextResponse.json(suggestions);

    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return NextResponse.json(
        { error: "Failed to fetch suggestions" },
        { status: 500 }
      );
    }
  }

  // If not a suggestions query, return all products and inventory items
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !canViewInventory(session.user.role as any)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Filter out service items (category = 'Service') from product table
    const products = await prisma.product.findMany({
      where: { NOT: { category: 'Service' } }
    });

    // Also fetch legacy/alternate InventoryItem records (some flows update this model)
    const inventoryItems = await prisma.inventoryItem.findMany();

    // Normalize InventoryItem to Product-like shape so the frontend receives a unified list
    const mappedInventoryItems = inventoryItems.map(ii => ({
      id: ii.id,
      name: ii.name,
      category: ii.category ?? 'Uncategorized',
      quantity: ii.quantity ?? 0,
      unitPrice: Number(ii.unitPrice ?? 0),
      buyingPrice: 0, // InventoryItem model doesn't have buyingPrice in schema; default to 0
      status: ii.status ?? 'IN_STOCK',
      // mark source to help debugging on UI if needed
      _source: 'inventoryItem'
    }));

    const unified = [
      ...products.map(p => ({ ...p, _source: 'product' })),
      ...mappedInventoryItems
    ];

    return NextResponse.json(unified);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { name, category, quantity, unitPrice, buyingPrice } = await request.json();

    if (!name || !category || quantity === undefined || unitPrice === undefined || buyingPrice === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        category,
        quantity: parseInt(quantity),
        unitPrice: parseFloat(unitPrice),
        buyingPrice: parseFloat(buyingPrice),
        status: parseInt(quantity) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If non-manager tries to update, block here
  if (!canManageInventory(session.user.role as any)) {
    return NextResponse.json({ error: "Insufficient privileges" }, { status: 403 });
  }

  try {
    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing product ID" },
        { status: 400 }
      );
    }

    let updatePayload: any = { ...updateData };
    if (updatePayload.unitPrice !== undefined) updatePayload.unitPrice = parseFloat(updatePayload.unitPrice);
    if (updatePayload.buyingPrice !== undefined) updatePayload.buyingPrice = parseFloat(updatePayload.buyingPrice);
    if (updatePayload.quantity !== undefined) updatePayload.quantity = parseInt(updatePayload.quantity);

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: updatePayload,
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !canDeleteInventory(session.user.role as any)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: "Missing product ID" },
        { status: 400 }
      );
    }

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