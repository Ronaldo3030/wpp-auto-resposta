import { WASocket } from "@whiskeysockets/baileys";
import { logMessage } from "./state";
import { botEmitter } from "./web/emitter";

export async function sendText(
  sock: WASocket,
  jid: string,
  text: string
): Promise<void> {
  await sock.sendMessage(jid, { text });
  logMessage(jid, "out", text);
  botEmitter.emit("message", { jid, direction: "out", body: text, created_at: new Date().toISOString() });
}
