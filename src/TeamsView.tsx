import { useEffect, useState } from "react"
import { loadClub, loadHonors, money, OFFICE, PAYROLL, DIVISIONS, type Coach, type Honors, type RosterGroup } from "./club"
import { clubById, headshot, teamLogo } from "./teams"

function Honors({ id, honors }: { id: number; honors: Honors | null }) {
  if (!honors) return null
  const division = honors.divisionIds.includes(id)
  const series = honors.worldSeriesId === id
  if (!division && !series) return null
  return (
    <span className="honors">
      {division ? <span className="chip">Division champs</span> : null}
      {series ? <span className="chip">World Series</span> : null}
    </span>
  )
}

function TeamList({ honors, onOpen }: { honors: Honors | null; onOpen: (id: number) => void }) {
  return (
    <>
      <div className="head">
        <h1>Teams</h1>
      </div>
      <p className="lede">Rosters, payroll, and the front office.</p>
      {DIVISIONS.map((division) => (
        <section className="group" key={division.id}>
          <h2>{division.name}</h2>
          <div className="card">
            {division.teams.map((id) => {
              const club = clubById(id)
              return (
                <button key={id} type="button" className="team-row" onClick={() => onOpen(id)}>
                  <img src={teamLogo(id)} alt="" width={36} height={36} />
                  <span className="name">{club?.nick}</span>
                  <Honors id={id} honors={honors} />
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}

function ClubPage({ id, honors, onBack }: { id: number; honors: Honors | null; onBack: () => void }) {
  const club = clubById(id)
  const office = OFFICE[id]
  const payroll = PAYROLL[id]
  const [groups, setGroups] = useState<RosterGroup[] | null>(null)
  const [coaches, setCoaches] = useState<Coach[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setGroups(null)
    setCoaches(null)
    setError(null)
    loadClub(id, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setGroups(result.groups)
        setCoaches(result.coaches)
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted || (caught instanceof DOMException && caught.name === "AbortError")) return
        setError("The roster didn’t load.")
      })
    return () => controller.abort()
  }, [id, attempt])

  return (
    <>
      <button type="button" className="back" onClick={onBack}>
        <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
          <path d="M7.6.8 1.2 7l6.4 6.2 2.2-2.1L5.5 7l4.3-4.1z" />
        </svg>
        Teams
      </button>
      <div className="club-hero">
        <img src={teamLogo(id)} alt="" width={64} height={64} />
        <div>
          <h1>{club?.nick}</h1>
          <Honors id={id} honors={honors} />
        </div>
      </div>
      {payroll ? (
        <p className="payroll">
          {money(payroll)}
          <span>2026 payroll</span>
        </p>
      ) : null}
      {office ? (
        <section className="group">
          <h2>Front office</h2>
          <div className="card">
            <div className="staff-row">
              <span>Owner</span>
              <strong>{office.owner}</strong>
            </div>
            <div className="staff-row">
              <span>{office.baseballTitle}</span>
              <strong>{office.baseball}</strong>
            </div>
          </div>
        </section>
      ) : null}
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
        {coaches === null ? (
          <div className="list-skel" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <div className="card">
            {coaches.map((coach) => (
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
        {groups === null ? (
          <div className="list-skel" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : groups.length === 0 ? (
          <p className="empty">No active roster is listed.</p>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <p className="roster-label">{group.label}</p>
              <div className="card">
                {group.players.map((player) => (
                  <div className="player" key={player.id}>
                    <img src={headshot(player.id)} alt="" width={44} height={44} />
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

export function TeamsView() {
  const [honors, setHonors] = useState<Honors | null>(null)
  const [teamId, setTeamId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    loadHonors(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setHonors(result)
      })
      .catch(() => {
        if (!controller.signal.aborted) setHonors({ divisionIds: [], worldSeriesId: null })
      })
    return () => controller.abort()
  }, [])

  function open(id: number) {
    setTeamId(id)
    window.scrollTo({ top: 0, behavior: "auto" })
  }

  function back() {
    setTeamId(null)
    window.scrollTo({ top: 0, behavior: "auto" })
  }

  if (teamId) return <ClubPage id={teamId} honors={honors} onBack={back} />
  return <TeamList honors={honors} onOpen={open} />
}
