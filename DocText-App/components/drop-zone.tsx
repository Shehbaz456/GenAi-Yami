"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

type Props = {
  onFile: (file: File) => Promise<void> | void
}

export function DropZone({ onFile }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleFile = useCallback(
    async (file?: File | null) => {
      if (!file) return
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid file", description: "Please upload a PDF file." })
        return
      }
      setBusy(true)
      try {
        await onFile(file)
        toast({
          title: "PDF embedded",
          description: `Indexed “${file.name}”. You can ask questions now.`,
        })
      } catch (e: any) {
        toast({
          title: "Embedding failed",
          description: e?.message || "We couldn't index your PDF. Please try again.",
        })
      } finally {
        setBusy(false)
      }
    },
    [onFile],
  )

  return (
    <Card
      className={cn(
        "p-4 md:p-6 border-dashed text-center",
        dragOver && "border-blue-600 bg-blue-50 dark:bg-blue-950/20",
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        handleFile(file)
      }}
    >
      <input
        id="file"
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />
      <label htmlFor="file" className="block cursor-pointer">
        <div className="font-medium">Drop a PDF here or click to upload</div>
        <p className="text-sm text-muted-foreground mt-1">
          We will index your PDF into Qdrant and answer questions from it.
        </p>
      </label>
      <div className="mt-3">
        <Button asChild disabled={busy}>
          <label htmlFor="file">{busy ? "Embedding…" : "Choose PDF"}</label>
        </Button>
      </div>
    </Card>
  )
}
