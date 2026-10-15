import { prisma } from "@/lib/prisma";

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  categoryId?: string;
  brand?: string;
}

export interface SlabTier {
  minQty: number;
  discountPercent: number;
}

export interface SchemeRule {
  id: string;
  title: string;
  code: string;
  description?: string | null;
  type: string; // PERCENTAGE_DISCOUNT | FLAT_DISCOUNT | BOGO | TIERED_SLAB
  eligibleClientTypesJson?: string | null; // e.g. '["ALL"]' or '["CUSTOMER", "PROSPECT"]'
  eligibleProductIdsJson?: string | null;  // e.g. '["ALL"]' or '["prod-id-1", "prod-id-2"]'
  minOrderQty: number;
  minOrderValue?: number | null;
  discountPercent?: number | null;
  flatDiscount?: number | null;
  freeSkuCode?: string | null;
  freeSkuQty?: number | null;
  slabTiersJson?: string | null; // e.g. '[{"minQty": 10, "discountPercent": 5}, {"minQty": 50, "discountPercent": 10}]'
  maxDiscountCap?: number | null;
  startDate: Date | string;
  endDate: Date | string;
  status?: string; // ACTIVE, INACTIVE, EXPIRED
  approvalStatus?: string; // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED
  isActive: boolean;
}

export interface SchemeCollision {
  hasConflict: boolean;
  conflictingSchemeId?: string;
  conflictingSchemeCode?: string;
  conflictingSchemeTitle?: string;
  overlapStartDate?: string;
  overlapEndDate?: string;
  conflictType: "OVERLAPPING_PRODUCTS" | "UNIVERSAL_OVERLAP" | "SAME_CODE";
  message: string;
}

export interface SchemeEvaluationResult {
  appliedSchemes: Array<{
    schemeId: string;
    code: string;
    title: string;
    discountAmount: number;
    benefitDescription: string;
    freeItems?: Array<{ sku: string; freeQty: number }>;
  }>;
  totalDiscount: number;
  freeGoods: Array<{ sku: string; freeQty: number }>;
  upcomingSchemes: Array<{
    schemeId: string;
    title: string;
    remainingQty?: number;
    remainingOrderValue?: number;
    message: string;
  }>;
}

/**
 * Checks if a candidate scheme collides with existing active approved schemes.
 * Prevents unintended double discounting or conflicting trade terms.
 */
export function detectSchemeCollisions(
  candidate: {
    id?: string;
    code: string;
    startDate: Date | string;
    endDate: Date | string;
    eligibleProductIdsJson?: string | null;
    eligibleClientTypesJson?: string | null;
    type: string;
  },
  existingSchemes: SchemeRule[]
): SchemeCollision[] {
  const collisions: SchemeCollision[] = [];
  const candStart = new Date(candidate.startDate).getTime();
  const candEnd = new Date(candidate.endDate).getTime();

  let candProducts: string[] = ["ALL"];
  try {
    if (candidate.eligibleProductIdsJson) {
      candProducts = JSON.parse(candidate.eligibleProductIdsJson);
    }
  } catch {
    candProducts = ["ALL"];
  }

  let candClientTypes: string[] = ["ALL"];
  try {
    if (candidate.eligibleClientTypesJson) {
      candClientTypes = JSON.parse(candidate.eligibleClientTypesJson);
    }
  } catch {
    candClientTypes = ["ALL"];
  }

  for (const existing of existingSchemes) {
    if (candidate.id && existing.id === candidate.id) continue;
    if (!existing.isActive) continue;
    if (existing.approvalStatus && existing.approvalStatus !== "APPROVED") continue;

    // Check code collision
    if (existing.code.toLowerCase() === candidate.code.toLowerCase()) {
      collisions.push({
        hasConflict: true,
        conflictingSchemeId: existing.id,
        conflictingSchemeCode: existing.code,
        conflictingSchemeTitle: existing.title,
        conflictType: "SAME_CODE",
        message: `Scheme code '${candidate.code}' already exists. Codes must be unique.`,
      });
      continue;
    }

    // Check date overlap
    const existStart = new Date(existing.startDate).getTime();
    const existEnd = new Date(existing.endDate).getTime();
    const isOverlapping = candStart <= existEnd && candEnd >= existStart;
    if (!isOverlapping) continue;

    // Check client type overlap
    let existClientTypes: string[] = ["ALL"];
    try {
      if (existing.eligibleClientTypesJson) {
        existClientTypes = JSON.parse(existing.eligibleClientTypesJson);
      }
    } catch {
      existClientTypes = ["ALL"];
    }

    const clientTypeOverlap =
      candClientTypes.includes("ALL") ||
      existClientTypes.includes("ALL") ||
      candClientTypes.some((ct) => existClientTypes.includes(ct));

    if (!clientTypeOverlap) continue;

    // Check product overlap
    let existProducts: string[] = ["ALL"];
    try {
      if (existing.eligibleProductIdsJson) {
        existProducts = JSON.parse(existing.eligibleProductIdsJson);
      }
    } catch {
      existProducts = ["ALL"];
    }

    const universalOverlap = candProducts.includes("ALL") && existProducts.includes("ALL");
    const specificOverlap =
      candProducts.includes("ALL") ||
      existProducts.includes("ALL") ||
      candProducts.some((p) => existProducts.includes(p));

    if (universalOverlap) {
      collisions.push({
        hasConflict: true,
        conflictingSchemeId: existing.id,
        conflictingSchemeCode: existing.code,
        conflictingSchemeTitle: existing.title,
        overlapStartDate: new Date(Math.max(candStart, existStart)).toISOString().slice(0, 10),
        overlapEndDate: new Date(Math.min(candEnd, existEnd)).toISOString().slice(0, 10),
        conflictType: "UNIVERSAL_OVERLAP",
        message: `Universal date overlap with active scheme '${existing.title}' (${existing.code}). Both apply to ALL products.`,
      });
    } else if (specificOverlap) {
      collisions.push({
        hasConflict: true,
        conflictingSchemeId: existing.id,
        conflictingSchemeCode: existing.code,
        conflictingSchemeTitle: existing.title,
        overlapStartDate: new Date(Math.max(candStart, existStart)).toISOString().slice(0, 10),
        overlapEndDate: new Date(Math.min(candEnd, existEnd)).toISOString().slice(0, 10),
        conflictType: "OVERLAPPING_PRODUCTS",
        message: `Product overlap detected with active scheme '${existing.title}' (${existing.code}) during effective dates.`,
      });
    }
  }

  return collisions;
}

