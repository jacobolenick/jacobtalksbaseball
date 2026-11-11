import { useEffect, useRef, useState } from "react"
import { LEAGUES, leagueOption, type LeagueId } from "./league"

function LeagueMark({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <span className="league-mark fallback" aria-hidden="true">
        {name.slice(0, 1)}
      </span>
    )
  }
  return <img className="league-mark" src={src} alt="" width={18} height={18} onError={() => setFailed(true)} />
}

export function LeagueMenu({ league, onChange }: { league: LeagueId; onChange: (league: LeagueId) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const current = leagueOption(league)

  useEffect(() => {
    if (!open) return
    const selected = root.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
    selected?.focus()
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        trigger.current?.focus()
        return
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
      const options = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])]
      const index = options.indexOf(document.activeElement as HTMLButtonElement)
      const next = event.key === "ArrowDown" ? Math.min(index + 1, options.length - 1) : Math.max(index - 1, 0)
      event.preventDefault()
      options[next]?.focus()
    }
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function choose(id: LeagueId) {
    setOpen(false)
    trigger.current?.focus()
    if (id !== league) onChange(id)
  }

  return (
    <div className={open ? "league-switch open" : "league-switch"} ref={root}>
      <button
        type="button"
        className="league-trigger"
        ref={trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`League, ${current.name}`}
        onClick={() => setOpen((value) => !value)}
      >
        <LeagueMark src={current.logo} name={current.short} />
        <span>{current.short}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1 L5 5 L9 1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul className="team-menu league-list" role="listbox" aria-label="Leagues">
          {LEAGUES.map((item) => (
            <li key={item.id}>
              <button type="button" role="option" aria-selected={league === item.id} onClick={() => choose(item.id)}>
                <LeagueMark src={item.logo} name={item.short} />
                <span className="league-copy">
                  <span>{item.name}</span>
                  <small>{item.detail}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
