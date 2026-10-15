"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { validateCustomFields, recordAuditLog } from "@/lib/customFields";

export interface ProductFilterInput {
  search?: string;
  categoryId?: string;
  brand?: string;
  subcategory?: string;
  status?: string;
  productType?: string;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  barcode?: string;
  hsnCode?: string;
  categoryId: string;
  subcategory?: string;
  brand?: string;
  productType?: string;
  uom: string;
  basePrice?: number;
  mrp: number;
  distributorPrice: number;
  retailerPrice: number;
  gstRate: number;
  stockQuantity: number;
  minOrderQty?: number;
  status?: string;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  imageUrl?: string;
  customFields?: Record<string, any>;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
  priceChangeReason?: string;
  changedBy?: string;
}

export interface BulkPriceUpdateInput {
  productIds: string[];
  priceTarget: "MRP" | "DISTRIBUTOR" | "RETAILER" | "ALL";
  changeType: "PERCENTAGE" | "FLAT";
  changeValue: number; // e.g. +5 for +5% or +10 for +10 rupees
  reason: string;
  effectiveDate?: string;
  changedBy?: string;
}

export async function getProducts(filters?: ProductFilterInput) {
  const where: any = {};

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { sku: { contains: filters.search, mode: "insensitive" } },
      { barcode: { contains: filters.search, mode: "insensitive" } },
      { brand: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters?.categoryId && filters.categoryId !== "ALL") {
    where.categoryId = filters.categoryId;
  }

  if (filters?.brand && filters.brand !== "ALL") {
    where.brand = filters.brand;
  }

  if (filters?.subcategory && filters.subcategory !== "ALL") {
    where.subcategory = filters.subcategory;
  }

  if (filters?.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters?.productType && filters.productType !== "ALL") {
    where.productType = filters.productType;
  }

  return await prisma.product.findMany({
    where,
    include: {
      category: true,
      priceHistory: {
        orderBy: { effectiveDate: "desc" },
        take: 5,
      },
      _count: {
        select: { orderItems: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductById(id: string) {
  return await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      priceHistory: {
        orderBy: { effectiveDate: "desc" },
      },
      _count: {
        select: { orderItems: true },
      },
    },
  });
}

export async function getCategories() {
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createProduct(input: CreateProductInput) {
  // 1. Validations
  if (!input.sku || input.sku.trim() === "") {
    throw new Error("Product SKU is mandatory and must be unique.");
  }

  const existingSku = await prisma.product.findUnique({
    where: { sku: input.sku.trim().toUpperCase() },
  });
  if (existingSku) {
    throw new Error(`A product with SKU '${input.sku}' already exists.`);
  }

  if (input.mrp < 0 || input.distributorPrice < 0 || input.retailerPrice < 0 || (input.basePrice && input.basePrice < 0)) {
    throw new Error("Prices cannot be negative.");
  }

  if (input.stockQuantity < 0) {
    throw new Error("Stock quantity cannot be negative.");
  }

  const minOrderQty = input.minOrderQty ? Number(input.minOrderQty) : 1;
  if (minOrderQty < 1) {
    throw new Error("Minimum Order Quantity must be at least 1.");
  }

  if (input.effectiveStartDate && input.effectiveEndDate) {
    if (new Date(input.effectiveStartDate) > new Date(input.effectiveEndDate)) {
      throw new Error("Effective start date cannot be after effective end date.");
    }
  }

  // 2. Custom Fields Validation
  let customFieldsData: any = input.customFields || {};
  if (input.customFields && Object.keys(input.customFields).length > 0) {
    const validation = await validateCustomFields("PRODUCT", input.customFields);
    if (!validation.isValid) {
      throw new Error(validation.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = validation.sanitizedValues;
  }

  // 3. Create Product
  const product = await prisma.product.create({
    data: {
      name: input.name.trim(),
      sku: input.sku.trim().toUpperCase(),
      barcode: input.barcode?.trim() || null,
      hsnCode: input.hsnCode?.trim() || null,
      categoryId: input.categoryId,
      subcategory: input.subcategory?.trim() || null,
      brand: input.brand?.trim() || null,
      productType: input.productType || "FINISHED_GOODS",
      uom: input.uom || "PCS",
      basePrice: input.basePrice ? Number(input.basePrice) : 0.0,
      mrp: Number(input.mrp),
      distributorPrice: Number(input.distributorPrice),
      retailerPrice: Number(input.retailerPrice),
      gstRate: Number(input.gstRate) || 18.0,
      stockQuantity: Number(input.stockQuantity) || 0,
      minOrderQty,
      status: input.status || "ACTIVE",
      effectiveStartDate: input.effectiveStartDate ? new Date(input.effectiveStartDate) : new Date(),
      effectiveEndDate: input.effectiveEndDate ? new Date(input.effectiveEndDate) : null,
      imageUrl: input.imageUrl?.trim() || null,
      isActive: (input.status || "ACTIVE") === "ACTIVE",
      customFields: customFieldsData,
    },
  });

  // 4. Record Initial Price History
  await prisma.productPriceHistory.create({
    data: {
      productId: product.id,
      oldMrp: Number(input.mrp),
      newMrp: Number(input.mrp),
      oldDistributorPrice: Number(input.distributorPrice),
      newDistributorPrice: Number(input.distributorPrice),
      oldRetailerPrice: Number(input.retailerPrice),
      newRetailerPrice: Number(input.retailerPrice),
      effectiveDate: new Date(),
      reason: "Initial Product Catalog Launch",
      changedBy: "System Admin",
    },
  });

  // 5. Audit Log
  await recordAuditLog({
    entityType: "PRODUCT",
    entityId: product.id,
    action: "CREATE",
    newValues: product,
    reason: `Product '${product.name}' (${product.sku}) registered into catalog`,
  });

  revalidatePath("/products");
  revalidatePath("/");
  return { success: true, product };
}

export async function updateProduct(input: UpdateProductInput) {
  const existing = await prisma.product.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new Error("Product not found.");
  }

  // SKU conflict check if updated
  if (input.sku && input.sku.trim().toUpperCase() !== existing.sku) {
    const skuConflict = await prisma.product.findUnique({
      where: { sku: input.sku.trim().toUpperCase() },
    });
    if (skuConflict) {
      throw new Error(`SKU '${input.sku}' is already assigned to another product.`);
    }
  }

  // Validate non-negative values
  if (input.mrp !== undefined && input.mrp < 0) throw new Error("MRP cannot be negative.");
  if (input.distributorPrice !== undefined && input.distributorPrice < 0) throw new Error("Distributor price cannot be negative.");
  if (input.retailerPrice !== undefined && input.retailerPrice < 0) throw new Error("Retailer price cannot be negative.");

  // Check if prices changed
  const newMrp = input.mrp !== undefined ? Number(input.mrp) : existing.mrp;
  const newDistPrice = input.distributorPrice !== undefined ? Number(input.distributorPrice) : existing.distributorPrice;
  const newRetPrice = input.retailerPrice !== undefined ? Number(input.retailerPrice) : existing.retailerPrice;

  const pricesChanged =
    newMrp !== existing.mrp ||
    newDistPrice !== existing.distributorPrice ||
    newRetPrice !== existing.retailerPrice;

  if (pricesChanged) {
    await prisma.productPriceHistory.create({
      data: {
        productId: existing.id,
        oldMrp: existing.mrp,
        newMrp,
        oldDistributorPrice: existing.distributorPrice,
        newDistributorPrice: newDistPrice,
        oldRetailerPrice: existing.retailerPrice,
        newRetailerPrice: newRetPrice,
        effectiveDate: new Date(),
        reason: input.priceChangeReason || "Commercial Price Revision",
        changedBy: input.changedBy || "System Admin",
      },
    });
  }

  // Custom fields
  let customFieldsData = existing.customFields;
  if (input.customFields) {
    const merged = {
      ...((existing.customFields as object) || {}),
      ...input.customFields,
    };
    const validation = await validateCustomFields("PRODUCT", merged);
    if (!validation.isValid) {
      throw new Error(validation.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = validation.sanitizedValues;
  }

  const updated = await prisma.product.update({
    where: { id: input.id },
    data: {
      name: input.name !== undefined ? input.name.trim() : existing.name,
      sku: input.sku !== undefined ? input.sku.trim().toUpperCase() : existing.sku,
      barcode: input.barcode !== undefined ? input.barcode?.trim() || null : existing.barcode,
      hsnCode: input.hsnCode !== undefined ? input.hsnCode?.trim() || null : existing.hsnCode,
      categoryId: input.categoryId !== undefined ? input.categoryId : existing.categoryId,
      subcategory: input.subcategory !== undefined ? input.subcategory?.trim() || null : existing.subcategory,
      brand: input.brand !== undefined ? input.brand?.trim() || null : existing.brand,
      productType: input.productType !== undefined ? input.productType : existing.productType,
      uom: input.uom !== undefined ? input.uom : existing.uom,
      basePrice: input.basePrice !== undefined ? Number(input.basePrice) : existing.basePrice,
      mrp: newMrp,
      distributorPrice: newDistPrice,
      retailerPrice: newRetPrice,
      gstRate: input.gstRate !== undefined ? Number(input.gstRate) : existing.gstRate,
      stockQuantity: input.stockQuantity !== undefined ? Number(input.stockQuantity) : existing.stockQuantity,
      minOrderQty: input.minOrderQty !== undefined ? Number(input.minOrderQty) : existing.minOrderQty,
      status: input.status !== undefined ? input.status : existing.status,
      isActive: input.status !== undefined ? input.status === "ACTIVE" : existing.isActive,
      effectiveStartDate: input.effectiveStartDate ? new Date(input.effectiveStartDate) : existing.effectiveStartDate,
      effectiveEndDate: input.effectiveEndDate ? new Date(input.effectiveEndDate) : existing.effectiveEndDate,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl?.trim() || null : existing.imageUrl,
      customFields: customFieldsData as any,
    },
  });

  await recordAuditLog({
    entityType: "PRODUCT",
    entityId: updated.id,
    action: "UPDATE",
    oldValues: existing,
    newValues: updated,
    reason: input.priceChangeReason || "Product catalog details updated",
  });

  revalidatePath("/products");
  return { success: true, product: updated };
}

export async function deleteProduct(id: string) {
  // Referential Integrity Guard: Check if referenced in historical orders
  const orderItemsCount = await prisma.orderItem.count({
    where: { productId: id },
  });

  if (orderItemsCount > 0) {
    throw new Error(
      `Cannot delete product: It is referenced by ${orderItemsCount} historical order item(s). You can mark its status as 'DISCONTINUED' or 'INACTIVE' instead.`
    );
  }

  const existing = await prisma.product.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Product not found.");
  }

  await prisma.product.delete({
    where: { id },
  });

  await recordAuditLog({
    entityType: "PRODUCT",
    entityId: id,
    action: "DELETE",
    oldValues: existing,
    reason: `Product '${existing.name}' (${existing.sku}) permanently removed`,
  });

  revalidatePath("/products");
  return { success: true };
}

/**
 * Bulk updates prices across multiple products with audit history
 */
export async function bulkUpdatePrices(input: BulkPriceUpdateInput) {
  if (!input.productIds || input.productIds.length === 0) {
    throw new Error("Please select at least one product for bulk price update.");
  }

  const products = await prisma.product.findMany({
    where: { id: { in: input.productIds } },
  });

  const updatedProducts = [];

  for (const prod of products) {
    let newMrp = prod.mrp;
    let newDistPrice = prod.distributorPrice;
    let newRetPrice = prod.retailerPrice;

    const calcPrice = (curr: number) => {
      if (input.changeType === "PERCENTAGE") {
        return Math.max(0, Math.round((curr * (1 + input.changeValue / 100)) * 100) / 100);
      } else {
        return Math.max(0, Math.round((curr + input.changeValue) * 100) / 100);
      }
    };

    if (input.priceTarget === "MRP" || input.priceTarget === "ALL") {
      newMrp = calcPrice(prod.mrp);
    }
    if (input.priceTarget === "DISTRIBUTOR" || input.priceTarget === "ALL") {
      newDistPrice = calcPrice(prod.distributorPrice);
    }
    if (input.priceTarget === "RETAILER" || input.priceTarget === "ALL") {
      newRetPrice = calcPrice(prod.retailerPrice);
    }

    // Save Price History
    await prisma.productPriceHistory.create({
      data: {
        productId: prod.id,
        oldMrp: prod.mrp,
        newMrp,
        oldDistributorPrice: prod.distributorPrice,
        newDistributorPrice: newDistPrice,
        oldRetailerPrice: prod.retailerPrice,
        newRetailerPrice: newRetPrice,
        effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : new Date(),
        reason: input.reason || `Bulk Price Revision (${input.changeType === "PERCENTAGE" ? input.changeValue + "%" : "₹" + input.changeValue})`,
        changedBy: input.changedBy || "System Admin",
      },
    });

    const updated = await prisma.product.update({
      where: { id: prod.id },
      data: {
        mrp: newMrp,
        distributorPrice: newDistPrice,
        retailerPrice: newRetPrice,
      },
    });

    updatedProducts.push(updated);
  }

  await recordAuditLog({
    entityType: "PRODUCT",
    entityId: "BULK_UPDATE",
    action: "UPDATE",
    reason: `Bulk price adjustment applied to ${products.length} product(s): ${input.reason}`,
    newValues: {
      affectedCount: products.length,
      priceTarget: input.priceTarget,
      changeType: input.changeType,
      changeValue: input.changeValue,
    },
  });

  revalidatePath("/products");
  return { success: true, count: updatedProducts.length };
}

/**
 * Bulk import handler for products parsed from CSV / Excel
 */
export async function bulkImportProducts(records: Array<Record<string, any>>) {
  const categories = await prisma.category.findMany();
  const catMap = new Map(categories.map((c: any) => [c.name.toLowerCase(), c.id]));
  const defaultCatId = categories[0]?.id || "";

  let successCount = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 1;

    try {
      const sku = (row.sku || row.SKU || row["Product Code"] || "").toString().trim().toUpperCase();
      const name = (row.name || row.Name || row["Product Name"] || "").toString().trim();
      const mrp = parseFloat(row.mrp || row.MRP || row["Price"] || "0");
      const distributorPrice = parseFloat(row.distributorPrice || row["Distributor Price"] || "0") || (mrp * 0.8);
      const retailerPrice = parseFloat(row.retailerPrice || row["Retailer Price"] || "0") || (mrp * 0.88);

      if (!sku) throw new Error("SKU is required.");
      if (!name) throw new Error("Product name is required.");
      if (isNaN(mrp) || mrp < 0) throw new Error("Valid MRP is required.");

      const categoryName = (row.category || row.Category || "").toString().trim().toLowerCase();
      const categoryId = catMap.get(categoryName) || defaultCatId;

      await prisma.product.upsert({
        where: { sku },
        update: {
          name,
          mrp,
          distributorPrice,
          retailerPrice,
          subcategory: (row.subcategory || row.Subcategory || "")?.toString().trim() || undefined,
          brand: (row.brand || row.Brand || "")?.toString().trim() || undefined,
          uom: (row.uom || row.UOM || "PCS")?.toString().trim().toUpperCase(),
          stockQuantity: parseInt(row.stock || row.stockQuantity || "100") || 100,
          status: (row.status || "ACTIVE")?.toString().trim().toUpperCase(),
        },
        create: {
          sku,
          name,
          categoryId,
          mrp,
          distributorPrice,
          retailerPrice,
          subcategory: (row.subcategory || row.Subcategory || "")?.toString().trim() || null,
          brand: (row.brand || row.Brand || "")?.toString().trim() || null,
          uom: (row.uom || row.UOM || "PCS")?.toString().trim().toUpperCase(),
          stockQuantity: parseInt(row.stock || row.stockQuantity || "100") || 100,
          status: (row.status || "ACTIVE")?.toString().trim().toUpperCase(),
        },
      });

      successCount++;
    } catch (err: any) {
      errors.push({ row: rowNum, error: err.message || "Failed to process row" });
    }
  }

  revalidatePath("/products");
  return { success: true, count: successCount, errors };
}
