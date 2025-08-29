"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import type { Session } from "@/lib/local-store"

export type SourceDoc = {
  page?: number | string
  snippet: string
}

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: SourceDoc[]
}

type Props = {
  disabled?: boolean
  session: Session | null
  onAsk: (message: string) => Promise<{ answer: string; sources: SourceDoc[] }>
}

export function ChatPanel({ disabled, session, onAsk }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([])
    setInput("")
    setBusy(false)
  }, [session?.id])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  async function submit() {
    if (!input.trim() || !session) return
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: input }
    setMessages((m) => [...m, userMsg])
    setInput("")
    setBusy(true)

    try {
      const { answer, sources } = await onAsk(userMsg.content)
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: answer,
        sources,
      }
      setMessages((m) => [...m, aiMsg])
    } catch (e: any) {
      const err: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: e?.message || "Something went wrong.",
      }
      setMessages((m) => [...m, err])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full grid grid-rows-[1fr_auto] gap-4">
      <Card className="p-0 overflow-hidden">
        <ScrollArea className="h-[50vh] md:h-[60vh]" viewportRef={viewportRef}>
          <div className="p-4 space-y-4">
            {!session ? (
              <div className="text-sm text-muted-foreground">
                Create a new session or upload a PDF to start chatting.
              </div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Ask a question about your uploaded PDF. We will cite source pages where possible.
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="space-y-2">
                  <div className="text-xs text-muted-foreground">{m.role === "user" ? "You" : "DocText"}</div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Sources:{" "}
                      {m.sources.map((s, i) => (
                        <span key={i} className="mr-2">
                          [p:{String(s.page || "?")}] {s.snippet}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            {busy ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </Card>

      <div className="flex items-center gap-2">
        <Input
          placeholder={disabled ? "Upload a PDF first…" : "Ask a question about your PDF…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit()
          }}
          disabled={disabled || busy}
        />
        <Button onClick={submit} disabled={disabled || busy}>
          Send
        </Button>
      </div>
    </div>
  )
}
