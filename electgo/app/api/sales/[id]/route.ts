import { NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params promise
    const { id: idParam } = await params;
    
    // Validate ID parameter
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid ID parameter" },
        { status: 400 }
      );
    }

    // Check if record exists first
    const sale = await prisma.transaction.findUnique({
      where: { id },
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
      await prisma.transaction.delete({ where: { id } });
      return NextResponse.json({ 
        message: "Invalid sale auto-deleted" 
      });
    }

    // Normal deletion for valid records
    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ message: "Sale deleted successfully" });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: "Failed to delete sale" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}