import { prisma } from "@/lib/prisma";
import { ModuleName } from "@prisma/client";
import { triggerSlaTracking } from "@/actions/sla";

export interface ConditionSpec {
  field: string;
  operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN" | "IN" | "IS_NOT_EMPTY";
  value: any;
}

export interface ActionConfigSpec {
  toType?: string; // for CLIENT_TYPE_CONVERSION e.g. "CUSTOMER"
  stage?: string;  // e.g. "WON"
  reason?: string;
  fieldUpdates?: Record<string, any>; // for FIELD_UPDATE
  newOwnerId?: string; // for OWNERSHIP_CHANGE
  notificationMessage?: string;
}

export interface RuleEvaluationEvent {
  module: ModuleName;
  triggerType: "RECORD_CREATED" | "RECORD_UPDATED" | "FIELD_CHANGED" | "STATUS_CHANGED" | "SCHEDULED_TIME";
  triggerField?: string;
  entityId: string;
  entityData: any;
  previousData?: any;
  actor?: string;
}

/**
 * Checks whether an entity meets the configured conditions of an automation rule
 */
export function checkRuleConditions(entityData: any, conditionsJson: string): boolean {
  try {
    const conditions: ConditionSpec[] = JSON.parse(conditionsJson || "[]");
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return true; // No conditions = always matches
    }

    return conditions.every((cond) => {
      const actualVal = entityData[cond.field];

      switch (cond.operator) {
        case "EQUALS":
          return String(actualVal).toLowerCase() === String(cond.value).toLowerCase();
        case "NOT_EQUALS":
          return String(actualVal).toLowerCase() !== String(cond.value).toLowerCase();
        case "CONTAINS":
          return String(actualVal).toLowerCase().includes(String(cond.value).toLowerCase());
        case "GREATER_THAN":
          return Number(actualVal) > Number(cond.value);
        case "LESS_THAN":
          return Number(actualVal) < Number(cond.value);
        case "IN":
          const candidates = Array.isArray(cond.value) ? cond.value : String(cond.value).split(",");
          return candidates.map((c) => String(c).trim().toLowerCase()).includes(String(actualVal).toLowerCase());
        case "IS_NOT_EMPTY":
          return actualVal !== null && actualVal !== undefined && actualVal !== "";
        default:
          return true;
      }
    });
  } catch (err) {
    console.error("Condition check error:", err);
    return false;
  }
}

/**
 * Evaluates active automation rules against an entity lifecycle event
 */
