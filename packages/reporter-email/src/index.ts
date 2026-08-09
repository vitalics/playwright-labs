export {
  a,
  body,
  br,
  div,
  fragment,
  h,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  head,
  hr,
  html,
  img,
  li,
  p,
  table,
  tbody,
  td,
  th,
  thead,
  title,
  tr,
  ul,
} from "@playwright-labs/email-core";

export {
  default as Reporter,
  default,
  type NodemailerReporterOptions as ReporterOptions,
  type NodemailerTestCases as TestCases,
} from "./reporter";

export * from "./templates";
