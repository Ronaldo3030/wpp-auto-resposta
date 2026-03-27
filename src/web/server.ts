import express from "express";
import cors from "cors";
import * as http from "http";
import * as path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { WASocket } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { botEmitter } from "./emitter";
import { createApiRouter } from "./routes/api";

let currentSock: WASocket | null = null;
let currentPhone: string | null = null;
let currentStatus: string = "close";

export interface WebServer {
  setSock: (sock: WASocket) => void;
}

export async function startWebServer(port = 3000): Promise<WebServer> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Servir arquivos estáticos da pasta public/
  app.use(express.static(path.resolve(process.cwd(), "public")));

  // API REST
  app.use("/api", createApiRouter(() => currentSock, () => currentPhone, () => currentStatus));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // Broadcast para todos os clientes conectados
  function broadcast(data: object): void {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  // Assinar eventos do bot e repassar para o browser
  botEmitter.on("qr", async ({ qr }: { qr: string }) => {
    try {
      const dataUrl = await QRCode.toDataURL(qr);
      broadcast({ type: "qr", data: { qr: dataUrl } });
    } catch {}
  });

  botEmitter.on("connection", (data: { status: string; phone?: string }) => {
    currentStatus = data.status;
    if (data.status === "open" && data.phone) {
      currentPhone = data.phone;
    } else if (data.status === "close") {
      currentPhone = null;
    }
    broadcast({ type: "connection", data });
  });

  botEmitter.on("message", (data: object) => {
    broadcast({ type: "message", data });
  });

  botEmitter.on("takeover", (data: object) => {
    broadcast({ type: "takeover", data });
  });

  server.listen(port, () => {
    console.log(`Dashboard disponível em http://localhost:${port}`);
  });

  return {
    setSock: (sock: WASocket) => {
      currentSock = sock;
    },
  };
}
