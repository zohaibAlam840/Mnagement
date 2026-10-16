"use client"

import { useEffect, useRef, useState } from "react"
import { Eraser, PenLine, Type } from "lucide-react"
import { cn } from "@/lib/utils"

const W = 600
const H = 160
const INK = "#1f1d3d"

// Crop to the inked area so the signature fills the PDF's signature line
function trimmedPng(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d")!
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null
  const pad = 6
  const out = document.createElement("canvas")
  out.width = maxX - minX + pad * 2
  out.height = maxY - minY + pad * 2
  out.getContext("2d")!.drawImage(canvas, minX - pad, minY - pad, out.width, out.height, 0, 0, out.width, out.height)
  return out.toDataURL("image/png")
}

// Draw or type an electronic signature. onChange receives a PNG data URL (or null when empty).
export function SignaturePad({ defaultName, onChange }: { defaultName: string; onChange: (png: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [mode, setMode] = useState<"type" | "draw">("type")
  const [typed, setTyped] = useState(defaultName)

  const clear = () => {
    const c = canvasRef.current
    if (!c) return
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height)
  }

  // Typed signatures are rendered into the same canvas
  useEffect(() => {
    if (mode !== "type") return
    const c = canvasRef.current
    if (!c) return
    clear()
    const ctx = c.getContext("2d")!
    ctx.fillStyle = INK
    ctx.textBaseline = "middle"
    let size = 64
    ctx.font = `italic ${size}px "Segoe Script", "Brush Script MT", "Snell Roundhand", cursive`
    while (ctx.measureText(typed).width > W - 30 && size > 20) {
      size -= 4
      ctx.font = `italic ${size}px "Segoe Script", "Brush Script MT", "Snell Roundhand", cursive`
    }
    if (typed.trim()) ctx.fillText(typed, 15, H / 2)
    onChange(typed.trim() ? trimmedPng(c) : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, mode])

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw") return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    last.current = point(e)
  }
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return
    const ctx = e.currentTarget.getContext("2d")!
    const p = point(e)
    ctx.strokeStyle = INK
    ctx.lineWidth = 3.2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }
  const onUp = () => {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    if (canvasRef.current) onChange(trimmedPng(canvasRef.current))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-0.5 w-fit">
        {([["type", Type, "Type"], ["draw", PenLine, "Draw"]] as const).map(([m, Icon, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); clear(); onChange(null) }}
            className={cn("flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md", mode === m ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500")}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>
      {mode === "type" && (
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type your full name"
          className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
        />
      )}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className={cn("w-full h-24 rounded-xl border-2 border-dashed border-zinc-200 bg-white", mode === "draw" && "touch-none cursor-crosshair")}
        />
        {mode === "draw" && (
          <button
            type="button"
            onClick={() => { clear(); onChange(null) }}
            className="absolute top-2 right-2 flex items-center gap-1 text-[11px] font-semibold text-zinc-500 bg-white/90 border border-zinc-200 rounded-md px-2 py-1"
          >
            <Eraser className="w-3 h-3" /> Clear
          </button>
        )}
        <div className="absolute left-4 right-4 bottom-5 border-b border-zinc-200 pointer-events-none" />
      </div>
    </div>
  )
}
