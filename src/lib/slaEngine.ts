import { prisma } from "@/lib/prisma";

export interface SlaDeadlineResult {
  responseDueAt: Date;
  resolutionDueAt: Date;
}

/**
 * Calculates due timestamps respecting Business Hours vs 24x7 calendar
 */
export function calculateSlaDueDates(
  startTime: Date,
  responseMinutes: number,
  resolutionMinutes: number,
  calendarType: string = "BUSINESS_HOURS",
  workHoursStart: string = "09:00",
  workHoursEnd: string = "18:00"
): SlaDeadlineResult {
  if (calendarType === "24X7") {
    const responseDueAt = new Date(startTime.getTime() + responseMinutes * 60 * 1000);
    const resolutionDueAt = new Date(startTime.getTime() + resolutionMinutes * 60 * 1000);
    return { responseDueAt, resolutionDueAt };
  }

  // Business Hours calculation
  const addBusinessMinutes = (start: Date, minsToAdd: number): Date => {
    let current = new Date(start);
    let remainingMins = minsToAdd;

    const [startH, startM] = workHoursStart.split(":").map(Number);
    const [endH, endM] = workHoursEnd.split(":").map(Number);
    const dayWorkMins = (endH - startH) * 60 + (endM - startM);

    while (remainingMins > 0) {
      // Skip weekend (Saturday = 6, Sunday = 0)
      const dayOfWeek = current.getDay();
      if (dayOfWeek === 0) {
        current.setDate(current.getDate() + 1);
        current.setHours(startH, startM, 0, 0);
        continue;
      }
      if (dayOfWeek === 6) {
        current.setDate(current.getDate() + 2);
        current.setHours(startH, startM, 0, 0);
        continue;
      }

      // Check current day's business window
      const curH = current.getHours();
      const curM = current.getMinutes();
      const curTotalMins = curH * 60 + curM;
      const workStartTotal = startH * 60 + startM;
      const workEndTotal = endH * 60 + endM;

      if (curTotalMins < workStartTotal) {
        current.setHours(startH, startM, 0, 0);
      } else if (curTotalMins >= workEndTotal) {
        // Next day morning
        current.setDate(current.getDate() + 1);
        current.setHours(startH, startM, 0, 0);
        continue;
      }

      const availableToday = workEndTotal - (current.getHours() * 60 + current.getMinutes());
      if (remainingMins <= availableToday) {
        current = new Date(current.getTime() + remainingMins * 60 * 1000);
        remainingMins = 0;
      } else {
        remainingMins -= availableToday;
        current.setDate(current.getDate() + 1);
        current.setHours(startH, startM, 0, 0);
      }
    }

    return current;
  };

  return {
    responseDueAt: addBusinessMinutes(startTime, responseMinutes),
    resolutionDueAt: addBusinessMinutes(startTime, resolutionMinutes),
  };
}

/**
 * Scans active SLA executions, detects breaches, and triggers multi-level escalations
 */
export async function processSlaBreachesAndEscalations() {
  const now = new Date();

  const activeExecutions = await prisma.slaExecutionLog.findMany({
    where: {
      status: "IN_PROGRESS",
    },
    include: {
      policy: true,
    },
  });

  let breachCount = 0;
  let escalationCount = 0;

  for (const exec of activeExecutions) {
    const elapsedMinutes = Math.floor((now.getTime() - new Date(exec.startTime).getTime()) / (60 * 1000));
    let isResponseBreached = exec.isResponseBreached;
    let isResolutionBreached = exec.isResolutionBreached;
    let status = exec.status;
    let currentEscalationLevel = exec.currentEscalationLevel;
    let escalatedTo = exec.escalatedTo;
    let escalatedAt = exec.escalatedAt;

    // Check response deadline
    if (!exec.respondedAt && now > new Date(exec.responseDueAt)) {
      isResponseBreached = true;
    }

    // Check resolution deadline
    if (!exec.resolvedAt && now > new Date(exec.resolutionDueAt)) {
      isResolutionBreached = true;
      status = "BREACHED";
      breachCount++;
    }

    // Check Escalation Level 2
    if (
      exec.policy.escalationLevel2Mins &&
      elapsedMinutes >= exec.policy.escalationLevel2Mins &&
      currentEscalationLevel < 2
    ) {
      currentEscalationLevel = 2;
      escalatedTo = exec.policy.escalationLevel2Role || "SUPER_ADMIN";
      escalatedAt = now;
      escalationCount++;
    }
    // Check Escalation Level 1
    else if (
      exec.policy.escalationLevel1Mins &&
      elapsedMinutes >= exec.policy.escalationLevel1Mins &&
      currentEscalationLevel < 1
    ) {
      currentEscalationLevel = 1;
      escalatedTo = exec.policy.escalationLevel1Role || "AREA_SALES_MANAGER";
      escalatedAt = now;
      escalationCount++;
    }

    await prisma.slaExecutionLog.update({
      where: { id: exec.id },
      data: {
        elapsedMinutes,
        isResponseBreached,
        isResolutionBreached,
        status,
        currentEscalationLevel,
        escalatedTo,
        escalatedAt,
      },
    });
  }

  return { processed: activeExecutions.length, breachCount, escalationCount };
}
