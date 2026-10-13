export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SchemeRule {
  id: string;
  title: string;
  code: string;
  description?: string | null;
  type: string; // PERCENTAGE_DISCOUNT | FLAT_DISCOUNT | BOGO
  minOrderQty: number;
  discountPercent?: number | null;
  flatDiscount?: number | null;
  freeSkuCode?: string | null;
  freeSkuQty?: number | null;
  startDate: Date | string;
  endDate: Date | string;
  isActive: boolean;
}

export interface SchemeEvaluationResult {
  appliedSchemes: Array<{
    schemeId: string;
    code: string;
    title: string;
    discountAmount: number;
    freeItems?: Array<{ sku: string; freeQty: number }>;
  }>;
  totalDiscount: number;
  freeGoods: Array<{ sku: string; freeQty: number }>;
  upcomingSchemes: Array<{
    schemeId: string;
    title: string;
    remainingQty: number;
  }>;
}

/**
 * Pure calculation engine to evaluate eligible schemes and discounts for a cart
 */
export function evaluateSchemes(
  items: CartItem[],
  schemes: SchemeRule[]
): SchemeEvaluationResult {
  const now = new Date();
  const activeSchemes = schemes.filter(
    (s) => s.isActive && new Date(s.startDate) <= now && new Date(s.endDate) >= now
  );

  const totalUnits = items.reduce((acc, it) => acc + it.quantity, 0);
  const grossSubtotal = items.reduce((acc, it) => acc + it.totalPrice, 0);

  let totalDiscount = 0;
  const appliedSchemes: SchemeEvaluationResult["appliedSchemes"] = [];
  const freeGoods: SchemeEvaluationResult["freeGoods"] = [];
  const upcomingSchemes: SchemeEvaluationResult["upcomingSchemes"] = [];

  for (const scheme of activeSchemes) {
    if (scheme.type === "PERCENTAGE_DISCOUNT") {
      if (totalUnits >= scheme.minOrderQty) {
        const percent = scheme.discountPercent || 0;
        const discountAmount = (grossSubtotal * percent) / 100;
        totalDiscount += discountAmount;
        appliedSchemes.push({
          schemeId: scheme.id,
          code: scheme.code,
          title: scheme.title,
          discountAmount,
        });
      } else if (scheme.minOrderQty > totalUnits && scheme.minOrderQty - totalUnits <= 10) {
        upcomingSchemes.push({
          schemeId: scheme.id,
          title: scheme.title,
          remainingQty: scheme.minOrderQty - totalUnits,
        });
      }
    } else if (scheme.type === "FLAT_DISCOUNT") {
      if (totalUnits >= scheme.minOrderQty) {
        const discountAmount = scheme.flatDiscount || 0;
        totalDiscount += discountAmount;
        appliedSchemes.push({
          schemeId: scheme.id,
          code: scheme.code,
          title: scheme.title,
          discountAmount,
        });
      }
    } else if (scheme.type === "BOGO") {
      // Find matching item in cart
      const matchedItem = items.find((it) => it.sku === scheme.freeSkuCode);
      if (matchedItem && matchedItem.quantity >= scheme.minOrderQty) {
        // Multiplier: how many free sets
        const multiplier = Math.floor(matchedItem.quantity / scheme.minOrderQty);
        const freeQty = multiplier * (scheme.freeSkuQty || 1);
        if (freeQty > 0) {
          freeGoods.push({ sku: scheme.freeSkuCode!, freeQty });
          appliedSchemes.push({
            schemeId: scheme.id,
            code: scheme.code,
            title: scheme.title,
            discountAmount: 0,
            freeItems: [{ sku: scheme.freeSkuCode!, freeQty }],
          });
        }
      } else if (scheme.freeSkuCode) {
        const currentQty = matchedItem?.quantity || 0;
        const needed = scheme.minOrderQty - currentQty;
        if (needed > 0 && needed <= 5) {
          upcomingSchemes.push({
            schemeId: scheme.id,
            title: scheme.title,
            remainingQty: needed,
          });
        }
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
