import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  // Check authentication and authorization
  if (!session || !session.user || !canViewInventory(session.user.role as any)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    // If no query parameter or query is too short, return empty array
    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Search for products that match the query (case-insensitive)
    const products = await prisma.product.findMany({
      where: {
        AND: [
          { NOT: { category: 'Service' } }, // Exclude services
          {
            OR: [
              { name: { contains: query } },
              { category: { contains: query } }
            ]
          }
        ]
      },
      take: 10, // Limit to 10 suggestions
      orderBy: { name: 'asc' }
    });

    // Also search legacy inventory items if needed
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { category: { contains: query } }
        ]
      },
      take: 5, // Limit legacy items
      orderBy: { name: 'asc' }
    });

    // Map inventory items to match product structure
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

    // Combine and return results
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

function canViewInventory(role: string): boolean {
  // Allow users with 'admin', 'manager', or 'inventory' roles to view inventory
  const allowedRoles = ['admin', 'manager', 'inventory'];
  return allowedRoles.includes(role);
}

