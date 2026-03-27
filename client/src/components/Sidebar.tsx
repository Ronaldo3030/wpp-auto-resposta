import { useState } from 'react'
import { Search } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatPhone, timeAgo } from '@/lib/helpers'
import type { ConversationRow } from '@/types'

interface SidebarProps {
  conversations: ConversationRow[]
  selectedJid: string | null
  onSelect: (jid: string) => void
}

export function Sidebar({ conversations, selectedJid, onSelect }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const sorted = [...conversations].sort(
    (a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
  )

  const filtered = searchTerm
    ? sorted.filter((c) => formatPhone(c.jid).includes(searchTerm))
    : sorted

  return (
    <aside className="w-72 shrink-0 flex flex-col bg-card border-r border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Conversas Ativas
          </h2>
          <span className="text-xs text-muted-foreground">({filtered.length})</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar conversa..."
            className="pl-9 h-8 text-sm bg-background border-border"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <p className="px-4 py-4 text-xs text-muted-foreground">Nenhuma conversa encontrada</p>
        ) : (
          filtered.map((conv) => {
            const isHuman = conv.human_takeover === 1
            const isActive = conv.jid === selectedJid
            const initial = formatPhone(conv.jid).replace(/\D/g, '').slice(-1) || '?'

            return (
              <button
                key={conv.jid}
                onClick={() => onSelect(conv.jid)}
                className={[
                  'w-full text-left px-4 py-3 border-b border-border/50 transition-colors',
                  'hover:bg-secondary focus:outline-none',
                  isActive
                    ? 'bg-secondary border-l-2 border-l-primary pl-[14px]'
                    : 'border-l-2 border-l-transparent',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {formatPhone(conv.jid)}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant={isHuman ? 'human' : 'bot'}>
                        {isHuman ? 'Humano' : 'Bot'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(conv.last_activity)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </ScrollArea>
    </aside>
  )
}
