import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (!role || !["MANAGER", "ADMIN", "SUPERVISOR"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supervisorId = session.user.id;
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
      approvalToken: null,
      approvalTokenExpires: null,
    },
  });
  return NextResponse.json({ message: "Staff approved and activated." });
} 