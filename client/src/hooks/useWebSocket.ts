import { useEffect, useRef, useCallback } from 'react'

interface WsMessage {
  type: string
  data: unknown
}

export function useWebSocket(onMessage: (msg: WsMessage) => void) {
  const onMessageRef = useRef(onMessage)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)

  // Keep the callback ref current so we never have stale closures
  useEffect(() => {
    onMessageRef.current = onMessage
  })

  const connect = useCallback(() => {
    if (unmountedRef.current) return

    const url = import.meta.env.DEV
      ? 'ws://localhost:3000'
      : `ws://${location.host}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (unmountedRef.current) {
        ws.close()
        return
      }
      // Signal connected — App will fetch initial data
      onMessageRef.current({ type: '__open', data: null })
    }

    ws.onmessage = (ev) => {
      if (unmountedRef.current) return
      try {
        const msg = JSON.parse(ev.data as string) as WsMessage
        onMessageRef.current(msg)
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      if (unmountedRef.current) return
      reconnectTimerRef.current = setTimeout(connect, 2000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, []) // stable — no deps needed because we use refs

  useEffect(() => {
    unmountedRef.current = false
    connect()

    return () => {
      unmountedRef.current = true
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect on intentional close
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])
}
