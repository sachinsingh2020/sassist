"use server";

import { prisma } from "@/lib/prisma";

export async function getBiAnalyticsData() {
  const [orders, visits, products, retailers, distributors, posTransactions] =
    await Promise.all([
      prisma.order.findMany({
        include: {
          items: { include: { product: true } },
          rep: true,
          retailer: true,
          distributor: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.visit.findMany({
        include: { rep: true, retailer: true, beat: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.findMany({
        include: { category: true },
      }),
      prisma.retailer.findMany({
        include: { beat: true, distributor: true },
      }),
      prisma.distributor.findMany({
        include: { territory: true },
      }),
      prisma.posTransaction.findMany({
        orderBy: { createdAt: "desc" },
      }),
    ]);

  // Calculations
  const secondarySalesTotal = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const posSalesTotal = posTransactions.reduce((acc, t) => acc + t.totalAmount, 0);
  const combinedGrossSales = secondarySalesTotal + posSalesTotal;

  // Rep Productivity
  const repStatsMap: Record<
    string,
    {
      name: string;
      email: string;
      visitsCount: number;
      ordersCount: number;
      orderValue: number;
    }
  > = {};

  for (const visit of visits) {
    const repId = visit.repId;
    if (!repStatsMap[repId]) {
      repStatsMap[repId] = {
        name: visit.rep.name,
        email: visit.rep.email,
        visitsCount: 0,
        ordersCount: 0,
        orderValue: 0,
      };
    }
    repStatsMap[repId].visitsCount += 1;
  }

  for (const order of orders) {
    const repId = order.repId;
    if (!repStatsMap[repId]) {
      repStatsMap[repId] = {
        name: order.rep.name,
        email: order.rep.email,
        visitsCount: 0,
        ordersCount: 0,
        orderValue: 0,
      };
    }
    repStatsMap[repId].ordersCount += 1;
    repStatsMap[repId].orderValue += order.totalAmount;
  }

  const repLeaderboard = Object.values(repStatsMap);

  // Top SKUs Sold
  const skuSalesMap: Record<
    string,
    { name: string; sku: string; unitsSold: number; totalValue: number; uom: string }
  > = {};

  for (const order of orders) {
    for (const item of order.items) {
      const sku = item.product.sku;
      if (!skuSalesMap[sku]) {
        skuSalesMap[sku] = {
          name: item.product.name,
          sku: item.product.sku,
          unitsSold: 0,
          totalValue: 0,
          uom: item.product.uom,
        };
      }
      skuSalesMap[sku].unitsSold += item.quantity;
      skuSalesMap[sku].totalValue += item.totalPrice;
    }
  }

  const topSkus = Object.values(skuSalesMap).sort((a, b) => b.totalValue - a.totalValue);

  // Category Distribution
  const categorySalesMap: Record<string, number> = {};
  for (const order of orders) {
    for (const item of order.items) {
      const cat = item.product.categoryId;
      categorySalesMap[cat] = (categorySalesMap[cat] || 0) + item.totalPrice;
    }
  }

  // Visit Conversion Rate
  const totalVisits = visits.length;
  const productiveVisits = visits.filter((v) => v.status === "COMPLETED").length;
  const strikeRate = totalVisits > 0 ? Math.round((productiveVisits / totalVisits) * 100) : 0;

  // Monthly Target vs Achievement
  const monthlyTarget = 250000; // Target in ₹
  const targetAchievementPercent = Math.min(
    100,
    Math.round((secondarySalesTotal / monthlyTarget) * 100)
  );

  return {
    metrics: {
      secondarySalesTotal,
      posSalesTotal,
      combinedGrossSales,
      totalOrders: orders.length,
      totalVisits,
      strikeRate,
      monthlyTarget,
      targetAchievementPercent,
      activeRetailers: retailers.length,
      activeDistributors: distributors.length,
    },
    repLeaderboard,
    topSkus,
    recentOrders: orders.slice(0, 5),
  };
}

export async function exportReportData(reportType: "orders" | "visits" | "inventory" | "retailers") {
  if (reportType === "orders") {
    const orders = await prisma.order.findMany({
      include: { retailer: true, distributor: true, rep: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });

    const rows = [
      ["Order Number", "Date", "Retailer", "Distributor", "Sales Rep", "Items Count", "Subtotal", "Discount", "GST", "Total Amount", "Status"],
      ...orders.map((o) => [
        o.orderNumber,
        new Date(o.createdAt).toLocaleDateString(),
        `"${o.retailer.storeName}"`,
        `"${o.distributor.name}"`,
        `"${o.rep.name}"`,
        o.items.length,
        o.subTotal.toFixed(2),
        o.discount.toFixed(2),
        o.taxAmount.toFixed(2),
        o.totalAmount.toFixed(2),
        o.status,
      ]),
    ];

    return rows.map((r) => r.join(",")).join("\n");
  }

  if (reportType === "visits") {
    const visits = await prisma.visit.findMany({
      include: { rep: true, retailer: true, beat: true },
      orderBy: { createdAt: "desc" },
    });

    const rows = [
      ["Date", "Sales Officer", "Retail Outlet", "Beat Name", "Check-In", "Check-Out", "GPS Coordinates", "Status", "No Order Reason"],
      ...visits.map((v) => [
        new Date(v.createdAt).toLocaleDateString(),
        `"${v.rep.name}"`,
        `"${v.retailer.storeName}"`,
        `"${v.beat.name}"`,
        new Date(v.checkIn).toLocaleTimeString(),
        v.checkOut ? new Date(v.checkOut).toLocaleTimeString() : "In Progress",
        v.lat && v.lng ? `"${v.lat}, ${v.lng}"` : "N/A",
        v.status,
        v.noOrderReason ? `"${v.noOrderReason}"` : "None",
      ]),
    ];

    return rows.map((r) => r.join(",")).join("\n");
  }

  if (reportType === "inventory") {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { name: "asc" },
    });

    const rows = [
      ["SKU Code", "Product Name", "Category", "UOM", "MRP", "Distributor Price", "Retailer Price", "Stock Quantity", "Status"],
      ...products.map((p) => [
        p.sku,
        `"${p.name}"`,
        `"${p.category.name}"`,
        p.uom,
        p.mrp.toFixed(2),
        p.distributorPrice.toFixed(2),
        p.retailerPrice.toFixed(2),
        p.stockQuantity,
        p.stockQuantity < 100 ? "LOW STOCK" : "IN STOCK",
      ]),
    ];

    return rows.map((r) => r.join(",")).join("\n");
  }

  if (reportType === "retailers") {
    const retailers = await prisma.retailer.findMany({
      include: { beat: true, distributor: true },
      orderBy: { storeName: "asc" },
    });

    const rows = [
      ["Store Name", "Owner Name", "Phone", "Address", "GSTIN", "Beat Route", "Mapped Stockist", "Latitude", "Longitude"],
      ...retailers.map((r) => [
        `"${r.storeName}"`,
        `"${r.ownerName}"`,
        r.phone,
        `"${r.address}"`,
        r.gstin || "N/A",
        `"${r.beat.name}"`,
        `"${r.distributor.name}"`,
        r.lat || "N/A",
        r.lng || "N/A",
      ]),
    ];

    return rows.map((r) => r.join(",")).join("\n");
  }

  return "";
}
