import { prisma } from "@/lib/prisma";

export interface TargetCalculationResult {
  actualQuantity: number;
  actualValue: number;
  achievementRate: number;
}

/**
 * Calculates actual achievement for a target based on live transactional data
 * (Orders, Visits, Clients, OrderItems) within the target effective dates.
 */
export async function calculateTargetAchievement(target: {
  id: string;
  targetMetric: string;
  dimension: string;
  employeeId?: string | null;
  territoryId?: string | null;
  productId?: string | null;
  targetQuantity?: number | null;
  targetValue?: number | null;
  startDate: Date | string;
  endDate: Date | string;
}): Promise<TargetCalculationResult> {
  const start = new Date(target.startDate);
  const end = new Date(target.endDate);

  let actualQuantity = 0;
  let actualValue = 0;

  try {
    if (target.targetMetric === "SALES_VALUE" || target.targetMetric === "SALES_VOLUME") {
      // Find orders within date range
      const orderWhere: any = {
        createdAt: { gte: start, lte: end },
        status: { not: "CANCELLED" },
      };

      if (target.dimension === "EMPLOYEE" && target.employeeId) {
        // Find user attached to employee
        const emp = await prisma.employee.findUnique({
          where: { id: target.employeeId },
          select: { userId: true },
        });
        if (emp?.userId) {
          orderWhere.repId = emp.userId;
        }
      } else if (target.dimension === "TERRITORY" && target.territoryId) {
        orderWhere.retailer = {
          beat: {
            territoryId: target.territoryId,
          },
        };
      }

      if (target.dimension === "PRODUCT" && target.productId) {
        // Query OrderItems matching product
        const items = await prisma.orderItem.findMany({
          where: {
            productId: target.productId,
            order: {
              createdAt: { gte: start, lte: end },
              status: { not: "CANCELLED" },
            },
          },
          select: {
            quantity: true,
            totalPrice: true,
          },
        });

        actualQuantity = items.reduce((acc, it) => acc + (it.quantity || 0), 0);
        actualValue = items.reduce((acc, it) => acc + (it.totalPrice || 0), 0);
      } else {
        const orders = await prisma.order.findMany({
          where: orderWhere,
          include: {
            items: true,
          },
        });

        actualValue = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
        actualQuantity = orders.reduce(
          (acc, o) => acc + o.items.reduce((sum, it) => sum + (it.quantity || 0), 0),
          0
        );
      }
    } else if (target.targetMetric === "VISITS_COUNT") {
      const visitWhere: any = {
        checkIn: { gte: start, lte: end },
        status: { in: ["CHECKED_IN", "COMPLETED"] },
      };

      if (target.dimension === "EMPLOYEE" && target.employeeId) {
        const emp = await prisma.employee.findUnique({
          where: { id: target.employeeId },
          select: { userId: true },
        });
        if (emp?.userId) {
          visitWhere.repId = emp.userId;
        }
      }

      actualQuantity = await prisma.visit.count({ where: visitWhere });
      actualValue = 0;
    } else if (target.targetMetric === "NEW_CLIENTS") {
      const clientWhere: any = {
        createdAt: { gte: start, lte: end },
      };

      if (target.dimension === "EMPLOYEE" && target.employeeId) {
        clientWhere.ownerId = target.employeeId;
      }

      actualQuantity = await prisma.client.count({ where: clientWhere });
      actualValue = 0;
    }
  } catch (err) {
    console.error("Error computing target achievement:", err);
  }

  // Calculate Achievement Rate (%)
  let achievementRate = 0;
  if (target.targetMetric === "SALES_VALUE") {
    const goal = target.targetValue || 0;
    achievementRate = goal > 0 ? (actualValue / goal) * 100 : 0;
  } else {
    const goal = target.targetQuantity || 0;
    achievementRate = goal > 0 ? (actualQuantity / goal) * 100 : 0;
  }

  return {
    actualQuantity: Math.round(actualQuantity * 100) / 100,
    actualValue: Math.round(actualValue * 100) / 100,
    achievementRate: Math.round(achievementRate * 10) / 10,
  };
}
