"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ModuleName } from "@prisma/client";
import { validateCustomFields, recordAuditLog } from "@/lib/customFields";
import { evaluateAutomationRules } from "@/lib/automationEngine";

export interface AutomationRuleFilterInput {
  module?: string;
  triggerType?: string;
  actionType?: string;
  search?: string;
  status?: string;
}

export interface CreateAutomationRuleInput {
  ruleName: string;
  ruleCode: string;
  description?: string;
  module: ModuleName;
  triggerType: string;
  triggerField?: string;
  conditionsJson?: string;
  actionType: string;
  actionConfigJson?: string;
  executionTiming?: string;
  effectiveDate?: string;
  effectiveTime?: string;
  timeZone?: string;
  recurrence?: string;
  requiresApproval?: boolean;
  approvalStatus?: string;
  failurePolicy?: string;
  status?: string;
  customFields?: Record<string, any>;
}

export interface UpdateAutomationRuleInput extends Partial<CreateAutomationRuleInput> {
  id: string;
}

export async function getAutomationRules(filters?: AutomationRuleFilterInput) {
  const where: any = {};

  if (filters?.search) {
    where.OR = [
      { ruleName: { contains: filters.search, mode: "insensitive" } },
      { ruleCode: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters?.module && filters.module !== "ALL") {
    where.module = filters.module as ModuleName;
  }

  if (filters?.triggerType && filters.triggerType !== "ALL") {
    where.triggerType = filters.triggerType;
  }

  if (filters?.actionType && filters.actionType !== "ALL") {
    where.actionType = filters.actionType;
  }

  if (filters?.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  return await prisma.automationRule.findMany({
    where,
    include: {
      _count: {
        select: { executionLogs: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAutomationRuleById(id: string) {
  return await prisma.automationRule.findUnique({
    where: { id },
    include: {
      executionLogs: {
        orderBy: { executedAt: "desc" },
        take: 50,
      },
    },
  });
}

export async function createAutomationRule(input: CreateAutomationRuleInput) {
  if (!input.ruleName || input.ruleName.trim() === "") {
    throw new Error("Rule name is mandatory.");
  }
  if (!input.ruleCode || input.ruleCode.trim() === "") {
    throw new Error("Rule code is mandatory.");
  }

  const existing = await prisma.automationRule.findUnique({
    where: { ruleCode: input.ruleCode.trim().toUpperCase() },
  });
  if (existing) {
    throw new Error(`An automation rule with code '${input.ruleCode}' already exists.`);
  }

  let customFieldsData: any = input.customFields || {};
  if (input.customFields && Object.keys(input.customFields).length > 0) {
    const validation = await validateCustomFields("AUTOMATION", input.customFields);
    if (!validation.isValid) {
      throw new Error(validation.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = validation.sanitizedValues;
  }

  const rule = await prisma.automationRule.create({
    data: {
      ruleName: input.ruleName.trim(),
      ruleCode: input.ruleCode.trim().toUpperCase(),
      description: input.description?.trim() || null,
      module: input.module,
      triggerType: input.triggerType,
      triggerField: input.triggerField?.trim() || null,
      conditionsJson: input.conditionsJson || "[]",
      actionType: input.actionType,
      actionConfigJson: input.actionConfigJson || "{}",
      executionTiming: input.executionTiming || "IMMEDIATE",
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : new Date(),
      effectiveTime: input.effectiveTime || "00:00",
      timeZone: input.timeZone || "Asia/Kolkata",
      recurrence: input.recurrence || "ONCE",
      requiresApproval: input.requiresApproval || false,
      approvalStatus: input.approvalStatus || "APPROVED",
      failurePolicy: input.failurePolicy || "CONTINUE",
      status: input.status || "ACTIVE",
      isActive: (input.status || "ACTIVE") === "ACTIVE",
      customFields: customFieldsData,
    },
  });

  await recordAuditLog({
    entityType: "AUTOMATION",
    entityId: rule.id,
    action: "CREATE",
    newValues: rule,
    reason: `Automation rule '${rule.ruleName}' (${rule.ruleCode}) created`,
  });

  revalidatePath("/automation");
  return { success: true, rule };
}

export async function updateAutomationRule(input: UpdateAutomationRuleInput) {
  const existing = await prisma.automationRule.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("Automation rule not found.");

  let customFieldsData = existing.customFields;
  if (input.customFields) {
    const merged = { ...((existing.customFields as object) || {}), ...input.customFields };
    const validation = await validateCustomFields("AUTOMATION", merged);
    if (!validation.isValid) {
      throw new Error(validation.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = validation.sanitizedValues;
  }

  const updated = await prisma.automationRule.update({
    where: { id: input.id },
    data: {
      ruleName: input.ruleName !== undefined ? input.ruleName.trim() : existing.ruleName,
      description: input.description !== undefined ? input.description?.trim() || null : existing.description,
      module: input.module !== undefined ? input.module : existing.module,
      triggerType: input.triggerType !== undefined ? input.triggerType : existing.triggerType,
      triggerField: input.triggerField !== undefined ? input.triggerField?.trim() || null : existing.triggerField,
      conditionsJson: input.conditionsJson !== undefined ? input.conditionsJson : existing.conditionsJson,
      actionType: input.actionType !== undefined ? input.actionType : existing.actionType,
      actionConfigJson: input.actionConfigJson !== undefined ? input.actionConfigJson : existing.actionConfigJson,
      executionTiming: input.executionTiming !== undefined ? input.executionTiming : existing.executionTiming,
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : existing.effectiveDate,
      effectiveTime: input.effectiveTime !== undefined ? input.effectiveTime : existing.effectiveTime,
      recurrence: input.recurrence !== undefined ? input.recurrence : existing.recurrence,
      requiresApproval: input.requiresApproval !== undefined ? input.requiresApproval : existing.requiresApproval,
      approvalStatus: input.approvalStatus !== undefined ? input.approvalStatus : existing.approvalStatus,
      failurePolicy: input.failurePolicy !== undefined ? input.failurePolicy : existing.failurePolicy,
      status: input.status !== undefined ? input.status : existing.status,
      isActive: input.status !== undefined ? input.status === "ACTIVE" : existing.isActive,
      customFields: customFieldsData as any,
    },
  });

  await recordAuditLog({
    entityType: "AUTOMATION",
    entityId: updated.id,
    action: "UPDATE",
    oldValues: existing,
    newValues: updated,
    reason: `Automation rule '${updated.ruleName}' updated`,
  });

  revalidatePath("/automation");
  return { success: true, rule: updated };
}

export async function deleteAutomationRule(id: string) {
  const existing = await prisma.automationRule.findUnique({ where: { id } });
  if (!existing) throw new Error("Rule not found.");

  await prisma.automationRule.delete({ where: { id } });

  await recordAuditLog({
    entityType: "AUTOMATION",
    entityId: id,
    action: "DELETE",
    oldValues: existing,
    reason: `Automation rule '${existing.ruleName}' deleted`,
  });

  revalidatePath("/automation");
  return { success: true };
}

export async function toggleAutomationRuleStatus(id: string, active: boolean) {
  const existing = await prisma.automationRule.findUnique({ where: { id } });
  if (!existing) throw new Error("Rule not found.");

  const updated = await prisma.automationRule.update({
    where: { id },
    data: {
      isActive: active,
      status: active ? "ACTIVE" : "PAUSED",
    },
  });

  revalidatePath("/automation");
  return { success: true, rule: updated };
}

export async function getAutomationExecutionLogs(filters?: {
  ruleId?: string;
  executionStatus?: string;
}) {
  const where: any = {};
  if (filters?.ruleId && filters.ruleId !== "ALL") where.ruleId = filters.ruleId;
  if (filters?.executionStatus && filters.executionStatus !== "ALL") where.executionStatus = filters.executionStatus;

  return await prisma.automationExecutionLog.findMany({
    where,
    include: {
      rule: true,
    },
    orderBy: { executedAt: "desc" },
    take: 100,
  });
}

export async function retryAutomationExecution(logId: string) {
  const log = await prisma.automationExecutionLog.findUnique({
    where: { id: logId },
    include: { rule: true },
  });

  if (!log) throw new Error("Execution log not found.");

  const results = await evaluateAutomationRules({
    module: log.rule.module,
    triggerType: log.triggerEvent as any,
    entityId: log.entityId,
    entityData: log.beforeSnapshot || {},
  });

  revalidatePath("/automation");
  return { success: true, results };
}

/**
 * Seeds initial enterprise automation rules if none are configured
 */
export async function seedDefaultAutomationRules() {
  const count = await prisma.automationRule.count();
  if (count > 0) return { seeded: false, count };

  // 1. Auto convert to CUSTOMER on first secondary order
  await prisma.automationRule.create({
    data: {
      ruleName: "Auto-Convert Account to Customer on First Order",
      ruleCode: "AUTO-CONV-FIRST-ORDER",
      description: "When an order is submitted, automatically promote the account from Lead/Prospect to verified Customer, setting stage to WON.",
      module: "ORDER",
      triggerType: "RECORD_CREATED",
      conditionsJson: JSON.stringify([
        { field: "totalAmount", operator: "GREATER_THAN", value: 0 },
      ]),
      actionType: "CLIENT_TYPE_CONVERSION",
      actionConfigJson: JSON.stringify({
        toType: "CUSTOMER",
        stage: "WON",
        reason: "Automatic commercial account upgrade triggered by first confirmed order",
      }),
      status: "ACTIVE",
      isActive: true,
      approvalStatus: "APPROVED",
    },
  });

  // 2. High Value Lead Auto-Qualification
  await prisma.automationRule.create({
    data: {
      ruleName: "Auto-Qualify High Value Enterprise Leads",
      ruleCode: "AUTO-QUALIFY-HIGH-VAL",
      description: "Automatically sets stage to QUALIFIED when an account has expected revenue pipeline >= ₹1,00,000.",
      module: "CLIENT",
      triggerType: "RECORD_CREATED",
      conditionsJson: JSON.stringify([
        { field: "expectedVal", operator: "GREATER_THAN", value: 99999 },
      ]),
      actionType: "FIELD_UPDATE",
      actionConfigJson: JSON.stringify({
        fieldUpdates: { stage: "QUALIFIED" },
        reason: "High Pipeline Value Auto-Qualification",
      }),
      status: "ACTIVE",
      isActive: true,
      approvalStatus: "APPROVED",
    },
  });

  revalidatePath("/automation");
  return { seeded: true, count: 2 };
}
