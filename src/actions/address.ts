"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { validateCustomFields, recordAuditLog } from "@/lib/customFields";

export interface AddressInput {
  addressLine1: string;
  addressLine2?: string | null;
  country?: string;
  state: string;
  city: string;
  district?: string | null;
  zone?: string | null;
  territory?: string | null;
  townLocality?: string | null;
  pincode: string;
  route?: string | null;
  beat?: string | null;
  deliveryArea?: string | null;
  lat?: number | null;
  lng?: number | null;
  status?: string;
  customFields?: Record<string, any>;
}

export async function getAddresses(params?: {
  search?: string;
  state?: string;
  city?: string;
  status?: string;
}) {
  const where: any = {};

  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params?.state && params.state !== "ALL") {
    where.state = params.state;
  }

  if (params?.city && params.city !== "ALL") {
    where.city = params.city;
  }

  if (params?.search && params.search.trim()) {
    const s = params.search.trim();
    where.OR = [
      { addressLine1: { contains: s, mode: "insensitive" } },
      { addressLine2: { contains: s, mode: "insensitive" } },
      { city: { contains: s, mode: "insensitive" } },
      { state: { contains: s, mode: "insensitive" } },
      { pincode: { contains: s, mode: "insensitive" } },
      { territory: { contains: s, mode: "insensitive" } },
      { townLocality: { contains: s, mode: "insensitive" } },
      { route: { contains: s, mode: "insensitive" } },
    ];
  }

  return await prisma.address.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function getAddressStats() {
  const [total, active, uniqueCities, uniquePincodes] = await Promise.all([
    prisma.address.count(),
    prisma.address.count({ where: { status: "ACTIVE" } }),
    prisma.address.groupBy({ by: ["city"] }).then((r) => r.length),
    prisma.address.groupBy({ by: ["pincode"] }).then((r) => r.length),
  ]);

  return { total, active, uniqueCities, uniquePincodes };
}

export async function getAddressById(id: string) {
  const address = await prisma.address.findUnique({
    where: { id },
  });

  if (!address) return null;

  const auditHistory = await prisma.auditLog.findMany({
    where: {
      entityType: "ADDRESS",
      entityId: id,
    },
    orderBy: { timestamp: "desc" },
    take: 20,
  });

  return { ...address, auditHistory };
}

export async function checkAddressDuplicate(
  addressLine1: string,
  pincode: string,
  city: string,
  excludeId?: string
) {
  const normalizedLine = addressLine1.trim().toLowerCase();
  const normalizedPincode = pincode.trim();
  const normalizedCity = city.trim().toLowerCase();

  const existing = await prisma.address.findFirst({
    where: {
      pincode: normalizedPincode,
      city: { equals: normalizedCity, mode: "insensitive" },
      addressLine1: { equals: normalizedLine, mode: "insensitive" },
      id: excludeId ? { not: excludeId } : undefined,
    },
  });

  return existing;
}

