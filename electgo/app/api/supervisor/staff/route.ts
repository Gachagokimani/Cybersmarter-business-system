import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (!role || !["MANAGER", "ADMIN", "SUPERVISOR"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supervisorId = session.user.id;
  const staff = await prisma.user.findMany({
    where: {
      supervisorId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      workId: true,
      email: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(staff);
} 