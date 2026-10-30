import { useEffect, useRef } from "react"
import trophy from "./assets/trophy.png"
import { teamLogo } from "./teams"

const BREWERS = 158

export function ChampionToast({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const timer = window.setTimeout(() => done.current(), reduced ? 4200 : 6200)
    const canvas = canvasRef.current
    if (reduced || !canvas) return () => window.clearTimeout(timer)
    const ctx = canvas.getContext("2d")
    if (!ctx) return () => window.clearTimeout(timer)
    const ratio = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * ratio
    canvas.height = window.innerHeight * ratio
    const colors = ["#0a2351", "#ffc72c", "#ffffff", "#c4a35a"]
    const originX = canvas.width / 2
    const originY = canvas.height - 96 * ratio
    const pieces = Array.from({ length: 160 }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.55
      const speed = (11 + Math.random() * 13) * ratio
      return {
        x: originX + (Math.random() - 0.5) * 48 * ratio,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: (5 + Math.random() * 7) * ratio,
        h: (8 + Math.random() * 8) * ratio,
        color: colors[Math.floor(Math.random() * colors.length)] ?? "#ffc72c",
        spin: (Math.random() - 0.5) * 0.35,
        rot: Math.random() * Math.PI,
        life: 1,
      }
    })
    let raf = 0
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const piece of pieces) {
        piece.vy += 0.26 * ratio
        piece.x += piece.vx
        piece.y += piece.vy
        piece.vx *= 0.992
        piece.rot += piece.spin
        piece.life -= 0.007
        if (piece.life <= 0) continue
        alive = true
        ctx.save()
        ctx.translate(piece.x, piece.y)
        ctx.rotate(piece.rot)
        ctx.globalAlpha = Math.max(0, piece.life)
        ctx.fillStyle = piece.color
        ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h)
        ctx.restore()
      }
      if (alive) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="confetti" aria-hidden="true" />
      <div className="toast" role="status">
        <img src={teamLogo(BREWERS)} alt="" width={48} height={48} />
        <img className="trophy" src={trophy} alt="Commissioner's Trophy" />
        <p>Congratulations to the Brewers! First time World Series Champions.</p>
      </div>
    </>
  )
}
