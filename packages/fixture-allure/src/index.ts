import {
  DEFAULT_CONFIG,
  ENVIRONMENT_INFO,
  REPORTER_DESCRIPTION,
  makeReporterDescription,
} from "./pw-config";
import config from "./pw-config";

import {
  PARAMETER,
  ParameterType,
  functionDecorator,
  methodDecorator,
} from "./decorators";
import * as decorators from "./decorators";

import { expect, test } from "./fixture";

export {
  // pw test
  expect,
  test,
  // decorators
  functionDecorator,
  methodDecorator,
  PARAMETER,
  decorators,
  type ParameterType,
  // pw config
  config,
  DEFAULT_CONFIG,
  ENVIRONMENT_INFO,
  REPORTER_DESCRIPTION,
  makeReporterDescription,
};

export default {
  expect,
  test,
  decorators,
  config,
};