export async function evaluateAutomationRules(event: RuleEvaluationEvent) {
  try {
    // 1. Fetch active approved rules for this module and trigger
    const rules = await prisma.automationRule.findMany({
      where: {
        module: event.module,
        triggerType: event.triggerType,
        isActive: true,
        approvalStatus: "APPROVED",
        status: "ACTIVE",
      },
    });

    if (rules.length === 0) return [];

    const executionResults = [];

    for (const rule of rules) {
      // 2. Field-specific check if triggerField is specified
      if (rule.triggerField && event.triggerField && rule.triggerField !== event.triggerField) {
        continue;
      }

      // 3. Condition check
      const matches = checkRuleConditions(event.entityData, rule.conditionsJson);
      if (!matches) continue;

      // 4. Execute Action
      let actionTaken = "";
      let executionStatus = "SUCCESS";
      let errorMessage: string | null = null;
      const beforeSnapshot = { ...event.entityData };
      let afterSnapshot: any = null;

      try {
        let actionConfig: ActionConfigSpec = {};
        try {
          actionConfig = JSON.parse(rule.actionConfigJson || "{}");
        } catch {
          actionConfig = {};
        }

        if (rule.actionType === "CLIENT_TYPE_CONVERSION") {
          // Automatic Client Conversion to CUSTOMER
          let clientId = event.entityId;
          // If event is an ORDER, look up client/retailer
          if (event.module === "ORDER") {
            clientId = event.entityData.retailerId || event.entityData.clientId;
          }

          if (clientId) {
            const client = await prisma.client.findUnique({ where: { id: clientId } });
            if (client) {
              const fromType = client.clientType;
              const toType = actionConfig.toType || "CUSTOMER";
              const newStage = actionConfig.stage || "WON";
              const reason = actionConfig.reason || `Automated conversion by rule '${rule.ruleName}'`;

              if (fromType !== toType) {
                const updatedClient = await prisma.client.update({
                  where: { id: clientId },
                  data: {
                    clientType: toType,
                    stage: newStage,
                    status: "ACTIVE",
                  },
                });

                // Record in ClientTypeHistory
                await prisma.clientTypeHistory.create({
                  data: {
                    clientId: client.id,
                    fromType,
                    toType,
                    triggerReason: reason,
                    triggerTransactionId: event.entityId,
                    changedBy: "Automation Engine",
                  },
                });

                actionTaken = `Converted Client (${client.businessName}) from ${fromType} to ${toType} (Stage: ${newStage})`;
                afterSnapshot = updatedClient;
              } else {
                actionTaken = `Client already has type ${toType}. Skipped redundant conversion.`;
              }
            }
          }
        } else if (rule.actionType === "FIELD_UPDATE" && actionConfig.fieldUpdates) {
          // Dynamic Field Update on Entity
          if (event.module === "CLIENT") {
            afterSnapshot = await prisma.client.update({
              where: { id: event.entityId },
              data: actionConfig.fieldUpdates,
            });
            actionTaken = `Updated fields: ${JSON.stringify(actionConfig.fieldUpdates)}`;
          } else if (event.module === "ORDER") {
            afterSnapshot = await prisma.order.update({
              where: { id: event.entityId },
              data: actionConfig.fieldUpdates,
            });
            actionTaken = `Updated order fields: ${JSON.stringify(actionConfig.fieldUpdates)}`;
          }
        } else if (rule.actionType === "OWNERSHIP_CHANGE" && actionConfig.newOwnerId) {
          // Reassign Ownership
          if (event.module === "CLIENT") {
            afterSnapshot = await prisma.client.update({
              where: { id: event.entityId },
              data: { ownerId: actionConfig.newOwnerId },
            });
            actionTaken = `Reassigned client owner to Employee ID ${actionConfig.newOwnerId}`;
          }
        } else if (rule.actionType === "SLA_TRIGGER") {
          // Trigger SLA Tracking
          await triggerSlaTracking({
            module: event.module,
            triggerEvent: event.triggerType,
            entityType: event.module,
            entityId: event.entityId,
            entityReference: event.entityData?.orderNumber || event.entityData?.businessName,
          });
          actionTaken = `Triggered SLA Tracking for ${event.module} #${event.entityId}`;
        } else {
          actionTaken = `Action ${rule.actionType} acknowledged and processed`;
        }

        // 5. Update Rule execution statistics
        await prisma.automationRule.update({
          where: { id: rule.id },
          data: {
            executionCount: { increment: 1 },
            lastExecutedAt: new Date(),
          },
        });
      } catch (err: any) {
        executionStatus = "FAILED";
        errorMessage = err.message || "Action execution error";
        console.error(`Rule '${rule.ruleName}' execution failed:`, err);
      }

      // 6. Record Execution Log
      const log = await prisma.automationExecutionLog.create({
        data: {
          ruleId: rule.id,
          entityType: String(event.module),
          entityId: event.entityId,
          entityReference:
            event.entityData?.orderNumber ||
            event.entityData?.businessName ||
            event.entityData?.name ||
            `${event.module}-${event.entityId.slice(0, 8)}`,
          triggerEvent: event.triggerType,
          executionStatus,
          actionTaken: actionTaken || "Completed without mutations",
          beforeSnapshot: beforeSnapshot as any,
          afterSnapshot: afterSnapshot as any,
          errorMessage,
        },
      });

      executionResults.push(log);
    }

    return executionResults;
  } catch (err) {
    console.error("Automation engine evaluation error:", err);
    return [];
  }
}
