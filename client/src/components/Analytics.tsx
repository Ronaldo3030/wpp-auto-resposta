import { MessageSquare, UserCheck, MessageCircle } from 'lucide-react'
import type { ReactNode } from 'react'

interface AnalyticsProps {
  total: number | undefined
  humanTakeover: number | undefined
  messagesToday: number | undefined
}

function Stat({ label, value, icon }: { label: string; value: number | undefined; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-6 py-2">
      <div className="text-primary">{icon}</div>
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          {label}
        </span>
        <span className="text-xl font-bold text-primary">
          {value == null ? '\u2014' : value}
        </span>
      </div>
    </div>
  )
}

export function Analytics({ total, humanTakeover, messagesToday }: AnalyticsProps) {
  return (
    <div className="flex items-center justify-around bg-card border-b border-border shrink-0">
      <Stat label="Conversas" value={total} icon={<MessageSquare className="w-5 h-5" />} />
      <div className="w-px h-10 bg-border" />
      <Stat label="Em atendimento" value={humanTakeover} icon={<UserCheck className="w-5 h-5" />} />
      <div className="w-px h-10 bg-border" />
      <Stat label="Mensagens hoje" value={messagesToday} icon={<MessageCircle className="w-5 h-5" />} />
    </div>
  )
}
