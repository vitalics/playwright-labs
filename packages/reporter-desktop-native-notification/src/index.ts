export {
  default as Reporter,
  default,
  type DesktopNotificationOptions,
  type NotificationPayload,
} from "./reporter";

// Re-export the unified template types so consumers can type their
// message callbacks without installing reporter-core directly.
export type { Template, TestCases } from "@playwright-labs/reporter-core";
