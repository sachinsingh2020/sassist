"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ModuleName } from "@prisma/client";
import { validateCustomFields, recordAuditLog } from "@/lib/customFields";
import { calculateSlaDueDates, processSlaBreachesAndEscalations } from "@/lib/slaEngine";

export interface SlaPolicyFilterInput {
  module?: string;
  triggerEvent?: string;
  priority?: string;
  search?: string;
}

export interface CreateSlaPolicyInput {
  name: string;
  code: string;
  description?: string;
  module: ModuleName;
  triggerEvent: string;
  priority: string;
  responseDeadlineMins: number;
  resolutionDeadlineMins: number;
  businessCalendar?: string;
  workHoursStart?: string;
  workHoursEnd?: string;
  assignedRole?: string;
  escalationLevel1Mins?: number;
  escalationLevel1Role?: string;
  escalationLevel2Mins?: number;
  escalationLevel2Role?: string;
  customFields?: Record<string, any>;
}

export interface UpdateSlaPolicyInput extends Partial<CreateSlaPolicyInput> {
  id: string;
}

export async function getSlaPolicies(filters?: SlaPolicyFilterInput) {
  const where: any = {};

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters?.module && filters.module !== "ALL") {
    where.module = filters.module as ModuleName;
  }

  if (filters?.triggerEvent && filters.triggerEvent !== "ALL") {
    where.triggerEvent = filters.triggerEvent;
  }

  if (filters?.priority && filters.priority !== "ALL") {
    where.priority = filters.priority;
  }

  return await prisma.slaPolicy.findMany({
    where,
    include: {
      _count: {
        select: { executions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSlaPolicyById(id: string) {
  return await prisma.slaPolicy.findUnique({
    where: { id },
    include: {
      executions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

export async function createSlaPolicy(input: CreateSlaPolicyInput) {
  if (!input.name || input.name.trim() === "") {
    throw new Error("SLA Policy name is required.");
  }
  if (!input.code || input.code.trim() === "") {
    throw new Error("SLA Policy code is required.");
  }

  const existing = await prisma.slaPolicy.findUnique({
    where: { code: input.code.trim().toUpperCase() },
  });
  if (existing) {
    throw new Error(`An SLA Policy with code '${input.code}' already exists.`);
  }

  if (input.responseDeadlineMins <= 0 || input.resolutionDeadlineMins <= 0) {
    throw new Error("Deadlines must be positive minutes.");
  }
  if (input.responseDeadlineMins > input.resolutionDeadlineMins) {
    throw new Error("Response deadline cannot exceed resolution deadline.");
  }

  let customFieldsData: any = input.customFields || {};
  if (input.customFields && Object.keys(input.customFields).length > 0) {
    const validation = await validateCustomFields("SLA", input.customFields);
    if (!validation.isValid) {
      throw new Error(validation.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = validation.sanitizedValues;
  }

  const policy = await prisma.slaPolicy.create({
    data: {
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      description: input.description?.trim() || null,
      module: input.module,
      triggerEvent: input.triggerEvent,
      priority: input.priority || "MEDIUM",
      responseDeadlineMins: Number(input.responseDeadlineMins),
      resolutionDeadlineMins: Number(input.resolutionDeadlineMins),
      businessCalendar: input.businessCalendar || "BUSINESS_HOURS",
      workHoursStart: input.workHoursStart || "09:00",
      workHoursEnd: input.workHoursEnd || "18:00",
      assignedRole: input.assignedRole || "SALES_REP",
      escalationLevel1Mins: input.escalationLevel1Mins ? Number(input.escalationLevel1Mins) : 30,
      escalationLevel1Role: input.escalationLevel1Role || "AREA_SALES_MANAGER",
      escalationLevel2Mins: input.escalationLevel2Mins ? Number(input.escalationLevel2Mins) : 120,
      escalationLevel2Role: input.escalationLevel2Role || "SUPER_ADMIN",
      isActive: true,
      customFields: customFieldsData,
    },
  });

  await recordAuditLog({
    entityType: "SLA",
    entityId: policy.id,
    action: "CREATE",
    newValues: policy,
    reason: `SLA Policy '${policy.name}' (${policy.code}) configured`,
  });

  revalidatePath("/sla");
  return { success: true, policy };
}

export async function updateSlaPolicy(input: UpdateSlaPolicyInput) {
  const existing = await prisma.slaPolicy.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("SLA policy not found.");

  let customFieldsData = existing.customFields;
  if (input.customFields) {
    const merged = { ...((existing.customFields as object) || {}), ...input.customFields };
    const validation = await validateCustomFields("SLA", merged);
    if (!validation.isValid) {
      throw new Error(validation.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = validation.sanitizedValues;
  }

  const updated = await prisma.slaPolicy.update({
    where: { id: input.id },
    data: {
      name: input.name !== undefined ? input.name.trim() : existing.name,
      description: input.description !== undefined ? input.description?.trim() || null : existing.description,
      module: input.module !== undefined ? input.module : existing.module,
      triggerEvent: input.triggerEvent !== undefined ? input.triggerEvent : existing.triggerEvent,
      priority: input.priority !== undefined ? input.priority : existing.priority,
      responseDeadlineMins: input.responseDeadlineMins !== undefined ? Number(input.responseDeadlineMins) : existing.responseDeadlineMins,
      resolutionDeadlineMins: input.resolutionDeadlineMins !== undefined ? Number(input.resolutionDeadlineMins) : existing.resolutionDeadlineMins,
      businessCalendar: input.businessCalendar !== undefined ? input.businessCalendar : existing.businessCalendar,
      workHoursStart: input.workHoursStart !== undefined ? input.workHoursStart : existing.workHoursStart,
      workHoursEnd: input.workHoursEnd !== undefined ? input.workHoursEnd : existing.workHoursEnd,
      assignedRole: input.assignedRole !== undefined ? input.assignedRole : existing.assignedRole,
      escalationLevel1Mins: input.escalationLevel1Mins !== undefined ? Number(input.escalationLevel1Mins) : existing.escalationLevel1Mins,
      escalationLevel1Role: input.escalationLevel1Role !== undefined ? input.escalationLevel1Role : existing.escalationLevel1Role,
      escalationLevel2Mins: input.escalationLevel2Mins !== undefined ? Number(input.escalationLevel2Mins) : existing.escalationLevel2Mins,
      escalationLevel2Role: input.escalationLevel2Role !== undefined ? input.escalationLevel2Role : existing.escalationLevel2Role,
      customFields: customFieldsData as any,
    },
  });

  await recordAuditLog({
    entityType: "SLA",
    entityId: updated.id,
    action: "UPDATE",
    oldValues: existing,
    newValues: updated,
    reason: `SLA policy '${updated.name}' parameters modified`,
  });

  revalidatePath("/sla");
  return { success: true, policy: updated };
}

export async function deleteSlaPolicy(id: string) {
  const existing = await prisma.slaPolicy.findUnique({ where: { id } });
  if (!existing) throw new Error("SLA policy not found.");

  await prisma.slaPolicy.delete({ where: { id } });

  await recordAuditLog({
    entityType: "SLA",
    entityId: id,
    action: "DELETE",
    oldValues: existing,
    reason: `SLA policy '${existing.name}' deleted`,
  });

  revalidatePath("/sla");
  return { success: true };
}

/**
 * Triggers SLA tracking for an entity instance
 */
export async function triggerSlaTracking(params: {
  module: ModuleName;
  triggerEvent: string;
  entityType: string;
  entityId: string;
  entityReference?: string;
  priority?: string;
}) {
  const policy = await prisma.slaPolicy.findFirst({
    where: {
      module: params.module,
      triggerEvent: params.triggerEvent,
      isActive: true,
      ...(params.priority ? { priority: params.priority } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!policy) return null;

  const now = new Date();
  const dueDates = calculateSlaDueDates(
    now,
    policy.responseDeadlineMins,
    policy.resolutionDeadlineMins,
    policy.businessCalendar,
    policy.workHoursStart || "09:00",
    policy.workHoursEnd || "18:00"
  );

  const execution = await prisma.slaExecutionLog.create({
    data: {
      policyId: policy.id,
      entityType: params.entityType,
      entityId: params.entityId,
      entityReference: params.entityReference || `${params.entityType}-${params.entityId.slice(0, 8)}`,
      startTime: now,
      responseDueAt: dueDates.responseDueAt,
      resolutionDueAt: dueDates.resolutionDueAt,
      status: "IN_PROGRESS",
    },
  });

  revalidatePath("/sla");
  return execution;
}

export async function getSlaExecutions(filters?: { status?: string; isBreached?: boolean }) {
  const where: any = {};
  if (filters?.status && filters.status !== "ALL") {
    where.status = filters.status;
  }
  if (filters?.isBreached) {
    where.isResolutionBreached = true;
  }

  return await prisma.slaExecutionLog.findMany({
    where,
    include: {
      policy: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function markSlaResponded(executionId: string) {
  const execution = await prisma.slaExecutionLog.findUnique({ where: { id: executionId } });
  if (!execution) throw new Error("Execution not found.");

  const now = new Date();
  const isResponseBreached = now > new Date(execution.responseDueAt);

  const updated = await prisma.slaExecutionLog.update({
    where: { id: executionId },
    data: {
      respondedAt: now,
      isResponseBreached,
    },
  });

  revalidatePath("/sla");
  return { success: true, execution: updated };
}

export async function markSlaResolved(executionId: string, notes?: string) {
  const execution = await prisma.slaExecutionLog.findUnique({ where: { id: executionId } });
  if (!execution) throw new Error("Execution not found.");

  const now = new Date();
  const isResolutionBreached = now > new Date(execution.resolutionDueAt);

  const updated = await prisma.slaExecutionLog.update({
    where: { id: executionId },
    data: {
      resolvedAt: now,
      status: isResolutionBreached ? "BREACHED" : "RESOLVED",
      isResolutionBreached,
      notes: notes || "Resolved within operational SLA guidelines",
    },
  });

  revalidatePath("/sla");
  return { success: true, execution: updated };
}

export async function runSlaEscalationCheck() {
  const result = await processSlaBreachesAndEscalations();
  revalidatePath("/sla");
  return { success: true, ...result };
}
