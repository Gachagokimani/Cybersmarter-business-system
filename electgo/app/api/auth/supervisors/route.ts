import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const supervisors = await prisma.user.findMany({
    where: {
      OR: [
        { role: "SUPERVISOR" },
        { role: "ADMIN" },
      ],
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(supervisors);
} 