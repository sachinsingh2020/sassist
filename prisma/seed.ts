import { PrismaClient, Role, LeadStage } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting SAssist Master Data seeding...");

  // 1. Clear existing seed data gracefully
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.retailer.deleteMany();
  await prisma.beat.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.distributor.deleteMany();
  await prisma.territory.deleteMany();
  await prisma.scheme.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash("password123", 10);

  // 2. Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@sassist.com",
      passwordHash: defaultPassword,
      name: "Rajesh Sharma (Admin)",
      phone: "+91 9811100001",
      role: Role.SUPER_ADMIN,
    },
  });

  const repUser = await prisma.user.create({
    data: {
      email: "rep@sassist.com",
      passwordHash: defaultPassword,
      name: "Amit Verma (Field Rep)",
      phone: "+91 9811100002",
      role: Role.SALES_REP,
    },
  });

  const distUser = await prisma.user.create({
    data: {
      email: "distributor@sassist.com",
      passwordHash: defaultPassword,
      name: "Suresh Gupta (Metro Dist.)",
      phone: "+91 9811100003",
      role: Role.DISTRIBUTOR,
    },
  });

  // 3. Create Territories
  const territoryDelhi = await prisma.territory.create({
    data: {
      name: "Delhi-NCR Central",
      zone: "North",
      state: "Delhi",
      city: "New Delhi",
    },
  });

  const territoryMumbai = await prisma.territory.create({
    data: {
      name: "Mumbai Metro Area",
      zone: "West",
      state: "Maharashtra",
      city: "Mumbai",
    },
  });

  // 4. Create Distributors
  const distributor1 = await prisma.distributor.create({
    data: {
      name: "Metro FMCG Distributors Pvt Ltd",
      code: "DIST-DEL-001",
      contactPerson: "Suresh Gupta",
      phone: "+91 9811100003",
      email: "distributor@sassist.com",
      gstin: "07AAAAA0000A1Z5",
      address: "B-42, Okhla Industrial Area Phase-1, New Delhi",
      territoryId: territoryDelhi.id,
      userId: distUser.id,
    },
  });

  const distributor2 = await prisma.distributor.create({
    data: {
      name: "Apex Consumer Supply Corp",
      code: "DIST-BOM-002",
      contactPerson: "Vikas Patil",
      phone: "+91 9822200004",
      email: "vikas@apexsupply.in",
      gstin: "27BBBBB1111B2Z6",
      address: "Unit 12, Andheri East, Mumbai",
      territoryId: territoryMumbai.id,
    },
  });

  // 5. Create Beats
  const beat1 = await prisma.beat.create({
    data: {
      name: "Connaught Place & Barakhamba Beat",
      code: "BEAT-DEL-CP",
      dayOfWeek: "Monday",
      territoryId: territoryDelhi.id,
      assignedToId: repUser.id,
    },
  });

  const beat2 = await prisma.beat.create({
    data: {
      name: "Karol Bagh Market Beat",
      code: "BEAT-DEL-KB",
      dayOfWeek: "Tuesday",
      territoryId: territoryDelhi.id,
      assignedToId: repUser.id,
    },
  });

  // 6. Create Retailers
  const retailersData = [
    {
      storeName: "Sharma Kirana & General Store",
      ownerName: "Ramesh Sharma",
      phone: "+91 9811122331",
      address: "Shop 14, Inner Circle, Connaught Place, New Delhi",
      gstin: "07CDE1234F1Z8",
      lat: 28.6315,
      lng: 77.2167,
      beatId: beat1.id,
      distributorId: distributor1.id,
    },
    {
      storeName: "Aggarwal Super Mart",
      ownerName: "Mohan Aggarwal",
      phone: "+91 9811122332",
      address: "Block M, Middle Circle, Connaught Place, New Delhi",
      gstin: "07FGH5678J1Z9",
      lat: 28.6328,
      lng: 77.2195,
      beatId: beat1.id,
      distributorId: distributor1.id,
    },
    {
      storeName: "New India Daily Needs",
      ownerName: "Harpreet Singh",
      phone: "+91 9811122333",
      address: "12, Barakhamba Road, Connaught Place, New Delhi",
      gstin: "07JKL9012K1Z0",
      lat: 28.6290,
      lng: 77.2240,
      beatId: beat1.id,
      distributorId: distributor1.id,
    },
    {
      storeName: "Gupta Brothers Provisions",
      ownerName: "Kailash Gupta",
      phone: "+91 9811122334",
      address: "Ajmal Khan Road, Karol Bagh, New Delhi",
      gstin: "07MNO3456L1Z1",
      lat: 28.6517,
      lng: 77.1906,
      beatId: beat2.id,
      distributorId: distributor1.id,
    },
    {
      storeName: "Royal Departmental Store",
      ownerName: "Sunil Bajaj",
      phone: "+91 9811122335",
      address: "Ghaffar Market Road, Karol Bagh, New Delhi",
      gstin: "07PQR7890M1Z2",
      lat: 28.6534,
      lng: 77.1932,
      beatId: beat2.id,
      distributorId: distributor1.id,
    },
  ];

  for (const r of retailersData) {
    await prisma.retailer.create({ data: r });
  }

  // 7. Create Categories
  const catBeverages = await prisma.category.create({
    data: { name: "Beverages & Drinks", description: "Soft drinks, juices, energy drinks, teas" },
  });

  const catSnacks = await prisma.category.create({
    data: { name: "Snacks & Confectionery", description: "Biscuits, chips, chocolates, namkeen" },
  });

  const catPersonal = await prisma.category.create({
    data: { name: "Personal Care", description: "Soaps, shampoos, oral hygiene, skin care" },
  });

  // 8. Create Products
  const products = [
    {
      name: "PowerVolt Energy Drink 250ml",
      sku: "BEV-PV-250",
      barcode: "890123450001",
      hsnCode: "2202",
      categoryId: catBeverages.id,
      uom: "CAN",
      mrp: 60.0,
      distributorPrice: 42.0,
      retailerPrice: 48.0,
      gstRate: 18.0,
      stockQuantity: 1200,
    },
    {
      name: "CitrusFresh Sparkling Orange 500ml",
      sku: "BEV-CF-500",
      barcode: "890123450002",
      hsnCode: "2202",
      categoryId: catBeverages.id,
      uom: "BOTTLE",
      mrp: 45.0,
      distributorPrice: 30.0,
      retailerPrice: 36.0,
      gstRate: 18.0,
      stockQuantity: 850,
    },
    {
      name: "CrispyCrunch Salted Potato Crisps 85g",
      sku: "SNK-CC-085",
      barcode: "890123450003",
      hsnCode: "2005",
      categoryId: catSnacks.id,
      uom: "PACK",
      mrp: 30.0,
      distributorPrice: 20.0,
      retailerPrice: 24.0,
      gstRate: 12.0,
      stockQuantity: 2400,
    },
    {
      name: "NutriChoc Premium Chocolate Cookies 150g",
      sku: "SNK-NC-150",
      barcode: "890123450004",
      hsnCode: "1905",
      categoryId: catSnacks.id,
      uom: "BOX",
      mrp: 75.0,
      distributorPrice: 52.0,
      retailerPrice: 60.0,
      gstRate: 18.0,
      stockQuantity: 620,
    },
    {
      name: "PureGlow Herbal Skin Care Soap 125g",
      sku: "PC-PG-125",
      barcode: "890123450005",
      hsnCode: "3401",
      categoryId: catPersonal.id,
      uom: "PCS",
      mrp: 55.0,
      distributorPrice: 38.0,
      retailerPrice: 44.0,
      gstRate: 18.0,
      stockQuantity: 1500,
    },
    {
      name: "BioClean Antibacterial Handwash 250ml",
      sku: "PC-BC-250",
      barcode: "890123450006",
      hsnCode: "3402",
      categoryId: catPersonal.id,
      uom: "BOTTLE",
      mrp: 99.0,
      distributorPrice: 68.0,
      retailerPrice: 79.0,
      gstRate: 18.0,
      stockQuantity: 420,
    },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  // 9. Create Schemes
  await prisma.scheme.create({
    data: {
      title: "Festive Booster: 10% Off On 20+ Cases",
      code: "SCHEME-FESTIVE-10",
      description: "Get 10% flat trade discount on any order with 20 or more units",
      type: "PERCENTAGE_DISCOUNT",
      minOrderQty: 20,
      discountPercent: 10.0,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2026-12-31"),
      isActive: true,
    },
  });

  await prisma.scheme.create({
    data: {
      title: "Energy Drink Launch BOGO Deal",
      code: "SCHEME-BOGO-POWER",
      description: "Buy 10 packs of PowerVolt 250ml, get 1 free",
      type: "BOGO",
      minOrderQty: 10,
      freeSkuCode: "BEV-PV-250",
      freeSkuQty: 1,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2026-12-31"),
      isActive: true,
    },
  });

  // 10. Create Sample Leads (CRM)
  await prisma.lead.create({
    data: {
      businessName: "Royal Traders & Stockists",
      contactName: "Gaurav Malhotra",
      phone: "+91 9999011223",
      email: "gaurav@royaltraders.com",
      address: "Sector 18, Noida, Uttar Pradesh",
      leadType: "DISTRIBUTOR",
      stage: LeadStage.QUALIFIED,
      expectedVal: 250000.0,
      notes: "Looking for distribution rights for Beverages category in Noida & Greater Noida.",
    },
  });

  await prisma.lead.create({
    data: {
      businessName: "City Mart Hypermarket",
      contactName: "Pooja Singhal",
      phone: "+91 9999044556",
      email: "pooja@citymart.in",
      address: "Indirapuram, Ghaziabad",
      leadType: "RETAILER",
      stage: LeadStage.NEW,
      expectedVal: 50000.0,
      notes: "New modern trade hypermarket opening next month. Requested price catalog.",
    },
  });

  console.log("✅ Seeding completed successfully! Master Data populated in Neon PostgreSQL.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