/**
 * Advanced pure evaluation engine supporting:
 * - Product eligibility
 * - Client type eligibility (LEAD, PROSPECT, CUSTOMER)
 * - Minimum order value (₹)
 * - Minimum order quantity
 * - 4 Scheme Types: PERCENTAGE_DISCOUNT, FLAT_DISCOUNT, BOGO, TIERED_SLAB
 * - Max discount cap
 */
export function evaluateSchemes(
  items: CartItem[],
  schemes: SchemeRule[],
  clientContext?: { clientType?: string; clientId?: string }
): SchemeEvaluationResult {
  const now = new Date();
  const currentClientType = clientContext?.clientType?.toUpperCase() || "CUSTOMER";

  // Filter schemes active, approved, and valid today
  const activeSchemes = schemes.filter((s) => {
    if (!s.isActive) return false;
    if (s.status && s.status !== "ACTIVE") return false;
    if (s.approvalStatus && s.approvalStatus !== "APPROVED") return false;

    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    if (start > now || end < now) return false;

    // Client type check
    if (s.eligibleClientTypesJson) {
      try {
        const types: string[] = JSON.parse(s.eligibleClientTypesJson);
        if (!types.includes("ALL") && !types.includes(currentClientType)) {
          return false;
        }
      } catch {
        // Default allow
      }
    }

    return true;
  });

  const grossSubtotal = items.reduce((acc, it) => acc + it.totalPrice, 0);
  const totalUnits = items.reduce((acc, it) => acc + it.quantity, 0);

  let totalDiscount = 0;
  const appliedSchemes: SchemeEvaluationResult["appliedSchemes"] = [];
  const freeGoods: SchemeEvaluationResult["freeGoods"] = [];
  const upcomingSchemes: SchemeEvaluationResult["upcomingSchemes"] = [];

  for (const scheme of activeSchemes) {
    // 1. Determine eligible items for this scheme
    let eligibleItems = items;
    let eligibleProductIds: string[] = ["ALL"];

    if (scheme.eligibleProductIdsJson) {
      try {
        eligibleProductIds = JSON.parse(scheme.eligibleProductIdsJson);
      } catch {
        eligibleProductIds = ["ALL"];
      }
    }

    if (!eligibleProductIds.includes("ALL")) {
      eligibleItems = items.filter((it) => eligibleProductIds.includes(it.productId));
      if (eligibleItems.length === 0) continue;
    }

    const eligibleSubtotal = eligibleItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const eligibleUnits = eligibleItems.reduce((acc, it) => acc + it.quantity, 0);

    // 2. Minimum Order Value Check
    const minOrderVal = scheme.minOrderValue || 0;
    if (minOrderVal > 0 && grossSubtotal < minOrderVal) {
      const remainingValue = minOrderVal - grossSubtotal;
      if (remainingValue <= 5000) {
        upcomingSchemes.push({
          schemeId: scheme.id,
          title: scheme.title,
          remainingOrderValue: remainingValue,
          message: `Add ₹${remainingValue.toFixed(2)} more to cart to unlock '${scheme.title}'!`,
        });
      }
      continue;
    }

    // 3. Minimum Order Quantity Check
    if (eligibleUnits < scheme.minOrderQty) {
      const needed = scheme.minOrderQty - eligibleUnits;
      if (needed <= 10) {
        upcomingSchemes.push({
          schemeId: scheme.id,
          title: scheme.title,
          remainingQty: needed,
          message: `Add ${needed} more unit(s) of eligible items to unlock '${scheme.title}'!`,
        });
      }
      continue;
    }

    // 4. Calculate Benefit based on Scheme Type
    if (scheme.type === "PERCENTAGE_DISCOUNT") {
      const percent = scheme.discountPercent || 0;
      let discountAmount = (eligibleSubtotal * percent) / 100;
      if (scheme.maxDiscountCap && scheme.maxDiscountCap > 0) {
        discountAmount = Math.min(discountAmount, scheme.maxDiscountCap);
      }
      discountAmount = Math.round(discountAmount * 100) / 100;

      totalDiscount += discountAmount;
      appliedSchemes.push({
        schemeId: scheme.id,
        code: scheme.code,
        title: scheme.title,
        discountAmount,
        benefitDescription: `${percent}% Trade Discount on eligible items (Saved ₹${discountAmount.toFixed(2)})`,
      });
    } else if (scheme.type === "FLAT_DISCOUNT") {
      let discountAmount = scheme.flatDiscount || 0;
      if (scheme.maxDiscountCap && scheme.maxDiscountCap > 0) {
        discountAmount = Math.min(discountAmount, scheme.maxDiscountCap);
      }
      discountAmount = Math.min(discountAmount, eligibleSubtotal);
      discountAmount = Math.round(discountAmount * 100) / 100;

      totalDiscount += discountAmount;
      appliedSchemes.push({
        schemeId: scheme.id,
        code: scheme.code,
        title: scheme.title,
        discountAmount,
        benefitDescription: `Flat ₹${discountAmount.toFixed(2)} Promotional Discount`,
      });
    } else if (scheme.type === "BOGO") {
      const matchedItem = items.find((it) => it.sku === scheme.freeSkuCode);
      const triggerQty = scheme.minOrderQty > 0 ? scheme.minOrderQty : 1;
      const multiplier = Math.floor(eligibleUnits / triggerQty);
      const freeQty = multiplier * (scheme.freeSkuQty || 1);

      if (freeQty > 0 && scheme.freeSkuCode) {
        freeGoods.push({ sku: scheme.freeSkuCode, freeQty });
        appliedSchemes.push({
          schemeId: scheme.id,
          code: scheme.code,
          title: scheme.title,
          discountAmount: 0,
          benefitDescription: `Free Goods: ${freeQty}x ${scheme.freeSkuCode}`,
          freeItems: [{ sku: scheme.freeSkuCode, freeQty }],
        });
      }
    } else if (scheme.type === "TIERED_SLAB") {
      // Evaluate slab tiers
      let tiers: SlabTier[] = [];
      try {
        if (scheme.slabTiersJson) {
          tiers = JSON.parse(scheme.slabTiersJson);
          tiers.sort((a, b) => b.minQty - a.minQty); // descending order
        }
      } catch {
        tiers = [];
      }

      // Find highest qualifying slab
      const qualifiedTier = tiers.find((t) => eligibleUnits >= t.minQty);
      if (qualifiedTier) {
        let discountAmount = (eligibleSubtotal * qualifiedTier.discountPercent) / 100;
        if (scheme.maxDiscountCap && scheme.maxDiscountCap > 0) {
          discountAmount = Math.min(discountAmount, scheme.maxDiscountCap);
        }
        discountAmount = Math.round(discountAmount * 100) / 100;

        totalDiscount += discountAmount;
        appliedSchemes.push({
          schemeId: scheme.id,
          code: scheme.code,
          title: scheme.title,
          discountAmount,
          benefitDescription: `Tiered Slab (${qualifiedTier.minQty}+ units): ${qualifiedTier.discountPercent}% off (Saved ₹${discountAmount.toFixed(2)})`,
        });
      }
    }
  }

  return {
    appliedSchemes,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    freeGoods,
    upcomingSchemes,
  };
}

/**
 * Records a scheme application transaction into SchemeApplicationLog.
 */
export async function logSchemeApplication(data: {
  schemeId: string;
  orderId?: string;
  clientId?: string;
  orderNumber?: string;
  discountAmount: number;
  freeSkuCode?: string;
  freeSkuQty?: number;
  orderSubtotal: number;
}) {
  try {
    return await prisma.schemeApplicationLog.create({
      data: {
        schemeId: data.schemeId,
        orderId: data.orderId || null,
        clientId: data.clientId || null,
        orderNumber: data.orderNumber || null,
        discountAmount: Number(data.discountAmount) || 0.0,
        freeSkuCode: data.freeSkuCode || null,
        freeSkuQty: data.freeSkuQty ? Number(data.freeSkuQty) : 0,
        orderSubtotal: Number(data.orderSubtotal) || 0.0,
      },
    });
  } catch (err) {
    console.error("Failed to record scheme application log:", err);
    return null;
  }
}
