import { test, TestDetailsAnnotation, TestType } from "@playwright/test";
import {
  type Formatter,
  formatStringTemplate,
  ParamContext,
} from "./formatStringTemplate";

type InferArgsFromTemplateString<
  Name extends string,
  Args extends readonly unknown[] = [],
> = Name extends `${string}$${infer First}${infer Rest}`
  ? InferArgsFromTemplateString<Rest, [...Args, argument: unknown]>
  : Args;

type Tail<T extends readonly unknown[]> = T extends readonly [
  unknown,
  ...infer Rest,
]
  ? Rest
  : never;

type ArgsToFormatters<
  A extends readonly unknown[],
  Result extends readonly Formatter<unknown>[] = [],
> = A["length"] extends 0
  ? Result
  : ArgsToFormatters<Tail<A>, [...Result, Formatter<A[0]>]>;

type OptionalArray<T extends readonly unknown[]> = T extends readonly [
  infer First,
  ...infer Rest,
]
  ? [First?, ...OptionalArray<Rest>]
  : [];

export const kAnnotate = Symbol.for("annotate");
export const kAttachment = Symbol.for("attachment");

/**
 * Wraps a function in a `test.step` from playwright. This is useful for breaking down complex tests into smaller steps.
 *
 * It supports strings with variable inferring for dynamic values and custom formatters.
 *
 * **NOTE:** after decorating a function with `@step`, the function can be called only inside playwright test context.
 *
 * **NOTE:** it works only for async functions, other functions will throw an error at runtime and type checking!
 * @param name
 * @returns
 * @example
 * class Example {
 *   *\@step(`my step with id: $0`)
 *   async myStep(id: number) {
 *     // some logic here
 *   }
 *
 * // typescript throws an error, declared 2 arguments but function only accepts 1 argument
 *  *\@step(`my step with id: $0 and $1`)
 *   async myStepWillThrow(id: number) {
 *     // some logic here
 *   }
 * }
 */
export const step = makeStep(test);

export function makeStep<T extends TestType<any, any>>(pwTest: T) {
  return function step<
    const Name extends string,
    const Args extends readonly unknown[] = InferArgsFromTemplateString<Name>,
    const T extends (this: any, ...args: Args) => Promise<unknown> = (
      ...args: Args
    ) => Promise<unknown>,
    const Formatters extends Formatter<any>[] = ArgsToFormatters<Args>,
  >(name?: Name, ...formatters: OptionalArray<Formatters>) {
    return function (target: T, context: DecoratorContext) {
      const stepName =
        name?.toString() ?? context.name?.toString() ?? "<anonymous>";
      if (context.kind !== "method") {
        throw new Error("step decorator can only be used on methods");
      }
      return async function replacementMethod(
        this: any,
        ...args: Args
      ): Promise<Awaited<ReturnType<T>>> {
        // Build the ParamContext by extracting actual property values from `this`
        const paramContext: ParamContext = {};
        const metadataParams =
          (context.metadata?.params as
            | Record<
                string,
                {
                  name: string;
                  originalName: string;
                  formatter?: (v: any) => string;
                }
              >
            | undefined) ?? {};

        if (metadataParams && this) {
          for (const [paramName, paramInfo] of Object.entries(metadataParams)) {
            paramContext[paramName] = {
              value: this[paramInfo.originalName],
              formatter: paramInfo.formatter,
            };
          }
        }
        const transformedName = formatStringTemplate(
          stepName,
          args,
          paramContext,
          formatters,
        );

        return test.step(transformedName, async () =>
          Reflect.apply(target, this, args),
        ) as Promise<Awaited<ReturnType<T>>>;
      };
    };
  };
}

export interface SymbolConstructor {
  annotate: () => TestDetailsAnnotation | TestDetailsAnnotation[];
  attachment: () => Attachment;
}
declare global {
  export interface SymbolConstructor {
    annotate: () => TestDetailsAnnotation | TestDetailsAnnotation[];
    attachment: () => Attachment;
  }
}

export type Annotation<T> = T & {
  // @ts-expect-error fix later
  [Symbol.annotate]: () => TestDetailsAnnotation | TestDetailsAnnotation[];
};

