import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding Milestone 3 Employee Master & Hierarchy...");

  // 1. VP Sales (Root)
  const vp = await prisma.employee.upsert({
    where: { empCode: "EMP-101" },
    update: {},
    create: {
      empCode: "EMP-101",
      name: "Rajesh Sharma",
      email: "rajesh.vp@sassist.crm",
      phone: "+91 98200 11223",
      designation: "Vice President - Field Sales",
      department: "Executive Leadership",
      status: "ACTIVE",
      territoryName: "National HQ",
      permissions: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canImport: true,
        canExport: true,
        canAssign: true,
        canTransfer: true,
        isSuperAdmin: true,
      },
    },
  });
  console.log("✓ Seeded VP:", vp.name);

  // 2. Zonal Head West (Reports to VP)
  const zh = await prisma.employee.upsert({
    where: { empCode: "EMP-102" },
    update: { managerId: vp.id },
    create: {
      empCode: "EMP-102",
      name: "Anita Deshmukh",
      email: "anita.zh@sassist.crm",
      phone: "+91 98201 33445",
      designation: "Zonal Sales Head (West)",
      department: "Field Sales",
      status: "ACTIVE",
      managerId: vp.id,
      territoryName: "West Zone (MH & GJ)",
      permissions: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canImport: true,
        canExport: true,
        canAssign: true,
        canTransfer: true,
        isSuperAdmin: false,
      },
    },
  });
  console.log("✓ Seeded Zonal Head:", zh.name);

  // 3. ASM Mumbai (Reports to Zonal Head)
  const asm = await prisma.employee.upsert({
    where: { empCode: "EMP-103" },
    update: { managerId: zh.id },
    create: {
      empCode: "EMP-103",
      name: "Vikram Malhotra",
      email: "vikram.asm@sassist.crm",
      phone: "+91 98202 55667",
      designation: "Area Sales Manager (Mumbai)",
      department: "Field Sales",
      status: "ACTIVE",
      managerId: zh.id,
      territoryName: "Mumbai Central",
    },
  });
  console.log("✓ Seeded ASM:", asm.name);

  // 4. Sales Rep (Reports to ASM)
  const rep = await prisma.employee.upsert({
    where: { empCode: "EMP-104" },
    update: { managerId: asm.id },
    create: {
      empCode: "EMP-104",
      name: "Amit Verma",
      email: "amit.rep@sassist.crm",
      phone: "+91 98203 77889",
      designation: "Senior Sales Representative",
      department: "Field Sales",
      status: "ACTIVE",
      managerId: asm.id,
      territoryName: "Lower Parel & Andheri",
      customFields: {
        emergency_contact: "+91 98203 99999",
        territory_vehicle_no: "MH-01-AX-9988",
      },
    },
  });
  console.log("✓ Seeded Sales Rep:", rep.name);

  // 5. TSO Pune (Reports to Zonal Head)
  const tso = await prisma.employee.upsert({
    where: { empCode: "EMP-105" },
    update: { managerId: zh.id },
    create: {
      empCode: "EMP-105",
      name: "Sneha Patil",
      email: "sneha.tso@sassist.crm",
      phone: "+91 98204 88990",
      designation: "Territory Sales Officer",
      department: "Field Sales",
      status: "ACTIVE",
      managerId: zh.id,
      territoryName: "Pune Central",
    },
  });
  console.log("✓ Seeded TSO:", tso.name);

  console.log("Employee hierarchy seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during employee seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
