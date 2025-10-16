import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/prisma';
import { sendMail } from '@/app/lib/sendMail';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { alertId, action } = await req.json();
    if (!alertId || !action) {
      return NextResponse.json({ error: 'alertId and action are required' }, { status: 400 });
    }

    const alert = await prisma.alert.findUnique({ where: { id: String(alertId) } });
    if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });

    // small helper to safely pick allowed keys
    const pick = (source: any, allowed: string[]) => {
      const out: any = {};
      if (!source || typeof source !== 'object') return out;
      for (const k of allowed) {
        if (k in source) out[k] = source[k];
      }
      return out;
    };

    // allowed fields per model
    const allowedProductFields = ['buyingPrice', 'unitPrice', 'quantity', 'name', 'category', 'status'];
    const allowedInventoryFields = ['unitPrice', 'quantity', 'name', 'category', 'status'];

    if (action === 'approve') {
      const msg = alert.message || '';

      // Attempt to extract a JSON payload from the message (we expect the request-update route to store PAYLOAD:<json>)
      let parsed: any = null;
      try {
        const parts = msg.split('\nPAYLOAD:');
        if (parts[1]) {
          parsed = JSON.parse(parts[1]);
        } else {
          // fallback to find any JSON-like substring
          const jsonMatch = msg.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        parsed = null;
      }

      // Determine target id from parsed payload or fallback to regex
      let targetId: number | null = null;
      if (parsed && (parsed.targetId || parsed.id)) {
        targetId = Number(parsed.targetId ?? parsed.id);
      } else {
        const idMatch = msg.match(/(?:Product #|product |productId\s*[:=]\s*)(\d+)/i) || msg.match(/(?:Inventory item #|Inventory #)(\d+)/i);
        targetId = idMatch ? Number(idMatch[1]) : null;
      }

      // Build generic suggested map (raw)
      const rawUpdateData: any = {};
      if (parsed) {
        const suggested = parsed.suggested ?? parsed;
        if (typeof suggested.buyingPrice === 'number' || typeof suggested.buyingPrice === 'string') rawUpdateData.buyingPrice = Number(suggested.buyingPrice);
        if (typeof suggested.sellingPrice === 'number' || typeof suggested.sellingPrice === 'string') rawUpdateData.unitPrice = Number(suggested.sellingPrice);
        if (typeof suggested.quantity === 'number' || typeof suggested.quantity === 'string') rawUpdateData.quantity = Number(suggested.quantity);

        if (typeof parsed.name === 'string') rawUpdateData.name = parsed.name;
        if (typeof parsed.category === 'string') rawUpdateData.category = parsed.category;
        if (typeof parsed.unitPrice === 'number' || typeof parsed.unitPrice === 'string') rawUpdateData.unitPrice = Number(parsed.unitPrice);
        if (typeof parsed.buyingPrice === 'number' || typeof parsed.buyingPrice === 'string') rawUpdateData.buyingPrice = Number(parsed.buyingPrice);
        if (typeof parsed.quantity === 'number' || typeof parsed.quantity === 'string') rawUpdateData.quantity = Number(parsed.quantity);
        if (typeof parsed.status === 'string') rawUpdateData.status = parsed.status;
      }

      // If we have a target and some incoming keys, decide model and prune to allowed fields
      if (targetId && Object.keys(rawUpdateData).length > 0) {
        try {
          // Try updating Product (has buyingPrice & unitPrice) first
          let updated: any = null;
          const product = await prisma.product.findUnique({ where: { id: Number(targetId) } });
          if (product) {
            const prodUpdate = pick(rawUpdateData, allowedProductFields);
            console.info('Admin approve: updating Product', { targetId, prodUpdate });
            if (Object.keys(prodUpdate).length > 0) {
              updated = await prisma.product.update({ where: { id: Number(targetId) }, data: prodUpdate });
            }
          } else {
            // Fallback to InventoryItem (no buyingPrice field on this model)
            const inv = await prisma.inventoryItem.findUnique({ where: { id: Number(targetId) } });
            if (!inv) {
              await prisma.alert.update({ where: { id: alert.id }, data: { read: true } });
              if (alert.userId) {
                const notFoundPayload: any = { type: 'SYSTEM', message: `Your request was approved but the target item (#${targetId}) was not found.`, userId: alert.userId };
                notFoundPayload.audience = 'USER';
                await prisma.alert.create({ data: notFoundPayload });
              }
              return NextResponse.json({ error: 'Target item not found' }, { status: 404 });
            }

            const invUpdate = pick(rawUpdateData, allowedInventoryFields);
            console.info('Admin approve: updating InventoryItem', { targetId, invUpdate });
            if (Object.keys(invUpdate).length > 0) {
              updated = await prisma.inventoryItem.update({ where: { id: Number(targetId) }, data: invUpdate });
            }
          }

          // Mark original alert read and notify requester
          await prisma.alert.update({ where: { id: alert.id }, data: { read: true } });

          if (alert.userId) {
            const successPayload: any = { type: 'SYSTEM', message: `Your inventory update request for item #${targetId} has been approved and applied by admin.`, userId: alert.userId };
            successPayload.audience = 'USER';
            await prisma.alert.create({ data: successPayload });
          }

          try {
            const requester = alert.userId ? await prisma.user.findUnique({ where: { id: alert.userId } }) : null;
            if (requester && requester.email) {
              await sendMail({ to: requester.email, subject: 'Inventory request approved', html: `<p>Your request for inventory item #${targetId} was approved and applied.</p><pre>${JSON.stringify(updated, null, 2)}</pre>` });
            }
          } catch (e) {
            console.error('Failed to send approval email:', e);
          }

          return NextResponse.json({ message: 'Approved and applied', updated });
        } catch (e) {
          console.error('Failed to apply changes:', e);
          await prisma.alert.update({ where: { id: alert.id }, data: { read: true } });
          if (alert.userId) {
            const failPayload: any = { type: 'SYSTEM', message: `Your request was approved but failed to apply automatically. Please contact admin.`, userId: alert.userId };
            failPayload.audience = 'USER';
            await prisma.alert.create({ data: failPayload });
          }
          return NextResponse.json({ message: 'Approved but failed to apply changes, admin must apply manually' });
        }
      }

      // If no target or no update data, mark read and notify the requester
      await prisma.alert.update({ where: { id: alert.id }, data: { read: true } });
      if (alert.userId) {
        const genericPayload: any = { type: 'SYSTEM', message: `Your request has been approved by an admin.`, userId: alert.userId };
        genericPayload.audience = 'USER';
        await prisma.alert.create({ data: genericPayload });
      }

      return NextResponse.json({ message: 'Approved (no automatic changes applied)' });
    }

    if (action === 'reject') {
      await prisma.alert.update({ where: { id: alert.id }, data: { read: true } });
      if (alert.userId) {
        const rejPayload: any = { type: 'SYSTEM', message: `Your request has been rejected by an admin.`, userId: alert.userId };
        rejPayload.audience = 'USER';
        await prisma.alert.create({ data: rejPayload });
      }
      return NextResponse.json({ message: 'Rejected' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Admin alerts action error:', error);
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
  }
}
