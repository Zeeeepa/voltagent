/**
 * Tool call interface
 */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}
/**
 * Converts a Zod-like schema to a JSON representation usable in the UI
 * @param schema Any Zod schema object
 * @returns A JSON Schema compatible representation of the Zod schema
 */
export declare function zodSchemaToJsonUI(schema: any): any;
