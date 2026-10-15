import { prisma } from "@/lib/prisma";

export interface ScheduledChangeInput {
  title: string;
  entityType: "PRODUCT_PRICE" | "TARGET_REVISION" | "SCHEME_STATUS" | "EMPLOYEE_TRANSFER" | "AUTOMATION_TOGGLE";
  entityId: string;
  entityName?: string;
  changeType: string;
  scheduledFor: Date | string;
  payloadJson: Record<string, any>;
  appliedBy?: string;
}

export interface ExecutionResult {
  totalPending: number;
  processed: number;
  appliedCount: number;
  failedCount: number;
  results: {
    id: string;
    title: string;
    entityType: string;
    entityId: string;
    status: "APPLIED" | "FAILED";
    error?: string;
  }[];
}

/**
 * Creates a future-dated or pending scheduled change
 */
export async function scheduleChange(input: ScheduledChangeInput) {
  const scheduledDate = new Date(input.scheduledFor);

  const change = await prisma.scheduledChange.create({
    data: {
      title: input.title,
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName || null,
      changeType: input.changeType,
      scheduledFor: scheduledDate,
      payloadJson: input.payloadJson || {},
      status: "PENDING",
      appliedBy: input.appliedBy || "System",
    },
  });

  // Log in AuditLog
  try {
    await prisma.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: "SCHEDULED_CHANGE_CREATED",
        actorName: input.appliedBy || "System Admin",
        actorEmail: "admin@sassist.crm",
        reason: `Scheduled change created: ${input.title}`,
        newValues: {
          scheduledChangeId: change.id,
          title: change.title,
          scheduledFor: scheduledDate.toISOString(),
          payload: input.payloadJson,
        },
      },
    });
  } catch (e) {
    console.error("Failed to write audit log for scheduled change:", e);
  }

  return change;
}

/**
 * Cancels a pending scheduled change
 */
export async function cancelScheduledChange(id: string, cancelledBy = "Admin") {
  const change = await prisma.scheduledChange.findUnique({ where: { id } });
  if (!change) throw new Error("Scheduled change not found");
  if (change.status !== "PENDING") {
    throw new Error(`Cannot cancel change with status: ${change.status}`);
  }

  const updated = await prisma.scheduledChange.update({
    where: { id },
    data: {
      status: "CANCELLED",
      errorMessage: `Cancelled by ${cancelledBy} on ${new Date().toISOString()}`,
    },
  });

  try {
    await prisma.auditLog.create({
      data: {
        entityType: change.entityType,
        entityId: change.entityId,
        action: "SCHEDULED_CHANGE_CANCELLED",
        actorName: cancelledBy,
        actorEmail: "admin@sassist.crm",
        reason: `Scheduled change cancelled: ${change.title}`,
        newValues: { scheduledChangeId: id, title: change.title },
      },
    });
  } catch (e) {
    console.error("Failed to write audit log for cancellation:", e);
  }

  return updated;
}

/**
 * Applies a specific scheduled change payload to the target entity
 */
