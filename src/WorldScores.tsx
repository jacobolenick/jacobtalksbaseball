import { useCallback, useEffect, useState } from "react"
import { dateLabel, todayISO } from "./dates"
import { scoresLede, type ForeignLeague } from "./league"
import type { BoxScore, Decisions, Linescore, PitcherLine, Starter } from "./scores"
import { TeamFilter } from "./TeamFilter"
import { loadWorldGame, loadWorldHighlight, loadWorldScores, type WorldDetail } from "./world"
import { clubsFor, seriesName, type WorldGame } from "./worldParse"
import { YouTubeFrame } from "./YouTube"

function Mark({ src, name, size }: { src: string; name: string; size: number }) {
  const [failed, setFailed] = useState(!src)
  if (!src || failed) {
    return (
      <span className="logo-fallback" style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) }}>
        {name.slice(0, 1)}
      </span>
    )
  }
  return <img src={src} alt="" width={size} height={size} onError={() => setFailed(true)} />
}

function Club({ name, score, win, logo }: { name: string; score: number; win: boolean; logo: string }) {
  return (
    <span className={win ? "score-side win" : "score-side"}>
      <Mark src={logo} name={name} size={28} />
      <span className="name">{name}</span>
      <span className="score-num">{score}</span>
    </span>
  )
}

