import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding Milestone 2 Initial Address Master Records...");

  const seedAddresses = [
    {
      addressLine1: "Unit 402, Trade Link B-Wing, Kamala Mills Compound",
      addressLine2: "Senapati Bapat Marg, Lower Parel",
      country: "India",
      state: "Maharashtra",
      city: "Mumbai",
      district: "Mumbai Suburban",
      zone: "West",
      territory: "Mumbai Central",
      townLocality: "Lower Parel Commercial",
      pincode: "400013",
      route: "RT-MUM-CENTRAL-01",
      beat: "Kamala Mills Commercial",
      deliveryArea: "Lower Parel Depot",
      lat: 18.9986,
      lng: 72.8258,
      status: "ACTIVE",
      customFields: {
        delivery_route_code: "RT-MUM-01",
        landmark_details: "Opposite Times Tower",
      },
    },
    {
      addressLine1: "Shop No. 12, Link Corner, Plot 34, Linking Road",
      addressLine2: "Near KFC, Khar West",
      country: "India",
      state: "Maharashtra",
      city: "Mumbai",
      district: "Mumbai Suburban",
      zone: "West",
      territory: "Bandra Kurla",
      townLocality: "Khar Linking Road",
      pincode: "400052",
      route: "RT-BANDRA-KHAR-02",
      beat: "Linking Road Retail Beat",
      deliveryArea: "Bandra Hub",
      lat: 19.0688,
      lng: 72.8344,
      status: "ACTIVE",
      customFields: {
        delivery_route_code: "RT-BANDRA-02",
        landmark_details: "Corner of 14th Road junction",
      },
    },
    {
      addressLine1: "Godown No 5, Sector 18 Commercial Complex",
      addressLine2: "Behind Atta Market",
      country: "India",
      state: "Uttar Pradesh",
      city: "Noida",
      district: "Gautam Buddha Nagar",
      zone: "North",
      territory: "Sector 18 Commercial",
      townLocality: "Atta Market Hub",
      pincode: "201301",
      route: "RT-NOIDA-SEC18",
      beat: "Noida FMCG Wholesale Beat",
      deliveryArea: "Noida Sector 63 Logistics Base",
      lat: 28.5708,
      lng: 77.3268,
      status: "ACTIVE",
      customFields: {
        delivery_route_code: "RT-NOIDA-01",
        landmark_details: "Adjacent to Wave Mall Parking",
      },
    },
    {
      addressLine1: "Plot 88, EPIP Industrial Area, Phase II",
      addressLine2: "Near SAP Labs, Whitefield",
      country: "India",
      state: "Karnataka",
      city: "Bengaluru",
      district: "Bengaluru Urban",
      zone: "South",
      territory: "Whitefield",
      townLocality: "ITPL Corridor",
      pincode: "560066",
      route: "RT-BLR-WHITEFIELD-04",
      beat: "East Tech Hub Beat",
      deliveryArea: "Bengaluru East Distribution Depot",
      lat: 12.9698,
      lng: 77.7499,
      status: "ACTIVE",
      customFields: {
        delivery_route_code: "RT-BLR-WF-04",
        landmark_details: "Next to Prestige Tech Park",
      },
    },
  ];

  for (const addr of seedAddresses) {
    const existing = await prisma.address.findFirst({
      where: {
        pincode: addr.pincode,
        addressLine1: addr.addressLine1,
      },
    });

    if (!existing) {
      await prisma.address.create({ data: addr });
      console.log(`✓ Seeded address in ${addr.city}, ${addr.state} (${addr.pincode})`);
    } else {
      console.log(`- Address already exists in ${addr.city} (${addr.pincode})`);
    }
  }

  console.log("Address seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during address seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
