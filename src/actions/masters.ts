"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ModuleName } from "@prisma/client";
import * as productActions from "./products";
import * as schemeActions from "./schemes";

// Delegated Product Actions
export async function getProducts(filters?: any) {
  return await productActions.getProducts(filters);
}

export async function getProductById(id: string) {
  return await productActions.getProductById(id);
}

export async function getCategories() {
  return await productActions.getCategories();
}

export async function createProduct(input: any) {
  return await productActions.createProduct(input);
}

export async function updateProduct(input: any) {
  return await productActions.updateProduct(input);
}

export async function deleteProduct(id: string) {
  return await productActions.deleteProduct(id);
}

export async function bulkUpdatePrices(input: any) {
  return await productActions.bulkUpdatePrices(input);
}

export async function bulkImportProducts(records: any[]) {
  return await productActions.bulkImportProducts(records);
}

// Delegated Scheme Actions
export async function getSchemes(filters?: any) {
  return await schemeActions.getSchemes(filters);
}

export async function getSchemeById(id: string) {
  return await schemeActions.getSchemeById(id);
}

export async function createScheme(input: any) {
  return await schemeActions.createScheme(input);
}

export async function updateScheme(input: any) {
  return await schemeActions.updateScheme(input);
}

export async function updateSchemeApproval(id: string, status: string, reason?: string) {
  return await schemeActions.updateSchemeApproval(id, status, reason);
}

export async function deleteScheme(id: string) {
  return await schemeActions.deleteScheme(id);
}

export async function checkSchemeCollisionAction(candidate: any) {
  return await schemeActions.checkSchemeCollisionAction(candidate);
}

export async function bulkImportSchemes(records: any[]) {
  return await schemeActions.bulkImportSchemes(records);
}

// Core Dashboard Overview
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

export async function getActiveFieldDefinitions(module: ModuleName) {
  return await prisma.fieldDefinition.findMany({
    where: { module, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
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
