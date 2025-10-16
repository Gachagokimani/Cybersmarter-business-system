import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'STAFF') {
    return NextResponse.json([], { status: 401 });
  }
  // Fetch inventory actions performed by this staff
  const actions = await prisma.inventoryAction.findMany({
    where: { userId: session.user.id },
    select: { id: true, itemName: true, action: true, quantity: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(actions);
}
