import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding Milestone 4 Client / Lead Master Records...");

  // Fetch reference addresses and employees
  const [addresses, employees] = await Promise.all([
    prisma.address.findMany({ take: 4 }),
    prisma.employee.findMany({ take: 4 }),
  ]);

  const addr1 = addresses[0];
  const addr2 = addresses[1] || addresses[0];
  const addr3 = addresses[2] || addresses[0];
  const addr4 = addresses[3] || addresses[0];

  const emp1 = employees[0];
  const emp2 = employees[1] || employees[0];
  const emp3 = employees[2] || employees[0];

  const clientsData = [
    {
      clientCode: "CL-201",
      businessName: "Metro Hypermarket Mumbai",
      contactName: "Gaurav Agarwal",
      phone: "+91 98200 44551",
      email: "gaurav@metrohyper.com",
      clientType: "CUSTOMER",
      stage: "WON",
      status: "ACTIVE",
      addressId: addr1?.id,
      ownerId: emp3?.id || emp1?.id,
      lat: addr1?.lat || 18.9986,
      lng: addr1?.lng || 72.8258,
      creditLimit: 250000.0,
      expectedVal: 400000.0,
      notes: "Key modern trade account in Lower Parel commercial zone.",
      customFields: {
        gst_state_code: "27",
        credit_limit_inr: 250000,
        outlet_grade: "Class A (High Value)",
      },
    },
    {
      clientCode: "CL-202",
      businessName: "Royal Supermarket Bandra",
      contactName: "Mahesh Advani",
      phone: "+91 98201 66772",
      email: "mahesh@royalsuper.in",
      clientType: "PROSPECT",
      stage: "PROPOSAL",
      status: "ACTIVE",
      addressId: addr2?.id,
      ownerId: emp2?.id || emp1?.id,
      lat: addr2?.lat || 19.0688,
      lng: addr2?.lng || 72.8344,
      creditLimit: 75000.0,
      expectedVal: 150000.0,
      notes: "High footfall retail supermarket on Linking Road.",
      customFields: {
        gst_state_code: "27",
        credit_limit_inr: 75000,
        outlet_grade: "Class A (High Value)",
      },
    },
    {
      clientCode: "CL-203",
      businessName: "Apex FMCG Distributors",
      contactName: "Vipin Singhal",
      phone: "+91 98202 88993",
      email: "vipin@apexfmcg.co.in",
      clientType: "LEAD",
      stage: "NEW",
      status: "ACTIVE",
      addressId: addr3?.id,
      ownerId: emp1?.id,
      lat: addr3?.lat || 28.5708,
      lng: addr3?.lng || 77.3268,
      creditLimit: 50000.0,
      expectedVal: 200000.0,
      notes: "Inbound wholesale inquiry seeking regional sub-distribution rights.",
      customFields: {
        gst_state_code: "09",
        credit_limit_inr: 50000,
        outlet_grade: "Class B (Mid Tier)",
      },
    },
    {
      clientCode: "CL-204",
      businessName: "Green Leaf Organics Bengaluru",
      contactName: "Sunita Rao",
      phone: "+91 98203 11224",
      email: "sunita@greenleafblr.com",
      clientType: "CUSTOMER",
      stage: "WON",
      status: "ACTIVE",
      addressId: addr4?.id,
      ownerId: emp2?.id || emp1?.id,
      lat: addr4?.lat || 12.9698,
      lng: addr4?.lng || 77.7499,
      creditLimit: 120000.0,
      expectedVal: 250000.0,
      notes: "Specialty modern retail chain in Whitefield IT corridor.",
      customFields: {
        gst_state_code: "29",
        credit_limit_inr: 120000,
        outlet_grade: "Class A (High Value)",
      },
    },
  ];

  for (const c of clientsData) {
    const existing = await prisma.client.findUnique({ where: { clientCode: c.clientCode } });
    if (!existing) {
      const created = await prisma.client.create({ data: c });
      await prisma.clientTypeHistory.create({
        data: {
          clientId: created.id,
          fromType: "NONE",
          toType: created.clientType,
          triggerReason: "Initial Client Onboarding",
          changedBy: "Admin",
        },
      });
      console.log(`✓ Seeded ${created.clientType}: ${created.businessName} (${created.clientCode})`);
    } else {
      console.log(`- Client already exists: ${c.businessName}`);
    }
  }

  console.log("Client seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during client seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
