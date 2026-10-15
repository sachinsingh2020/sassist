"use server";

import { prisma } from "@/lib/prisma";
import { scheduleChange, cancelScheduledChange, processScheduledChanges, ScheduledChangeInput } from "@/lib/schedulingEngine";
import { revalidatePath } from "next/cache";

export async function fetchScheduledChanges(statusFilter?: string) {
  try {
    const whereClause: any = {};
    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    const changes = await prisma.scheduledChange.findMany({
      where: whereClause,
      orderBy: { scheduledFor: "desc" },
      take: 100,
    });

    return { success: true, data: changes };
  } catch (error: any) {
    console.error("Error fetching scheduled changes:", error);
    return { success: false, error: error.message || "Failed to fetch scheduled changes", data: [] };
  }
}

export async function addScheduledChange(input: ScheduledChangeInput) {
  try {
    const change = await scheduleChange(input);
    revalidatePath("/schedule");
    return { success: true, data: change };
  } catch (error: any) {
    console.error("Error adding scheduled change:", error);
    return { success: false, error: error.message || "Failed to schedule change" };
  }
}

export async function cancelSchedule(id: string) {
  try {
    const change = await cancelScheduledChange(id);
    revalidatePath("/schedule");
    return { success: true, data: change };
  } catch (error: any) {
    console.error("Error cancelling scheduled change:", error);
    return { success: false, error: error.message || "Failed to cancel scheduled change" };
  }
}

export async function executePendingScheduledChanges() {
  try {
    const result = await processScheduledChanges();
    revalidatePath("/schedule");
    revalidatePath("/products");
    revalidatePath("/targets");
    revalidatePath("/schemes");
    revalidatePath("/employees");
    return { success: true, result };
  } catch (error: any) {
    console.error("Error running pending changes:", error);
    return { success: false, error: error.message || "Execution error" };
  }
}

export async function getScheduleMetrics() {
  try {
    const [totalPending, totalApplied, totalFailed, totalCancelled, nextJob] = await Promise.all([
      prisma.scheduledChange.count({ where: { status: "PENDING" } }),
      prisma.scheduledChange.count({ where: { status: "APPLIED" } }),
      prisma.scheduledChange.count({ where: { status: "FAILED" } }),
      prisma.scheduledChange.count({ where: { status: "CANCELLED" } }),
      prisma.scheduledChange.findFirst({
        where: { status: "PENDING" },
        orderBy: { scheduledFor: "asc" },
      }),
    ]);

    return {
      success: true,
      metrics: {
        totalPending,
        totalApplied,
        totalFailed,
        totalCancelled,
        nextJobTime: nextJob ? nextJob.scheduledFor : null,
        nextJobTitle: nextJob ? nextJob.title : null,
      },
    };
  } catch (error: any) {
    console.error("Error getting schedule metrics:", error);
    return {
      success: false,
      metrics: {
        totalPending: 0,
        totalApplied: 0,
        totalFailed: 0,
        totalCancelled: 0,
        nextJobTime: null,
        nextJobTitle: null,
      },
    };
  }
}

/**
 * Helper to fetch available entities for scheduling forms
 */
export async function getSchedulableEntities() {
  try {
    const [products, targets, schemes, employees, rules] = await Promise.all([
      prisma.product.findMany({ select: { id: true, name: true, sku: true, mrp: true, basePrice: true }, take: 100 }),
      prisma.target.findMany({ select: { id: true, title: true, targetCode: true, targetValue: true }, take: 100 }),
      prisma.scheme.findMany({ select: { id: true, title: true, code: true, status: true }, take: 100 }),
      prisma.employee.findMany({ select: { id: true, name: true, empCode: true, designation: true, territoryName: true }, take: 100 }),
      prisma.automationRule.findMany({ select: { id: true, ruleName: true, ruleCode: true, status: true }, take: 100 }),
    ]);

    return {
      success: true,
      data: {
        products,
        targets,
        schemes,
        employees,
        rules,
      },
    };
  } catch (error: any) {
    console.error("Error fetching schedulable entities:", error);
    return {
      success: false,
      data: { products: [], targets: [], schemes: [], employees: [], rules: [] },
    };
  }
}
