import { LockClient } from "./transport.js";
import { WebSocketLockClient } from "./transports/ws.js";
import { HttpLockClient } from "./transports/http.js";
import { IpcLockClient } from "./transports/ipc.js";
import { FsLockClient } from "./transports/fs.js";

/**
 * Picks a transport from process.env. Falls back to the filesystem
 * transport (no server required) when nothing else is configured.
 */
export function createLockClientFromEnv(): LockClient {
  if (process.env.LOCK_WS_URL) {
    return new WebSocketLockClient(process.env.LOCK_WS_URL);
  }
  if (process.env.LOCK_SOCKET_PATH) {
    return new IpcLockClient(process.env.LOCK_SOCKET_PATH);
  }

  if (process.env.LOCK_SERVER_URL) {
    return new HttpLockClient(process.env.LOCK_SERVER_URL);
  }

  return new FsLockClient(process.env.LOCK_FS_DIR);
}
