import type { PathInput } from "./path.js";

/** Returned by {@link File.type} when the extension is unknown. */
export const DEFAULT_MIME_TYPE = "application/octet-stream";

/**
 * Extension (without the dot, lowercase) to IANA media type. Covers the
 * types Playwright suites actually deal with — reports, fixtures, screenshots,
 * traces, downloads, archives, fonts and media. Zero dependencies, so the
 * table is curated rather than a full copy of the IANA registry; pass
 * `{ type }` to the {@link File} constructor for anything missing.
 */
export const MIME_BY_EXTENSION: Readonly<Record<string, string>> =
  Object.freeze({
    // text
    txt: "text/plain",
    log: "text/plain",
    md: "text/markdown",
    markdown: "text/markdown",
    csv: "text/csv",
    tsv: "text/tab-separated-values",
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    ics: "text/calendar",
    vtt: "text/vtt",
    js: "text/javascript",
    mjs: "text/javascript",
    cjs: "text/javascript",
    // `.ts` is registered as MPEG-2 transport stream, not TypeScript
    ts: "video/mp2t",
    // application
    json: "application/json",
    jsonl: "application/jsonl",
    map: "application/json",
    har: "application/json",
    jsonld: "application/ld+json",
    webmanifest: "application/manifest+json",
    xml: "application/xml",
    xhtml: "application/xhtml+xml",
    yaml: "application/yaml",
    yml: "application/yaml",
    toml: "application/toml",
    sql: "application/sql",
    sh: "application/x-sh",
    wasm: "application/wasm",
    pdf: "application/pdf",
    rtf: "application/rtf",
    epub: "application/epub+zip",
    zip: "application/zip",
    gz: "application/gzip",
    tgz: "application/gzip",
    tar: "application/x-tar",
    bz2: "application/x-bzip2",
    "7z": "application/x-7z-compressed",
    rar: "application/vnd.rar",
    jar: "application/java-archive",
    exe: "application/vnd.microsoft.portable-executable",
    iso: "application/x-iso9660-image",
    bin: "application/octet-stream",
    // office
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    odt: "application/vnd.oasis.opendocument.text",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
    odp: "application/vnd.oasis.opendocument.presentation",
    // images
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    svg: "image/svg+xml",
    ico: "image/vnd.microsoft.icon",
    bmp: "image/bmp",
    tif: "image/tiff",
    tiff: "image/tiff",
    heic: "image/heic",
    // audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    oga: "audio/ogg",
    opus: "audio/ogg",
    flac: "audio/flac",
    aac: "audio/aac",
    m4a: "audio/mp4",
    // video
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    mpeg: "video/mpeg",
    mpg: "video/mpeg",
    // fonts
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    otf: "font/otf",
    eot: "application/vnd.ms-fontobject",
  });

/**
 * IANA media type for a file name or path, by extension.
 * Returns `undefined` for unknown or missing extensions (dotfiles included).
 *
 * ```ts
 * mimeType("shot.png");      // "image/png"
 * mimeType("a/b/data.json"); // "application/json"
 * mimeType(".gitignore");    // undefined
 * ```
 */
export function mimeType(name: PathInput): string | undefined {
  const base = String(name).split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return undefined;
  return MIME_BY_EXTENSION[base.slice(dot + 1).toLowerCase()];
}
