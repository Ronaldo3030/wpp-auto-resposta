import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
// @ts-ignore -- no type declarations available
import qrcode from "qrcode-terminal";
import { botEmitter } from "./web/emitter";

const logger = pino({ level: "silent" });

type MessageHandler = (sock: WASocket, events: any) => Promise<void>;

export async function startSock(onMessages: MessageHandler): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
  });

  sock.ev.process(async (events) => {
    if (events["connection.update"]) {
      const { connection, lastDisconnect, qr } = events["connection.update"];

      if (qr) {
        console.log("Escaneie o QR code em http://localhost:3000");
        qrcode.generate(qr, { small: true });
        botEmitter.emit("qr", { qr });
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

        if (statusCode === DisconnectReason.loggedOut) {
          console.log(
            "Sessão encerrada. Delete a pasta auth_info_baileys e rode novamente."
          );
          botEmitter.emit("connection", { status: "close" });
          process.exit(1);
        } else {
          console.log("Conexão perdida. Reconectando...");
          botEmitter.emit("connection", { status: "connecting" });
          startSock(onMessages);
        }
      }

      if (connection === "open") {
        console.log("Conectado ao WhatsApp!");
        botEmitter.emit("connection", { status: "open", phone: sock.user?.id });
      }
    }

    if (events["creds.update"]) {
      await saveCreds();
    }

    if (events["messages.upsert"]) {
      await onMessages(sock, events["messages.upsert"]);
    }
  });
}