async function applySingleChange(change: any): Promise<void> {
  const { entityType, entityId, payloadJson } = change;
  const payload = (payloadJson as Record<string, any>) || {};

  switch (entityType) {
    case "PRODUCT_PRICE": {
      const product = await prisma.product.findUnique({ where: { id: entityId } });
      if (!product) throw new Error(`Product with ID ${entityId} not found`);

      const oldMrp = product.mrp;
      const newMrp = payload.mrp !== undefined ? parseFloat(payload.mrp) : product.mrp;
      const newBasePrice = payload.basePrice !== undefined ? parseFloat(payload.basePrice) : product.basePrice;
      const newDistributorPrice = payload.distributorPrice !== undefined ? parseFloat(payload.distributorPrice) : product.distributorPrice;
      const newRetailerPrice = payload.retailerPrice !== undefined ? parseFloat(payload.retailerPrice) : product.retailerPrice;

      // Update product
      await prisma.product.update({
        where: { id: entityId },
        data: {
          mrp: newMrp,
          basePrice: newBasePrice,
          distributorPrice: newDistributorPrice,
          retailerPrice: newRetailerPrice,
        },
      });

      // Insert into ProductPriceHistory
      await prisma.productPriceHistory.create({
        data: {
          productId: entityId,
          oldMrp: oldMrp,
          newMrp: newMrp,
          oldDistributorPrice: product.distributorPrice,
          newDistributorPrice: newDistributorPrice,
          oldRetailerPrice: product.retailerPrice,
          newRetailerPrice: newRetailerPrice,
          effectiveDate: new Date(),
          reason: payload.reason || change.title || "Scheduled automated price update",
          changedBy: change.appliedBy || "Scheduled Engine",
        },
      });
      break;
    }

    case "TARGET_REVISION": {
      const target = await prisma.target.findUnique({ where: { id: entityId } });
      if (!target) throw new Error(`Target with ID ${entityId} not found`);

      const newTargetValue = payload.targetValue !== undefined ? parseFloat(payload.targetValue) : target.targetValue;
      const newTargetQty = payload.targetQuantity !== undefined ? parseFloat(payload.targetQuantity) : target.targetQuantity;
      
      // Recalculate achievement rate
      const actualVal = target.actualValue || 0;
      const newAchievement = newTargetValue && newTargetValue > 0 ? (actualVal / newTargetValue) * 100 : 0;

      await prisma.target.update({
        where: { id: entityId },
        data: {
          targetValue: newTargetValue,
          targetQuantity: newTargetQty,
          achievementRate: parseFloat(newAchievement.toFixed(2)),
          description: payload.notes ? `${target.description || ""} [Revised: ${payload.notes}]` : target.description,
        },
      });
      break;
    }

    case "SCHEME_STATUS": {
      const scheme = await prisma.scheme.findUnique({ where: { id: entityId } });
      if (!scheme) throw new Error(`Scheme with ID ${entityId} not found`);

      const newStatus = payload.status || (payload.isActive ? "ACTIVE" : "INACTIVE");
      const isActive = newStatus === "ACTIVE";

      await prisma.scheme.update({
        where: { id: entityId },
        data: {
          status: newStatus,
          isActive: isActive,
        },
      });
      break;
    }

    case "EMPLOYEE_TRANSFER": {
      const employee = await prisma.employee.findUnique({ where: { id: entityId } });
      if (!employee) throw new Error(`Employee with ID ${entityId} not found`);

      const updateData: Record<string, any> = {};
      if (payload.managerId !== undefined) {
        updateData.managerId = payload.managerId || null;
      }
      if (payload.territoryName !== undefined) {
        updateData.territoryName = payload.territoryName;
      }
      if (payload.status !== undefined) {
        updateData.status = payload.status;
      }
      if (payload.designation !== undefined) {
        updateData.designation = payload.designation;
      }

      await prisma.employee.update({
        where: { id: entityId },
        data: updateData,
      });
      break;
    }

    case "AUTOMATION_TOGGLE": {
      const rule = await prisma.automationRule.findUnique({ where: { id: entityId } });
      if (!rule) throw new Error(`Automation rule with ID ${entityId} not found`);

      const newStatus = payload.status || (payload.isActive ? "ACTIVE" : "PAUSED");
      const isActive = newStatus === "ACTIVE";

      await prisma.automationRule.update({
        where: { id: entityId },
        data: {
          status: newStatus,
          isActive: isActive,
        },
      });
      break;
    }

    default:
      throw new Error(`Unsupported entityType: ${entityType}`);
  }
}

/**
 * Finds all pending scheduled changes where scheduledFor <= now, and applies them
 */
export async function processScheduledChanges(): Promise<ExecutionResult> {
  const now = new Date();

  const pendingChanges = await prisma.scheduledChange.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: now },
    },
    orderBy: { scheduledFor: "asc" },
  });

  const results: ExecutionResult["results"] = [];
  let appliedCount = 0;
  let failedCount = 0;

  for (const change of pendingChanges) {
    try {
      await applySingleChange(change);

      await prisma.scheduledChange.update({
        where: { id: change.id },
        data: {
          status: "APPLIED",
          appliedAt: new Date(),
          errorMessage: null,
        },
      });

      // Write audit log
      try {
        await prisma.auditLog.create({
          data: {
            entityType: change.entityType,
            entityId: change.entityId,
            action: "SCHEDULED_CHANGE_APPLIED",
            actorName: "Scheduled Engine",
            actorEmail: "admin@sassist.crm",
            reason: `Scheduled change applied: ${change.title}`,
            newValues: {
              scheduledChangeId: change.id,
              title: change.title,
              appliedAt: new Date().toISOString(),
              payload: change.payloadJson,
            },
          },
        });
      } catch (e) {
        console.error("Audit log error:", e);
      }

      appliedCount++;
      results.push({
        id: change.id,
        title: change.title,
        entityType: change.entityType,
        entityId: change.entityId,
        status: "APPLIED",
      });
    } catch (err: any) {
      const errorMsg = err?.message || "Execution failed";

      await prisma.scheduledChange.update({
        where: { id: change.id },
        data: {
          status: "FAILED",
          errorMessage: errorMsg,
        },
      });

      failedCount++;
      results.push({
        id: change.id,
        title: change.title,
        entityType: change.entityType,
        entityId: change.entityId,
        status: "FAILED",
        error: errorMsg,
      });
    }
  }

  return {
    totalPending: pendingChanges.length,
    processed: pendingChanges.length,
    appliedCount,
    failedCount,
    results,
  };
}
