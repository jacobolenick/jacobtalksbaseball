import { useEffect, useState } from "react"
import { teamsLede, type ForeignLeague } from "./league"
import { loadWorldClub, loadWorldTeams } from "./world"
import { recordLabel, type WorldDirectory, type WorldPlayer, type WorldRoster } from "./worldParse"

function Mark({ src, name, size }: { src: string; name: string; size: number }) {
  const [failed, setFailed] = useState(!src)
  if (!src || failed) {
    return (
      <span className="logo-fallback" style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.36)) }}>
        {name.slice(0, 1)}
      </span>
    )
  }
  return <img src={src} alt="" width={size} height={size} onError={() => setFailed(true)} />
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase()
}

function Face({ player }: { player: WorldPlayer }) {
  const [failed, setFailed] = useState(!player.photo)
  if (!player.photo || failed) {
    return (
      <span className="face">
        <span className="initials">{initials(player.name)}</span>
      </span>
    )
  }
  return <img src={player.photo} alt="" width={44} height={44} onError={() => setFailed(true)} />
}

function Honors({ league, id, directory }: { league: ForeignLeague; id: number; directory: WorldDirectory }) {
  const division = directory.honors.divisionIds.includes(id)
  const champion = directory.honors.championId === id
  if (!division && !champion) return null
  const divisionLabel = league === "npb" ? "League champions" : "Zone leaders"
  return (
    <span className="honors">
      {division ? <span className="chip">{divisionLabel}</span> : null}
      {champion && directory.honors.championLabel ? <span className="chip">{directory.honors.championLabel}</span> : null}
    </span>
  )
}

function ClubPage({
  league,
  directory,
  id,
  onBack,
}: {
  league: ForeignLeague
  directory: WorldDirectory
  id: number
  onBack: () => void
}) {
  const club = directory.divisions.flatMap((division) => division.teams).find((team) => team.id === id)
  const [roster, setRoster] = useState<WorldRoster | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setRoster(null)
    setError(null)
    loadWorldClub(league, id, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        const coaches = result.coaches.length ? result.coaches : club?.manager ? [{ id: club.id, name: club.manager, title: "Manager" }] : []
        setRoster({ coaches, groups: result.groups })
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted || (caught instanceof DOMException && caught.name === "AbortError")) return
        if (club?.manager) setRoster({ coaches: [{ id: club.id, name: club.manager, title: "Manager" }], groups: [] })
        else setError("The roster didn’t load.")
      })
    return () => controller.abort()
  }, [club, id, league, attempt])

  const place = [club?.city, club?.stadium].filter(Boolean).join(" · ")

  return (
    <>
      <button type="button" className="back" onClick={onBack}>
        <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
          <path d="M7.6.8 1.2 7l6.4 6.2 2.2-2.1L5.5 7l4.3-4.1z" />
        </svg>
        Teams
      </button>
      <div className="club-hero">
        <Mark src={club?.logo ?? ""} name={club?.nick ?? ""} size={64} />
        <div>
          <h1>{club?.nick}</h1>
          <Honors league={league} id={id} directory={directory} />
        </div>
      </div>
      {club ? (
        <p className="payroll">
          {recordLabel(club)}
          <span>{directory.season}</span>
        </p>
      ) : null}
      {place ? <p className="lede">{place}</p> : null}
      {error ? (
        <div className="error">
          <p>{error}</p>
          <button type="button" className="retry" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <section className="group">
            <h2>Coaching</h2>
            {roster === null ? (
              <div className="list-skel" aria-hidden="true">
                <span />
                <span />
              </div>
            ) : roster.coaches.length === 0 ? (
              <p className="empty">No coaching staff is listed.</p>
            ) : (
              <div className="card">
                {roster.coaches.map((coach) => (
                  <div className="staff-row" key={coach.id}>
                    <strong>{coach.name}</strong>
                    <span>{coach.title}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="group">
            <h2>Roster</h2>
            {roster === null ? (
              <div className="list-skel" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
            ) : roster.groups.length === 0 ? (
              <p className="empty">No active roster is listed.</p>
            ) : (
              roster.groups.map((group) => (
                <div key={group.label}>
                  <p className="roster-label">{group.label}</p>
                  <div className="card">
                    {group.players.map((player) => (
                      <div className="roster-row" key={player.id}>
                        <Face player={player} />
                        <span className="name">{player.name}</span>
                        <span className="player-meta">
                          {player.position}
                          {player.number ? ` · ${player.number}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </>
  )
}

export function WorldTeams({ league }: { league: ForeignLeague }) {
  const [directory, setDirectory] = useState<WorldDirectory | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    loadWorldTeams(league, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDirectory(result)
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        if (!controller.signal.aborted) setError("Teams didn’t load.")
      })
    return () => controller.abort()
  }, [attempt, league])

  function open(id: number) {
    setTeamId(id)
    window.scrollTo({ top: 0, behavior: "auto" })
  }

  function back() {
    setTeamId(null)
    window.scrollTo({ top: 0, behavior: "auto" })
  }

  if (directory && teamId) return <ClubPage league={league} directory={directory} id={teamId} onBack={back} />

  return (
    <>
      <div className="head">
        <h1>Teams</h1>
      </div>
      <p className="lede">{teamsLede(league)}</p>
      {error && !directory ? (
        <div className="error">
          <p>{error}</p>
          <button type="button" className="retry" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : directory === null ? (
        <div className="list-skel" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : (
        directory.divisions.map((division) => (
          <section className="group" key={division.id}>
            <h2>{division.name}</h2>
            <div className="card">
              {division.teams.map((team) => (
                <button key={team.id} type="button" className="team-row" onClick={() => open(team.id)}>
                  <Mark src={team.logo} name={team.nick} size={36} />
                  <span className="name">{team.nick}</span>
                  <span className="chip">{recordLabel(team)}</span>
                  {directory ? <Honors league={league} id={team.id} directory={directory} /> : null}
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  )
}
