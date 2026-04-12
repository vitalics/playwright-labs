import { selectors } from "@playwright/test";
import { VueEngine } from "../src/engine";

try {
  selectors.register("vue", VueEngine);
} catch {
  // Already registered in this worker — safe to ignore
}
