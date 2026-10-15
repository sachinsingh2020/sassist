"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getDashboardOverview() {
  const [
    totalProducts,
    totalRetailers,
    totalDistributors,
    totalBeats,
    totalSchemes,
    totalLeads,
    totalOrders,
    recentProducts,
    recentRetailers,
    recentOrders,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.retailer.count(),
    prisma.distributor.count(),
    prisma.beat.count(),
    prisma.scheme.count(),
    prisma.lead.count(),
    prisma.order.count(),
    prisma.product.findMany({
      take: 5,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.retailer.findMany({
      take: 5,
      include: { beat: true, distributor: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      take: 5,
      include: { retailer: true, distributor: true, rep: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    metrics: {
      totalProducts,
      totalRetailers,
      totalDistributors,
      totalBeats,
      totalSchemes,
      totalLeads,
      totalOrders,
    },
    recentProducts,
    recentRetailers,
    recentOrders,
  };
}

export async function getProducts() {
  return await prisma.product.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });
}

export async function getCategories() {
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getRetailers() {
  return await prisma.retailer.findMany({
    include: {
      beat: true,
      distributor: true,
    },
    orderBy: { storeName: "asc" },
  });
}

export async function getDistributors() {
  return await prisma.distributor.findMany({
    include: {
      territory: true,
      user: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getBeats() {
  return await prisma.beat.findMany({
    include: {
      territory: true,
      assignedTo: true,
      _count: {
        select: { retailers: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getSchemes() {
  return await prisma.scheme.findMany({
    orderBy: { createdAt: "desc" },
  });
}

import { validateCustomFields, recordAuditLog } from "@/lib/customFields";
import { ModuleName } from "@prisma/client";

export async function getActiveFieldDefinitions(module: ModuleName) {
  return await prisma.fieldDefinition.findMany({
    where: { module, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createProduct(formData: {
  name: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  uom: string;
  mrp: number;
  distributorPrice: number;
  retailerPrice: number;
  gstRate: number;
  stockQuantity: number;
  customFields?: Record<string, any>;
}) {
  let customFieldsData: any = formData.customFields || {};
  if (formData.customFields && Object.keys(formData.customFields).length > 0) {
    const validation = await validateCustomFields("PRODUCT", formData.customFields);
    if (!validation.isValid) {
      throw new Error(validation.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = validation.sanitizedValues;
  }

  const product = await prisma.product.create({
    data: {
      name: formData.name,
      sku: formData.sku,
      barcode: formData.barcode || null,
      categoryId: formData.categoryId,
      uom: formData.uom,
      mrp: Number(formData.mrp),
      distributorPrice: Number(formData.distributorPrice),
      retailerPrice: Number(formData.retailerPrice),
      gstRate: Number(formData.gstRate),
      stockQuantity: Number(formData.stockQuantity),
      customFields: customFieldsData,
    },
  });

  await recordAuditLog({
    entityType: "PRODUCT",
    entityId: product.id,
    action: "CREATE",
    newValues: product,
    reason: `Product '${product.name}' (${product.sku}) created`,
  });

  revalidatePath("/");
  revalidatePath("/products");
  return { success: true, product };
}

export async function createRetailer(formData: {
  storeName: string;
  ownerName: string;
  phone: string;
  address: string;
  gstin?: string;
  beatId: string;
  distributorId: string;
  lat?: number;
  lng?: number;
}) {
  const retailer = await prisma.retailer.create({
    data: {
      storeName: formData.storeName,
      ownerName: formData.ownerName,
      phone: formData.phone,
      address: formData.address,
      gstin: formData.gstin || null,
      beatId: formData.beatId,
      distributorId: formData.distributorId,
      lat: formData.lat || 28.6139,
      lng: formData.lng || 77.2090,
    },
  });

  revalidatePath("/");
  revalidatePath("/retailers");
  return { success: true, retailer };
}

export async function createScheme(formData: {
  title: string;
  code: string;
  description?: string;
  type: string;
  minOrderQty: number;
  discountPercent?: number;
  flatDiscount?: number;
  freeSkuCode?: string;
  freeSkuQty?: number;
  startDate: string;
  endDate: string;
}) {
  const scheme = await prisma.scheme.create({
    data: {
      title: formData.title,
      code: formData.code,
      description: formData.description || null,
      type: formData.type,
      minOrderQty: Number(formData.minOrderQty),
      discountPercent: formData.discountPercent ? Number(formData.discountPercent) : 0.0,
      flatDiscount: formData.flatDiscount ? Number(formData.flatDiscount) : 0.0,
      freeSkuCode: formData.freeSkuCode || null,
      freeSkuQty: formData.freeSkuQty ? Number(formData.freeSkuQty) : 0,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      isActive: true,
    },
  });

  revalidatePath("/");
  revalidatePath("/schemes");
  revalidatePath("/orders/new");
  return { success: true, scheme };
}
