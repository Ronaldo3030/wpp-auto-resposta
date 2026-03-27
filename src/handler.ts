import { WAMessage, WASocket } from "@whiskeysockets/baileys";
import { buildMenuText, findReply, getFlows } from "./flows";
import { getState, setState, resetState, setHumanTakeover, clearHumanTakeover, isHumanTakeover } from "./state";
import { sendText } from "./sender";

export async function handleMessage(
  sock: WASocket,
  message: WAMessage
): Promise<void> {
  const jid = message.key.remoteJid;
  if (!jid) return;

  // Ignorar grupos e status broadcasts
  if (jid.endsWith("@g.us")) return;
  if (jid === "status@broadcast") return;

  const text =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    "";

  if (!text) return;

  // Interceptar mensagens enviadas pelo próprio atendente
  if (message.key.fromMe) {
    const cmd = text.trim().toLowerCase();
    if (cmd.startsWith("#bot")) {
      clearHumanTakeover(jid);
    } else if (cmd.startsWith("#humano")) {
      setHumanTakeover(jid);
    } else {
      // Atendente respondeu manualmente: desativar bot
      setHumanTakeover(jid);
    }
    return;
  }

  // Bot silenciado para este contato (atendimento humano ativo)
  if (isHumanTakeover(jid)) return;

  const state = getState(jid);

  if (!state || !state.menuSent) {
    // Primeiro contato ou estado expirado: enviar menu
    await sendText(sock, jid, buildMenuText());
    setState(jid, true);
    return;
  }

  // Menu já foi enviado: verificar opção escolhida
  const result = findReply(text);

  if (result) {
    await sendText(sock, jid, result.reply);
    if (result.type === "human") {
      setHumanTakeover(jid);
    } else {
      resetState(jid);
    }
  } else {
    await sendText(sock, jid, getFlows().fallback.trim());
  }
}
