export * from "./body";
export {
  type Email,
  EmailProvider,
  type EmailProviderAPI,
  type EmailProviderEvents,
  type EmailReaders,
  type EmailReadEvent,
  emailReaders,
  type EmailSendEvent,
  extractLinks,
  filterEmails,
  type FindEmailOptions,
  type ReadEmailOptions,
  type WaitForEmailOptions,
} from "./email";
export {
  type NodemailerAttachment,
  NodemailerSender,
  type NodemailerSendOptions,
  type NodemailerSendResult,
  type NodemailerTransportOptions,
} from "./nodemailer";
