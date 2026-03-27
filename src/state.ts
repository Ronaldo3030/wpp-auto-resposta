import Database from "better-sqlite3";
import * as path from "path";

const STALE_HOURS = 24;
const HUMAN_TIMEOUT_MINUTES = 30;

const db = new Database(path.resolve(process.cwd(), "data/bot.db"));

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      jid TEXT PRIMARY KEY,
      menu_sent INTEGER NOT NULL DEFAULT 0,
      human_takeover INTEGER NOT NULL DEFAULT 0,
      last_activity TEXT NOT NULL,
      human_takeover_at TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      jid        TEXT NOT NULL,
      direction  TEXT NOT NULL CHECK(direction IN ('in','out')),
      body       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_jid ON messages(jid);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
  `);
}

interface ConversationRow {
  jid: string;
  menu_sent: number;
  human_takeover: number;
  last_activity: string;
  human_takeover_at: string | null;
}

interface ConversationState {
  menuSent: boolean;
  humanTakeover: boolean;
  lastActivity: Date;
  humanTakeoverAt: Date | null;
}

export interface MessageRow {
  id: number;
  jid: string;
  direction: "in" | "out";
  body: string;
  created_at: string;
}

function rowToState(row: ConversationRow): ConversationState {
  return {
    menuSent: row.menu_sent === 1,
    humanTakeover: row.human_takeover === 1,
    lastActivity: new Date(row.last_activity),
    humanTakeoverAt: row.human_takeover_at ? new Date(row.human_takeover_at) : null,
  };
}

export function getState(jid: string): ConversationState | undefined {
  const row = db
    .prepare("SELECT * FROM conversations WHERE jid = ?")
    .get(jid) as ConversationRow | undefined;

  if (!row) return undefined;

  const state = rowToState(row);
  const hoursElapsed = (Date.now() - state.lastActivity.getTime()) / (1000 * 60 * 60);

  if (hoursElapsed > STALE_HOURS) {
    db.prepare("DELETE FROM conversations WHERE jid = ?").run(jid);
    return undefined;
  }

  return state;
}

export function setState(jid: string, menuSent: boolean): void {
  db.prepare(`
    INSERT INTO conversations (jid, menu_sent, human_takeover, last_activity, human_takeover_at)
    VALUES (?, ?, 0, ?, NULL)
    ON CONFLICT(jid) DO UPDATE SET
      menu_sent = excluded.menu_sent,
      last_activity = excluded.last_activity
  `).run(jid, menuSent ? 1 : 0, new Date().toISOString());
}

export function setHumanTakeover(jid: string): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO conversations (jid, menu_sent, human_takeover, last_activity, human_takeover_at)
    VALUES (?, 0, 1, ?, ?)
    ON CONFLICT(jid) DO UPDATE SET
      human_takeover = 1,
      last_activity = excluded.last_activity,
      human_takeover_at = excluded.human_takeover_at
  `).run(jid, now, now);
}

export function clearHumanTakeover(jid: string): void {
  db.prepare(`
    INSERT INTO conversations (jid, menu_sent, human_takeover, last_activity, human_takeover_at)
    VALUES (?, 0, 0, ?, NULL)
    ON CONFLICT(jid) DO UPDATE SET
      menu_sent = 0,
      human_takeover = 0,
      last_activity = excluded.last_activity,
      human_takeover_at = NULL
  `).run(jid, new Date().toISOString());
}

export function isHumanTakeover(jid: string): boolean {
  const state = getState(jid);
  if (!state || !state.humanTakeover) return false;

  if (state.humanTakeoverAt) {
    const minutesElapsed =
      (Date.now() - state.humanTakeoverAt.getTime()) / (1000 * 60);
    if (minutesElapsed > HUMAN_TIMEOUT_MINUTES) {
      clearHumanTakeover(jid);
      return false;
    }
  }

  return true;
}

export function resetState(jid: string): void {
  db.prepare("DELETE FROM conversations WHERE jid = ?").run(jid);
}

export function getAllConversations(): ConversationRow[] {
  return db.prepare("SELECT * FROM conversations ORDER BY last_activity DESC").all() as ConversationRow[];
}

export function logMessage(jid: string, direction: "in" | "out", body: string): void {
  db.prepare(
    "INSERT INTO messages (jid, direction, body, created_at) VALUES (?, ?, ?, ?)"
  ).run(jid, direction, body, new Date().toISOString());
}

export function getMessages(jid: string, limit = 50, offset = 0): MessageRow[] {
  return db.prepare(
    "SELECT * FROM messages WHERE jid = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).all(jid, limit, offset) as MessageRow[];
}

export function getAnalytics(): { totalConversations: number; humanTakeover: number; messagesToday: number } {
  const total = (db.prepare("SELECT COUNT(*) as n FROM conversations").get() as { n: number }).n;
  const human = (db.prepare("SELECT COUNT(*) as n FROM conversations WHERE human_takeover = 1").get() as { n: number }).n;
  const today = (db.prepare(
    "SELECT COUNT(*) as n FROM messages WHERE created_at >= date('now')"
  ).get() as { n: number }).n;
  return { totalConversations: total, humanTakeover: human, messagesToday: today };
}
