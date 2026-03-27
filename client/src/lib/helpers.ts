/**
 * Formats a WhatsApp JID to a human-readable phone number.
 * e.g. "5511987654321@s.whatsapp.net" → "+55 (11) 98765-4321"
 */
export function formatPhone(jid: string): string {
  if (!jid) return ''
  return (
    '+' +
    jid
      .replace(/@.+$/, '')
      .replace(/:\d+$/, '')
      .replace(/(\d{2})(\d{2})(\d{4,5})(\d{4})/, '$1 ($2) $3-$4')
  )
}

/**
 * Returns a human-friendly time-ago string (Portuguese).
 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

/**
 * Formats an ISO timestamp to HH:MM (pt-BR locale).
 */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Escapes HTML special characters to prevent XSS.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
