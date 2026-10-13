"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPosDashboardData() {
  const [products, recentTransactions, promoterLogs] = await Promise.all([
    prisma.product.findMany({
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.posTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.promoterLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const totalPosRevenue = recentTransactions.reduce((acc, t) => acc + t.totalAmount, 0);

  return {
    products,
    recentTransactions,
    promoterLogs,
    stats: {
      totalBills: recentTransactions.length,
      totalPosRevenue,
    },
  };
}

export async function createPosTransaction(data: {
  customerName?: string;
  customerPhone?: string;
  paymentMethod: string; // CASH, UPI, CARD
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  items: Array<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  notes?: string;
}) {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const billNumber = `POS-${dateStr}-${randomSuffix}`;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Deduct stock for each item sold at counter
    for (const item of data.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    // 2. Create POS Transaction
    const transaction = await tx.posTransaction.create({
      data: {
        billNumber,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        paymentMethod: data.paymentMethod,
        subTotal: data.subTotal,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        itemsJson: JSON.stringify(data.items),
        notes: data.notes || null,
      },
    });

    return transaction;
  });

  revalidatePath("/pos");
  revalidatePath("/");
  return { success: true, transaction: result };
}

export async function createPromoterLog(formData: {
  promoterName: string;
  storeName: string;
  walkIns: number;
  interactions: number;
  salesUnits: number;
  salesValue: number;
  feedback?: string;
}) {
  const log = await prisma.promoterLog.create({
    data: {
      promoterName: formData.promoterName,
      storeName: formData.storeName,
      walkIns: Number(formData.walkIns),
      interactions: Number(formData.interactions),
      salesUnits: Number(formData.salesUnits),
      salesValue: Number(formData.salesValue),
      feedback: formData.feedback || null,
    },
  });

  revalidatePath("/pos");
  return { success: true, log };
}
