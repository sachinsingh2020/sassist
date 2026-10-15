import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CustomFieldType } from "@prisma/client";
import { recordAuditLog } from "@/lib/customFields";

// PUT /api/custom-fields/[id] - Update field definition
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.fieldDefinition.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Field definition not found." },
        { status: 404 }
      );
    }

    const {
      label,
      dataType,
      placeholder,
      defaultValue,
      isRequired,
      isUnique,
      minVal,
      maxVal,
      regexPattern,
      regexErrorMsg,
      optionsJson,
      dependentOnId,
      lookupTarget,
      sortOrder,
      isActive,
      showInList,
      showInDetail,
    } = body;

    const updated = await prisma.fieldDefinition.update({
      where: { id },
      data: {
        label: label !== undefined ? label.trim() : existing.label,
        dataType: dataType !== undefined ? (dataType as CustomFieldType) : existing.dataType,
        placeholder: placeholder !== undefined ? placeholder : existing.placeholder,
        defaultValue: defaultValue !== undefined ? (defaultValue !== null ? String(defaultValue) : null) : existing.defaultValue,
        isRequired: isRequired !== undefined ? Boolean(isRequired) : existing.isRequired,
        isUnique: isUnique !== undefined ? Boolean(isUnique) : existing.isUnique,
        minVal: minVal !== undefined ? (minVal !== null && minVal !== "" ? Number(minVal) : null) : existing.minVal,
        maxVal: maxVal !== undefined ? (maxVal !== null && maxVal !== "" ? Number(maxVal) : null) : existing.maxVal,
        regexPattern: regexPattern !== undefined ? regexPattern : existing.regexPattern,
        regexErrorMsg: regexErrorMsg !== undefined ? regexErrorMsg : existing.regexErrorMsg,
        optionsJson:
          optionsJson !== undefined
            ? optionsJson
              ? typeof optionsJson === "string"
                ? optionsJson
                : JSON.stringify(optionsJson)
              : null
            : existing.optionsJson,
        dependentOnId: dependentOnId !== undefined ? dependentOnId : existing.dependentOnId,
        lookupTarget: lookupTarget !== undefined ? lookupTarget : existing.lookupTarget,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        showInList: showInList !== undefined ? Boolean(showInList) : existing.showInList,
        showInDetail: showInDetail !== undefined ? Boolean(showInDetail) : existing.showInDetail,
      },
    });

    // Audit Log
    await recordAuditLog({
      entityType: "FIELD_DEFINITION",
      entityId: id,
      action: "UPDATE",
      oldValues: existing,
      newValues: updated,
      reason: `Updated dynamic field '${existing.name}' in module '${existing.module}'`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PUT /api/custom-fields/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update field definition." },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-fields/[id] - Soft deactivates or permanently deletes field definition
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    const existing = await prisma.fieldDefinition.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Field definition not found." },
        { status: 404 }
      );
    }

    if (permanent) {
      await prisma.fieldDefinition.delete({ where: { id } });
      await recordAuditLog({
        entityType: "FIELD_DEFINITION",
        entityId: id,
        action: "DELETE",
        oldValues: existing,
        reason: `Permanently deleted dynamic field '${existing.name}' from module '${existing.module}'`,
      });
    } else {
      // Soft deactivate to protect historical records
      await prisma.fieldDefinition.update({
        where: { id },
        data: { isActive: false },
      });
      await recordAuditLog({
        entityType: "FIELD_DEFINITION",
        entityId: id,
        action: "DEACTIVATE",
        oldValues: existing,
        reason: `Deactivated dynamic field '${existing.name}' from module '${existing.module}'`,
      });
    }

    return NextResponse.json({
      success: true,
      message: permanent ? "Field deleted permanently." : "Field deactivated successfully.",
    });
  } catch (error: any) {
    console.error("DELETE /api/custom-fields/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete field definition." },
      { status: 500 }
    );
  }
}
