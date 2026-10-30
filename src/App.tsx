import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { clockET, dateLabel, shortDate, todayISO } from "./dates"
import { isOption } from "./classify"
import { headshot, teamLogo } from "./teams"
import logo from "./assets/logo.png"
import { ChampionToast } from "./ChampionToast"
import { FeedView } from "./FeedView"
import { ProfileButton, ProfileSheet } from "./Creator"
import { ScoresView } from "./ScoresView"
import { TeamsView } from "./TeamsView"
import { Sheet, type SheetRequest } from "./Sheet"
import { TeamFilter } from "./TeamFilter"
import type { FilterId, Move } from "./types"
import { hydratePlayers, loadWire } from "./wire"

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "trade", label: "Trades" },
  { id: "signing", label: "Signings" },
  { id: "options", label: "Options" },
  { id: "free-agency", label: "Free agency" },
]

function matches(move: Move, filter: FilterId, showMinors: boolean, teamId: number | null): boolean {
  if (move.minor && !showMinors) return false
  if (teamId && !move.teamIds.includes(teamId)) return false
  if (filter === "all") return true
  if (filter === "trade") return move.kind === "trade"
  if (filter === "signing") return move.kind === "signing" || move.kind === "contract"
  if (filter === "options") return isOption(move.kind)
  return move.kind === "free-agency"
}

