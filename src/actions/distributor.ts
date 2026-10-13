"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export async function getDistributorDashboardData(distributorEmail?: string) {
  // Find the distributor by user email or default to seeded Metro Distributors
  let distributor = await prisma.distributor.findFirst({
    where: distributorEmail ? { email: distributorEmail } : { code: "DIST-DEL-001" },
    include: {
      territory: true,
      retailers: true,
    },
  });

  if (!distributor) {
    distributor = await prisma.distributor.findFirst({
      include: {
        territory: true,
        retailers: true,
      },
    });
  }

  if (!distributor) {
    throw new Error("No distributor registered");
  }

  // Fetch orders routed to this distributor
  const orders = await prisma.order.findMany({
    where: { distributorId: distributor.id },
    include: {
      retailer: true,
      rep: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch current product catalog & stock
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });

  // Calculate distributor metrics
  const pendingOrders = orders.filter((o) => o.status === OrderStatus.SUBMITTED);
  const confirmedOrders = orders.filter((o) => o.status === OrderStatus.CONFIRMED);
  const dispatchedOrders = orders.filter(
    (o) => o.status === OrderStatus.DISPATCHED || o.status === OrderStatus.DELIVERED
  );
  const totalRevenue = orders
    .filter((o) => o.status !== OrderStatus.CANCELLED)
    .reduce((acc, o) => acc + o.totalAmount, 0);

  return {
    distributor,
    stats: {
      totalOrders: orders.length,
      pendingOrdersCount: pendingOrders.length,
      confirmedOrdersCount: confirmedOrders.length,
      dispatchedOrdersCount: dispatchedOrders.length,
      totalRevenue,
      mappedRetailersCount: distributor.retailers.length,
    },
    orders,
    products,
  };
}

export async function updateDistributorOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  paymentStatus?: PaymentStatus
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch the order with items
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new Error("Order not found");

    // 2. If transitioning to DISPATCHED from SUBMITTED or CONFIRMED, deduct stock
    if (
      newStatus === OrderStatus.DISPATCHED &&
      order.status !== OrderStatus.DISPATCHED &&
      order.status !== OrderStatus.DELIVERED
    ) {
      for (const item of order.items) {
        const totalDeduct = item.quantity + (item.freeQty || 0);
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: totalDeduct,
            },
          },
        });
      }
    }

    // 3. Update order status
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        paymentStatus: paymentStatus || order.paymentStatus,
      },
    });

    return updated;
  });

  revalidatePath("/distributor-portal");
  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true, order: result };
}

export async function restockDistributorProduct(productId: string, addQuantity: number) {
  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      stockQuantity: {
        increment: Number(addQuantity),
      },
    },
  });

  revalidatePath("/distributor-portal");
  revalidatePath("/products");
  return { success: true, product: updated };
}
