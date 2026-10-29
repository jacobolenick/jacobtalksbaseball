import { useEffect, useRef, useState } from "react"
import { CLUBS, clubById, mlbLogo, teamLogo } from "./teams"

const TEAMS = [...CLUBS].sort((a, b) => a.nick.localeCompare(b.nick, "en"))

function TeamMark({ id, src }: { id?: number; src?: string }) {
  const [failed, setFailed] = useState(false)
  const url = src ?? (id ? teamLogo(id) : undefined)
  if (!url || failed) return <span className="team-mark" aria-hidden="true" />
  return <img className="team-mark" src={url} alt="" width={18} height={18} onError={() => setFailed(true)} />
}

export function TeamFilter({
  teamId,
  onChange,
}: {
  teamId: number | null
  onChange: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const club = clubById(teamId ?? undefined)

  useEffect(() => {
    if (!open) return
    const selected = root.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
    selected?.focus()
    selected?.scrollIntoView({ block: "nearest" })
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

  function choose(id: number | null) {
    onChange(id)
    setOpen(false)
    trigger.current?.focus()
  }

  return (
    <div className={open ? "team-filter open" : "team-filter"} ref={root}>
      <button
        type="button"
        className="team-trigger"
        ref={trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Team, ${club?.nick ?? "All teams"}`}
        onClick={() => setOpen((value) => !value)}
      >
        {club ? <TeamMark id={club.id} /> : <TeamMark src={mlbLogo} />}
        <span>{club?.nick ?? "All teams"}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1 L5 5 L9 1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul className="team-menu" role="listbox" aria-label="Teams">
          <li>
            <button type="button" role="option" aria-selected={teamId === null} onClick={() => choose(null)}>
              <TeamMark src={mlbLogo} />
              All teams
            </button>
          </li>
          {TEAMS.map((item) => (
            <li key={item.id}>
              <button type="button" role="option" aria-selected={teamId === item.id} onClick={() => choose(item.id)}>
                <TeamMark id={item.id} />
                {item.nick}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