export function annotation<
  const T,
  const V,
  ExpectedType extends TestDetailsAnnotation | TestDetailsAnnotation[],
>(toAnnotation?: (v: V) => ExpectedType) {
  return function (
    target: any,
    context: ClassFieldDecoratorContext<T, V>,
  ): (v: V) => Annotation<V> {
    return function (value: any) {
      if (typeof value === "string") {
        (String.prototype as any)[kAnnotate] = function () {
          return (
            toAnnotation?.(value as V) ?? {
              type: context.name.toString(),
              description: value,
            }
          );
        };
        const sObj = String(value);
        return sObj;
      }

      if (typeof value === "number") {
        (Number.prototype as any)[kAnnotate] = function () {
          return (
            toAnnotation?.(value as V) ?? {
              type: context.name.toString(),
              description: value,
            }
          );
        };
        const nObj = Number(value);
        return nObj;
      }

      if (typeof value === "boolean") {
        (Boolean.prototype as any)[kAnnotate] = function () {
          return (
            toAnnotation?.(value as V) ?? {
              type: context.name.toString(),
              description: value,
            }
          );
        };
        const bObj = Boolean(value);
        return bObj;
      }

      return new Proxy(value, {
        apply(target, thisArg, args) {
          const fnResult = Reflect.apply(target, thisArg, args);
          // assert fn result
          console.log("fnResult", fnResult, target, thisArg, args);
          if (
            typeof fnResult === "object" &&
            fnResult !== null &&
            "type" in fnResult
          ) {
            return fnResult;
          }
          throw new Error(
            `Expected function to return an object as annotation "{ type: string, description?: string}". Got ${JSON.stringify(
              fnResult,
            )}`,
          );
        },
        get(target, prop) {
          if (prop === kAnnotate) {
            const v = Reflect.get(target, prop);
            return toAnnotation?.(v) ?? { type: prop, description: v };
          }
          return Reflect.get(target, prop);
        },
        set(target, prop, value) {
          return Reflect.set(target, prop, value);
        },
      });
    };
  };
}

export type Attachment = {
  body: string | Buffer;
  /** Attachment type, e.g. "image/png" */
  type: string;
};

type AttachmentType<T> = T & {
  // @ts-expect-error fix later
  [Symbol.attachment]: () => Attachment;
};

export function attachment<const T, const V, ExpectedType extends Attachment>(
  toAttachment?: (v: V) => ExpectedType,
) {
  return function (target: V, context: ClassFieldDecoratorContext<T, V>) {
    return function (value: any) {
      if (typeof value === "string") {
        (String.prototype as any)[kAttachment] = function () {
          return (
            toAttachment?.(value as V) ?? {
              type: "text/json",
              body: JSON.stringify(value),
            }
          );
        };
        const sObj = String(value);
        return sObj;
      }

      if (typeof value === "number") {
        (Number.prototype as any)[kAttachment] = function () {
          return (
            toAttachment?.(value as V) ?? {
              type: "text/json",
              body: JSON.stringify(value),
            }
          );
        };
        const nObj = Number(value);
        return nObj;
      }

      if (typeof value === "boolean") {
        (Boolean.prototype as any)[kAttachment] = function () {
          return (
            toAttachment?.(value as V) ?? {
              type: "text/json",
              body: JSON.stringify(value),
            }
          );
        };
        const bObj = Boolean(value);
        return bObj;
      }

      return new Proxy(value, {
        apply(target, thisArg, args) {
          const fnResult = Reflect.apply(target, thisArg, args);
          // assert fn result
          console.log("fnResult", fnResult, target, thisArg, args);
          if (
            typeof fnResult === "object" &&
            fnResult !== null &&
            "type" in fnResult &&
            "body" in fnResult
          ) {
            return fnResult;
          }
          throw new Error(
            `Expected function to return an object as annotation "{ type: string, body: string | Buffer}". Got ${JSON.stringify(
              fnResult,
            )}`,
          );
        },
        get(target, prop) {
          if (prop === kAnnotate) {
            const v = Reflect.get(target, prop);
            return toAttachment?.(v) ?? { type: prop, description: v };
          }
          return Reflect.get(target, prop);
        },
        set(target, prop, value) {
          return Reflect.set(target, prop, value);
        },
      });
    };
  };
}
