import type { BaseTool } from '@voltagent/core';
import type { PerplexityTool } from '../types';

/**
 * Converts a VoltAgent tool to Perplexity tool format
 * @param tool VoltAgent tool
 * @returns Perplexity tool format
 */
export function coreToolToPerplexity(tools: BaseTool[]): PerplexityTool[] {
  return tools.map((tool) => {
    const schema = tool.schema.shape;
    
    // Convert Zod schema to JSON Schema properties
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    Object.entries(schema).forEach(([key, value]) => {
      // Basic type mapping
      const zodType = value._def.typeName;
      
      if (zodType === 'ZodString') {
        properties[key] = { type: 'string' };
        if (value._def.description) {
          properties[key].description = value._def.description;
        }
      } else if (zodType === 'ZodNumber') {
        properties[key] = { type: 'number' };
        if (value._def.description) {
          properties[key].description = value._def.description;
        }
      } else if (zodType === 'ZodBoolean') {
        properties[key] = { type: 'boolean' };
        if (value._def.description) {
          properties[key].description = value._def.description;
        }
      } else if (zodType === 'ZodArray') {
        properties[key] = { 
          type: 'array',
          items: { type: 'string' } // Default to string items
        };
        if (value._def.description) {
          properties[key].description = value._def.description;
        }
      } else if (zodType === 'ZodObject') {
        properties[key] = { 
          type: 'object',
          properties: {} // Simplified - would need recursive handling for nested objects
        };
        if (value._def.description) {
          properties[key].description = value._def.description;
        }
      } else {
        // Default fallback
        properties[key] = { type: 'string' };
        if (value._def.description) {
          properties[key].description = value._def.description;
        }
      }
      
      // Check if the field is required
      if (!value._def.isOptional) {
        required.push(key);
      }
    });
    
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties,
          required: required.length > 0 ? required : undefined
        }
      }
    };
  });
}

