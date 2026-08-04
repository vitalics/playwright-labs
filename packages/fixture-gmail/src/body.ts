/**
 * HTML body primitives for composing email bodies.
 *
 * The API mirrors the `html` helpers of `@playwright-labs/reporter-email`:
 * every helper returns a string, so primitives compose by plain nesting.
 *
 * @example
 * ```ts
 * const body = div(
 *   fragment(
 *     h1("Your verification code"),
 *     p("Use the code below to finish sign in:"),
 *     h2("123456"),
 *   ),
 * );
 * await gmail.sendEmail({ to: "user@example.com", subject: "Code", body });
 * ```
 */

/**
 * Function to create HTML elements
 * @param tag - The HTML tag name
 * @param children - The child elements of the HTML element
 * @param attributes - The attributes of the HTML element
 * @param selfClosing - Whether the HTML element is self-closing
 * @returns The HTML element as a string
 * @example
 * h("div", ["Hello, world!"], { id: "my-div" }); // <div id="my-div">Hello, world!</div>
 * h("head", "<title>My Title</title>"); // <head><title>My Title</title></head>
 */
export function h(
  tag: string,
  children: string[] | string | TemplateStringsArray = [],
  attributes: Record<string, string> = {},
  selfClosing = false,
): string {
  const attrs = Object.entries(attributes)
    .map(([key, value], index) =>
      index === 0 ? ` ${key}="${value}"` : `${key}="${value}"`,
    )
    .join(" ");
  let remappedChildren: string;
  if (Array.isArray(children)) {
    remappedChildren = children.join("").trim();
  } else {
    remappedChildren = children.toString().trim();
  }
  return selfClosing
    ? `<${tag}${attrs}/>`
    : `<${tag}${attrs}>${remappedChildren}</${tag}>`;
}

function makeElement(tag: string) {
  return function createElement(
    children?: string[] | string | TemplateStringsArray,
    attributes?: Record<string, string>,
    selfClosing = false,
  ) {
    return h(tag, children, attributes, selfClosing);
  };
}

export const br = h("br", "", {}, true);
export const hr = h("hr", "", {}, true);
export const html = makeElement("html");
export const body = makeElement("body");
export const head = makeElement("head");
export const title = makeElement("title");
export const div = makeElement("div");
export const p = makeElement("p");
export const ul = makeElement("ul");
export const li = makeElement("li");
export const a = makeElement("a");
export const img = (attributes?: Record<string, string>) =>
  h("img", "", attributes, true);
export const table = makeElement("table");
export const tbody = makeElement("tbody");
export const thead = makeElement("thead");
export const tr = makeElement("tr");
export const td = makeElement("td");
export const th = makeElement("th");
export const h1 = makeElement("h1");
export const h2 = makeElement("h2");
export const h3 = makeElement("h3");
export const h4 = makeElement("h4");
export const h5 = makeElement("h5");
export const h6 = makeElement("h6");

/**
 * Fragment allows to append many elements without an array.
 * @example
 * fragment(h1("Title"), p("text")) // <h1>Title</h1><p>text</p>
 */
export const fragment = (...children: TemplateStringsArray | string[]) =>
  children.join("");
