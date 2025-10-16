import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'STAFF') {
    return NextResponse.json([], { status: 401 });
  }
  const sales = await prisma.sale.findMany({
    where: { userId: session.user.id },
    select: { id: true, price: true, item: true, quantity: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(sales);
}
