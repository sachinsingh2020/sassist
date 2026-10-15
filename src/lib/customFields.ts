import { prisma } from "@/lib/prisma";
import { CustomFieldType, ModuleName, FieldDefinition } from "@prisma/client";

export interface CustomFieldValidationError {
  field: string;
  label: string;
  message: string;
}

/**
 * Validates custom field input data against the active FieldDefinitions for a module.
 */
export async function validateCustomFields(
  module: ModuleName,
  inputValues: Record<string, any> = {}
): Promise<{ isValid: boolean; errors: CustomFieldValidationError[]; sanitizedValues: Record<string, any> }> {
  const definitions = await prisma.fieldDefinition.findMany({
    where: { module, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const errors: CustomFieldValidationError[] = [];
  const sanitizedValues: Record<string, any> = {};

  for (const def of definitions) {
    const rawVal = inputValues[def.name];
    const isPresent = rawVal !== undefined && rawVal !== null && rawVal !== "";

    // 1. Required Check
    if (def.isRequired && !isPresent) {
      errors.push({
        field: def.name,
        label: def.label,
        message: `${def.label} is required.`,
      });
      continue;
    }

    if (!isPresent) {
      // Default value fallback if configured
      if (def.defaultValue !== null && def.defaultValue !== undefined && def.defaultValue !== "") {
        sanitizedValues[def.name] = def.defaultValue;
      }
      continue;
    }

    // 2. Data Type & Format Validations
    switch (def.dataType) {
      case CustomFieldType.TEXT: {
        const strVal = String(rawVal).trim();
        if (def.regexPattern) {
          try {
            const regex = new RegExp(def.regexPattern);
            if (!regex.test(strVal)) {
              errors.push({
                field: def.name,
                label: def.label,
                message: def.regexErrorMsg || `${def.label} format is invalid.`,
              });
            }
          } catch (e) {
            console.error(`Invalid regex pattern in field ${def.name}:`, e);
          }
        }
        sanitizedValues[def.name] = strVal;
        break;
      }

      case CustomFieldType.NUMBER:
      case CustomFieldType.CURRENCY: {
        const numVal = Number(rawVal);
        if (isNaN(numVal)) {
          errors.push({
            field: def.name,
            label: def.label,
            message: `${def.label} must be a valid number.`,
          });
        } else {
          if (def.minVal !== null && numVal < def.minVal) {
            errors.push({
              field: def.name,
              label: def.label,
              message: `${def.label} cannot be less than ${def.minVal}.`,
            });
          }
          if (def.maxVal !== null && numVal > def.maxVal) {
            errors.push({
              field: def.name,
              label: def.label,
              message: `${def.label} cannot exceed ${def.maxVal}.`,
            });
          }
          sanitizedValues[def.name] = numVal;
        }
        break;
      }

      case CustomFieldType.CHECKBOX: {
        sanitizedValues[def.name] = Boolean(rawVal);
        break;
      }

      case CustomFieldType.EMAIL: {
        const emailStr = String(rawVal).trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailStr)) {
          errors.push({
            field: def.name,
            label: def.label,
            message: `${def.label} must be a valid email address.`,
          });
        }
        sanitizedValues[def.name] = emailStr;
        break;
      }

      case CustomFieldType.PHONE: {
        const phoneStr = String(rawVal).trim();
        const phoneRegex = /^[+0-9\s-]{7,15}$/;
        if (!phoneRegex.test(phoneStr)) {
          errors.push({
            field: def.name,
            label: def.label,
            message: `${def.label} must be a valid phone number (7-15 digits).`,
          });
        }
        sanitizedValues[def.name] = phoneStr;
        break;
      }

      case CustomFieldType.SELECT: {
        const selectedVal = String(rawVal);
        if (def.optionsJson) {
          try {
            const options = JSON.parse(def.optionsJson);
            const validOptions = Array.isArray(options)
              ? options.map((opt) => (typeof opt === "string" ? opt : opt.value || opt.label))
              : [];
            if (validOptions.length > 0 && !validOptions.includes(selectedVal)) {
              errors.push({
                field: def.name,
                label: def.label,
                message: `${selectedVal} is not a valid option for ${def.label}.`,
              });
            }
          } catch (e) {
            console.error("Failed to parse optionsJson for", def.name, e);
          }
        }
        sanitizedValues[def.name] = selectedVal;
        break;
      }

      case CustomFieldType.DEPENDENT_SELECT: {
        const selectedVal = String(rawVal);
        sanitizedValues[def.name] = selectedVal;
        break;
      }

      case CustomFieldType.GEOLOCATION: {
        if (typeof rawVal === "object" && rawVal !== null) {
          sanitizedValues[def.name] = {
            lat: Number(rawVal.lat) || 0,
            lng: Number(rawVal.lng) || 0,
            accuracy: rawVal.accuracy ? Number(rawVal.accuracy) : undefined,
            timestamp: rawVal.timestamp || new Date().toISOString(),
          };
        } else {
          sanitizedValues[def.name] = rawVal;
        }
        break;
      }

      default:
        sanitizedValues[def.name] = rawVal;
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValues,
  };
}

/**
 * Audit log recording helper
 */
export async function recordAuditLog({
  entityType,
  entityId,
  action,
  actorEmail = "admin@sassist.crm",
  actorName = "System Admin",
  oldValues = null,
  newValues = null,
  reason = null,
}: {
  entityType: string;
  entityId: string;
  action: string;
  actorEmail?: string;
  actorName?: string;
  oldValues?: any;
  newValues?: any;
  reason?: string | null;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        actorEmail,
        actorName,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : undefined,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : undefined,
        reason,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    return null;
  }
}
