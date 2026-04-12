export type AttributeSelectorOperator =
  | "<truthy>"
  | "="
  | "*="
  | "|="
  | "^="
  | "$="
  | "~=";

export type AttributeSelectorPart = {
  name: string;
  jsonPath: string[];
  op: AttributeSelectorOperator;
  value: any;
  caseSensitive: boolean;
};

export type AttributeSelector = {
  name: string;
  attributes: AttributeSelectorPart[];
};
