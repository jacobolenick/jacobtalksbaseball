import { useCallback, useEffect, useRef, useState } from "react"
import { feedWhen, loadFeed, type FeedItem, type FeedKind } from "./feed"
import { YouTubeFrame } from "./YouTube"

const FILTERS: { id: "all" | FeedKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "news", label: "News" },
  { id: "video", label: "Video" },
  { id: "short", label: "Shorts" },
]

function Cover({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return <img src={src} alt={alt} onError={() => setFailed(true)} />
}

function ShortCard({ item, onOpen }: { item: FeedItem; onOpen: (item: FeedItem) => void }) {
  return (
    <button type="button" className="short-card" onClick={() => onOpen(item)}>
      <span className="short-still">
        <Cover src={item.image} alt="" />
      </span>
      <span className="short-title">{item.title}</span>
    </button>
  )
}

function ShortRail({ items, onOpen }: { items: FeedItem[]; onOpen: (item: FeedItem) => void }) {
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
    const distance = Math.max(width, frame.clientWidth - width)
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    frame.scrollBy({ left: direction * distance, behavior: reduced ? "auto" : "smooth" })
  }

  return (
    <div className="rail-frame">
      <div className="rail" ref={scroller}>
        {items.map((item) => (
          <ShortCard key={item.id} item={item} onOpen={onOpen} />
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

function StoryCard({ item, onOpen }: { item: FeedItem; onOpen: (item: FeedItem) => void }) {
  const playable = Boolean(item.videoId)
  const body = (
    <>
      <Cover src={item.image} alt="" />
      <div className="story-body">
        <p className="kicker">{item.kind === "video" ? "Video" : "News"}</p>
        <h3>{item.title}</h3>
        {item.text ? <p>{item.text}</p> : null}
        <p className="meta">
          {[item.author && item.author !== item.source ? item.author : "", item.source, feedWhen(item.stamp)].filter(Boolean).join(" · ")}
        </p>
        {item.kind === "news" && item.url ? (
          <a className="story-link" href={item.url} target="_blank" rel="noopener noreferrer">
            Read on {item.source}
          </a>
        ) : null}
      </div>
    </>
  )
  if (!playable) return <article className="story">{body}</article>
  return (
    <button type="button" className="story" onClick={() => onOpen(item)}>
      {body}
    </button>
  )
}

function Player({ item, onClose }: { item: FeedItem; onClose: () => void }) {
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
        className={item.kind === "short" ? "sheet player short" : "sheet player"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2 L12 12 M12 2 L2 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <p className="sheet-source">{item.kind === "short" ? "Short" : "Video"} · {item.source}</p>
        <h2 id="player-title">{item.title}</h2>
        <div className="player-frame">
          <YouTubeFrame id={item.videoId ?? ""} title={item.title} />
        </div>
      </div>
    </div>
  )
}

export function FeedView() {
  const [items, setItems] = useState<FeedItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all")
  const [player, setPlayer] = useState<FeedItem | null>(null)
  const [attempt, setAttempt] = useState(0)
  const closePlayer = useCallback(() => setPlayer(null), [])

  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    loadFeed(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setItems(next)
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        if (!controller.signal.aborted) setError("The feed didn’t load.")
      })
    return () => controller.abort()
  }, [attempt])

  const shorts = (items ?? []).filter((item) => item.kind === "short")
  const stories = (items ?? []).filter((item) => item.kind !== "short")
  const visibleStories =
    filter === "all"
      ? [...stories.filter((item) => item.kind === "news").slice(0, 12), ...stories.filter((item) => item.kind === "video").slice(0, 6)].sort(
          (a, b) => b.stamp - a.stamp,
        )
      : stories.filter((item) => item.kind === filter)
  const visibleShorts = filter === "all" ? shorts.slice(0, 8) : shorts

  return (
    <>
      <div className="head">
        <h1>Feed</h1>
      </div>
      <p className="lede">News from MLB.com. Video and shorts from MLB, ESPN, and the clubs.</p>
      <div className="segments feed-segments" role="group" aria-label="Filter the feed">
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
      {error && !items ? (
        <div className="error">
          <p>{error}</p>
          <button type="button" className="retry" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : items === null ? (
        <div className="list-skel" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <>
          {filter === "all" && visibleShorts.length ? (
            <section className="rail-wrap">
              <h2>Shorts</h2>
              <ShortRail items={visibleShorts} onOpen={setPlayer} />
            </section>
          ) : null}
          {filter === "short" ? (
            <div className="short-grid">
              {shorts.map((item) => (
                <ShortCard key={item.id} item={item} onOpen={setPlayer} />
              ))}
            </div>
          ) : visibleStories.length ? (
            <div className="feed-list">
              {visibleStories.map((item) => (
                <StoryCard key={item.id} item={item} onOpen={setPlayer} />
              ))}
            </div>
          ) : (
            <p className="empty">Nothing in this view.</p>
          )}
        </>
      )}
      {player?.videoId ? <Player item={player} onClose={closePlayer} /> : null}
    </>
  )
}
