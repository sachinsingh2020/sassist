import { prisma } from "@/lib/prisma";

export interface CycleCheckResult {
  isCircular: boolean;
  message?: string;
  cyclePath?: string[];
}

/**
 * Checks whether assigning `newManagerId` as the manager of `employeeId`
 * would cause a circular reporting loop (e.g., A -> B -> C -> A).
 */
export async function detectCircularHierarchy(
  employeeId: string,
  newManagerId: string | null | undefined
): Promise<CycleCheckResult> {
  if (!newManagerId) {
    return { isCircular: false };
  }

  // 1. Direct self-reporting check
  if (employeeId === newManagerId) {
    return {
      isCircular: true,
      message: "An employee cannot be their own reporting manager.",
      cyclePath: [employeeId, newManagerId],
    };
  }

  // 2. Climb up the reporting tree starting from newManagerId
  let currentId: string | null = newManagerId;
  const visitedPath: string[] = [employeeId];
  const loopSeen = new Set<string>();

  while (currentId) {
    if (currentId === employeeId) {
      visitedPath.push(currentId);
      return {
        isCircular: true,
        message: `Circular reporting loop detected: Assigning this manager would cause an impossible cycle (${visitedPath.join(" → ")}).`,
        cyclePath: visitedPath,
      };
    }

    if (loopSeen.has(currentId)) {
      // Loop detected elsewhere in tree
      break;
    }
    loopSeen.add(currentId);
    visitedPath.push(currentId);

    const currentEmp: { managerId: string | null } | null = await prisma.employee.findUnique({
      where: { id: currentId },
      select: { managerId: true },
    });

    currentId = currentEmp?.managerId || null;
  }

  return { isCircular: false };
}

/**
 * Builds the hierarchical reporting tree structure
 */
export async function getEmployeeHierarchyTree() {
  const employees = await prisma.employee.findMany({
    orderBy: { name: "asc" },
    include: {
      manager: {
        select: { id: true, name: true, empCode: true, designation: true },
      },
      directReports: {
        select: { id: true, name: true, empCode: true, designation: true, status: true },
      },
    },
  });

  // Map into hierarchical roots
  const empMap = new Map<string, any>();
  employees.forEach((emp) => {
    empMap.set(emp.id, { ...emp, children: [] });
  });

  const roots: any[] = [];
  empMap.forEach((emp) => {
    if (emp.managerId && empMap.has(emp.managerId)) {
      empMap.get(emp.managerId).children.push(emp);
    } else {
      roots.push(emp);
    }
  });

  return { roots, allCount: employees.length };
}
