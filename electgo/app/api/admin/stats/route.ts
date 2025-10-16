import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an admin
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch all stats in parallel
    const [
      totalUsers,
      activeProducts,
      monthlySales,
      activeSessions,
      databaseStats,
      pendingApprovals
    ] = await Promise.all([
      // Total users count
      prisma.user.count(),
      
      // Active products count
      prisma.product.count({
        where: { status: 'IN_STOCK' }
      }),
      
      // Monthly sales total (example: last 30 days)
      prisma.sale.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        },
        _sum: {
          price: true
        }
      }),
      
      // Active sessions (simplified - in a real app, you'd track this differently)
      prisma.session.count({
        where: {
          expires: {
            gt: new Date()
          }
        }
      }),
      
      // Database size and uptime (cross-database)
      (async () => {
        const dbUrl = process.env.DATABASE_URL || '';
        if (dbUrl.includes('sqlite')) {
          // SQLite: Get file name (size can be checked with fs if needed)
          return Promise.resolve([{ size: 'N/A', uptime: 'N/A' }]);
        } else if (dbUrl.includes('postgres')) {
           } else if (dbUrl.includes('mysql')) {
          // MySQL
          return await prisma.$queryRaw`SELECT CONCAT(ROUND(SUM(data_length + index_length) / 1024 / 1024, 2), ' MB') AS size, 'N/A' as uptime FROM information_schema.tables WHERE table_schema = DATABASE();`;
        } else {
          // Unknown DB
          return Promise.resolve([{ size: 'N/A', uptime: 'N/A' }]);
        }
      })(),
      
      // Pending staff approvals
      prisma.user.count({
        where: { 
          isActive: false,
          approvalToken: { not: null },
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)) // Last 7 days
          }
        }
      })
    ]);

    // Calculate system health (simplified example)
    const systemHealth = Math.min(
      100,
      Math.floor(Math.random() * 20) + 80 // Random value between 80-100 for demo
    );

    // Calculate storage used (simplified example)
    const storageUsed = Math.min(
      100,
      Math.floor(Math.random() * 30) + 60 // Random value between 60-90 for demo
    );

    // Format uptime
    const dbStatsArr = databaseStats as any[];
    let uptime = '0d 0h 0m';
if (Array.isArray(databaseStats) && databaseStats.length > 0 && typeof databaseStats[0].uptime === 'string') {
  uptime = databaseStats[0].uptime;
}    // Format database size
    let databaseSize = '0 MB';
if (Array.isArray(dbStatsArr) && dbStatsArr.length > 0 && typeof dbStatsArr[0].size === 'string') {
  databaseSize = dbStatsArr[0].size;
}
    return NextResponse.json({
      totalUsers,
      activeProducts,
      monthlySales: monthlySales?._sum?.price || 0,
      systemHealth,
      activeSessions,
      storageUsed,
      responseTime: Math.floor(Math.random() * 50) + 50, // Random response time in ms
      databaseSize,
      uptime: typeof uptime === 'string' ? uptime : '0d 0h 0m',
      pendingApprovals
    });

  } catch (error) {
    console.error('Error fetching system stats:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch system stats' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
