"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { validateCustomFields, recordAuditLog } from "@/lib/customFields";

export interface ClientInput {
  clientCode: string;
  businessName: string;
  contactName: string;
  phone: string;
  altPhone?: string | null;
  email?: string | null;
  clientType: "LEAD" | "PROSPECT" | "CUSTOMER" | string;
  stage?: string;
  status?: string;
  addressId?: string | null;
  ownerId?: string | null;
  lat?: number | null;
  lng?: number | null;
  geoAccuracy?: number | null;
  geoTimestamp?: Date | string | null;
  geoSource?: string;
  creditLimit?: number | null;
  expectedVal?: number | null;
  notes?: string | null;
  customFields?: Record<string, any>;
  transitionReason?: string;
}

export async function getClients(params?: {
  search?: string;
  clientType?: string;
  stage?: string;
  ownerId?: string;
  status?: string;
}) {
  const where: any = {};

  if (params?.clientType && params.clientType !== "ALL") {
    where.clientType = params.clientType;
  }

  if (params?.stage && params.stage !== "ALL") {
    where.stage = params.stage;
  }

  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params?.ownerId && params.ownerId !== "ALL") {
    where.ownerId = params.ownerId;
  }

  if (params?.search && params.search.trim()) {
    const s = params.search.trim();
    where.OR = [
      { businessName: { contains: s, mode: "insensitive" } },
      { contactName: { contains: s, mode: "insensitive" } },
      { clientCode: { contains: s, mode: "insensitive" } },
      { phone: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
    ];
  }

  return await prisma.client.findMany({
    where,
    include: {
      address: {
        select: {
          id: true,
          addressLine1: true,
          city: true,
          state: true,
          pincode: true,
          territory: true,
          lat: true,
          lng: true,
        },
      },
      owner: {
        select: { id: true, name: true, empCode: true, designation: true },
      },
      sharedWith: {
        include: {
          employee: { select: { id: true, name: true, empCode: true } },
        },
      },
      _count: {
        select: { typeHistory: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClientStats() {
  const [total, leads, prospects, customers, won] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { clientType: "LEAD" } }),
    prisma.client.count({ where: { clientType: "PROSPECT" } }),
    prisma.client.count({ where: { clientType: "CUSTOMER" } }),
    prisma.client.count({ where: { stage: "WON" } }),
  ]);

  return { total, leads, prospects, customers, won };
}

export async function getClientById(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      address: true,
      owner: true,
      sharedWith: {
        include: { employee: true },
        orderBy: { createdAt: "desc" },
      },
      typeHistory: {
        orderBy: { timestamp: "desc" },
      },
    },
  });

  if (!client) return null;

  const auditHistory = await prisma.auditLog.findMany({
    where: {
      entityType: "CLIENT",
      entityId: id,
    },
    orderBy: { timestamp: "desc" },
    take: 30,
  });

  return { ...client, auditHistory };
}

