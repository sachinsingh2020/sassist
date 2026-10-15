import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ModuleName, CustomFieldType } from "@prisma/client";
import { recordAuditLog } from "@/lib/customFields";

// GET /api/custom-fields?module=PRODUCT&activeOnly=false
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleParam = searchParams.get("module") as ModuleName | null;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: any = {};
    if (moduleParam && Object.values(ModuleName).includes(moduleParam)) {
      where.module = moduleParam;
    }
    if (activeOnly) {
      where.isActive = true;
    }

    const fields = await prisma.fieldDefinition.findMany({
      where,
      orderBy: [{ module: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ success: true, data: fields });
  } catch (error: any) {
    console.error("GET /api/custom-fields error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch custom field definitions." },
      { status: 500 }
    );
  }
}

// POST /api/custom-fields - Create a new dynamic field definition
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      module,
      name,
      label,
      dataType = "TEXT",
      placeholder,
      defaultValue,
      isRequired = false,
      isUnique = false,
      minVal,
      maxVal,
      regexPattern,
      regexErrorMsg,
      optionsJson,
      dependentOnId,
      lookupTarget,
      sortOrder = 0,
      showInList = true,
      showInDetail = true,
    } = body;

    // 1. Validation
    if (!module || !Object.values(ModuleName).includes(module)) {
      return NextResponse.json(
        { success: false, error: "Valid module is required (e.g. PRODUCT, CLIENT, ADDRESS, EMPLOYEE)." },
        { status: 400 }
      );
    }

    if (!name || !/^[a-z0-9_]+$/.test(name)) {
      return NextResponse.json(
        { success: false, error: "Field name must be lowercase alphanumeric with underscores only (e.g. gst_number, tax_rate)." },
        { status: 400 }
      );
    }

    if (!label || label.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Field label is required." },
        { status: 400 }
      );
    }

    // 2. Check for duplicate name in same module
    const existing = await prisma.fieldDefinition.findUnique({
      where: {
        module_name: {
          module,
          name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Field '${name}' already exists in module ${module}.` },
        { status: 409 }
      );
    }

    // 3. Create Field Definition
    const fieldDef = await prisma.fieldDefinition.create({
      data: {
        module,
        name,
        label: label.trim(),
        dataType: dataType as CustomFieldType,
        placeholder: placeholder || null,
        defaultValue: defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : null,
        isRequired: Boolean(isRequired),
        isUnique: Boolean(isUnique),
        minVal: minVal !== undefined && minVal !== null && minVal !== "" ? Number(minVal) : null,
        maxVal: maxVal !== undefined && maxVal !== null && maxVal !== "" ? Number(maxVal) : null,
        regexPattern: regexPattern || null,
        regexErrorMsg: regexErrorMsg || null,
        optionsJson: optionsJson ? (typeof optionsJson === "string" ? optionsJson : JSON.stringify(optionsJson)) : null,
        dependentOnId: dependentOnId || null,
        lookupTarget: lookupTarget || null,
        sortOrder: Number(sortOrder) || 0,
        showInList: Boolean(showInList),
        showInDetail: Boolean(showInDetail),
        isActive: true,
      },
    });

    // 4. Audit Log
    await recordAuditLog({
      entityType: "FIELD_DEFINITION",
      entityId: fieldDef.id,
      action: "CREATE",
      newValues: fieldDef,
      reason: `Created dynamic field definition '${fieldDef.name}' for module '${fieldDef.module}'`,
    });

    return NextResponse.json({ success: true, data: fieldDef }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/custom-fields error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create field definition." },
      { status: 500 }
    );
  }
}
