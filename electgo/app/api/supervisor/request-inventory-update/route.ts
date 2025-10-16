import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session || !session.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (session.user.role !== "STAFF") {
		return NextResponse.json({ error: "Only staff can request updates" }, { status: 403 });
	}

	try {
		const { productId, changes } = await req.json();
		if (!productId || !changes) {
			return NextResponse.json({ error: "Missing productId or changes" }, { status: 400 });
		}

		// Create an alert for supervisor/admins to review
		const reqAlert: any = {
			type: "SYSTEM",
			message: `Inventory update request for Product #${productId} by ${session.user.email || session.user.id}: ${JSON.stringify(changes)}`,
			userId: session.user.id,
		};
		reqAlert.audience = 'ADMIN';
		await prisma.alert.create({ data: reqAlert });

		return NextResponse.json({ message: "Update request submitted" }, { status: 201 });
	} catch (error) {
		console.error("Request update error:", error);
		return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
	}
}