import type {
  AttributeSelector,
  AttributeSelectorOperator,
  AttributeSelectorPart,
} from "./types";

/**
 * Parses a CSS-like attribute selector string into a structured object.
 *
 * Selector grammar:
 * ```
 * selector        = identifier { attribute }
 * attribute       = "[" path [ operator value [ "i" | "s" ] ] "]"
 * path            = token { "." token }
 * token           = identifier | quoted-string
 * operator        = "=" | "*=" | "^=" | "$=" | "|=" | "~="
 * value           = quoted-string | regexp | unquoted-value
 * unquoted-value  = number | "true" | "false"
 * ```
 *
 * When only a path is given with no operator (e.g. `[disabled]`), the result
 * uses the `<truthy>` pseudo-operator to test for a truthy value.
 *
 * @param selector - The selector string to parse.
 * @param allowUnquotedStrings - When `true`, unquoted attribute values that
 *   are not valid numbers or booleans are treated as plain strings rather than
 *   throwing a syntax error.
 */
export function parseAttributeSelector(
  selector: string,
  allowUnquotedStrings: boolean,
): AttributeSelector {
  let wp = 0;
  let EOL = selector.length === 0;

  const next = () => selector[wp] || "";
  const eat1 = () => {
    const result = next();
    ++wp;
    EOL = wp >= selector.length;
    return result;
  };

  const syntaxError = (stage: string | undefined) => {
    if (EOL)
      throw new Error(
        `Unexpected end of selector while parsing selector \`${selector}\``,
      );
    throw new Error(
      `Error while parsing selector \`${selector}\` - unexpected symbol "${next()}" at position ${wp}` +
        (stage ? " during " + stage : ""),
    );
  };

  function skipSpaces() {
    while (!EOL && /\s/.test(next())) eat1();
  }

  function isCSSNameChar(char: string) {
    // https://www.w3.org/TR/css-syntax-3/#ident-token-diagram
    return (
      char >= "\u0080" || // non-ascii
      (char >= "\u0030" && char <= "\u0039") || // digit
      (char >= "\u0041" && char <= "\u005a") || // uppercase letter
      (char >= "\u0061" && char <= "\u007a") || // lowercase letter
      char === "\u005f" || // "_"
      char === "\u002d" // "-"
    );
  }

  function readIdentifier() {
    let result = "";
    skipSpaces();
    while (!EOL && isCSSNameChar(next())) result += eat1();
    return result;
  }

  function readQuotedString(quote: string) {
    let result = eat1();
    if (result !== quote) syntaxError("parsing quoted string");
    while (!EOL && next() !== quote) {
      if (next() === "\\") eat1();
      result += eat1();
    }
    if (next() !== quote) syntaxError("parsing quoted string");
    result += eat1();
    return result;
  }

  function readRegularExpression() {
    if (eat1() !== "/") syntaxError("parsing regular expression");
    let source = "";
    let inClass = false;
    // https://262.ecma-international.org/11.0/#sec-literals-regular-expression-literals
    while (!EOL) {
      if (next() === "\\") {
        source += eat1();
        if (EOL) syntaxError("parsing regular expression");
      } else if (inClass && next() === "]") {
        inClass = false;
      } else if (!inClass && next() === "[") {
        inClass = true;
      } else if (!inClass && next() === "/") {
        break;
      }
      source += eat1();
    }
    if (eat1() !== "/") syntaxError("parsing regular expression");
    let flags = "";
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
    while (!EOL && next().match(/[dgimsuy]/)) flags += eat1();
    try {
      return new RegExp(source, flags);
    } catch (e) {
      throw new Error(
        `Error while parsing selector \`${selector}\`: ${(e as Error).message}`,
      );
    }
  }

  function readAttributeToken() {
    let token = "";
    skipSpaces();
    if (next() === `'` || next() === `"`)
      token = readQuotedString(next()).slice(1, -1);
    else token = readIdentifier();
    if (!token) syntaxError("parsing property path");
    return token;
  }

  function readOperator(): AttributeSelectorOperator {
    skipSpaces();
    let op = "";
    if (!EOL) op += eat1();
    if (!EOL && op !== "=") op += eat1();
    if (!["=", "*=", "^=", "$=", "|=", "~="].includes(op))
      syntaxError("parsing operator");
    return op as AttributeSelectorOperator;
  }

  function readAttribute(): AttributeSelectorPart {
    // skip leading [
    eat1();

    // read attribute name: foo.bar or 'foo'."ba zz"
    const jsonPath: string[] = [];
    jsonPath.push(readAttributeToken());
    skipSpaces();
    while (next() === ".") {
      eat1();
      jsonPath.push(readAttributeToken());
      skipSpaces();
    }

    // check property is truthy: [enabled]
    if (next() === "]") {
      eat1();
      return {
        name: jsonPath.join("."),
        jsonPath,
        op: "<truthy>",
        value: null,
        caseSensitive: false,
      };
    }

    const operator = readOperator();

    let value: any = undefined;
    let caseSensitive = true;
    skipSpaces();
    if (next() === "/") {
      if (operator !== "=")
        throw new Error(
          `Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with regular expression`,
        );
      value = readRegularExpression();
    } else if (next() === `'` || next() === `"`) {
      value = readQuotedString(next()).slice(1, -1);
      skipSpaces();
      if (next() === "i" || next() === "I") {
        caseSensitive = false;
        eat1();
      } else if (next() === "s" || next() === "S") {
        caseSensitive = true;
        eat1();
      }
    } else {
      value = "";
      while (
        !EOL &&
        (isCSSNameChar(next()) || next() === "+" || next() === ".")
      )
        value += eat1();
      if (value === "true") {
        value = true;
      } else if (value === "false") {
        value = false;
      } else {
        if (!allowUnquotedStrings) {
          value = +value;
          if (Number.isNaN(value)) syntaxError("parsing attribute value");
        }
      }
    }
    skipSpaces();
    if (next() !== "]") syntaxError("parsing attribute value");

    eat1();
    if (operator !== "=" && typeof value !== "string")
      throw new Error(
        `Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with non-string matching value - ${value}`,
      );
    return {
      name: jsonPath.join("."),
      jsonPath,
      op: operator,
      value,
      caseSensitive,
    };
  }

  const result: AttributeSelector = {
    name: "",
    attributes: [],
  };
  result.name = readIdentifier();
  skipSpaces();
  while (next() === "[") {
    result.attributes.push(readAttribute());
    skipSpaces();
  }
  if (!EOL) syntaxError(undefined);
  if (!result.name && !result.attributes.length)
    throw new Error(
      `Error while parsing selector \`${selector}\` - selector cannot be empty`,
    );
  return result;
}

