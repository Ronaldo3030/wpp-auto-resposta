import { startSock } from "./connection";
import { loadFlows } from "./flows";
import { handleMessage } from "./handler";
import { initDb } from "./state";
import { startWebServer } from "./web/server";
import { WASocket } from "@whiskeysockets/baileys";

async function main() {
  console.log("Carregando configuração...");
  loadFlows();
  initDb();
  console.log("Configuração carregada.");

  const webServer = await startWebServer(3000);

  await startSock(async (sock: WASocket, upsert: any) => {
    webServer.setSock(sock);

    const { messages, type } = upsert;
    if (type !== "notify") return;

    for (const msg of messages) {
      try {
        await handleMessage(sock, msg);
      } catch (err) {
        console.error("Erro ao processar mensagem:", err);
      }
    }
  });
}

main();
