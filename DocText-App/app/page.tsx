"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { DropZone } from "@/components/drop-zone"
import { ChatPanel, type SourceDoc } from "@/components/chat-panel"
import { loadSessions, saveSessions, type Session } from "@/lib/local-store"
import { Plus, Trash2 } from "lucide-react"

// Color & UX notes (Design Guidelines):
// - Colors: primary blue (#2563eb), neutral foreground (#0b0f19), neutral background (#ffffff), gray-500, accent teal (#14b8a6)
// - Max 2 fonts are already handled by the base template (font-sans, font-mono)
// - Mobile-first, responsive layout with clear spacing

export default function Page() {
  const { toast } = useToast()

  const [sessions, setSessions] = useState<Session[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = useMemo(() => sessions.find((s) => s.id === activeId) || null, [sessions, activeId])

  // Load from localStorage
  useEffect(() => {
    const { sessions: initial, activeId: storedActive } = loadSessions()
    setSessions(initial)
    setActiveId(storedActive || initial[0]?.id || null)
  }, [])

  useEffect(() => {
    saveSessions(sessions, activeId)
  }, [sessions, activeId])

  async function handleUpload(file: File) {
    try {
      const form = new FormData()
      form.append("file", file)
      // If a session is selected, append to its collection; otherwise create a new one
      if (active?.collectionName) form.append("collectionName", active.collectionName)

      const res = await fetch("/api/upload", { method: "POST", body: form })
      if (!res.ok) throw new Error(await res.text())
      const data: {
        collectionName: string
        stats: { chunks: number; pages: number }
        fileName: string
        appended: boolean
      } = await res.json()

      let targetId = active?.id || null

      // Create a new session when no active session yet
      if (!active) {
        targetId = crypto.randomUUID()
        const newSession: Session = {
          id: targetId,
          name: data.fileName.replace(/\.pdf$/i, "") || "Untitled PDF",
          collectionName: data.collectionName,
          createdAt: Date.now(),
          messageCount: 0,
          stats: data.stats,
        }
        setSessions((prev) => [newSession, ...prev])
        setActiveId(targetId)
      } else {
        // Update the stats if appended to existing session
        setSessions((prev) =>
          prev.map((s) =>
            s.id === active.id
              ? {
                  ...s,
                  stats: data.stats || s.stats,
                }
              : s,
          ),
        )
      }

      toast({
        title: "Embedded to Qdrant",
        description: `Pages: ${data.stats.pages}, Chunks: ${data.stats.chunks}`,
      })
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: e?.message || "Unknown error",
      })
    }
  }

  async function handleAsk(message: string): Promise<{ answer: string; sources: SourceDoc[] }> {
    if (!active) {
      throw new Error("Please create or select a document first.")
    }
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        collectionName: active.collectionName,
      }),
    })
    if (!res.ok) {
      throw new Error(await res.text())
    }
    const data = (await res.json()) as { answer: string; sources: SourceDoc[] }

    // increment message count
    setSessions((prev) => prev.map((s) => (s.id === active.id ? { ...s, messageCount: (s.messageCount || 0) + 1 } : s)))

    return data
  }

  function createBlankSession() {
    const id = crypto.randomUUID()
    const s: Session = {
      id,
      name: "New Session",
      collectionName: `doctext_${id}`,
      createdAt: Date.now(),
      messageCount: 0,
    }
    setSessions((prev) => [s, ...prev])
    setActiveId(id)
  }

  async function deleteSession(id: string) {
    const session = sessions.find((s) => s.id === id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (activeId === id) setActiveId(sessions.find((s) => s.id !== id)?.id || null)

    // Optional: drop collection in Qdrant
    if (session?.collectionName) {
      try {
        await fetch("/api/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collectionName: session.collectionName }),
        })
      } catch {
        // ignore
      }
    }
  }

  function renameSession(id: string, name: string) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)))
  }

  return (
    <main className="h-dvh flex flex-col">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-md bg-blue-600" aria-hidden />
            <h1 className="text-lg font-semibold leading-none text-pretty">DocText</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[320px_1fr]">
        {/* Sidebar - History */}
        <aside className="border-b md:border-r">
          <div className="h-full flex flex-col">
            <div className="p-3 flex items-center gap-2">
              <Button className="w-full" onClick={createBlankSession}>
                <Plus className="size-4 mr-2" /> New Session
              </Button>
            </div>
            <Separator />
            <ScrollArea className="flex-1">
              <ul className="p-2 space-y-1">
                {sessions.length === 0 ? (
                  <li>
                    <Card className="p-3 text-sm text-muted-foreground">
                      No sessions yet. Upload a PDF to get started.
                    </Card>
                  </li>
                ) : (
                  sessions.map((s) => (
                    <li key={s.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={activeId === s.id}
                        onClick={() => setActiveId(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setActiveId(s.id)
                          }
                        }}
                        className={cn(
                          "w-full text-left rounded-md px-3 py-2 hover:bg-muted transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          activeId === s.id && "bg-muted",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            defaultValue={s.name}
                            onBlur={(e) => renameSession(s.id, e.currentTarget.value || "Untitled")}
                            className="h-7 border-none px-0 focus-visible:ring-0 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteSession(s.id)
                            }}
                            aria-label="Delete session"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{s.messageCount} messages</span>
                          {s.stats ? (
                            <>
                              <span>•</span>
                              <span>
                                {s.stats.pages}p/{s.stats.chunks}c
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      {/* </CHANGE> */}
                    </li>
                  ))
                )}
              </ul>
            </ScrollArea>
          </div>
        </aside>

        {/* Right - Workbench */}
        <section className="overflow-hidden">
          <div className="h-full grid grid-rows-[auto_1fr]">
            <div className="border-b">
              <div className="mx-auto max-w-3xl px-4 py-3">
                <DropZone onFile={handleUpload} />
              </div>
            </div>
            <div className="mx-auto max-w-3xl px-4 py-4">
              <ChatPanel key={active?.id || "empty"} disabled={!active} session={active} onAsk={handleAsk} />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