export async function createAddress(data: AddressInput) {
  // 1. Mandatory validation
  if (!data.addressLine1?.trim()) throw new Error("Address Line 1 is required.");
  if (!data.state?.trim()) throw new Error("State is required.");
  if (!data.city?.trim()) throw new Error("City is required.");
  if (!data.pincode?.trim()) throw new Error("Pincode is required.");

  // 2. Indian Pincode format check (6 digits)
  const pinRegex = /^[1-9][0-9]{5}$/;
  if (!pinRegex.test(data.pincode.trim())) {
    throw new Error("Pincode must be a valid 6-digit postal code (e.g. 400001).");
  }

  // 3. Duplicate Prevention Rule
  const dup = await checkAddressDuplicate(data.addressLine1, data.pincode, data.city);
  if (dup) {
    throw new Error(
      `Duplicate address detected: Record with same Line 1 and Pincode already exists (${dup.id}).`
    );
  }

  // 4. Custom fields validation
  let customFieldsData: any = data.customFields || {};
  if (data.customFields && Object.keys(data.customFields).length > 0) {
    const valResult = await validateCustomFields("ADDRESS", data.customFields);
    if (!valResult.isValid) {
      throw new Error(valResult.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = valResult.sanitizedValues;
  }

  // 5. DB creation
  const address = await prisma.address.create({
    data: {
      addressLine1: data.addressLine1.trim(),
      addressLine2: data.addressLine2?.trim() || null,
      country: data.country?.trim() || "India",
      state: data.state.trim(),
      city: data.city.trim(),
      district: data.district?.trim() || null,
      zone: data.zone?.trim() || null,
      territory: data.territory?.trim() || null,
      townLocality: data.townLocality?.trim() || null,
      pincode: data.pincode.trim(),
      route: data.route?.trim() || null,
      beat: data.beat?.trim() || null,
      deliveryArea: data.deliveryArea?.trim() || null,
      lat: data.lat !== undefined && data.lat !== null && !isNaN(Number(data.lat)) ? Number(data.lat) : null,
      lng: data.lng !== undefined && data.lng !== null && !isNaN(Number(data.lng)) ? Number(data.lng) : null,
      status: data.status || "ACTIVE",
      customFields: customFieldsData,
    },
  });

  // 6. Audit Logging
  await recordAuditLog({
    entityType: "ADDRESS",
    entityId: address.id,
    action: "CREATE",
    newValues: address,
    reason: `Address created in ${address.city}, ${address.state} (${address.pincode})`,
  });

  revalidatePath("/addresses");
  return { success: true, address };
}

export async function updateAddress(id: string, data: Partial<AddressInput>) {
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing) throw new Error("Address record not found.");

  if (data.pincode) {
    const pinRegex = /^[1-9][0-9]{5}$/;
    if (!pinRegex.test(data.pincode.trim())) {
      throw new Error("Pincode must be a valid 6-digit postal code.");
    }
  }

  // Duplicate Check if addressLine1 or pincode or city changed
  if (data.addressLine1 || data.pincode || data.city) {
    const line = data.addressLine1 || existing.addressLine1;
    const pin = data.pincode || existing.pincode;
    const city = data.city || existing.city;
    const dup = await checkAddressDuplicate(line, pin, city, id);
    if (dup) {
      throw new Error(`Another address with same Line 1 and Pincode already exists.`);
    }
  }

  let customFieldsData = existing.customFields as any;
  if (data.customFields) {
    const valResult = await validateCustomFields("ADDRESS", data.customFields);
    if (!valResult.isValid) {
      throw new Error(valResult.errors.map((e) => e.message).join(", "));
    }
    customFieldsData = valResult.sanitizedValues;
  }

  const updated = await prisma.address.update({
    where: { id },
    data: {
      addressLine1: data.addressLine1 !== undefined ? data.addressLine1.trim() : existing.addressLine1,
      addressLine2: data.addressLine2 !== undefined ? data.addressLine2?.trim() || null : existing.addressLine2,
      country: data.country !== undefined ? data.country.trim() : existing.country,
      state: data.state !== undefined ? data.state.trim() : existing.state,
      city: data.city !== undefined ? data.city.trim() : existing.city,
      district: data.district !== undefined ? data.district?.trim() || null : existing.district,
      zone: data.zone !== undefined ? data.zone?.trim() || null : existing.zone,
      territory: data.territory !== undefined ? data.territory?.trim() || null : existing.territory,
      townLocality: data.townLocality !== undefined ? data.townLocality?.trim() || null : existing.townLocality,
      pincode: data.pincode !== undefined ? data.pincode.trim() : existing.pincode,
      route: data.route !== undefined ? data.route?.trim() || null : existing.route,
      beat: data.beat !== undefined ? data.beat?.trim() || null : existing.beat,
      deliveryArea: data.deliveryArea !== undefined ? data.deliveryArea?.trim() || null : existing.deliveryArea,
      lat: data.lat !== undefined ? (data.lat !== null && !isNaN(Number(data.lat)) ? Number(data.lat) : null) : existing.lat,
      lng: data.lng !== undefined ? (data.lng !== null && !isNaN(Number(data.lng)) ? Number(data.lng) : null) : existing.lng,
      status: data.status !== undefined ? data.status : existing.status,
      customFields: customFieldsData,
    },
  });

  await recordAuditLog({
    entityType: "ADDRESS",
    entityId: id,
    action: "UPDATE",
    oldValues: existing,
    newValues: updated,
    reason: `Address details updated`,
  });

  revalidatePath("/addresses");
  return { success: true, address: updated };
}

export async function deleteAddress(id: string, permanent: boolean = false) {
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing) throw new Error("Address not found.");

  if (permanent) {
    await prisma.address.delete({ where: { id } });
    await recordAuditLog({
      entityType: "ADDRESS",
      entityId: id,
      action: "DELETE",
      oldValues: existing,
      reason: "Permanently deleted address record",
    });
  } else {
    // Soft deactivate to safeguard relations
    await prisma.address.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    await recordAuditLog({
      entityType: "ADDRESS",
      entityId: id,
      action: "DEACTIVATE",
      oldValues: existing,
      reason: "Address deactivated",
    });
  }

  revalidatePath("/addresses");
  return { success: true };
}

export async function bulkInsertAddresses(records: AddressInput[]) {
  const inserted: any[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    try {
      if (!row.addressLine1 || !row.state || !row.city || !row.pincode) {
        throw new Error("Missing required fields (addressLine1, state, city, pincode).");
      }

      const pinRegex = /^[1-9][0-9]{5}$/;
      if (!pinRegex.test(String(row.pincode).trim())) {
        throw new Error(`Invalid 6-digit pincode: ${row.pincode}`);
      }

      // Check dup
      const dup = await checkAddressDuplicate(row.addressLine1, String(row.pincode), row.city);
      if (dup) {
        throw new Error(`Duplicate address already exists in database.`);
      }

      const res = await prisma.address.create({
        data: {
          addressLine1: row.addressLine1.trim(),
          addressLine2: row.addressLine2 ? String(row.addressLine2).trim() : null,
          country: row.country ? String(row.country).trim() : "India",
          state: String(row.state).trim(),
          city: String(row.city).trim(),
          district: row.district ? String(row.district).trim() : null,
          zone: row.zone ? String(row.zone).trim() : null,
          territory: row.territory ? String(row.territory).trim() : null,
          townLocality: row.townLocality ? String(row.townLocality).trim() : null,
          pincode: String(row.pincode).trim(),
          route: row.route ? String(row.route).trim() : null,
          beat: row.beat ? String(row.beat).trim() : null,
          deliveryArea: row.deliveryArea ? String(row.deliveryArea).trim() : null,
          lat: row.lat ? Number(row.lat) : null,
          lng: row.lng ? Number(row.lng) : null,
          status: row.status || "ACTIVE",
          customFields: row.customFields || {},
        },
      });

      inserted.push(res);
    } catch (e: any) {
      errors.push({ row: i + 1, error: e.message });
    }
  }

  if (inserted.length > 0) {
    await recordAuditLog({
      entityType: "ADDRESS",
      entityId: "BULK_IMPORT",
      action: "IMPORT",
      newValues: { totalInserted: inserted.length, totalErrors: errors.length },
      reason: `Bulk imported ${inserted.length} addresses (${errors.length} failed)`,
    });
  }

  revalidatePath("/addresses");
  return {
    success: true,
    totalAttempted: records.length,
    totalInserted: inserted.length,
    errors,
  };
}
