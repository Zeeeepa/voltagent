"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodSchemaToJsonUI = zodSchemaToJsonUI;
/**
 * Converts a Zod-like schema to a JSON representation usable in the UI
 * @param schema Any Zod schema object
 * @returns A JSON Schema compatible representation of the Zod schema
 */
function zodSchemaToJsonUI(schema) {
  if (!schema) return null;
  // Handle ZodObject
  if (schema._def?.typeName === "ZodObject") {
    const properties = {};
    const required = [];
    // Process each property in the object
    Object.entries(schema._def.shape()).forEach(([key, value]) => {
      properties[key] = zodSchemaToJsonUI(value);
      // If the field is not optional, add to required list
      if (!value._def?.typeName?.includes("ZodOptional")) {
        required.push(key);
      }
    });
    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }
  // Handle ZodString
  if (schema._def?.typeName === "ZodString") {
    return { type: "string" };
  }
  // Handle ZodNumber
  if (schema._def?.typeName === "ZodNumber") {
    return { type: "number" };
  }
  // Handle ZodBoolean
  if (schema._def?.typeName === "ZodBoolean") {
    return { type: "boolean" };
  }
  // Handle ZodArray
  if (schema._def?.typeName === "ZodArray") {
    return {
      type: "array",
      items: zodSchemaToJsonUI(schema._def.type),
    };
  }
  // Handle ZodEnum
  if (schema._def?.typeName === "ZodEnum") {
    return {
      type: "string",
      enum: schema._def.values,
    };
  }
  // Handle ZodUnion (as oneOf)
  if (schema._def?.typeName === "ZodUnion") {
    return {
      oneOf: schema._def.options.map((option) => zodSchemaToJsonUI(option)),
    };
  }
  // Handle ZodOptional by unwrapping
  if (schema._def?.typeName === "ZodOptional") {
    return zodSchemaToJsonUI(schema._def.innerType);
  }
  // Handle ZodDefault by unwrapping
  if (schema._def?.typeName === "ZodDefault") {
    const innerSchema = zodSchemaToJsonUI(schema._def.innerType);
    return {
      ...innerSchema,
      default: schema._def.defaultValue(),
    };
  }
  // Handle ZodRecord (as object with additionalProperties)
  if (schema._def?.typeName === "ZodRecord") {
    return {
      type: "object",
      additionalProperties: zodSchemaToJsonUI(schema._def.valueType),
    };
  }
  // Fallback for other types
  return { type: "unknown" };
}
//# sourceMappingURL=index.js.map
