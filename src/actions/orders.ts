"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { OrderStatus, PaymentStatus, VisitStatus } from "@prisma/client";

export async function createSecondaryOrder(data: {
  retailerId: string;
  distributorId: string;
  repId: string;
  visitId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    freeQty?: number;
    discount?: number;
  }>;
  subTotal: number;
  discount?: number;
  taxAmount?: number;
  totalAmount: number;
  notes?: string;
  appliedSchemes?: Array<{
    schemeId: string;
    discountAmount: number;
    freeSkuCode?: string;
    freeSkuQty?: number;
  }>;
}) {
  // Generate a professional sequential Order Number (e.g. ORD-20251013-4821)
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

  // Execute order creation within a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Order
    const order = await tx.order.create({
      data: {
        orderNumber,
        repId: data.repId,
        retailerId: data.retailerId,
        distributorId: data.distributorId,
        visitId: data.visitId || null,
        subTotal: data.subTotal,
        discount: data.discount || 0.0,
        taxAmount: data.taxAmount || 0.0,
        totalAmount: data.totalAmount,
        status: OrderStatus.SUBMITTED,
        paymentStatus: PaymentStatus.PENDING,
        notes: data.notes || null,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            freeQty: item.freeQty || 0,
            discount: item.discount || 0.0,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        retailer: true,
        distributor: true,
      },
    });

    // 2. If this order was booked during an active store visit, complete the visit record
    if (data.visitId) {
      await tx.visit.update({
        where: { id: data.visitId },
        data: {
          checkOut: new Date(),
          status: VisitStatus.COMPLETED,
          notes: `Order booked: ${orderNumber} (₹${data.totalAmount.toFixed(2)})`,
        },
      });
    }

    // 3. Log Scheme Application History
    if (data.appliedSchemes && data.appliedSchemes.length > 0) {
      for (const as of data.appliedSchemes) {
        await tx.schemeApplicationLog.create({
          data: {
            schemeId: as.schemeId,
            orderId: order.id,
            clientId: data.retailerId,
            orderNumber: order.orderNumber,
            discountAmount: as.discountAmount || 0.0,
            freeSkuCode: as.freeSkuCode || null,
            freeSkuQty: as.freeSkuQty || 0,
            orderSubtotal: data.subTotal,
          },
        });
      }
    }

    return order;
  });

  revalidatePath("/");
  revalidatePath("/field");
  revalidatePath("/orders");
  revalidatePath("/visits");

  return { success: true, order: result };
}

export async function getAllOrders() {
  return await prisma.order.findMany({
    include: {
      retailer: true,
      distributor: true,
      rep: true,
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderDetails(orderId: string) {
  return await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      retailer: true,
      distributor: true,
      rep: true,
      items: {
        include: { product: true },
      },
      visit: true,
    },
  });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  revalidatePath("/orders");
  return { success: true, order: updated };
}
