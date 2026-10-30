import { useCallback, useEffect, useRef, useState } from "react"
import { ATHLETICS, BONUS_PARKS, FAVORITE_PLAYERS, GREW_UP, PARKS } from "./about"
import banner from "./assets/banner.jpg"
import photo from "./assets/jacob.jpg"
import { DIVISIONS } from "./club"
import { formatViews, postedAgo } from "./feed"
import { clubById, headshot, teamLogo } from "./teams"
import { YouTubeFrame } from "./YouTube"

const LINKS = [
  { name: "Instagram", href: "https://www.instagram.com/jacobtalksbaseball/" },
  { name: "TikTok", href: "https://www.tiktok.com/@jacobtalksbaseball" },
  { name: "YouTube", href: "https://www.youtube.com/@jacobtalks-baseball" },
  { name: "X", href: "https://x.com/jtalksbaseball" },
  { name: "Facebook", href: "https://www.facebook.com/profile.php?id=61595596657892" },
]

type Clip = { id: string; title: string; published: string; views: number | null; length: string | null }

function poster(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

function clipMeta(clip: Clip, now: number): string {
  const when = postedAgo(clip.published, now)
  const views = clip.views === null ? "" : formatViews(clip.views)
  return [views, when].filter(Boolean).join(" · ")
}

async function loadClips(signal: AbortSignal): Promise<{ videos: Clip[]; shorts: Clip[] }> {
  const response = await fetch("/api/feed/jacob", { signal })
  if (!response.ok) throw new Error("Videos didn’t load.")
  const data: unknown = await response.json()
  const record = data !== null && typeof data === "object" ? (data as { videos?: unknown; shorts?: unknown }) : {}
  const clips = (value: unknown): Clip[] =>
    Array.isArray(value)
      ? value.flatMap((item) => {
          const row = item !== null && typeof item === "object" ? (item as { id?: unknown; title?: unknown; published?: unknown; views?: unknown; length?: unknown }) : {}
          if (typeof row.id !== "string" || typeof row.title !== "string") return []
          return [
            {
              id: row.id,
              title: row.title,
              published: typeof row.published === "string" ? row.published : "",
              views: typeof row.views === "number" && Number.isFinite(row.views) ? row.views : null,
              length: typeof row.length === "string" ? row.length : null,
            },
          ]
        })
      : []
  return { videos: clips(record.videos), shorts: clips(record.shorts) }
}

export function ProfileButton({ pressed, onOpen }: { pressed: boolean; onOpen: () => void }) {
  return (
    <a
      href="/jacob"
      className="profile-fab"
      aria-current={pressed ? "page" : undefined}
      aria-label="Jacob Olenick"
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
        event.preventDefault()
        onOpen()
      }}
    >
      <img src={photo} alt="" />
    </a>
  )
}

function People({ people, detail }: { people: { id: number; name: string; team?: string }[]; detail?: string }) {
  return (
    <div className="card">
      {people.map((person) => {
        const team = person.team ?? detail
        return (
          <div className="roster-row" key={person.id}>
            <img src={headshot(person.id)} alt="" width={44} height={44} />
            <span className="name">{person.name}</span>
            {team ? <span className="player-meta">{team}</span> : null}
          </div>
        )
      })}
    </div>
  )
}

