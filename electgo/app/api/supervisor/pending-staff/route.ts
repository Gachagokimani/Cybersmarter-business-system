import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== "MANAGER" && session.user?.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supervisorId = session.user?.id;
  const pendingStaff = await prisma.user.findMany({
    where: {
      supervisorId,
      isActive: false,
      approvalToken: { not: null },
    },
    select: {
      id: true,
      name: true,
      workId: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(pendingStaff);
} 