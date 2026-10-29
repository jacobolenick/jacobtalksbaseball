import { useEffect, useRef, useState } from "react"
import { loadBrief, type Brief } from "./brief"
import { loadProfile, type PlayerProfile, type StatLine } from "./profile"
import { headshot, teamLogo } from "./teams"
import type { Move } from "./types"

export type SheetRequest = { kind: "player" | "report"; move: Move }

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (!parts.length) return "MLB"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase()
}

function Portrait({ id, name }: { id?: number; name: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="face face-lg" aria-hidden="true">
      {id && !failed ? (
        <img src={headshot(id)} alt="" width={88} height={88} onError={() => setFailed(true)} />
      ) : (
        <span className="initials initials-lg">{initials(name)}</span>
      )}
    </span>
  )
}

function StatBlock({ line }: { line: StatLine }) {
  const [logoFailed, setLogoFailed] = useState(false)
  const logo = !logoFailed && line.teamId ? teamLogo(line.teamId) : undefined
  return (
    <section className="stat-block">
      <h3>
        {logo ? <img src={logo} alt="" width={16} height={16} onError={() => setLogoFailed(true)} /> : null}
        {line.heading}
      </h3>
      <div className="stats">
        {line.cells.map((cell) => (
          <p key={cell.label}>
            <b>{cell.value}</b>
            <span>{cell.label}</span>
          </p>
        ))}
      </div>
    </section>
  )
}

function ProfileBody({
  move,
  profile,
  failed,
}: {
  move: Move
  profile: PlayerProfile | null
  failed: boolean
}) {
  const name = profile?.name || move.playerName
  return (
    <>
      <div className="hero">
        <Portrait id={move.playerId} name={name} />
        <div>
          <p className="hero-kicker">
            {profile?.position ?? move.chip}
            {profile?.number ? ` · No. ${profile.number}` : ""}
          </p>
          <h2 id="sheet-title">{name}</h2>
          <p className="hero-detail">
            <span className="chip">{move.chip}</span>
            {move.detail}
          </p>
        </div>
      </div>
      {profile ? (
        <>
          <dl className="bio">
            <div>
              <dt>Age</dt>
              <dd>{profile.age ?? "—"}</dd>
            </div>
            <div>
              <dt>Bats</dt>
              <dd>{profile.bats}</dd>
            </div>
            <div>
              <dt>Throws</dt>
              <dd>{profile.throws}</dd>
            </div>
            <div>
              <dt>Height</dt>
              <dd>{profile.height}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{profile.weight}</dd>
            </div>
            <div>
              <dt>Born</dt>
              <dd>{profile.born || "—"}</dd>
            </div>
            <div>
              <dt>Debut</dt>
              <dd>{profile.debut ?? "—"}</dd>
            </div>
          </dl>
          {profile.draft ? <p className="draft">{profile.draft}</p> : null}
          {profile.lines.length ? (
            profile.lines.map((line) => <StatBlock key={line.id} line={line} />)
          ) : (
            <p className="sheet-empty">No major league statistics on file.</p>
          )}
        </>
      ) : failed ? (
        <p className="sheet-empty">The profile didn’t load.</p>
      ) : (
        <div className="sheet-skel" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </>
  )
}

function ReportBody({
  move,
  onShowPlayer,
}: {
  move: Move
  onShowPlayer: () => void
}) {
  const [brief, setBrief] = useState<Brief | null>(null)
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!move.url) return
    const controller = new AbortController()
    setBrief(null)
    setFailed(false)
    loadBrief(move.url, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setBrief(next)
        if (!next) setFailed(true)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [move.url])

  useEffect(() => {
    if (!move.playerId) return
    const controller = new AbortController()
    loadProfile(move.playerId, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setProfile(next)
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfile(null)
      })
    return () => controller.abort()
  }, [move.playerId])

  const summary = brief?.summary || move.blurb
  const title = brief?.title || `${move.playerName} ${move.chip.toLowerCase()}`
  const season = profile?.lines.find((line) => line.id.startsWith("season-"))
  const career = profile?.lines.find((line) => line.id.startsWith("career-"))

  return (
    <>
      <p className="sheet-source">{brief?.source || move.source}</p>
      <h2 id="sheet-title">{title}</h2>
      <p className="sheet-summary">{summary}</p>
      {brief === null && !failed ? (
        <div className="sheet-skel" aria-hidden="true">
          <span />
          <span />
        </div>
      ) : null}
      {failed && !brief ? <p className="sheet-empty">The report didn’t load. The note above is what we already had.</p> : null}
      {brief && brief.terms.length ? (
        <section className="terms-block">
          <h3>Details</h3>
          <ul className="terms">
            {brief.terms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {season ? <StatBlock line={season} /> : null}
      {career ? <StatBlock line={career} /> : null}
      {move.playerId ? (
        <button type="button" className="text-link" onClick={onShowPlayer}>
          Full profile
        </button>
      ) : null}
    </>
  )
}

export function Sheet({
  request,
  onClose,
  onShowPlayer,
}: {
  request: SheetRequest
  onClose: () => void
  onShowPlayer: () => void
}) {
  const dialog = useRef<HTMLDivElement>(null)
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    dialog.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key !== "Tab" || !dialog.current) return
      const nodes = [...dialog.current.querySelectorAll<HTMLElement>("button, a, [href], [tabindex]:not([tabindex='-1'])")]
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose, request.kind, request.move.id])

  useEffect(() => {
    if (request.kind !== "player" || !request.move.playerId) return
    const controller = new AbortController()
    setProfile(null)
    setFailed(false)
    loadProfile(request.move.playerId, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setProfile(next)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [request.kind, request.move.playerId, request.move.id])

  return (
    <div className="sheet-root" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        tabIndex={-1}
        ref={dialog}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2 L12 12 M12 2 L2 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        {request.kind === "player" ? (
          <ProfileBody move={request.move} profile={profile} failed={failed} />
        ) : (
          <ReportBody move={request.move} onShowPlayer={onShowPlayer} />
        )}
      </div>
    </div>
  )
}