/**
 * Tests whether `value` satisfies the constraint described by `attr`.
 *
 * Supports all CSS attribute-selector operators plus the `<truthy>` pseudo-
 * operator. String comparisons respect the `caseSensitive` flag.
 */
export function matchesAttributePart(
  value: any,
  attr: AttributeSelectorPart,
): boolean {
  const objValue =
    typeof value === "string" && !attr.caseSensitive
      ? value.toUpperCase()
      : value;
  const attrValue =
    typeof attr.value === "string" && !attr.caseSensitive
      ? attr.value.toUpperCase()
      : attr.value;

  if (attr.op === "<truthy>") return !!objValue;
  if (attr.op === "=") {
    if (attrValue instanceof RegExp)
      return typeof objValue === "string" && !!objValue.match(attrValue);
    return objValue === attrValue;
  }
  if (typeof objValue !== "string" || typeof attrValue !== "string")
    return false;
  if (attr.op === "*=") return objValue.includes(attrValue);
  if (attr.op === "^=") return objValue.startsWith(attrValue);
  if (attr.op === "$=") return objValue.endsWith(attrValue);
  if (attr.op === "|=")
    return objValue === attrValue || objValue.startsWith(attrValue + "-");
  if (attr.op === "~=") return objValue.split(" ").includes(attrValue);
  return false;
}