export async function checkClientDuplicate(
  businessName: string,
  phone: string,
  email?: string | null,
  excludeId?: string
) {
  const cleanPhone = phone.trim();
  const cleanName = businessName.trim().toLowerCase();

  const conditions: any[] = [
    { phone: cleanPhone },
    { businessName: { equals: cleanName, mode: "insensitive" } },
  ];

  if (email && email.trim()) {
    conditions.push({ email: { equals: email.trim().toLowerCase(), mode: "insensitive" } });
  }

  const existing = await prisma.client.findFirst({
    where: {
      OR: conditions,
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { id: true, businessName: true, phone: true, email: true, clientType: true },
  });

  return existing;
}

export async function createClient(data: ClientInput) {
  // 1. Mandatory Validations
  if (!data.clientCode?.trim()) throw new Error("Client Code is required.");
  if (!data.businessName?.trim()) throw new Error("Business Name is required.");
  if (!data.contactName?.trim()) throw new Error("Contact Person Name is required.");
  if (!data.phone?.trim()) throw new Error("Phone Number is required.");

  // Conditional Required Rules per Client Type
  if (data.clientType === "CUSTOMER" && !data.addressId) {
    throw new Error("Registered Customer type requires an associated Address from Address Master.");
  }

  // 2. Duplicate Detection
  const dup = await checkClientDuplicate(data.businessName, data.phone, data.email);
  if (dup) {
    throw new Error(
      `Duplicate detected: A client with matching ${
        dup.phone === data.phone.trim() ? "Phone Number" : "Business Name"
      } already exists: '${dup.businessName}' (${dup.clientType}).`
    );
  }

  // 3. Custom Fields Validation
  let customFieldsData: any = data.customFields || {};
  if (data.customFields && Object.keys(data.customFields).length > 0) {
    const valResult = await validateCustomFields("CLIENT", data.customFields);
    if (!valResult.isValid) {
      throw new Error(valResult.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = valResult.sanitizedValues;
  }

  // 4. Create Client
  const client = await prisma.client.create({
    data: {
      clientCode: data.clientCode.trim().toUpperCase(),
      businessName: data.businessName.trim(),
      contactName: data.contactName.trim(),
      phone: data.phone.trim(),
      altPhone: data.altPhone?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      clientType: data.clientType || "LEAD",
      stage: data.stage || "NEW",
      status: data.status || "ACTIVE",
      addressId: data.addressId || null,
      ownerId: data.ownerId || null,
      lat: data.lat !== undefined && data.lat !== null && !isNaN(Number(data.lat)) ? Number(data.lat) : null,
      lng: data.lng !== undefined && data.lng !== null && !isNaN(Number(data.lng)) ? Number(data.lng) : null,
      geoAccuracy: data.geoAccuracy ? Number(data.geoAccuracy) : null,
      geoTimestamp: data.geoTimestamp ? new Date(data.geoTimestamp) : new Date(),
      geoSource: data.geoSource || "DEVICE_GPS",
      creditLimit: data.creditLimit ? Number(data.creditLimit) : 0.0,
      expectedVal: data.expectedVal ? Number(data.expectedVal) : 0.0,
      notes: data.notes || null,
      customFields: customFieldsData,
    },
  });

  // 5. Initial Lifecycle History Log
  await prisma.clientTypeHistory.create({
    data: {
      clientId: client.id,
      fromType: "NONE",
      toType: client.clientType,
      triggerReason: data.transitionReason || "Initial Registration",
      changedBy: "Admin",
    },
  });

  // 6. Audit Log
  await recordAuditLog({
    entityType: "CLIENT",
    entityId: client.id,
    action: "CREATE",
    newValues: client,
    reason: `Registered new ${client.clientType}: ${client.businessName} (${client.clientCode})`,
  });

  // 7. Evaluate Automation Rules
  try {
    const { evaluateAutomationRules } = await import("@/lib/automationEngine");
    await evaluateAutomationRules({
      module: "CLIENT",
      triggerType: "RECORD_CREATED",
      entityId: client.id,
      entityData: client,
    });
  } catch (err) {
    console.error("Client automation trigger error:", err);
  }

  revalidatePath("/leads");
  return { success: true, client };
}

export async function updateClient(id: string, data: Partial<ClientInput>) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) throw new Error("Client record not found.");

  // Duplicate Check
  if (data.businessName || data.phone || data.email) {
    const name = data.businessName || existing.businessName;
    const phone = data.phone || existing.phone;
    const email = data.email !== undefined ? data.email : existing.email;
    const dup = await checkClientDuplicate(name, phone, email, id);
    if (dup) {
      throw new Error(`Another client with matching Phone or Business Name already exists.`);
    }
  }

  // Custom Fields Validation
  let customFieldsData = existing.customFields as any;
  if (data.customFields) {
    const valResult = await validateCustomFields("CLIENT", data.customFields);
    if (!valResult.isValid) {
      throw new Error(valResult.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = valResult.sanitizedValues;
  }

  const updated = await prisma.client.update({
    where: { id },
    data: {
      clientCode: data.clientCode ? data.clientCode.trim().toUpperCase() : existing.clientCode,
      businessName: data.businessName ? data.businessName.trim() : existing.businessName,
      contactName: data.contactName ? data.contactName.trim() : existing.contactName,
      phone: data.phone ? data.phone.trim() : existing.phone,
      altPhone: data.altPhone !== undefined ? (data.altPhone ? data.altPhone.trim() : null) : existing.altPhone,
      email: data.email !== undefined ? (data.email ? data.email.trim().toLowerCase() : null) : existing.email,
      clientType: data.clientType !== undefined ? data.clientType : existing.clientType,
      stage: data.stage !== undefined ? data.stage : existing.stage,
      status: data.status !== undefined ? data.status : existing.status,
      addressId: data.addressId !== undefined ? data.addressId : existing.addressId,
      ownerId: data.ownerId !== undefined ? data.ownerId : existing.ownerId,
      lat: data.lat !== undefined ? (data.lat !== null && !isNaN(Number(data.lat)) ? Number(data.lat) : null) : existing.lat,
      lng: data.lng !== undefined ? (data.lng !== null && !isNaN(Number(data.lng)) ? Number(data.lng) : null) : existing.lng,
      geoAccuracy: data.geoAccuracy !== undefined ? (data.geoAccuracy ? Number(data.geoAccuracy) : null) : existing.geoAccuracy,
      geoTimestamp: data.geoTimestamp ? new Date(data.geoTimestamp) : existing.geoTimestamp,
      creditLimit: data.creditLimit !== undefined ? (data.creditLimit ? Number(data.creditLimit) : 0.0) : existing.creditLimit,
      expectedVal: data.expectedVal !== undefined ? (data.expectedVal ? Number(data.expectedVal) : 0.0) : existing.expectedVal,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      customFields: customFieldsData as any,
    },
  });

  // Track Client Type Transition History (e.g. LEAD -> PROSPECT -> CUSTOMER)
  if (data.clientType && data.clientType !== existing.clientType) {
    await prisma.clientTypeHistory.create({
      data: {
        clientId: id,
        fromType: existing.clientType,
        toType: data.clientType,
        triggerReason: data.transitionReason || "Manual Status Update",
        changedBy: "Admin",
      },
    });
  }

  // Audit Log
  await recordAuditLog({
    entityType: "CLIENT",
    entityId: id,
    action: "UPDATE",
    oldValues: existing,
    newValues: updated,
    reason: `Client profile updated (${updated.businessName})`,
  });

  revalidatePath("/leads");
  return { success: true, client: updated };
}

/**
 * Out-of-Hierarchy Employee Sharing
 */
export async function shareClient(
  clientId: string,
  employeeId: string,
  accessLevel: string = "READ_WRITE",
  grantedBy: string = "Admin"
) {
  const share = await prisma.clientShare.upsert({
    where: {
      clientId_employeeId: {
        clientId,
        employeeId,
      },
    },
    update: { accessLevel, grantedBy },
    create: {
      clientId,
      employeeId,
      accessLevel,
      grantedBy,
    },
  });

  await recordAuditLog({
    entityType: "CLIENT_SHARE",
    entityId: share.id,
    action: "SHARE_RECORD",
    newValues: share,
    reason: `Shared client record ${clientId} with employee ${employeeId} (${accessLevel})`,
  });

  revalidatePath("/leads");
  return { success: true, share };
}

export async function revokeClientShare(shareId: string) {
  const existing = await prisma.clientShare.findUnique({ where: { id: shareId } });
  if (!existing) throw new Error("Share record not found.");

  await prisma.clientShare.delete({ where: { id: shareId } });

  await recordAuditLog({
    entityType: "CLIENT_SHARE",
    entityId: shareId,
    action: "REVOKE_SHARE",
    oldValues: existing,
    reason: `Revoked client sharing with employee ${existing.employeeId}`,
  });

  revalidatePath("/leads");
  return { success: true };
}

/**
 * Reassign Client Primary Owner
 */
export async function reassignClientOwner(
  clientId: string,
  newOwnerId: string,
  reason: string = "Territory reallocation"
) {
  const existing = await prisma.client.findUnique({ where: { id: clientId } });
  if (!existing) throw new Error("Client not found.");

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: { ownerId: newOwnerId },
  });

  await recordAuditLog({
    entityType: "CLIENT",
    entityId: clientId,
    action: "REASSIGN_OWNER",
    oldValues: { ownerId: existing.ownerId },
    newValues: { ownerId: newOwnerId },
    reason: `Client ownership reassigned from ${existing.ownerId} to ${newOwnerId}. Reason: ${reason}`,
  });

  revalidatePath("/leads");
  return { success: true, client: updated };
}
