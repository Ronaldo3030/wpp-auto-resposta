import { useState, useCallback } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Header } from '@/components/Header'
import { Analytics } from '@/components/Analytics'
import { Sidebar } from '@/components/Sidebar'
import { QrScreen } from '@/components/QrScreen'
import { ChatPanel } from '@/components/ChatPanel'
import type { ConversationRow, MessageRow, Analytics as AnalyticsType } from '@/types'

type ConnectionStatus = 'open' | 'connecting' | 'close'

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [phone, setPhone] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Record<string, ConversationRow>>({})
  const [selectedJid, setSelectedJid] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsType>({
    totalConversations: 0,
    humanTakeover: 0,
    messagesToday: 0,
  })

  // ── API helpers ────────────────────────────────────────────────

  async function fetchStatus() {
    try {
      const res = await fetch('/api/status')
      const data = await res.json() as { status: string; phone?: string; qr?: string }
      applyConnectionStatus(data.status, data.phone)
      if (data.qr) {
        setQrDataUrl(data.qr)
      }
    } catch {}
  }

  async function fetchConversations() {
    try {
      const res = await fetch('/api/conversations')
      const rows = await res.json() as ConversationRow[]
      setConversations(
        rows.reduce<Record<string, ConversationRow>>((acc, r) => {
          acc[r.jid] = r
          return acc
        }, {})
      )
    } catch {}
  }

  async function fetchAnalytics() {
    try {
      const res = await fetch('/api/analytics')
      const data = await res.json() as AnalyticsType
      setAnalytics(data)
    } catch {}
  }

  async function fetchMessages(jid: string) {
    try {
      const res = await fetch(
        `/api/conversations/${encodeURIComponent(jid)}/messages?limit=50`
      )
      const rows = await res.json() as MessageRow[]
      // API returns DESC; reverse to ASC for display
      setMessages(rows.reverse())
    } catch {}
  }

  function applyConnectionStatus(newStatus: string, newPhone?: string) {
    const s = newStatus as ConnectionStatus
    setStatus(s)
    setPhone(newPhone ?? null)
    if (s === 'open') {
      setQrDataUrl(null)
      fetchConversations()
      fetchAnalytics()
    }
  }

  // ── WebSocket message handler ──────────────────────────────────

  const handleWsMessage = useCallback(
    (msg: { type: string; data: unknown }) => {
      switch (msg.type) {
        case '__open': {
          fetchStatus()
          fetchConversations()
          fetchAnalytics()
          break
        }
        case 'connection': {
          const d = msg.data as { status: string; phone?: string }
          applyConnectionStatus(d.status, d.phone)
          break
        }
        case 'qr': {
          const d = msg.data as { qr: string }
          setQrDataUrl(d.qr)
          break
        }
        case 'message': {
          const d = msg.data as MessageRow
          setSelectedJid((currentJid) => {
            if (currentJid === d.jid) {
              setMessages((prev) => [...prev, d])
            }
            return currentJid
          })
          fetchConversations()
          fetchAnalytics()
          break
        }
        case 'takeover': {
          const d = msg.data as { jid: string; active: boolean }
          setConversations((prev) => {
            if (!prev[d.jid]) return prev
            return {
              ...prev,
              [d.jid]: { ...prev[d.jid], human_takeover: d.active ? 1 : 0 },
            }
          })
          break
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useWebSocket(handleWsMessage)

  // ── Actions ───────────────────────────────────────────────────

  async function handleSelectConversation(jid: string) {
    setSelectedJid(jid)
    await fetchMessages(jid)
  }

  async function handleSendMessage(text: string) {
    if (!selectedJid) return
    try {
      await fetch(
        `/api/conversations/${encodeURIComponent(selectedJid)}/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        }
      )
    } catch {}
  }

  async function handleTakeover() {
    if (!selectedJid) return
    const conv = conversations[selectedJid]
    if (!conv) return
    const newActive = conv.human_takeover !== 1

    try {
      await fetch(
        `/api/conversations/${encodeURIComponent(selectedJid)}/takeover`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: newActive }),
        }
      )
      setConversations((prev) => ({
        ...prev,
        [selectedJid]: { ...prev[selectedJid], human_takeover: newActive ? 1 : 0 },
      }))
    } catch {}
  }

  // ── Render ────────────────────────────────────────────────────

  const convList = Object.values(conversations)
  const selectedConv = selectedJid ? conversations[selectedJid] : null

  // QR-first flow: show only QR screen until connected
  if (status !== 'open') {
    return <QrScreen qrDataUrl={qrDataUrl} status={status} />
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground animate-fade-in">
      <Header connected={true} status={status} phone={phone} />
      <Analytics
        total={analytics.totalConversations}
        humanTakeover={analytics.humanTakeover}
        messagesToday={analytics.messagesToday}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          conversations={convList}
          selectedJid={selectedJid}
          onSelect={handleSelectConversation}
        />
        {selectedJid && selectedConv ? (
          <ChatPanel
            key={selectedJid}
            jid={selectedJid}
            conversation={selectedConv}
            messages={messages}
            onSendMessage={handleSendMessage}
            onTakeover={handleTakeover}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">Selecione uma conversa</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
