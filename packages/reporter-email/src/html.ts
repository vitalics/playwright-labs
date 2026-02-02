const IS_DEBUG =
  Boolean(process.env.IS_DEBUG) ?? process.env.NODE_ENV === "development";
/**
 * Function to create HTML elements
 * @param tag - The HTML tag name
 * @param attributes - The attributes of the HTML element
 * @param children - The child elements of the HTML element
 * @param selfClosing - Whether the HTML element is self-closing
 * @returns The HTML element as a string
 * @example
 * h("div", ["Hello, world!"], { id: "my-div" }, ); // <div id="my-div">Hello, world!</div>
 * h("head", "<title>My Title</title>"); // <head><title>My Title</title></head>
 * h("body", h("h1", {}, ["Hello world"]) ); // <body><h1>Hello, world!</h1></body>
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
    ? `<${tag}${attrs}/>${IS_DEBUG ? "\n" : ""}`
    : `<${tag}${attrs}>${remappedChildren}</${tag}>${IS_DEBUG ? "\n" : ""}`;
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

export const br = h("br", "\n", {}, true);
export const hr = h("hr", "\n", {}, true);
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
 * Fragment allows to append many of elements.
 * @param children
 * @returns
 */
export const fragment = (...children: TemplateStringsArray | string[]) =>
  children.join("");

export default {
  h,
  br,
  hr,
  html,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  tr,
  td,
  th,
  table,
  tbody,
  thead,
  head,
  body,
  fragment,
};

const result = {
  status: "success",
};

const testCases = [
  { title: "Test Case 1", status: "passed", duration: "100ms" },
  { title: "Test Case 2", status: "failed", duration: "200ms" },
];

const el = div(
  fragment(
    h1(
      `Playwright Test Report - ${result.status === "success" ? "Success" : "Failure"}`,
    ),
    p(`Test report table`),
    table(
      fragment(
        thead(tr(fragment(td("Test Name"), td("Status"), td("Duration")))),
        tbody(
          testCases.map((testCase) =>
            tr(
              fragment(
                td(testCase.title),
                td(testCase.status),
                td(testCase.duration),
              ),
            ),
          ),
        ),
      ),
    ),
  ),
);

console.log(el);
