import { Smartphone } from 'lucide-react'
import { formatPhone } from '@/lib/helpers'

interface HeaderProps {
  connected: boolean
  status: string
  phone: string | null
}

export function Header({ connected, status, phone }: HeaderProps) {
  const dotColor =
    status === 'open'
      ? 'bg-green-500'
      : status === 'connecting'
      ? 'bg-amber-500 animate-pulse'
      : 'bg-red-500'

  const statusLabel =
    status === 'open'
      ? 'Conectado'
      : status === 'connecting'
      ? 'Reconectando...'
      : 'Desconectado'

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-card border-b border-border shrink-0">
      <div className="flex items-center gap-3">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor}`}
          title={statusLabel}
        />
        <span className="text-xl font-bold tracking-widest text-primary-foreground">ZAP</span>
        <span className="text-sm text-muted-foreground">{statusLabel}</span>
      </div>
      {phone && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
          <Smartphone className="w-4 h-4" />
          {formatPhone(phone)}
        </div>
      )}
    </header>
  )
}
