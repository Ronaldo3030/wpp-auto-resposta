export interface ConversationRow {
  jid: string
  menu_sent: number
  human_takeover: number
  last_activity: string
}

export interface MessageRow {
  id: number
  jid: string
  direction: 'in' | 'out'
  body: string
  created_at: string
}

export interface Analytics {
  totalConversations: number
  humanTakeover: number
  messagesToday: number
}
