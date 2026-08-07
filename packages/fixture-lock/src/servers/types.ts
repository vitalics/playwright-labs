import { EventEmitter } from "node:events";
import { AddressInfo } from "node:net";

export type DefaultEvents = {
  start: [info: StartInfo];
  stop: [reason?: Error | string];
  error: [reason: Error | string];
};

export type StartInfo = {
  addr: AddressInfo;
  port?: number;
  url: string | URL;
};

/** Merge 2 events map into 1 type */
export type MergeEvents<T1, T2> = Prettify<
  {
    [P in keyof T1]: T1[P];
  } & {
    [PP in keyof T2]: T2[PP];
  }
>;

type Prettify<T> = {
  [P in keyof T]: T[P];
};

export interface Server<
  AdditionalEvents extends Record<string, any[]> = {},
  Merged extends Record<string, any[]> = MergeEvents<
    DefaultEvents,
    AdditionalEvents
  >,
>
  extends AsyncDisposable, EventEmitter<Merged> {
  start(): Promise<StartInfo>;
  stop(): Promise<void>;
}
