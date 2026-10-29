import { useCallback, useEffect, useState } from "react"
import { dateLabel, todayISO } from "./dates"
import { loadGame, loadScores, seriesLabel, type GameDetail, type PitcherLine, type ScoreGame, type Starter } from "./scores"
import { teamLogo } from "./teams"
import { TeamFilter } from "./TeamFilter"
import { YouTubeFrame } from "./YouTube"

function Club({ id, name, score, win }: { id: number; name: string; score: number; win: boolean }) {
  return (
    <span className={win ? "score-side win" : "score-side"}>
      <img src={teamLogo(id)} alt="" width={28} height={28} />
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
          <li key={starter.id}>
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
            <tr key={pitcher.id}>
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

function GameSheet({ game, onClose }: { game: ScoreGame; onClose: () => void }) {
  const [detail, setDetail] = useState<GameDetail | null>(null)
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
    setDetail(null)
    loadGame(game, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setDetail(next)
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        if (!controller.signal.aborted) setError("This game didn’t load.")
      })
    return () => controller.abort()
  }, [game, attempt])

  const series = seriesLabel(game.gameType)
  const decision = [detail?.decisions.win ? `Win ${detail.decisions.win}` : "", detail?.decisions.loss ? `Loss ${detail.decisions.loss}` : "", detail?.decisions.save ? `Save ${detail.decisions.save}` : ""]
    .filter(Boolean)
    .join(" · ")

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
            ) : (
              <p className="sheet-empty">No MLB highlight is up for this game.</p>
            )}
            {detail.linescore ? (
              <div className="stat-block">
                <h3>Breakdown</h3>
                <div className="line-scroll">
                  <table className="lines">
                    <thead>
                      <tr>
                        <th />
                        {detail.linescore.innings.map((inning) => (
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
                        {detail.linescore.innings.map((inning) => (
                          <td key={inning.num}>{inning.away ?? ""}</td>
                        ))}
                        <td>{detail.linescore.away.runs}</td>
                        <td>{detail.linescore.away.hits}</td>
                        <td>{detail.linescore.away.errors}</td>
                      </tr>
                      <tr>
                        <th>{game.homeName}</th>
                        {detail.linescore.innings.map((inning) => (
                          <td key={inning.num}>{inning.home ?? ""}</td>
                        ))}
                        <td>{detail.linescore.home.runs}</td>
                        <td>{detail.linescore.home.hits}</td>
                        <td>{detail.linescore.home.errors}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {detail.box ? (
              <>
                <div className="stat-block">
                  <h3>Starters</h3>
                  <div className="split">
                    <Lineup title={game.awayName} starters={detail.box.away.starters} />
                    <Lineup title={game.homeName} starters={detail.box.home.starters} />
                  </div>
                </div>
                <div className="stat-block">
                  <h3>Pitchers</h3>
                  <div className="split">
                    <Pitchers title={game.awayName} pitchers={detail.box.away.pitchers} />
                    <Pitchers title={game.homeName} pitchers={detail.box.home.pitchers} />
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export function ScoresView() {
  const [games, setGames] = useState<ScoreGame[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<number | null>(null)
  const [selected, setSelected] = useState<ScoreGame | null>(null)
  const [attempt, setAttempt] = useState(0)
  const close = useCallback(() => setSelected(null), [])
  const today = todayISO()

  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    loadScores(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setGames(next)
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        if (!controller.signal.aborted) setError("Scores didn’t load.")
      })
    return () => controller.abort()
  }, [attempt])

  const visible = (games ?? []).filter((game) => !teamId || game.awayId === teamId || game.homeId === teamId)
  const groups: { date: string; label: string; games: ScoreGame[] }[] = []
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
      <p className="lede">{visible.length ? `${visible.length.toLocaleString("en-US")} finals from the 2026 season.` : "Finals from the 2026 season."}</p>
      <div className="controls">
        <TeamFilter teamId={teamId} onChange={setTeamId} />
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
                const series = seriesLabel(game.gameType)
                return (
                  <button
                    key={game.id}
                    type="button"
                    className="score-row"
                    onClick={() => setSelected(game)}
                    aria-label={`${game.awayName} ${game.awayScore}, ${game.homeName} ${game.homeScore}${series ? `, ${series}` : ""}`}
                  >
                    <span className="score-match">
                      <Club id={game.awayId} name={game.awayName} score={game.awayScore} win={game.awayScore > game.homeScore} />
                      <Club id={game.homeId} name={game.homeName} score={game.homeScore} win={game.homeScore > game.awayScore} />
                    </span>
                    {series ? <span className="chip">{series}</span> : null}
                  </button>
                )
              })}
            </div>
          </section>
        ))
      )}
      {selected ? <GameSheet game={selected} onClose={close} /> : null}
    </>
  )
}
