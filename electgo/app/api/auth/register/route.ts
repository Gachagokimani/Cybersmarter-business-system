import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { sendMail } from "@/app/lib/sendMail";

export async function POST(req: NextRequest) {
  let { name, workId, password, supervisorId, email, role } = await req.json();

  // Only allow 'STAFF' or 'SUPERVISOR' roles from registration
  if (role !== 'STAFF' && role !== 'SUPERVISOR') {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (!name || !workId || !password || (role === 'STAFF' && !supervisorId)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check for duplicate workId or email
  const existing = await prisma.user.findFirst({
    where: { OR: [{ workId }, { email }] }
  });
  if (existing) {
    return NextResponse.json({ error: "Work ID or email already registered" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const approvalToken = randomBytes(32).toString("hex");
  const approvalTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const staff = await prisma.user.create({
    data: {
      name,
      workId,
      email,
      password: hashedPassword,
      role,
      isActive: role === 'ADMIN' ? true : false,
      supervisorId: role === 'STAFF' ? supervisorId : undefined,
      approvalToken,
      approvalTokenExpires,
    },
  });

  // Only send approval email if supervisorId is present (STAFF registration)
  if (role === 'STAFF' && supervisorId) {
    const supervisor = await prisma.user.findUnique({ where: { id: supervisorId } });
    if (supervisor?.email) {
      const approvalLink = `${process.env.NEXTAUTH_URL}/api/auth/approve-staff?token=${approvalToken}`;
      await sendMail({
        to: supervisor.email,
        subject: `[Action Required] Staff Registration Request: ${name} (${workId})`,
        html: `
          <p>Hello ${supervisor.name || "Supervisor"},</p>
          <p>A new staff member has requested to join the system and is awaiting your authorization.</p>
          <ul>
            <li><b>Name:</b> ${name}</li>
            <li><b>Work ID:</b> ${workId}</li>
            <li><b>Email:</b> ${email || "N/A"}</li>
          </ul>
          <p>
            To approve this registration, please click the link below:<br/>
            <a href="${approvalLink}">Approve Staff Member</a>
          </p>
          <p>If you did not expect this request, you can safely ignore this email.</p>
          <p>Thank you,<br/>CyberSmater Team</p>
        `,
      });
    }
  }

  return NextResponse.json({ message: role === 'STAFF' ? "Registration submitted, pending supervisor approval." : "Supervisor registration submitted." });
} 