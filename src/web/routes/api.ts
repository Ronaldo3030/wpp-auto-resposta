import { Router, Request, Response } from "express";
import { WASocket } from "@whiskeysockets/baileys";
import {
  getAllConversations,
  getMessages,
  getAnalytics,
  setHumanTakeover,
  clearHumanTakeover,
} from "../../state";
import { sendText } from "../../sender";
import { botEmitter } from "../emitter";

export function createApiRouter(getSock: () => WASocket | null, getPhone: () => string | null): Router {
  const router = Router();

  router.get("/status", (_req: Request, res: Response) => {
    const sock = getSock();
    const connected = sock !== null;
    res.json({
      connected,
      status: connected ? "open" : "close",
      phone: getPhone(),
    });
  });

  router.get("/conversations", (_req: Request, res: Response) => {
    res.json(getAllConversations());
  });

  router.post("/conversations/:jid/takeover", (req: Request, res: Response) => {
    const jid = decodeURIComponent(req.params["jid"] as string);
    const { active } = req.body as { active: boolean };
    if (active) {
      setHumanTakeover(jid);
    } else {
      clearHumanTakeover(jid);
    }
    botEmitter.emit("takeover", { jid, active });
    res.json({ ok: true });
  });

  router.get("/conversations/:jid/messages", (req: Request, res: Response) => {
    const jid = decodeURIComponent(req.params["jid"] as string);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    res.json(getMessages(jid, limit, offset));
  });

  router.post("/conversations/:jid/send", async (req: Request, res: Response) => {
    const jid = decodeURIComponent(req.params["jid"] as string);
    const { text } = req.body as { text: string };
    const sock = getSock();
    if (!sock) {
      res.status(503).json({ error: "Bot não conectado" });
      return;
    }
    await sendText(sock, jid, text);
    res.json({ ok: true });
  });

  router.get("/analytics", (_req: Request, res: Response) => {
    res.json(getAnalytics());
  });

  return router;
}
