import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

interface MenuItem {
  key: string;
  label: string;
  reply: string;
  type?: string;
}

interface Flows {
  greeting: string;
  menu: MenuItem[];
  fallback: string;
}

let flows: Flows;

export function loadFlows(): Flows {
  const filePath = path.resolve(process.cwd(), "flows.yaml");
  const content = fs.readFileSync(filePath, "utf-8");
  flows = yaml.load(content) as Flows;
  return flows;
}

export function getFlows(): Flows {
  if (!flows) loadFlows();
  return flows;
}

export function buildMenuText(): string {
  const { greeting, menu } = getFlows();
  const options = menu.map((item) => `${item.key} - ${item.label}`).join("\n");
  return `${greeting.trim()}\n\n${options}`;
}

export function findReply(key: string): { reply: string; type?: string } | null {
  const item = getFlows().menu.find((m) => m.key === key.trim());
  return item ? { reply: item.reply.trim(), type: item.type } : null;
}
