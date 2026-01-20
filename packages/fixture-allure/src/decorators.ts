import { inspect } from "node:util";

import { Bind } from "@rslike/std";
import * as allure from "allure-js-commons";
import type { ParameterMode } from "allure-js-commons";

type Fn<T, A extends readonly any[], This = void> = (
  this: This,
  ...args: A
) => T;

export const PARAMETER = Object.freeze({
  DEFAULT: "default",
  HIDDEN: "hidden",
  MASKED: "masked",
});

export type ParameterType =
  | typeof PARAMETER
  | (typeof PARAMETER)[keyof typeof PARAMETER];

type DecoratorParameters = {
  /**
   * Name of the step. If not provided, the name will be inferred from the function name.
   * @default decorated function name
   */
  name?: string;
  /**
   * add argument `this` as `allure.parameter`. Helps for debugging.
   * **NOTE:** this is experimental option
   *
   * @default false
   */
  parametrizeThis?: boolean;
  /**
   * add arguments array as `allure.parameter`. Helps for debugging
   * @default false
   */
  parametrizeArguments?: boolean;
  /**
   * custom arguments that helps allure to mask function arguments by specific name
   * @default []
   * @example
   * args: [
   *   ['argName 1', PARAMETER.DEFAULT] // default behavior in allure
   *   ['argName 1.1', ] // same as previous as default
   *   ['argName 2', PARAMETER.HIDDEN] // marks hidden argument in allure. invisible in report
   *   ['argName 3', PARAMETER.MASKED] // marks argument as masked (*****) but visible in report
   * ]
   */
  args?: [name: string, type?: ParameterType][];
  /**
   * use `allure.attachment` for result of decorated function/method result
   * @default true
   */
  attachResult?: boolean;
  /**
   * if function throw an error - the error will be attached as `allure.attachment` function
   * @default true
   */
  attachError?: boolean;
  /**
   * if function throw an error - it will be rethrow. Helps for debugging
   * @default true
   */
  throwError?: boolean;
};

const DEFAULT_DECORATOR_PARAMETERS = Object.freeze({
  parametrizeThis: false,
  parametrizeArguments: false,
  args: [],
  attachResult: true,
  attachError: true,
  throwError: true,
} as const satisfies DecoratorParameters);

/**
 * Decorator for functions to log their execution details using Allure.
 * @param anotherFn The function to be decorated.
 * @param params parameters for the decorator, like hide `arguments`, `attach result`, `attach error`, `throw on error` ,etc.
 * @param this custom this argument. By default it uses `this`.
 * @returns A promise function that wraps the original function and attach the result to allure.
 * @example
 * function someAction(param: string) {
 *   console.log("someAction called", param);
 * }
 * const f1 = functionDecorator(someAction);
 * const f2 = functionDecorator(someAction, 'perform some action');
 * const f3 = functionDecorator(someAction, 'perform some action', { args: [['param', 'hidden']] });
 *
 * await f1("param 1");
 * await f2("param 2");
 * await f3('param 3'); // note: param will be hidden in allure
 */
export function functionDecorator<
  const T,
  const A extends any[] = any[],
  const This = void,
>(
  anotherFn: Fn<T, A, This>,
  params: DecoratorParameters = {
    name: anotherFn.name.toString() ?? "<anonymous>",
    ...DEFAULT_DECORATOR_PARAMETERS,
  },
  /** custom this argument. By default it uses `this`.
   * @default this
   */
  thisArg: This | undefined = undefined,
): Fn<PromiseLike<Awaited<ReturnType<typeof anotherFn>>>, A, This> {
  return async function decoratedFunction(
    this: unknown,
    ...args: A
  ): Promise<Awaited<T>> {
    const safeFn = Bind(anotherFn, thisArg ?? (this as never));
    return await allure.step(
      params.name ?? anotherFn.name.toString() ?? `<anonymous>`,
      async (allureCtx) => {
        if ("args" in params && params.args && Array.isArray(params.args)) {
          params.args.forEach(([argName, kind], index) => {
            allureCtx.parameter(
              argName,
              inspect(args!.at(index)),
              (kind as ParameterMode) ?? "default",
            );
          });
        }
        if (params.parametrizeArguments) {
          allureCtx.parameter("arguments", inspect(args, { depth: 3 }));
        }
        if (params.parametrizeThis) {
          allureCtx.parameter("this", inspect(this));
        }
        const result = await safeFn(...args);
        if (params.attachResult && result.isOk()) {
          await allure.attachment(
            "return",
            inspect(result.unwrap().unwrap(), { depth: Infinity }),
            { contentType: "application/json" },
          );
        }
        if (params.attachError && result.isErr()) {
          await allure.attachment(
            "error",
            inspect(result.unwrapErr(), { depth: Infinity }),
            { contentType: "application/json" },
          );
        }

        if (params.throwError && result.isErr()) {
          throw result.unwrapErr();
        }

        if (params.throwError === false) {
          return result.unwrapErr() as Awaited<T>;
        }

        return result.unwrap().valueOf() as Awaited<T>;
      },
    );
  };
}

/**
 * method decorator that wraps the method with an Allure step
 * **NOTE:** works only with `async` methods!
 * @param params Allure parameters, like `name`, `args`, and `attachments`, etc.
 * @returns
 * @example
 * class MyClass {
 *   *@methodDecorator({
 *     name: 'custom name',
 *     args: [['myArg', 'masked']] // allure will hide `myArgMaskedArg`
 *   })
 *   async myMethod(myArgMaskedArg: string) {
 *     console.log('call with name', myArgMaskedArg);
 *   }
 * }
 */
export function methodDecorator<
  const R extends PromiseLike<any>,
  const T extends Fn<R, any[], any>,
>(params: DecoratorParameters = DEFAULT_DECORATOR_PARAMETERS) {
  return function (target: T, context: ClassMethodDecoratorContext<any, any>) {
    if (context.kind !== "method") {
      throw new Error("AllureStep decorator can only be used on methods");
    }

    return async function (this: unknown, ...args: any[]) {
      const safeFn = Bind(target, this);
      return await allure.step(
        params.name ?? context.name.toString() ?? `<anonymous>`,
        async (allureCtx) => {
          if ("args" in params && params.args && Array.isArray(params.args)) {
            params.args.forEach(([argName, kind], index) => {
              allureCtx.parameter(
                argName,
                inspect(args!.at(index)),
                (kind as ParameterMode) ?? "default",
              );
            });
          }
          if (params.parametrizeArguments) {
            allureCtx.parameter("arguments", inspect(args, { depth: 3 }));
          }
          if (params.parametrizeThis) {
            allureCtx.parameter("this", inspect(this));
          }
          const result = await safeFn(...args);
          if (params.attachResult && result.isOk()) {
            await allure.attachment(
              "return",
              inspect(result.unwrap().unwrap(), { depth: Infinity }),
              { contentType: "application/json" },
            );
          }
          if (params.attachError && result.isErr()) {
            await allure.attachment(
              "error",
              inspect(result.unwrapErr(), { depth: Infinity }),
              { contentType: "application/json" },
            );
          }

          if (params.throwError && result.isErr()) {
            throw result.unwrapErr();
          }

          if (params.throwError === false) {
            return result.unwrapErr() as Awaited<T>;
          }

          return result.unwrap().valueOf() as Awaited<T>;
        },
      );
    } as unknown as Fn<R, any[], any>;
  };
}

export default {
  functionDecorator,
  methodDecorator,
  PARAMETER,
};