function Check({ on }: { on: boolean }) {
  return (
    <span className={on ? "park-mark on" : "park-mark"} aria-hidden="true">
      {on ? (
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M2 6.2 L4.6 8.8 L10 3.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  )
}

function ClipPlayer({ clip, kind, onClose }: { clip: Clip; kind: "video" | "short"; onClose: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  return (
    <div className="sheet-root" onClick={onClose}>
      <div
        className={kind === "short" ? "sheet player short" : "sheet player"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="creator-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2 L12 12 M12 2 L2 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <p className="sheet-source">{kind === "short" ? "Short" : "Video"} · Jacob Talks Baseball</p>
        <h2 id="creator-title">{clip.title}</h2>
        <div className="player-frame">
          <YouTubeFrame id={clip.id} title={clip.title} />
        </div>
      </div>
    </div>
  )
}

function ShortRail({ items, onOpen }: { items: Clip[]; onOpen: (clip: Clip) => void }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const update = useCallback(() => {
    const frame = scroller.current
    if (!frame) return
    const max = frame.scrollWidth - frame.clientWidth
    setCanLeft(frame.scrollLeft > 4)
    setCanRight(max > 4 && frame.scrollLeft < max - 4)
  }, [])

  useEffect(() => {
    const frame = scroller.current
    if (!frame) return
    update()
    frame.addEventListener("scroll", update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(frame)
    return () => {
      frame.removeEventListener("scroll", update)
      observer.disconnect()
    }
  }, [update, items.length])

  function step(direction: -1 | 1) {
    const frame = scroller.current
    if (!frame) return
    const card = frame.querySelector(".short-card")
    const width = card instanceof HTMLElement ? card.offsetWidth + 12 : 144
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    frame.scrollBy({ left: direction * Math.max(width, frame.clientWidth - width), behavior: reduced ? "auto" : "smooth" })
  }

  return (
    <div className="rail-frame">
      <div className="rail" ref={scroller}>
        {items.map((clip) => (
          <button key={clip.id} type="button" className="short-card" onClick={() => onOpen(clip)}>
            <span className="short-still">
              <img src={poster(clip.id)} alt="" />
            </span>
            <span className="short-title">{clip.title}</span>
          </button>
        ))}
      </div>
      {canLeft ? (
        <button type="button" className="rail-arrow prev" aria-label="Previous shorts" onClick={() => step(-1)}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
      {canRight ? (
        <button type="button" className="rail-arrow next" aria-label="Next shorts" onClick={() => step(1)}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M5 2 L10 7 L5 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}

export function ProfilePage() {
  const [clips, setClips] = useState<{ videos: Clip[]; shorts: Clip[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [playing, setPlaying] = useState<{ clip: Clip; kind: "video" | "short" } | null>(null)
  const closePlayer = useCallback(() => setPlaying(null), [])
  const loaded = useRef(false)
  const parks = new Map(PARKS.map((park) => [park.teamId, park]))

  useEffect(() => {
    const controller = new AbortController()
    loadClips(controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return
        loaded.current = true
        setClips(next)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        if (!controller.signal.aborted && !loaded.current) setError("Videos didn’t load.")
      })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    const refresh = window.setInterval(() => setAttempt((value) => value + 1), 60_000)
    const clock = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => {
      window.clearInterval(refresh)
      window.clearInterval(clock)
    }
  }, [])

  return (
    <>
      <div className="profile-page">
        <img className="profile-banner" src={banner} alt="" />
        <img className="profile-photo" src={photo} alt="" />
        <h1>Jacob Olenick</h1>
        <p className="lede profile-bio">A baseball creator and fan of the game.</p>
        <div className="card social-card">
          {LINKS.map((link) => (
            <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer">
              <span>{link.name}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M4 10 L10 4 M6 4 H10 V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ))}
        </div>
      </div>

      <section className="group">
        <h2>Favorite team</h2>
        <div className="card">
          <div className="fav-row">
            <img src={teamLogo(ATHLETICS)} alt="" width={36} height={36} />
            <span className="name">A's</span>
          </div>
        </div>
      </section>

      <section className="group">
        <h2>Favorite players</h2>
        <People people={FAVORITE_PLAYERS} />
      </section>

      <section className="group">
        <h2>Favorite players growing up</h2>
        <People people={GREW_UP} />
      </section>

      <section className="group">
        <h2>Little league and high school</h2>
        <div className="card">
          <div className="staff-row">
            <span>Positions</span>
            <strong>Second base and outfield</strong>
          </div>
        </div>
      </section>

      <section className="group">
        <h2>Ballparks</h2>
        {DIVISIONS.map((division) => (
          <div key={division.id}>
            <p className="roster-label">{division.name}</p>
            <div className="card">
              {division.teams.map((id) => {
                const park = parks.get(id)
                const club = clubById(id)
                if (!park) return null
                return (
                  <div className="park-row" key={id}>
                    <Check on={park.been} />
                    <span>
                      <strong>{park.name}</strong>
                      <span className="park-club">{club?.nick}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <p className="roster-label">Bonus</p>
        <div className="card">
          {BONUS_PARKS.map((park) => (
            <div className="park-row" key={park.name}>
              <Check on />
              <span>
                <strong>{park.name}</strong>
                <span className="park-club">{park.club}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {error && !clips ? (
        <div className="error">
          <p>{error}</p>
          <button type="button" className="retry" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : null}
      {clips === null && !error ? (
        <div className="list-skel" aria-hidden="true">
          <span />
          <span />
        </div>
      ) : null}

      {clips ? (
        <section className="group">
          <h2>Shorts</h2>
          {clips.shorts.length > 0 ? <ShortRail items={clips.shorts} onOpen={(clip) => setPlaying({ clip, kind: "short" })} /> : <p className="empty">No shorts yet.</p>}
        </section>
      ) : null}

      {clips ? (
        <section className="group">
          <h2>Videos</h2>
          {clips.videos.length === 0 ? (
            <p className="empty">No videos yet.</p>
          ) : (
            <>
              <div className="feed-list">
                {(expanded ? clips.videos : clips.videos.slice(0, 4)).map((clip) => (
                  <button key={clip.id} type="button" className="clip-card" onClick={() => setPlaying({ clip, kind: "video" })}>
                    <img src={poster(clip.id)} alt="" />
                    <span className="clip-body">
                      <span className="clip-kicker">
                        <strong>Longform</strong>
                        {clip.length ? <span>{clip.length}</span> : null}
                      </span>
                      <span className="clip-title">{clip.title}</span>
                      {clipMeta(clip, now) ? <span className="clip-meta">{clipMeta(clip, now)}</span> : null}
                    </span>
                  </button>
                ))}
              </div>
              {clips.videos.length > 4 ? (
                <button type="button" className="view-more" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
                  {expanded ? "View less" : "View more"}
                </button>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {playing ? <ClipPlayer clip={playing.clip} kind={playing.kind} onClose={closePlayer} /> : null}
    </>
  )
}
