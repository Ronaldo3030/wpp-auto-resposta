import { Loader2, QrCode } from 'lucide-react'

interface QrScreenProps {
  qrDataUrl: string | null
  status: 'connecting' | 'close'
}

export function QrScreen({ qrDataUrl, status }: QrScreenProps) {
  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-bold tracking-widest text-primary">ZAP</h1>
          <p className="text-sm text-muted-foreground">WhatsApp Automation</p>
        </div>

        {qrDataUrl ? (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="bg-white p-4 rounded-2xl shadow-lg shadow-primary/10">
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
            </div>
            <p className="text-sm text-muted-foreground">
              Escaneie o QR Code com o WhatsApp
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-72 h-72 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-4">
              {status === 'close' ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-sm text-muted-foreground">Reconectando...</p>
                </>
              ) : (
                <>
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">Aguardando QR Code...</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