function forTicker(moves: Move[], filter: FilterId): Move[] {
  if (filter === "signing") return moves.slice(0, 40)
  const minors = moves.filter((move) => move.minor).slice(0, 12)
  const rest = moves.filter((move) => !move.minor)
  return [...rest, ...minors].sort((a, b) => {
    const indexA = moves.indexOf(a)
    const indexB = moves.indexOf(b)
    return indexA - indexB
  })
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (!parts.length) return "MLB"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase()
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

function Mark({ id, abbr }: { id?: number; abbr?: string }) {
  const [failed, setFailed] = useState(false)
  const src = !failed && id ? teamLogo(id) : undefined
  if (!src) return <span className="mark fallback">{abbr ?? "MLB"}</span>
  return <img className="mark" src={src} alt="" width={22} height={22} draggable={false} onError={() => setFailed(true)} />
}

function Face({ id, name }: { id?: number; name: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [id])
  return (
    <span className="face" aria-hidden="true">
      {id && !failed ? (
        <img src={headshot(id)} alt="" width={44} height={44} draggable={false} onError={() => setFailed(true)} />
      ) : (
        <span className="initials">{initials(name)}</span>
      )}
    </span>
  )
}

function Pills({ items, onOpen }: { items: Move[]; onOpen: (id: string) => void }) {
  let previous = ""
  return (
    <>
      {items.map((move) => {
        const showDate = move.date !== previous
        previous = move.date
        return (
          <button
            key={move.id}
            type="button"
            className="tick"
            aria-label={`${move.playerName}, ${move.chip}, ${shortDate(move.date)}`}
            onClick={() => onOpen(move.id)}
          >
            {showDate ? <span className="tick-date">{shortDate(move.date)}</span> : null}
            <Mark id={move.teamId} abbr={move.teamAbbr} />
            <span className="tick-name">{move.playerName}</span>
            <span className="chip">{move.chip}</span>
          </button>
        )
      })}
    </>
  )
}

function Ticker({
  items,
  loading,
  onOpen,
  onHome,
}: {
  items: Move[] | null
  loading: boolean
  onOpen: (id: string) => void
  onHome: () => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const pause = useRef({ hover: false, hold: false, wheel: false })
  const [loop, setLoop] = useState(false)
  const signature = items?.map((item) => item.id).join("|") ?? ""

  useLayoutEffect(() => {
    const frame = scroller.current
    const first = track.current
    if (!frame || !first) return
    setLoop(first.scrollWidth > frame.clientWidth + 24)
  }, [signature])

  useEffect(() => {
    const frame = scroller.current
    if (!frame) return
    frame.scrollLeft = 0
  }, [signature])

  useEffect(() => {
    const frame = scroller.current
    if (!frame || !loop) return
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    let raf = 0
    let last = performance.now()
    let wheelTimer = 0
    const step = (now: number) => {
      const delta = now - last
      last = now
      const state = pause.current
      const paused = state.hover || state.hold || state.wheel || media.matches || document.hidden
      if (!paused) {
        frame.scrollLeft += delta * 0.032
        const half = frame.scrollWidth / 2
        if (half > 0 && frame.scrollLeft >= half) frame.scrollLeft -= half
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        frame.scrollLeft += event.deltaY
        event.preventDefault()
      }
      pause.current.wheel = true
      window.clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        pause.current.wheel = false
      }, 1400)
    }
    frame.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      cancelAnimationFrame(raf)
      frame.removeEventListener("wheel", onWheel)
      window.clearTimeout(wheelTimer)
    }
  }, [loop, signature])

  return (
    <header className="ticker">
      <button type="button" className="brand" onClick={onHome}>
        <img src={logo} alt="Jacob Talks Baseball" />
      </button>
      <div
        className="ticker-scroller"
        ref={scroller}
        aria-label="Recent MLB moves"
        onMouseEnter={() => {
          pause.current.hover = true
        }}
        onMouseLeave={() => {
          pause.current.hover = false
        }}
        onFocusCapture={() => {
          pause.current.hold = true
        }}
        onBlurCapture={() => {
          pause.current.hold = false
        }}
        onPointerDown={() => {
          pause.current.hold = true
        }}
        onPointerUp={() => {
          pause.current.hold = false
        }}
      >
        {loading || !items ? (
          <div className="skeleton-row" aria-hidden="true">
            <span className="skel" />
            <span className="skel" />
            <span className="skel" />
          </div>
        ) : items.length === 0 ? (
          <p className="ticker-note">No moves in this view.</p>
        ) : (
          <>
            <div className="track" ref={track}>
              <Pills items={items} onOpen={onOpen} />
            </div>
            {loop ? (
              <div className="track" aria-hidden="true" inert>
                <Pills items={items} onOpen={onOpen} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </header>
  )
}

function MoveRow({
  move,
  open,
  pulse,
  onToggle,
  onReport,
  onPlayer,
}: {
  move: Move
  open: boolean
  pulse: boolean
  onToggle: () => void
  onReport: () => void
  onPlayer: () => void
}) {
  return (
    <article id={`move-${move.id}`} className={pulse ? "move pulse" : open ? "move open" : "move"}>
      <button type="button" className="row" aria-expanded={open} onClick={onToggle}>
        <Face id={move.playerId} name={move.playerName} />
        <span>
          <p className="name">{move.playerName}</p>
          <p className="detail">{move.detail}</p>
        </span>
        <span className="chip">{move.chip}</span>
      </button>
      {open ? (
        <div className="more">
          <p>{move.blurb}</p>
          <div className="links">
            {move.url ? (
              <button type="button" className="text-link" onClick={onReport}>
                Read the report
              </button>
            ) : null}
            {move.playerId ? (
              <button type="button" className="text-link" onClick={onPlayer}>
                Player page
              </button>
            ) : null}
          </div>
          <p className="origin">{move.source}</p>
        </div>
      ) : null}
    </article>
  )
}

export default function App() {
  const [moves, setMoves] = useState<Move[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [updated, setUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterId>("all")
  const [teamId, setTeamId] = useState<number | null>(null)
  const [showMinors, setShowMinors] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [pulseId, setPulseId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetRequest | null>(null)
  const [tab, setTab] = useState<"moves" | "feed" | "scores" | "teams">("moves")
  const [champions, setChampions] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const movesRef = useRef<Move[] | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const today = todayISO()

  const load = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setRefreshing(movesRef.current !== null)
    try {
      const result = await loadWire(controller.signal)
      if (controller.signal.aborted) return
      movesRef.current = result.moves
      setMoves(result.moves)
      setError(null)
      setUpdated(new Date())
      setNotice(
        result.storiesFailed
          ? "Option reports didn’t load. Showing the official transaction log."
          : result.transactionFailed
            ? "The transaction log didn’t load. Showing reported moves."
            : null,
      )
      const hydrated = await hydratePlayers(result.moves, controller.signal)
      if (controller.signal.aborted) return
      movesRef.current = hydrated
      setMoves(hydrated)
    } catch (caught) {
      if (isAbort(caught) || controller.signal.aborted) return
      if (movesRef.current?.length) setNotice("Couldn’t refresh just now.")
      else setError("The wire didn’t load.")
    } finally {
      if (!controller.signal.aborted) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const kickoff = window.setTimeout(() => {
      void load()
    }, 0)
    const timer = window.setInterval(() => void load(), 180_000)
    return () => {
      window.clearTimeout(kickoff)
      window.clearInterval(timer)
      abortRef.current?.abort()
    }
  }, [load])

  useEffect(() => {
    if (!pulseId) return
    const timer = window.setTimeout(() => setPulseId(null), 1600)
    return () => window.clearTimeout(timer)
  }, [pulseId])

  const visible = (moves ?? []).filter((move) => matches(move, filter, showMinors, teamId))
  const tickerItems = moves ? forTicker(visible, filter) : null
  const groups: { date: string; label: string; moves: Move[] }[] = []
  for (const move of visible) {
    const last = groups[groups.length - 1]
    if (!last || last.date !== move.date) groups.push({ date: move.date, label: dateLabel(move.date, today), moves: [move] })
    else last.moves.push(move)
  }

  function home() {
    setFilter("all")
    window.scrollTo({ top: 0, behavior: scrollBehavior() })
  }

  const closeSheet = useCallback(() => setSheet(null), [])

  function openMove(id: string) {
    setTab("moves")
    setOpenId(id)
    setPulseId(id)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(`move-${id}`)?.scrollIntoView({ behavior: scrollBehavior(), block: "center" })
      })
    })
  }

  return (
    <>
      <a className="skip" href={tab === "moves" ? "#wire" : `#${tab}`}>
        Skip to {tab}
      </a>
      <Ticker items={tickerItems} loading={moves === null && !error} onOpen={openMove} onHome={home} />
      <main id={tab === "moves" ? undefined : tab}>
        {tab === "feed" ? (
          <FeedView />
        ) : tab === "scores" ? (
          <ScoresView />
        ) : tab === "teams" ? (
          <TeamsView />
        ) : (
          <>
        <div className="head">
          <h1>Moves</h1>
          {updated ? (
            <button type="button" className="updated" onClick={() => void load()}>
              {refreshing ? "Updating…" : `Updated ${clockET(updated)}`}
            </button>
          ) : null}
        </div>
        <p className="lede">Trades, contracts, signings, and option decisions.</p>
        {notice ? <p className="notice" role="status">{notice}</p> : null}
        <div className="controls">
          <div className="segments" role="group" aria-label="Filter moves">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="segment"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <TeamFilter teamId={teamId} onChange={setTeamId} />
          <button
            type="button"
            className="minor-toggle"
            role="switch"
            aria-checked={showMinors}
            onClick={() => setShowMinors((value) => !value)}
          >
            <span className={showMinors ? "switch on" : "switch"} aria-hidden="true">
              <i />
            </span>
            Minor league deals
          </button>
        </div>

        <div id="wire">
          {error && !moves ? (
            <div className="error">
              <p>{error}</p>
              <button type="button" className="retry" onClick={() => void load()}>
                Try again
              </button>
            </div>
          ) : moves === null ? (
            <div className="list-skel" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : groups.length === 0 ? (
            <p className="empty">Nothing in this view from the last five weeks.</p>
          ) : (
            groups.map((group) => (
              <section className="group" key={group.date}>
                <h2>
                  {group.label}
                  <span>{group.moves.length}</span>
                </h2>
                <div className="card">
                  {group.moves.map((move) => (
                    <MoveRow
                      key={move.id}
                      move={move}
                      open={openId === move.id}
                      pulse={pulseId === move.id}
                      onToggle={() => setOpenId((current) => (current === move.id ? null : move.id))}
                      onReport={() => setSheet({ kind: "report", move })}
                      onPlayer={() => setSheet({ kind: "player", move })}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
        <footer>Jacob Talks MLB. Transaction log from MLB. Option decisions as reported by MLB Trade Rumors and MLB.com.</footer>
          </>
        )}
      </main>
      <div className="dock-row">
        <nav className="dock" aria-label="Sections">
        <button type="button" aria-pressed={tab === "moves"} onClick={() => setTab("moves")}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 4.5h12M2 8h12M2 11.5h8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Moves
        </button>
        <button
          type="button"
          aria-pressed={tab === "feed"}
          onClick={() => {
            setTab("feed")
            window.scrollTo({ top: 0, behavior: scrollBehavior() })
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <rect x="2" y="3" width="12" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M7 6.5 L11 8 L7 9.5 Z" fill="currentColor" />
          </svg>
          Feed
        </button>
        <button
          type="button"
          aria-pressed={tab === "scores"}
          onClick={() => {
            setTab("scores")
            setChampions((value) => value + 1)
            window.scrollTo({ top: 0, behavior: scrollBehavior() })
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <rect x="2" y="3" width="12" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 3v10M2 8h12" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          Scores
        </button>
        <button
          type="button"
          aria-pressed={tab === "teams"}
          onClick={() => {
            setTab("teams")
            window.scrollTo({ top: 0, behavior: scrollBehavior() })
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="5.5" cy="5" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="11" cy="5.5" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M1.8 13.2c.3-2 1.8-3.2 3.7-3.2s3.4 1.2 3.7 3.2M10 10.2c1.3.2 2.3 1.1 2.7 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Teams
        </button>
        </nav>
        <ProfileButton onOpen={() => setProfileOpen(true)} />
      </div>
      {champions > 0 ? <ChampionToast key={champions} onDone={() => setChampions(0)} /> : null}
      {profileOpen ? <ProfileSheet onClose={() => setProfileOpen(false)} /> : null}
      {sheet ? (
        <Sheet
          request={sheet}
          onClose={closeSheet}
          onShowPlayer={() => setSheet({ kind: "player", move: sheet.move })}
        />
      ) : null}
    </>
  )
}
