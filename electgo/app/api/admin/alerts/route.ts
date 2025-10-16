import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '../../../../app/lib/prisma';
import type { Prisma } from '@prisma/client';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Helper function to build alert query conditions
    function buildAdminAlertWhereClause(): Prisma.AlertWhereInput {
      return {
        OR: [
          { audience: { equals: 'ALL' } },
          { audience: { equals: 'ADMIN' } },
          { userId: null }
        ]
      };
    }

    // simple pagination from query params
    const url = new URL(request.url);
    const limit = Math.min(100, Number(url.searchParams.get('limit') || '50'));
    const offset = Math.max(0, Number(url.searchParams.get('offset') || '0'));

    // Fetch alerts from database targeted to admins or global (ALL) or legacy system-wide (userId == null)
    const alerts = await prisma.alert.findMany({
      where: buildAdminAlertWhereClause(),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      take: limit,
      skip: offset
    });

    return NextResponse.json(alerts);

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { type, message } = await request.json();

    if (!type || !message) {
      return new NextResponse(
        JSON.stringify({ error: 'Type and message are required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create new alert in the database. Default audience is ALL for admin-created alerts.
    const newAlertData: any = {
      type: type,
      audience: 'ALL',
      message: message,
      userId: session.user?.id,
      read: false
    };

    const newAlert = await prisma.alert.create({
      data: newAlertData,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(newAlert, { status: 201 });

  } catch (error) {
    console.error('Error creating alert:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
