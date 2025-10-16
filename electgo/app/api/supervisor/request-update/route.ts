import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { sendMail } from "@/app/lib/sendMail";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only staff can create a supervisor request from the staff dashboard
  if (session.user.role !== "STAFF") {
    return NextResponse.json({ error: "Only staff can request updates" }, { status: 403 });
  }

  try {
    const payload = await req.json();
    const { type, targetId, targetName, message, staff, suggested } = payload;

    if (!type || !message) {
      return NextResponse.json({ error: "Missing type or message" }, { status: 400 });
    }

    // Build a short human-friendly summary
    const summaryParts = [
      `Type: ${type}`,
      targetName ? `Target: ${targetName}` : (targetId ? `Target ID: ${targetId}` : null),
      staff ? `From: ${staff.name ?? staff.email ?? session.user.email}` : `From: ${session.user.email}`
    ].filter(Boolean);
    const summary = summaryParts.join(' | ');

    const jsonPayload = JSON.stringify(payload);
    const humanMessage = `${summary}\nMessage: ${String(message)}`;

    // Record the alert and associate it with the requesting staff user so admins can notify them later
    const alertPayload: any = {
      type: "SYSTEM",
      message: `${humanMessage}\nPAYLOAD:${jsonPayload}`,
      userId: staff?.id ?? session.user.id,
    };
    // Target this alert to admins/supervisors for review
    alertPayload.audience = 'ADMIN';
    await prisma.alert.create({ data: alertPayload });

    // Try to find the staff's supervisor to send an email
    let supervisor = null;
    const userWithSupervisor = session.user as typeof session.user & { supervisorId?: string };
    if (userWithSupervisor?.supervisorId) {
      supervisor = await prisma.user.findUnique({ where: { id: userWithSupervisor.supervisorId } });
    } else {
      // fallback: find any supervisor user
      supervisor = await prisma.user.findFirst({ where: { role: "SUPERVISOR" } });
    }

    // Send a plain-text friendly email (avoid complex HTML to reduce parser issues)
    if (supervisor && supervisor.email) {
      const subject = `Staff request: ${type} - ${targetName ?? targetId ?? ''}`;
      const lines = [] as string[];
      lines.push(summary);
      lines.push('');
      lines.push('Message:');
      lines.push(String(message));
      lines.push('');
      if (suggested) {
        lines.push('Suggested changes:');
        lines.push(JSON.stringify(suggested, null, 2));
        lines.push('');
      }
      lines.push('Please review this request in the supervisor dashboard.');

      const body = lines.join('\n');

      try {
        await sendMail({ to: supervisor.email, subject, html: body });
      } catch (emailErr) {
        console.error('Failed to send supervisor email:', emailErr);
        // don't fail the whole request because of email issues
      }
    }

    return NextResponse.json({ message: 'Request submitted to supervisor' }, { status: 201 });
  } catch (error) {
    console.error('Request update error:', error);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
