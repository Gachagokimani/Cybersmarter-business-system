import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const staff = await prisma.user.findFirst({
    where: {
      approvalToken: token,
      approvalTokenExpires: { gt: new Date() },
      isActive: false,
    },
  });

  if (!staff) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: staff.id },
    data: {
      isActive: true,
      approvalToken: null,
      approvalTokenExpires: null,
    },
  });

  // Optionally, send an email to the staff member notifying them of approval

  // Redirect to login with a success message
  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/login?approved=1`);
} 