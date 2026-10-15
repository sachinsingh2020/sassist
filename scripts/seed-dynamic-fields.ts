import { prisma } from "../src/lib/prisma";
import { ModuleName, CustomFieldType } from "@prisma/client";

async function main() {
  console.log("Seeding Milestone 1 Dynamic Field Definitions...");

  const definitions = [
    // PRODUCT MASTER
    {
      module: ModuleName.PRODUCT,
      name: "fssai_license_no",
      label: "FSSAI License No",
      dataType: CustomFieldType.TEXT,
      placeholder: "14-digit FSSAI Number",
      regexPattern: "^[0-9]{14}$",
      regexErrorMsg: "FSSAI must be 14 numeric digits",
      sortOrder: 1,
      showInList: true,
      showInDetail: true,
      isRequired: false,
    },
    {
      module: ModuleName.PRODUCT,
      name: "is_cold_chain",
      label: "Cold Storage Required",
      dataType: CustomFieldType.CHECKBOX,
      defaultValue: "false",
      sortOrder: 2,
      showInList: true,
      showInDetail: true,
      isRequired: false,
    },
    {
      module: ModuleName.PRODUCT,
      name: "shelf_life_days",
      label: "Shelf Life (Days)",
      dataType: CustomFieldType.NUMBER,
      minVal: 1,
      maxVal: 730,
      placeholder: "180",
      sortOrder: 3,
      showInList: true,
      showInDetail: true,
      isRequired: false,
    },
    {
      module: ModuleName.PRODUCT,
      name: "case_pack_tier",
      label: "Packaging Tier",
      dataType: CustomFieldType.SELECT,
      optionsJson: JSON.stringify(["Standard Corrugated", "Polybag Wrapped", "Export Wooden Crate"]),
      sortOrder: 4,
      showInList: true,
      showInDetail: true,
      isRequired: false,
    },

    // CLIENT / LEAD MASTER
    {
      module: ModuleName.CLIENT,
      name: "gst_state_code",
      label: "GST State Code",
      dataType: CustomFieldType.TEXT,
      placeholder: "27",
      regexPattern: "^[0-9]{2}$",
      regexErrorMsg: "Must be 2 digit state code (e.g. 27)",
      sortOrder: 1,
      showInList: true,
      showInDetail: true,
      isRequired: false,
    },
    {
      module: ModuleName.CLIENT,
      name: "credit_limit_inr",
      label: "Approved Credit Limit",
      dataType: CustomFieldType.CURRENCY,
      minVal: 0,
      defaultValue: "50000",
      sortOrder: 2,
      showInList: true,
      showInDetail: true,
      isRequired: false,
    },
    {
      module: ModuleName.CLIENT,
      name: "store_front_gps",
      label: "Store Front GPS",
      dataType: CustomFieldType.GEOLOCATION,
      sortOrder: 3,
      showInList: true,
      showInDetail: true,
      isRequired: false,
    },
    {
      module: ModuleName.CLIENT,
      name: "outlet_grade",
      label: "Outlet Class Grade",
      dataType: CustomFieldType.SELECT,
      optionsJson: JSON.stringify(["Class A (High Value)", "Class B (Mid Tier)", "Class C (Rural General)"]),
      sortOrder: 4,
      showInList: true,
      showInDetail: true,
      isRequired: false,
    },

    // ADDRESS MASTER
    {
      module: ModuleName.ADDRESS,
      name: "delivery_route_code",
      label: "Delivery Route Code",
      dataType: CustomFieldType.TEXT,
      placeholder: "RT-NORTH-04",
      sortOrder: 1,
      showInList: true,
      showInDetail: true,
      isRequired: false,
    },
    {
      module: ModuleName.ADDRESS,
      name: "landmark_details",
      label: "Key Landmark",
      dataType: CustomFieldType.TEXT,
      placeholder: "Opposite Bus Depot / Near Central Hospital",
      sortOrder: 2,
      showInList: true,
      showInDetail: true,
      isRequired: false,
    },

    // EMPLOYEE MASTER
    {
      module: ModuleName.EMPLOYEE,
      name: "emergency_contact",
      label: "Emergency Phone",
      dataType: CustomFieldType.PHONE,
      placeholder: "+91 98765 43210",
      sortOrder: 1,
      showInList: true,
      showInDetail: true,
      isRequired: false,
    },
    {
      module: ModuleName.EMPLOYEE,
      name: "territory_vehicle_no",
      label: "Vehicle Reg No",
      dataType: CustomFieldType.TEXT,
      placeholder: "MH-02-AB-1234",
      sortOrder: 2,
      showInList: true,
      showInDetail: true,
      isRequired: false,
    },
  ];

  for (const def of definitions) {
    await prisma.fieldDefinition.upsert({
      where: {
        module_name: {
          module: def.module,
          name: def.name,
        },
      },
      update: def,
      create: def,
    });
    console.log(`✓ Seeded field: [${def.module}] ${def.label} (${def.name})`);
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
