import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPhone, formatTime, escapeHtml } from '@/lib/helpers'
import type { ConversationRow, MessageRow } from '@/types'

interface ChatPanelProps {
  jid: string
  conversation: ConversationRow
  messages: MessageRow[]
  onSendMessage: (text: string) => void
  onTakeover: () => void
}

export function ChatPanel({
  jid,
  conversation,
  messages,
  onSendMessage,
  onTakeover,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const isHuman = conversation.human_takeover === 1

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = inputValue.trim()
    if (!text) return
    setInputValue('')
    onSendMessage(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-3 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">
            {formatPhone(jid)}
          </span>
          <Badge variant={isHuman ? 'human' : 'bot'}>
            {isHuman ? 'Humano' : 'Bot'}
          </Badge>
        </div>
        <Button
          size="sm"
          variant={isHuman ? 'outline' : 'default'}
          onClick={onTakeover}
          className={
            isHuman
              ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }
        >
          {isHuman ? 'Devolver ao Bot' : 'Assumir Atendimento'}
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4 bg-background">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground mt-8">
            Nenhuma mensagem ainda
          </p>
        ) : (
          messages.map((msg) => {
            const isOut = msg.direction === 'out'
            return (
              <div
                key={msg.id}
                className={`flex mb-3 ${isOut ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={[
                    'max-w-[70%] rounded-2xl px-4 py-2 text-sm break-words',
                    isOut
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card text-foreground rounded-bl-sm',
                  ].join(' ')}
                >
                  <span
                    // Safe: escapeHtml sanitizes the content before inserting
                    dangerouslySetInnerHTML={{ __html: escapeHtml(msg.body) }}
                  />
                  <div
                    className={`text-[10px] mt-1 ${
                      isOut ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    } text-right`}
                  >
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Send bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-card border-t border-border shrink-0">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..."
          className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
        />
        <Button
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
        >
          <Send className="w-4 h-4 mr-1" />
          Enviar
        </Button>
      </div>
    </div>
  )
}
