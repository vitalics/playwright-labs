import { Timeseries } from "prometheus-remote-write";

/** Attachment name used when events are transported via `testInfo.attachments`. */
export const PROM_ATTACHMENT_NAME = "__pw_prom__";

/** Custom transport for events, installed via {@link Event.setWriter}. */
export type EventWriter = (event: Event) => void;

export class Event {
  static readonly name = "prometheus-remote-writer";

  private static writer: EventWriter | undefined;

  constructor(
    readonly payload: Timeseries,
    readonly name = Event.name,
  ) {}

  /**
   * Routes subsequent `emit()` calls through `writer` instead of stdout.
   * fixture-prometheus installs an attachment-based writer for the duration
   * of each test so the transport does not pollute the console. Pass
   * `undefined` to restore the stdout fallback.
   */
  static setWriter(writer: EventWriter | undefined): void {
    Event.writer = writer;
  }

  /**
   * Forwards a single event to the reporter — through the installed writer
   * when one is active, otherwise as a single-line JSON event on stdout that
   * the reporter's `onStdOut` hook decodes.
   */
  static emit(event: Event): void {
    if (Event.writer) {
      Event.writer(event);
      return;
    }
    // Newline-terminated so back-to-back events can be split into single
    // JSON lines by the reporter (`JSON.parse` tolerates the trailing "\n").
    process.stdout.write(JSON.stringify(event) + "\n");
  }

  /**
   * Returns `true` if incoming object is event.
   * False in other cases
   */
  static is(input: unknown): input is Event {
    if (
      typeof input === "object" &&
      input !== null &&
      "name" in input &&
      "payload" in input &&
      input.name === Event.name &&
      typeof input.payload === "object"
    ) {
      return true;
    }
    return false;
  }

  /**
   * Tries to decode a test attachment as a `prometheus-remote-writer` event.
   * Returns `null` when the attachment is unrelated to this transport.
   */
  static fromAttachment(attachment: {
    name: string;
    body?: Buffer;
  }): Event | null {
    if (attachment.name !== PROM_ATTACHMENT_NAME || !attachment.body) {
      return null;
    }
    try {
      const parsed = JSON.parse(attachment.body.toString("utf-8"));
      return Event.is(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}
