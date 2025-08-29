// Simple localStorage-backed sessions

export type Session = {
  id: string
  name: string
  collectionName: string
  createdAt: number
  messageCount: number
  stats?: { pages: number; chunks: number }
}

const SESSIONS_KEY = "doctext:sessions"
const ACTIVE_KEY = "doctext:activeId"

export function loadSessions(): { sessions: Session[]; activeId: string | null } {
  if (typeof window === "undefined") return { sessions: [], activeId: null }
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    const sessions: Session[] = raw ? JSON.parse(raw) : []
    const activeId = localStorage.getItem(ACTIVE_KEY)
    return { sessions, activeId }
  } catch {
    return { sessions: [], activeId: null }
  }
}

export function saveSessions(sessions: Session[], activeId: string | null) {
  if (typeof window === "undefined") return
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  if (activeId) localStorage.setItem(ACTIVE_KEY, activeId)
  else localStorage.removeItem(ACTIVE_KEY)
}
