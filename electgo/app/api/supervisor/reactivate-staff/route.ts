import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== "MANAGER" && session.user?.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supervisorId = session.user?.id;
  const { staffId } = await req.json();
  const staff = await prisma.user.findFirst({
    where: {
      id: staffId,
      supervisorId,
      isActive: false,
    },
  });
  if (!staff) {
    return NextResponse.json({ error: "Staff not found or already active" }, { status: 404 });
  }
  await prisma.user.update({
    where: { id: staffId },
    data: {
      isActive: true,
    },
  });
  return NextResponse.json({ message: "Staff reactivated." });
}