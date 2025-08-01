import { NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if record exists first
    const exists = await prisma.transaction.count({
      where: { id: parseInt(params.id) }
    });

    if (!exists) {
      return NextResponse.json(
        { warning: "Record already removed" }, // Different from error
        { status: 200 } // Still success status
      );
    }

    // Proceed with normal deletion
    await prisma.transaction.delete({
      where: { id: parseInt(params.id) }
    });

    return NextResponse.json({ message: "Sale deleted" });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: "Failed to delete valid record" },
      { status: 500 }
    );
  }
}