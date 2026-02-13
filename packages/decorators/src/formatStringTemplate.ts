import { format } from "node:util";

export type Formatter<T> = (value: T) => string;

export type ParamContext = Record<
  string,
  { name?: string; value: any; formatter?: (value: any) => string }
>;

/**
 * Safely converts a value to string using Node.js util.format for consistent formatting.
 * Handles special cases like objects, arrays, errors, circular references, etc.
 *
 * @param value - The value to convert to string
 * @returns String representation of the value
 */
function safeStringify(value: any): string {
  // Use %s which safely handles any type
  // This handles: primitives, objects, arrays, errors, circular refs, etc.
  return format("%s", value);
}

/**
 * Transforms a step name template with placeholders into a formatted step name.
 *
 * Supports multiple formatting styles:
 * - JavaScript-style: $0, $1, $2 (zero-indexed)
 * - Named parameters: $name, $user (from `@param` decorators)
 * - Custom formatters: provide formatter functions to transform arguments before display
 *
 * @param stepNameTemplate - The step name template with placeholders.
 * @param args - The arguments to be inserted into the placeholders.
 * @param context - Object mapping parameter names to their values and formatters (from `@param` decorators).
 * @param formatters - Optional array of formatter functions to transform arguments.
 * @returns The formatted step name.
 *
 * @example
 * // JavaScript-style (default)
 * transformName("Step $0 with $1", ["user", "admin"], {}, []);
 * // Output: "Step user with admin"
 *
 * @example
 * // Custom formatters
 * transformName("Step $1 and $0", [42, {id: 1}], {}, [JSON.stringify, (v) => v.toString()]);
 * // Output: 'Step {"id":1} and 42'
 *
 * @example
 * // Named parameters
 * transformName("User $name has role $role", [], {name: {value: "john"}, role: {value: "admin"}}, []);
 * // Output: "User john has role admin"
 */
export const formatStringTemplate = (
  stepNameTemplate: string | TemplateStringsArray,
  args: readonly any[],
  context: ParamContext,
  formatters: (Formatter<any> | undefined)[],
) => {
  const template = stepNameTemplate.toString();
  let result = "";
  let i = 0;

  // Helper to get formatted argument value
  const getFormattedArg = (argIndex: number): string => {
    const arg = args[argIndex];

    // If custom formatter exists for this argument, use it
    if (
      formatters &&
      formatters[argIndex] &&
      typeof formatters[argIndex] === "function"
    ) {
      return formatters[argIndex]!(arg);
    }

    // Otherwise use default safeStringify
    return safeStringify(arg);
  };

  while (i < template.length) {
    // Handle JavaScript-style: $N or Named parameters: $name
    if (template[i] === "$") {
      if (
        i + 1 < template.length &&
        template[i + 1] >= "0" &&
        template[i + 1] <= "9"
      ) {
        // $N format, collect all digits
        let numStr = "";
        let j = i + 1;
        while (
          j < template.length &&
          template[j] >= "0" &&
          template[j] <= "9"
        ) {
          numStr += template[j];
          j++;
        }
        const argIndex = Number(numStr);

        // Check if argument exists
        if (argIndex >= args.length) {
          throw new Error(
            `Missing argument for placeholder at position ${i}: "$${argIndex}". Expected at least ${argIndex + 1} argument(s), but got ${args.length}.`,
          );
        }

        result += getFormattedArg(argIndex);
        i = j;
      } else if (
        i + 1 < template.length &&
        ((template[i + 1] >= "a" && template[i + 1] <= "z") ||
          (template[i + 1] >= "A" && template[i + 1] <= "Z"))
      ) {
        // $name format - collect all letters, digits, and underscores
        let paramName = "";
        let j = i + 1;
        while (
          j < template.length &&
          ((template[j] >= "a" && template[j] <= "z") ||
            (template[j] >= "A" && template[j] <= "Z") ||
            (template[j] >= "0" && template[j] <= "9") ||
            template[j] === "_")
        ) {
          paramName += template[j];
          j++;
        }

        // Check if parameter exists in context
        if (!context || !context[paramName]) {
          throw new Error(
            `Missing parameter for placeholder at position ${i}: "$${paramName}". Parameter not found in context.`,
          );
        }

        const param = context[paramName];
        const formattedValue = param.formatter
          ? param.formatter(param.value)
          : safeStringify(param.value);

        result += formattedValue;
        i = j;
      } else {
        // $ alone or followed by special character - keep as is (dollar sign)
        result += "$";
        i++;
      }
    } else {
      result += template[i];
      i++;
    }
  }

  return result;
};
