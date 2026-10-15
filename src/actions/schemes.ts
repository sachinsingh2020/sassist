"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { validateCustomFields, recordAuditLog } from "@/lib/customFields";
import { detectSchemeCollisions, SchemeRule } from "@/lib/schemesEngine";

export interface SchemeFilterInput {
  status?: string;
  type?: string;
  approvalStatus?: string;
  search?: string;
}

export interface CreateSchemeInput {
  title: string;
  code: string;
  description?: string;
  type: string; // PERCENTAGE_DISCOUNT | FLAT_DISCOUNT | BOGO | TIERED_SLAB
  eligibleClientTypes?: string[]; // e.g. ["ALL"] or ["LEAD", "PROSPECT", "CUSTOMER"]
  eligibleProductIds?: string[];  // e.g. ["ALL"] or array of product ids
  minOrderQty: number;
  minOrderValue?: number;
  discountPercent?: number;
  flatDiscount?: number;
  freeSkuCode?: string;
  freeSkuQty?: number;
  slabTiers?: Array<{ minQty: number; discountPercent: number }>;
  maxDiscountCap?: number;
  startDate: string;
  endDate: string;
  status?: string;
  approvalStatus?: string;
  customFields?: Record<string, any>;
}

export interface UpdateSchemeInput extends Partial<CreateSchemeInput> {
  id: string;
}