function Lineup({ title, starters }: { title: string; starters: Starter[] }) {
  if (!starters.length) return null
  return (
    <div>
      <p className="side-label">{title}</p>
      <ol className="lineup">
        {starters.map((starter) => (
          <li key={`${starter.order}-${starter.name}`}>
            <span>{starter.name}</span>
            <span>{starter.pos}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Pitchers({ title, pitchers }: { title: string; pitchers: PitcherLine[] }) {
  if (!pitchers.length) return null
  return (
    <div>
      <p className="side-label">{title}</p>
      <table className="pitchers">
        <thead>
          <tr>
            <th>Pitcher</th>
            <th>IP</th>
            <th>H</th>
            <th>ER</th>
            <th>BB</th>
            <th>K</th>
          </tr>
        </thead>
        <tbody>
          {pitchers.map((pitcher) => (
            <tr key={`${pitcher.id}-${pitcher.name}`}>
              <td>
                {pitcher.name}
                {pitcher.started ? <span className="chip">SP</span> : null}
              </td>
              <td>{pitcher.ip}</td>
              <td>{pitcher.h}</td>
              <td>{pitcher.er}</td>
              <td>{pitcher.bb}</td>
              <td>{pitcher.k}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Lines({ game, linescore }: { game: WorldGame; linescore: Linescore }) {
  return (
    <div className="stat-block">
      <h3>Breakdown</h3>
      <div className="line-scroll">
        <table className="lines">
          <thead>
            <tr>
              <th />
              {linescore.innings.map((inning) => (
                <th key={inning.num}>{inning.num}</th>
              ))}
              <th>R</th>
              <th>H</th>
              <th>E</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>{game.awayName}</th>
              {linescore.innings.map((inning) => (
                <td key={inning.num}>{inning.away ?? ""}</td>
              ))}
              <td>{linescore.away.runs}</td>
              <td>{linescore.away.hits}</td>
              <td>{linescore.away.errors}</td>
            </tr>
            <tr>
              <th>{game.homeName}</th>
              {linescore.innings.map((inning) => (
                <td key={inning.num}>{inning.home ?? ""}</td>
              ))}
              <td>{linescore.home.runs}</td>
              <td>{linescore.home.hits}</td>
              <td>{linescore.home.errors}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GameSheet({ league, game, onClose }: { league: ForeignLeague; game: WorldGame; onClose: () => void }) {
  const [detail, setDetail] = useState<(WorldDetail & { videoId: string | null }) | null>(null)
  const [highlightReady, setHighlightReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

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

  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    setHighlightReady(false)
    setDetail(
      game.linescore || game.decisions
        ? { linescore: game.linescore ?? null, box: null, decisions: game.decisions ?? {}, videoId: null }
        : null,
    )
    loadWorldGame(league, game.id, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return
        setDetail({
          linescore: next.linescore ?? game.linescore ?? null,
          box: next.box,
          decisions: next.decisions.win || next.decisions.loss || next.decisions.save ? next.decisions : (game.decisions ?? {}),
          videoId: null,
        })
        return loadWorldHighlight(game.awayName, game.homeName, controller.signal).catch(() => null)
      })
      .then((videoId) => {
        if (controller.signal.aborted) return
        setHighlightReady(true)
        if (!videoId) return
        setDetail((current) => (current ? { ...current, videoId } : current))
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        if (!controller.signal.aborted && !game.linescore) setError("This game didn’t load.")
      })
    return () => controller.abort()
  }, [game, league, attempt])

  const series = seriesName(game.gameType)
  const decisions: Decisions = detail?.decisions ?? {}
  const decision = [decisions.win ? `Win ${decisions.win}` : "", decisions.loss ? `Loss ${decisions.loss}` : "", decisions.save ? `Save ${decisions.save}` : ""]
    .filter(Boolean)
    .join(" · ")
  const box: BoxScore | null = detail?.box ?? null
  const showStarters = Boolean(box && (box.away.starters.length || box.home.starters.length))
  const showPitchers = Boolean(box && (box.away.pitchers.length || box.home.pitchers.length))

  return (
    <div className="sheet-root" onClick={onClose}>
      <div className="sheet score-sheet" role="dialog" aria-modal="true" aria-labelledby="game-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2 L12 12 M12 2 L2 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <p className="sheet-source">{series || "Final"}</p>
        <h2 id="game-title">
          {game.awayName} {game.awayScore}, {game.homeName} {game.homeScore}
        </h2>
        {decision ? <p className="decision">{decision}</p> : null}
        {error ? (
          <div className="error">
            <p>{error}</p>
            <button type="button" className="retry" onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
          </div>
        ) : !detail ? (
          <div className="sheet-skel" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <>
            {detail.videoId ? (
              <div className="player-frame">
                <YouTubeFrame id={detail.videoId} title={`${game.awayName} at ${game.homeName} highlight`} />
              </div>
            ) : highlightReady ? (
              <p className="sheet-empty">No highlight is up for this game.</p>
            ) : null}
            {detail.linescore ? <Lines game={game} linescore={detail.linescore} /> : null}
            {showStarters && box ? (
              <div className="stat-block">
                <h3>Starters</h3>
                <div className="split">
                  <Lineup title={game.awayName} starters={box.away.starters} />
                  <Lineup title={game.homeName} starters={box.home.starters} />
                </div>
              </div>
            ) : null}
            {showPitchers && box ? (
              <div className="stat-block">
                <h3>Pitchers</h3>
                <div className="split">
                  <Pitchers title={game.awayName} pitchers={box.away.pitchers} />
                  <Pitchers title={game.homeName} pitchers={box.home.pitchers} />
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export function WorldScores({ league }: { league: ForeignLeague }) {
  const clubs = clubsFor(league)
  const logos = new Map(clubs.map((club) => [club.id, club.logo]))
  const [games, setGames] = useState<WorldGame[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<number | null>(null)
  const [selected, setSelected] = useState<WorldGame | null>(null)
  const [attempt, setAttempt] = useState(0)
  const close = useCallback(() => setSelected(null), [])
  const today = todayISO()

  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    loadWorldScores(league, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setGames(next)
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        if (!controller.signal.aborted) setError("Scores didn’t load.")
      })
    return () => controller.abort()
  }, [attempt, league])

  const visible = (games ?? []).filter((game) => !teamId || game.awayId === teamId || game.homeId === teamId)
  const groups: { date: string; label: string; games: WorldGame[] }[] = []
  for (const game of visible) {
    const last = groups[groups.length - 1]
    if (!last || last.date !== game.date) groups.push({ date: game.date, label: dateLabel(game.date, today), games: [game] })
    else last.games.push(game)
  }

  return (
    <>
      <div className="head">
        <h1>Scores</h1>
      </div>
      <p className="lede">{scoresLede(league, visible.length)}</p>
      <div className="controls">
        <TeamFilter teamId={teamId} onChange={setTeamId} clubs={clubs.map((club) => ({ id: club.id, nick: club.nick, logo: club.logo }))} />
      </div>
      {error && !games ? (
        <div className="error">
          <p>{error}</p>
          <button type="button" className="retry" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : games === null ? (
        <div className="list-skel" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : groups.length === 0 ? (
        <p className="empty">No games for this club.</p>
      ) : (
        groups.map((group) => (
          <section className="group" key={group.date}>
            <h2>
              {group.label}
              <span>{group.games.length}</span>
            </h2>
            <div className="card">
              {group.games.map((game) => {
                const series = seriesName(game.gameType)
                return (
                  <button
                    key={game.id}
                    type="button"
                    className={selected?.id === game.id ? "score-row selected" : "score-row"}
                    onClick={() => setSelected(game)}
                    aria-label={`${game.awayName} ${game.awayScore}, ${game.homeName} ${game.homeScore}${series ? `, ${series}` : ""}`}
                  >
                    <span className="score-match">
                      <Club name={game.awayName} score={game.awayScore} win={game.awayScore > game.homeScore} logo={logos.get(game.awayId) ?? ""} />
                      <Club name={game.homeName} score={game.homeScore} win={game.homeScore > game.awayScore} logo={logos.get(game.homeId) ?? ""} />
                    </span>
                    {series ? <span className="chip">{series}</span> : null}
                  </button>
                )
              })}
            </div>
          </section>
        ))
      )}
      {selected ? <GameSheet league={league} game={selected} onClose={close} /> : null}
    </>
  )
}
