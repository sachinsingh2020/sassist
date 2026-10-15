"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { validateCustomFields, recordAuditLog } from "@/lib/customFields";
import { detectCircularHierarchy } from "@/lib/hierarchy";

export interface EmployeeInput {
  empCode: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department?: string;
  status?: string; // ACTIVE, INACTIVE, ON_LEAVE, VACANT
  territoryId?: string | null;
  territoryName?: string | null;
  managerId?: string | null;
  effectiveStartDate?: Date | string;
  effectiveEndDate?: Date | string | null;
  permissions?: {
    canView?: boolean;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canImport?: boolean;
    canExport?: boolean;
    canAssign?: boolean;
    canTransfer?: boolean;
    isSuperAdmin?: boolean;
  };
  customFields?: Record<string, any>;
}

export async function getEmployees(params?: {
  search?: string;
  department?: string;
  status?: string;
  managerId?: string;
}) {
  const where: any = {};

  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params?.department && params.department !== "ALL") {
    where.department = params.department;
  }

  if (params?.managerId && params.managerId !== "ALL") {
    where.managerId = params.managerId;
  }

  if (params?.search && params.search.trim()) {
    const s = params.search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { empCode: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
      { phone: { contains: s, mode: "insensitive" } },
      { designation: { contains: s, mode: "insensitive" } },
      { territoryName: { contains: s, mode: "insensitive" } },
    ];
  }

  return await prisma.employee.findMany({
    where,
    include: {
      manager: {
        select: { id: true, name: true, empCode: true, designation: true },
      },
      directReports: {
        select: { id: true, name: true, empCode: true, status: true },
      },
      delegationsGiven: {
        where: { status: "ACTIVE" },
        include: { toEmployee: { select: { id: true, name: true, empCode: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEmployeeStats() {
  const [total, active, onLeave, vacant, departments] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.employee.count({ where: { status: "ON_LEAVE" } }),
    prisma.employee.count({ where: { status: "VACANT" } }),
    prisma.employee.groupBy({ by: ["department"] }).then((d) => d.length),
  ]);

  return { total, active, onLeave, vacant, departments };
}

export async function getEmployeeById(id: string) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      manager: true,
      directReports: true,
      delegationsGiven: {
        include: { toEmployee: true },
        orderBy: { createdAt: "desc" },
      },
      delegationsReceived: {
        include: { fromEmployee: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!employee) return null;

  const auditHistory = await prisma.auditLog.findMany({
    where: {
      entityType: "EMPLOYEE",
      entityId: id,
    },
    orderBy: { timestamp: "desc" },
    take: 25,
  });

  return { ...employee, auditHistory };
}

export async function createEmployee(data: EmployeeInput) {
  // 1. Mandatory Fields Validation
  if (!data.empCode?.trim()) throw new Error("Employee Code is required.");
  if (!data.name?.trim()) throw new Error("Employee Name is required.");
  if (!data.email?.trim()) throw new Error("Email Address is required.");
  if (!data.phone?.trim()) throw new Error("Phone Number is required.");
  if (!data.designation?.trim()) throw new Error("Designation is required.");

  // 2. Email & Code Uniqueness Check
  const existingCode = await prisma.employee.findUnique({ where: { empCode: data.empCode.trim() } });
  if (existingCode) throw new Error(`Employee with Code '${data.empCode}' already exists.`);

  const existingEmail = await prisma.employee.findUnique({ where: { email: data.email.trim() } });
  if (existingEmail) throw new Error(`Employee with Email '${data.email}' already exists.`);

  // 3. Circular Hierarchy Prevention
  if (data.managerId) {
    const cycle = await detectCircularHierarchy("NEW_EMPLOYEE", data.managerId);
    if (cycle.isCircular) {
      throw new Error(cycle.message || "Invalid reporting manager selection.");
    }
  }

  // 4. Custom fields validation
  let customFieldsData: any = data.customFields || {};
  if (data.customFields && Object.keys(data.customFields).length > 0) {
    const valResult = await validateCustomFields("EMPLOYEE", data.customFields);
    if (!valResult.isValid) {
      throw new Error(valResult.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = valResult.sanitizedValues;
  }

  // 5. Creation
  const employee = await prisma.employee.create({
    data: {
      empCode: data.empCode.trim().toUpperCase(),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      designation: data.designation.trim(),
      department: data.department?.trim() || "Field Sales",
      status: data.status || "ACTIVE",
      territoryId: data.territoryId || null,
      territoryName: data.territoryName || null,
      managerId: data.managerId || null,
      effectiveStartDate: data.effectiveStartDate ? new Date(data.effectiveStartDate) : new Date(),
      effectiveEndDate: data.effectiveEndDate ? new Date(data.effectiveEndDate) : null,
      permissions: data.permissions || {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canImport: false,
        canExport: true,
        canAssign: false,
        canTransfer: false,
        isSuperAdmin: false,
      },
      customFields: customFieldsData,
    },
  });

  // 6. Audit Logging
  await recordAuditLog({
    entityType: "EMPLOYEE",
    entityId: employee.id,
    action: "CREATE",
    newValues: employee,
    reason: `Registered employee ${employee.name} (${employee.empCode}) as ${employee.designation}`,
  });

  revalidatePath("/employees");
  return { success: true, employee };
}

export async function updateEmployee(id: string, data: Partial<EmployeeInput>) {
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) throw new Error("Employee not found.");

  // Check unique constraints if updated
  if (data.empCode && data.empCode.trim().toUpperCase() !== existing.empCode) {
    const dup = await prisma.employee.findUnique({ where: { empCode: data.empCode.trim().toUpperCase() } });
    if (dup) throw new Error(`Employee Code '${data.empCode}' is already taken.`);
  }

  if (data.email && data.email.trim().toLowerCase() !== existing.email) {
    const dup = await prisma.employee.findUnique({ where: { email: data.email.trim().toLowerCase() } });
    if (dup) throw new Error(`Email Address '${data.email}' is already taken.`);
  }

  // Circular Reporting Loop Prevention!
  if (data.managerId !== undefined && data.managerId !== existing.managerId) {
    const cycle = await detectCircularHierarchy(id, data.managerId);
    if (cycle.isCircular) {
      throw new Error(cycle.message || "Circular reporting relationship detected!");
    }
  }

  let customFieldsData = existing.customFields as any;
  if (data.customFields) {
    const valResult = await validateCustomFields("EMPLOYEE", data.customFields);
    if (!valResult.isValid) {
      throw new Error(valResult.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = valResult.sanitizedValues;
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      empCode: data.empCode ? data.empCode.trim().toUpperCase() : existing.empCode,
      name: data.name ? data.name.trim() : existing.name,
      email: data.email ? data.email.trim().toLowerCase() : existing.email,
      phone: data.phone ? data.phone.trim() : existing.phone,
      designation: data.designation ? data.designation.trim() : existing.designation,
      department: data.department ? data.department.trim() : existing.department,
      status: data.status !== undefined ? data.status : existing.status,
      territoryId: data.territoryId !== undefined ? data.territoryId : existing.territoryId,
      territoryName: data.territoryName !== undefined ? data.territoryName : existing.territoryName,
      managerId: data.managerId !== undefined ? data.managerId : existing.managerId,
      effectiveStartDate: data.effectiveStartDate ? new Date(data.effectiveStartDate) : existing.effectiveStartDate,
      permissions: data.permissions !== undefined ? (data.permissions as any) : (existing.permissions as any),
      customFields: customFieldsData as any,
    },
  });

  await recordAuditLog({
    entityType: "EMPLOYEE",
    entityId: id,
    action: "UPDATE",
    oldValues: existing,
    newValues: updated,
    reason: `Updated employee profile for ${updated.name}`,
  });

  revalidatePath("/employees");
  return { success: true, employee: updated };
}

/**
 * Marks an employee's position as Vacant while preserving their historical
 * records, direct reporting structure, and ownership audit trail.
 */
export async function markPositionVacant(employeeId: string, reason: string) {
  const existing = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { directReports: true },
  });

  if (!existing) throw new Error("Employee record not found.");

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      status: "VACANT",
      vacantPositionTitle: existing.designation,
      vacatedAt: new Date(),
    },
  });

  await recordAuditLog({
    entityType: "EMPLOYEE",
    entityId: employeeId,
    action: "VACATE_POSITION",
    oldValues: existing,
    newValues: updated,
    reason: `Position '${existing.designation}' marked as VACANT. Reason: ${reason}. ${existing.directReports.length} direct reports preserved.`,
  });

  revalidatePath("/employees");
  return { success: true, employee: updated };
}

/**
 * Occupies a vacant position with an authorized replacement employee,
 * preserving original historical records and reassigning direct reports.
 */
export async function occupyVacantPosition(
  vacantPositionEmployeeId: string,
  replacementData: {
    name: string;
    email: string;
    phone: string;
    empCode: string;
    reassignDirectReports: boolean;
  }
) {
  const vacantEmp = await prisma.employee.findUnique({
    where: { id: vacantPositionEmployeeId },
    include: { directReports: true },
  });

  if (!vacantEmp || vacantEmp.status !== "VACANT") {
    throw new Error("Specified record is not currently a vacant position.");
  }

  // Create new replacement employee inheriting the vacant hierarchy
  const newEmp = await prisma.employee.create({
    data: {
      empCode: replacementData.empCode.trim().toUpperCase(),
      name: replacementData.name.trim(),
      email: replacementData.email.trim().toLowerCase(),
      phone: replacementData.phone.trim(),
      designation: vacantEmp.vacantPositionTitle || vacantEmp.designation,
      department: vacantEmp.department,
      status: "ACTIVE",
      managerId: vacantEmp.managerId,
      territoryId: vacantEmp.territoryId,
      territoryName: vacantEmp.territoryName,
      effectiveStartDate: new Date(),
    },
  });

  // Reassign direct reports if requested
  if (replacementData.reassignDirectReports && vacantEmp.directReports.length > 0) {
    await prisma.employee.updateMany({
      where: { managerId: vacantEmp.id },
      data: { managerId: newEmp.id },
    });
  }

  // Mark vacant placeholder as archived/inactive
  await prisma.employee.update({
    where: { id: vacantPositionEmployeeId },
    data: { status: "INACTIVE" },
  });

  await recordAuditLog({
    entityType: "EMPLOYEE",
    entityId: newEmp.id,
    action: "OCCUPY_VACANT_POSITION",
    newValues: newEmp,
    reason: `Replacement employee ${newEmp.name} occupied vacant position previously held by ${vacantEmp.name} (${vacantEmp.empCode}).`,
  });

  revalidatePath("/employees");
  return { success: true, employee: newEmp };
}

/**
 * Temporary Delegated Access management with auto-expiry
 */
export async function createDelegatedAccess(data: {
  fromEmployeeId: string;
  toEmployeeId: string;
  effectiveEnd: string | Date;
  scope?: string;
  reason?: string;
}) {
  if (data.fromEmployeeId === data.toEmployeeId) {
    throw new Error("Cannot delegate access to oneself.");
  }

  const delegation = await prisma.delegatedAccess.create({
    data: {
      fromEmployeeId: data.fromEmployeeId,
      toEmployeeId: data.toEmployeeId,
      effectiveStart: new Date(),
      effectiveEnd: new Date(data.effectiveEnd),
      scope: data.scope || "ALL",
      status: "ACTIVE",
      reason: data.reason || "Temporary assignment / leave coverage",
    },
  });

  await recordAuditLog({
    entityType: "DELEGATED_ACCESS",
    entityId: delegation.id,
    action: "GRANT_DELEGATION",
    newValues: delegation,
    reason: `Delegated access granted to employee ID ${data.toEmployeeId} until ${new Date(data.effectiveEnd).toLocaleDateString()}`,
  });

  revalidatePath("/employees");
  return { success: true, delegation };
}

export async function revokeDelegatedAccess(delegationId: string) {
  const existing = await prisma.delegatedAccess.findUnique({ where: { id: delegationId } });
  if (!existing) throw new Error("Delegation record not found.");

  const revoked = await prisma.delegatedAccess.update({
    where: { id: delegationId },
    data: { status: "REVOKED" },
  });

  await recordAuditLog({
    entityType: "DELEGATED_ACCESS",
    entityId: delegationId,
    action: "REVOKE_DELEGATION",
    oldValues: existing,
    newValues: revoked,
    reason: `Delegated access manually revoked early`,
  });

  revalidatePath("/employees");
  return { success: true };
}
