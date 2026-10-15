"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { validateCustomFields, recordAuditLog } from "@/lib/customFields";
import { calculateTargetAchievement } from "@/lib/targetEngine";

export interface TargetFilterInput {
  search?: string;
  targetPeriod?: string;
  targetMetric?: string;
  dimension?: string;
  approvalStatus?: string;
  employeeId?: string;
}

export interface CreateTargetInput {
  title: string;
  targetCode: string;
  description?: string;
  targetPeriod: string; // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
  targetMetric: string; // SALES_VALUE, SALES_VOLUME, VISITS_COUNT, NEW_CLIENTS
  dimension: string;    // EMPLOYEE, TERRITORY, PRODUCT, TEAM
  employeeId?: string;
  territoryId?: string;
  productId?: string;
  teamName?: string;
  targetQuantity?: number;
  targetValue?: number;
  startDate: string;
  endDate: string;
  approvalStatus?: string;
  customFields?: Record<string, any>;
}

export interface UpdateTargetInput extends Partial<CreateTargetInput> {
  id: string;
}

export async function getTargets(filters?: TargetFilterInput) {
  const where: any = {};

  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { targetCode: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { employee: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  if (filters?.targetPeriod && filters.targetPeriod !== "ALL") {
    where.targetPeriod = filters.targetPeriod;
  }

  if (filters?.targetMetric && filters.targetMetric !== "ALL") {
    where.targetMetric = filters.targetMetric;
  }

  if (filters?.dimension && filters.dimension !== "ALL") {
    where.dimension = filters.dimension;
  }

  if (filters?.approvalStatus && filters.approvalStatus !== "ALL") {
    where.approvalStatus = filters.approvalStatus;
  }

  if (filters?.employeeId && filters.employeeId !== "ALL") {
    where.employeeId = filters.employeeId;
  }

  return await prisma.target.findMany({
    where,
    include: {
      employee: true,
      territory: true,
      product: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTargetById(id: string) {
  return await prisma.target.findUnique({
    where: { id },
    include: {
      employee: true,
      territory: true,
      product: true,
    },
  });
}

/**
 * Checks for duplicate target assignments
 */
export async function checkDuplicateTarget(params: {
  id?: string;
  dimension: string;
  employeeId?: string;
  territoryId?: string;
  productId?: string;
  targetMetric: string;
  targetPeriod: string;
  startDate: string;
  endDate: string;
}) {
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);

  const where: any = {
    targetMetric: params.targetMetric,
    targetPeriod: params.targetPeriod,
    status: "ACTIVE",
    startDate: { lte: end },
    endDate: { gte: start },
  };

  if (params.id) where.id = { not: params.id };
  if (params.dimension === "EMPLOYEE" && params.employeeId) where.employeeId = params.employeeId;
  if (params.dimension === "TERRITORY" && params.territoryId) where.territoryId = params.territoryId;
  if (params.dimension === "PRODUCT" && params.productId) where.productId = params.productId;

  const existing = await prisma.target.findFirst({ where });
  return existing ? true : false;
}

export async function createTarget(input: CreateTargetInput) {
  // 1. Validations
  if (!input.title || input.title.trim() === "") {
    throw new Error("Target title is required.");
  }
  if (!input.targetCode || input.targetCode.trim() === "") {
    throw new Error("Target code is required.");
  }

  const existingCode = await prisma.target.findUnique({
    where: { targetCode: input.targetCode.trim().toUpperCase() },
  });
  if (existingCode) {
    throw new Error(`Target with code '${input.targetCode}' already exists.`);
  }

  if (new Date(input.startDate) > new Date(input.endDate)) {
    throw new Error("Target start date cannot be later than end date.");
  }

  if ((input.targetQuantity ?? 0) < 0 || (input.targetValue ?? 0) < 0) {
    throw new Error("Target goals cannot be negative.");
  }

  // Duplicate assignment check
  const isDuplicate = await checkDuplicateTarget({
    dimension: input.dimension,
    employeeId: input.employeeId,
    territoryId: input.territoryId,
    productId: input.productId,
    targetMetric: input.targetMetric,
    targetPeriod: input.targetPeriod,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  if (isDuplicate) {
    throw new Error(
      "A target for this same entity, metric, and overlapping date period already exists."
    );
  }

  // 2. Custom fields validation
  let customFieldsData: any = input.customFields || {};
  if (input.customFields && Object.keys(input.customFields).length > 0) {
    const validation = await validateCustomFields("TARGET", input.customFields);
    if (!validation.isValid) {
      throw new Error(validation.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = validation.sanitizedValues;
  }

  // 3. Create target
  const target = await prisma.target.create({
    data: {
      title: input.title.trim(),
      targetCode: input.targetCode.trim().toUpperCase(),
      description: input.description?.trim() || null,
      targetPeriod: input.targetPeriod,
      targetMetric: input.targetMetric,
      dimension: input.dimension,
      employeeId: input.employeeId || null,
      territoryId: input.territoryId || null,
      productId: input.productId || null,
      teamName: input.teamName?.trim() || null,
      targetQuantity: input.targetQuantity ? Number(input.targetQuantity) : 0.0,
      targetValue: input.targetValue ? Number(input.targetValue) : 0.0,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      approvalStatus: input.approvalStatus || "APPROVED",
      status: "ACTIVE",
      customFields: customFieldsData,
    },
  });

  // 4. Calculate initial achievement
  const ach = await calculateTargetAchievement(target);
  const updated = await prisma.target.update({
    where: { id: target.id },
    data: {
      actualQuantity: ach.actualQuantity,
      actualValue: ach.actualValue,
      achievementRate: ach.achievementRate,
    },
  });

  await recordAuditLog({
    entityType: "TARGET",
    entityId: target.id,
    action: "CREATE",
    newValues: updated,
    reason: `Target '${target.title}' (${target.targetCode}) assigned`,
  });

  revalidatePath("/targets");
  return { success: true, target: updated };
}

export async function updateTarget(input: UpdateTargetInput) {
  const existing = await prisma.target.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new Error("Target not found.");
  }

  let customFieldsData = existing.customFields;
  if (input.customFields) {
    const merged = { ...((existing.customFields as object) || {}), ...input.customFields };
    const validation = await validateCustomFields("TARGET", merged);
    if (!validation.isValid) {
      throw new Error(validation.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = validation.sanitizedValues;
  }

  const startDate = input.startDate ? new Date(input.startDate) : existing.startDate;
  const endDate = input.endDate ? new Date(input.endDate) : existing.endDate;

  const updated = await prisma.target.update({
    where: { id: input.id },
    data: {
      title: input.title !== undefined ? input.title.trim() : existing.title,
      description: input.description !== undefined ? input.description?.trim() || null : existing.description,
      targetPeriod: input.targetPeriod !== undefined ? input.targetPeriod : existing.targetPeriod,
      targetMetric: input.targetMetric !== undefined ? input.targetMetric : existing.targetMetric,
      dimension: input.dimension !== undefined ? input.dimension : existing.dimension,
      employeeId: input.employeeId !== undefined ? input.employeeId : existing.employeeId,
      territoryId: input.territoryId !== undefined ? input.territoryId : existing.territoryId,
      productId: input.productId !== undefined ? input.productId : existing.productId,
      teamName: input.teamName !== undefined ? input.teamName?.trim() || null : existing.teamName,
      targetQuantity: input.targetQuantity !== undefined ? Number(input.targetQuantity) : existing.targetQuantity,
      targetValue: input.targetValue !== undefined ? Number(input.targetValue) : existing.targetValue,
      startDate,
      endDate,
      approvalStatus: input.approvalStatus !== undefined ? input.approvalStatus : existing.approvalStatus,
      customFields: customFieldsData as any,
    },
  });

  // Recalculate achievement
  const ach = await calculateTargetAchievement(updated);
  const finalUpdated = await prisma.target.update({
    where: { id: updated.id },
    data: {
      actualQuantity: ach.actualQuantity,
      actualValue: ach.actualValue,
      achievementRate: ach.achievementRate,
    },
  });

  await recordAuditLog({
    entityType: "TARGET",
    entityId: updated.id,
    action: "UPDATE",
    oldValues: existing,
    newValues: finalUpdated,
    reason: `Target '${finalUpdated.title}' modified`,
  });

  revalidatePath("/targets");
  return { success: true, target: finalUpdated };
}

export async function updateTargetApproval(id: string, status: string, approvedBy: string = "System Admin") {
  const existing = await prisma.target.findUnique({ where: { id } });
  if (!existing) throw new Error("Target not found.");

  const updated = await prisma.target.update({
    where: { id },
    data: {
      approvalStatus: status,
      approvedBy: status === "APPROVED" ? approvedBy : null,
      approvalDate: status === "APPROVED" ? new Date() : null,
      status: status === "APPROVED" ? "ACTIVE" : existing.status,
    },
  });

  await recordAuditLog({
    entityType: "TARGET",
    entityId: id,
    action: "UPDATE",
    oldValues: { approvalStatus: existing.approvalStatus },
    newValues: { approvalStatus: status },
    reason: `Target approval state set to ${status}`,
  });

  revalidatePath("/targets");
  return { success: true, target: updated };
}

export async function deleteTarget(id: string) {
  const existing = await prisma.target.findUnique({ where: { id } });
  if (!existing) throw new Error("Target not found.");

  await prisma.target.delete({ where: { id } });

  await recordAuditLog({
    entityType: "TARGET",
    entityId: id,
    action: "DELETE",
    oldValues: existing,
    reason: `Target '${existing.title}' (${existing.targetCode}) deleted`,
  });

  revalidatePath("/targets");
  return { success: true };
}

/**
 * Batch recalculates actual achievements across all active targets
 */
export async function refreshAllTargetAchievements() {
  const targets = await prisma.target.findMany({
    where: { status: "ACTIVE" },
  });

  let updatedCount = 0;
  for (const t of targets) {
    const ach = await calculateTargetAchievement(t);
    await prisma.target.update({
      where: { id: t.id },
      data: {
        actualQuantity: ach.actualQuantity,
        actualValue: ach.actualValue,
        achievementRate: ach.achievementRate,
      },
    });
    updatedCount++;
  }

  revalidatePath("/targets");
  return { success: true, count: updatedCount };
}

export async function bulkImportTargets(records: Array<Record<string, any>>) {
  let successCount = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 1;

    try {
      const code = (row.targetCode || row.Code || row["Target Code"] || "").toString().trim().toUpperCase();
      const title = (row.title || row.Title || row["Target Title"] || "").toString().trim();
      const period = (row.targetPeriod || row.Period || "MONTHLY").toString().trim().toUpperCase();
      const metric = (row.targetMetric || row.Metric || "SALES_VALUE").toString().trim().toUpperCase();

      if (!code) throw new Error("Target Code is required.");
      if (!title) throw new Error("Target Title is required.");

      const targetValue = parseFloat(row.targetValue || row["Target Value"] || "0") || 0;
      const targetQuantity = parseFloat(row.targetQuantity || row["Target Quantity"] || "0") || 0;
      const startDate = row.startDate ? new Date(row.startDate) : new Date();
      const endDate = row.endDate ? new Date(row.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const created = await prisma.target.upsert({
        where: { targetCode: code },
        update: {
          title,
          targetPeriod: period,
          targetMetric: metric,
          targetValue,
          targetQuantity,
          startDate,
          endDate,
        },
        create: {
          targetCode: code,
          title,
          targetPeriod: period,
          targetMetric: metric,
          targetValue,
          targetQuantity,
          startDate,
          endDate,
          approvalStatus: "APPROVED",
          status: "ACTIVE",
        },
      });

      const ach = await calculateTargetAchievement(created);
      await prisma.target.update({
        where: { id: created.id },
        data: {
          actualQuantity: ach.actualQuantity,
          actualValue: ach.actualValue,
          achievementRate: ach.achievementRate,
        },
      });

      successCount++;
    } catch (err: any) {
      errors.push({ row: rowNum, error: err.message || "Failed to import row" });
    }
  }

  revalidatePath("/targets");
  return { success: true, count: successCount, errors };
}