export async function getSchemes(filters?: SchemeFilterInput) {
  const where: any = {};

  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters?.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters?.type && filters.type !== "ALL") {
    where.type = filters.type;
  }

  if (filters?.approvalStatus && filters.approvalStatus !== "ALL") {
    where.approvalStatus = filters.approvalStatus;
  }

  return await prisma.scheme.findMany({
    where,
    include: {
      _count: {
        select: { applicationLogs: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSchemeById(id: string) {
  return await prisma.scheme.findUnique({
    where: { id },
    include: {
      applicationLogs: {
        orderBy: { appliedAt: "desc" },
        take: 50,
      },
    },
  });
}

/**
 * Validates collision and conflict against active schemes
 */
export async function checkSchemeCollisionAction(candidate: {
  id?: string;
  code: string;
  startDate: string;
  endDate: string;
  eligibleProductIds?: string[];
  eligibleClientTypes?: string[];
  type: string;
}) {
  const existingSchemes = await prisma.scheme.findMany({
    where: { isActive: true },
  });

  const collisions = detectSchemeCollisions(
    {
      id: candidate.id,
      code: candidate.code,
      startDate: candidate.startDate,
      endDate: candidate.endDate,
      eligibleProductIdsJson: JSON.stringify(candidate.eligibleProductIds || ["ALL"]),
      eligibleClientTypesJson: JSON.stringify(candidate.eligibleClientTypes || ["ALL"]),
      type: candidate.type,
    },
    existingSchemes as unknown as SchemeRule[]
  );

  return collisions;
}

export async function createScheme(input: CreateSchemeInput) {
  // 1. Validations
  if (!input.title || input.title.trim() === "") {
    throw new Error("Scheme title is required.");
  }
  if (!input.code || input.code.trim() === "") {
    throw new Error("Scheme code is mandatory.");
  }

  const existingCode = await prisma.scheme.findUnique({
    where: { code: input.code.trim().toUpperCase() },
  });
  if (existingCode) {
    throw new Error(`A trade scheme with code '${input.code}' already exists.`);
  }

  if (new Date(input.startDate) > new Date(input.endDate)) {
    throw new Error("Scheme start date cannot be later than end date.");
  }

  if (input.type === "PERCENTAGE_DISCOUNT") {
    const pct = input.discountPercent ?? 0;
    if (pct <= 0 || pct > 100) {
      throw new Error("Percentage discount must be between 0.1% and 100%.");
    }
  } else if (input.type === "FLAT_DISCOUNT") {
    if ((input.flatDiscount ?? 0) <= 0) {
      throw new Error("Flat discount must be greater than zero.");
    }
  } else if (input.type === "BOGO") {
    if (!input.freeSkuCode || input.freeSkuCode.trim() === "") {
      throw new Error("Free SKU Code is required for Buy-One-Get-One (BOGO) schemes.");
    }
    if ((input.freeSkuQty ?? 0) <= 0) {
      throw new Error("Free SKU quantity must be at least 1.");
    }
  }

  // 2. Custom Fields Validation
  let customFieldsData: any = input.customFields || {};
  if (input.customFields && Object.keys(input.customFields).length > 0) {
    const validation = await validateCustomFields("SCHEME", input.customFields);
    if (!validation.isValid) {
      throw new Error(validation.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = validation.sanitizedValues;
  }

  const eligibleClientTypesJson = JSON.stringify(input.eligibleClientTypes || ["ALL"]);
  const eligibleProductIdsJson = JSON.stringify(input.eligibleProductIds || ["ALL"]);
  const slabTiersJson = input.slabTiers ? JSON.stringify(input.slabTiers) : null;

  const scheme = await prisma.scheme.create({
    data: {
      title: input.title.trim(),
      code: input.code.trim().toUpperCase(),
      description: input.description?.trim() || null,
      type: input.type,
      eligibleClientTypesJson,
      eligibleProductIdsJson,
      minOrderQty: Number(input.minOrderQty) || 1,
      minOrderValue: input.minOrderValue ? Number(input.minOrderValue) : 0.0,
      discountPercent: input.discountPercent ? Number(input.discountPercent) : 0.0,
      flatDiscount: input.flatDiscount ? Number(input.flatDiscount) : 0.0,
      freeSkuCode: input.freeSkuCode?.trim() || null,
      freeSkuQty: input.freeSkuQty ? Number(input.freeSkuQty) : 0,
      slabTiersJson,
      maxDiscountCap: input.maxDiscountCap ? Number(input.maxDiscountCap) : null,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      status: input.status || "ACTIVE",
      approvalStatus: input.approvalStatus || "APPROVED",
      isActive: (input.status || "ACTIVE") === "ACTIVE",
      customFields: customFieldsData,
    },
  });

  await recordAuditLog({
    entityType: "SCHEME",
    entityId: scheme.id,
    action: "CREATE",
    newValues: scheme,
    reason: `Trade Promotion scheme '${scheme.title}' (${scheme.code}) launched`,
  });

  revalidatePath("/schemes");
  revalidatePath("/");
  return { success: true, scheme };
}

export async function updateScheme(input: UpdateSchemeInput) {
  const existing = await prisma.scheme.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new Error("Scheme not found.");
  }

  if (input.code && input.code.trim().toUpperCase() !== existing.code) {
    const codeConflict = await prisma.scheme.findUnique({
      where: { code: input.code.trim().toUpperCase() },
    });
    if (codeConflict) {
      throw new Error(`Scheme code '${input.code}' is already assigned to another promotion.`);
    }
  }

  let customFieldsData = existing.customFields;
  if (input.customFields) {
    const merged = {
      ...((existing.customFields as object) || {}),
      ...input.customFields,
    };
    const validation = await validateCustomFields("SCHEME", merged);
    if (!validation.isValid) {
      throw new Error(validation.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = validation.sanitizedValues;
  }

  const updated = await prisma.scheme.update({
    where: { id: input.id },
    data: {
      title: input.title !== undefined ? input.title.trim() : existing.title,
      code: input.code !== undefined ? input.code.trim().toUpperCase() : existing.code,
      description: input.description !== undefined ? input.description?.trim() || null : existing.description,
      type: input.type !== undefined ? input.type : existing.type,
      eligibleClientTypesJson: input.eligibleClientTypes !== undefined ? JSON.stringify(input.eligibleClientTypes) : existing.eligibleClientTypesJson,
      eligibleProductIdsJson: input.eligibleProductIds !== undefined ? JSON.stringify(input.eligibleProductIds) : existing.eligibleProductIdsJson,
      minOrderQty: input.minOrderQty !== undefined ? Number(input.minOrderQty) : existing.minOrderQty,
      minOrderValue: input.minOrderValue !== undefined ? Number(input.minOrderValue) : existing.minOrderValue,
      discountPercent: input.discountPercent !== undefined ? Number(input.discountPercent) : existing.discountPercent,
      flatDiscount: input.flatDiscount !== undefined ? Number(input.flatDiscount) : existing.flatDiscount,
      freeSkuCode: input.freeSkuCode !== undefined ? input.freeSkuCode?.trim() || null : existing.freeSkuCode,
      freeSkuQty: input.freeSkuQty !== undefined ? Number(input.freeSkuQty) : existing.freeSkuQty,
      slabTiersJson: input.slabTiers !== undefined ? JSON.stringify(input.slabTiers) : existing.slabTiersJson,
      maxDiscountCap: input.maxDiscountCap !== undefined ? Number(input.maxDiscountCap) : existing.maxDiscountCap,
      startDate: input.startDate ? new Date(input.startDate) : existing.startDate,
      endDate: input.endDate ? new Date(input.endDate) : existing.endDate,
      status: input.status !== undefined ? input.status : existing.status,
      approvalStatus: input.approvalStatus !== undefined ? input.approvalStatus : existing.approvalStatus,
      isActive: input.status !== undefined ? input.status === "ACTIVE" : existing.isActive,
      customFields: customFieldsData as any,
    },
  });

  await recordAuditLog({
    entityType: "SCHEME",
    entityId: updated.id,
    action: "UPDATE",
    oldValues: existing,
    newValues: updated,
    reason: `Scheme '${updated.title}' updated`,
  });

  revalidatePath("/schemes");
  return { success: true, scheme: updated };
}

export async function updateSchemeApproval(id: string, approvalStatus: string, reason?: string) {
  const existing = await prisma.scheme.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Scheme not found.");
  }

  const updated = await prisma.scheme.update({
    where: { id },
    data: {
      approvalStatus,
      status: approvalStatus === "APPROVED" ? "ACTIVE" : "INACTIVE",
      isActive: approvalStatus === "APPROVED",
    },
  });

  await recordAuditLog({
    entityType: "SCHEME",
    entityId: id,
    action: "UPDATE",
    oldValues: { approvalStatus: existing.approvalStatus },
    newValues: { approvalStatus },
    reason: reason || `Scheme approval status changed to ${approvalStatus}`,
  });

  revalidatePath("/schemes");
  return { success: true, scheme: updated };
}

export async function deleteScheme(id: string) {
  // Check if scheme has application history
  const applicationCount = await prisma.schemeApplicationLog.count({
    where: { schemeId: id },
  });

  if (applicationCount > 0) {
    throw new Error(
      `Cannot delete scheme: It has been applied to ${applicationCount} transaction(s). You can set its status to 'INACTIVE' or 'EXPIRED' instead to preserve audit records.`
    );
  }

  const existing = await prisma.scheme.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Scheme not found.");
  }

  await prisma.scheme.delete({
    where: { id },
  });

  await recordAuditLog({
    entityType: "SCHEME",
    entityId: id,
    action: "DELETE",
    oldValues: existing,
    reason: `Scheme '${existing.title}' (${existing.code}) deleted`,
  });

  revalidatePath("/schemes");
  return { success: true };
}

export async function bulkImportSchemes(records: Array<Record<string, any>>) {
  let successCount = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 1;

    try {
      const code = (row.code || row.Code || row["Scheme Code"] || "").toString().trim().toUpperCase();
      const title = (row.title || row.Title || row["Scheme Name"] || "").toString().trim();
      const type = (row.type || row.Type || "PERCENTAGE_DISCOUNT").toString().trim().toUpperCase();

      if (!code) throw new Error("Scheme code is required.");
      if (!title) throw new Error("Scheme title is required.");

      const minOrderQty = parseInt(row.minOrderQty || row["Min Qty"] || "1") || 1;
      const discountPercent = parseFloat(row.discountPercent || row["Discount %"] || "0") || 0;
      const flatDiscount = parseFloat(row.flatDiscount || row["Flat Discount"] || "0") || 0;
      const startDate = row.startDate ? new Date(row.startDate) : new Date();
      const endDate = row.endDate ? new Date(row.endDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      await prisma.scheme.upsert({
        where: { code },
        update: {
          title,
          type,
          minOrderQty,
          discountPercent,
          flatDiscount,
          startDate,
          endDate,
          status: "ACTIVE",
          approvalStatus: "APPROVED",
        },
        create: {
          code,
          title,
          type,
          minOrderQty,
          discountPercent,
          flatDiscount,
          startDate,
          endDate,
          status: "ACTIVE",
          approvalStatus: "APPROVED",
        },
      });

      successCount++;
    } catch (err: any) {
      errors.push({ row: rowNum, error: err.message || "Failed to import row" });
    }
  }

  revalidatePath("/schemes");
  return { success: true, count: successCount, errors };
}
