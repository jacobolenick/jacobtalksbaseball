import { todayISO } from "./dates"

export type StatCell = { label: string; value: string }

export type StatLine = {
  id: string
  heading: string
  teamId?: number
  cells: StatCell[]
}

export type PlayerProfile = {
  id: number
  name: string
  number?: string
  position: string
  bats: string
  throws: string
  height: string
  weight: string
  age?: number
  born: string
  debut?: string
  lines: StatLine[]
  draft?: string
}

type StatBag = Record<string, string | number | undefined>

type Split = {
  season?: string
  stat?: StatBag
  team?: { id?: number; name?: string }
}

type StatGroup = {
  type?: { displayName?: string }
  group?: { displayName?: string }
  splits?: Split[]
}

type Person = {
  fullName?: string
  primaryNumber?: string
  currentAge?: number
  height?: string
  weight?: number
  mlbDebutDate?: string
  birthCity?: string
  birthStateProvince?: string
  birthCountry?: string
  batSide?: { code?: string }
  pitchHand?: { code?: string }
  primaryPosition?: { abbreviation?: string; type?: string; name?: string }
  drafts?: {
    year?: string
    pickRound?: string
    school?: { name?: string }
    team?: { name?: string }
    isDrafted?: boolean
  }[]
}

function num(value: string | number | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function innings(value: string | number | undefined): number {
  const [whole, fraction = "0"] = String(value ?? "0").split(".")
  const thirds = fraction.startsWith("2") ? 2 / 3 : fraction.startsWith("1") ? 1 / 3 : 0
  return num(whole) + thirds
}

function whip(stat: StatBag): string {
  if (stat.whip !== undefined && stat.whip !== "") return String(stat.whip)
  const pitched = innings(stat.inningsPitched)
  if (!pitched) return "—"
  return ((num(stat.baseOnBalls) + num(stat.hits)) / pitched).toFixed(2)
}

function show(value: string | number | undefined): string {
  if (value === undefined || value === "") return "—"
  return String(value)
}

function pitchingCells(stat: StatBag): StatCell[] {
  const started = num(stat.gamesStarted)
  const saves = num(stat.saves)
  const reliever = started === 0 || (saves > 0 && started < 5)
  if (reliever) {
    return [
      { label: "G", value: show(stat.gamesPlayed) },
      { label: "ERA", value: show(stat.era) },
      { label: "IP", value: show(stat.inningsPitched) },
      { label: "SO", value: show(stat.strikeOuts) },
      { label: "WHIP", value: whip(stat) },
      { label: "SV", value: show(stat.saves) },
    ]
  }
  return [
    { label: "W-L", value: `${show(stat.wins)}-${show(stat.losses)}` },
    { label: "ERA", value: show(stat.era) },
    { label: "IP", value: show(stat.inningsPitched) },
    { label: "SO", value: show(stat.strikeOuts) },
    { label: "WHIP", value: whip(stat) },
    { label: "GS", value: show(stat.gamesStarted) },
  ]
}

function hittingCells(stat: StatBag): StatCell[] {
  return [
    { label: "AVG", value: show(stat.avg) },
    { label: "HR", value: show(stat.homeRuns) },
    { label: "RBI", value: show(stat.rbi) },
    { label: "OPS", value: show(stat.ops) },
    { label: "SB", value: show(stat.stolenBases) },
    { label: "G", value: show(stat.gamesPlayed) },
  ]
}

function usefulPitching(stat: StatBag, pitcher: boolean): boolean {
  const pitched = innings(stat.inningsPitched)
  if (!pitcher && pitched < 10) return false
  return pitched > 0 || num(stat.gamesPlayed) > 0
}

function usefulHitting(stat: StatBag): boolean {
  const appearances = num(stat.plateAppearances) || num(stat.atBats)
  if (appearances < 10) return false
  if (stat.avg === ".000" && num(stat.hits) === 0 && num(stat.homeRuns) === 0) return false
  return true
}

export function linesFromStats(groups: StatGroup[], pitcherFirst: boolean): StatLine[] {
  const lines: StatLine[] = []
  const order = pitcherFirst ? ["pitching"] : ["hitting", "pitching"]
  for (const groupName of order) {
    const season = groups.find(
      (group) =>
        group.group?.displayName?.toLowerCase() === groupName &&
        group.type?.displayName?.toLowerCase() === "season",
    )
    const career = groups.find(
      (group) =>
        group.group?.displayName?.toLowerCase() === groupName &&
        group.type?.displayName?.toLowerCase() === "career",
    )
    const useful = groupName === "pitching" ? (stat: StatBag) => usefulPitching(stat, pitcherFirst) : usefulHitting
    const cells = groupName === "pitching" ? pitchingCells : hittingCells
    for (const split of season?.splits ?? []) {
      if (!split.stat || !useful(split.stat)) continue
      const team = split.team?.name
      lines.push({
        id: `season-${groupName}-${split.team?.id ?? team ?? lines.length}`,
        heading: [split.season, team].filter(Boolean).join(" · "),
        teamId: split.team?.id,
        cells: cells(split.stat),
      })
    }
    const careerSplit = career?.splits?.find((split) => split.stat && useful(split.stat))
    if (careerSplit?.stat) {
      lines.push({
        id: `career-${groupName}`,
        heading: "Career",
        cells: cells(careerSplit.stat),
      })
    }
  }
  return lines
}

function positionLabel(person: Person): string {
  const pitcher = person.primaryPosition?.type === "Pitcher" || person.primaryPosition?.abbreviation === "P"
  if (pitcher) return person.pitchHand?.code === "L" ? "LHP" : "RHP"
  return person.primaryPosition?.abbreviation || person.primaryPosition?.name || "Player"
}

function born(person: Person): string {
  const region = person.birthCountry === "USA" ? person.birthStateProvince : person.birthCountry
  return [person.birthCity, region].filter(Boolean).join(", ")
}

function ordinal(value: string): string {
  const number = Number(value)
  if (!number) return value
  const mod = number % 100
  if (mod >= 11 && mod <= 13) return `${number}th`
  const last = number % 10
  if (last === 1) return `${number}st`
  if (last === 2) return `${number}nd`
  if (last === 3) return `${number}rd`
  return `${number}th`
}

function draftLine(person: Person): string | undefined {
  const draft = person.drafts?.find((entry) => entry.isDrafted !== false && entry.year)
  if (!draft?.year) return undefined
  const round = draft.pickRound ? `, ${ordinal(draft.pickRound)} round` : ""
  const team = draft.team?.name ? ` by the ${draft.team.name.replace(/^the /i, "")}` : ""
  const school = draft.school?.name ? ` out of ${draft.school.name}` : ""
  return `Drafted ${draft.year}${round}${team}${school}`
}

function longDate(iso?: string): string | undefined {
  if (!iso) return undefined
  const [year, month, day] = iso.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function profileFrom(person: Person, groups: StatGroup[]): PlayerProfile {
  const position = positionLabel(person)
  return {
    id: 0,
    name: person.fullName ?? "Player",
    number: person.primaryNumber,
    position,
    bats: person.batSide?.code ?? "—",
    throws: person.pitchHand?.code ?? "—",
    height: person.height ?? "—",
    weight: person.weight ? `${person.weight} lb` : "—",
    age: person.currentAge,
    born: born(person),
    debut: longDate(person.mlbDebutDate),
    lines: linesFromStats(groups, position === "LHP" || position === "RHP"),
    draft: draftLine(person),
  }
}

export async function loadProfile(id: number, signal: AbortSignal): Promise<PlayerProfile> {
  const year = todayISO().slice(0, 4)
  const [personResponse, statResponse] = await Promise.all([
    fetch(`https://statsapi.mlb.com/api/v1/people/${id}?hydrate=draft`, { signal }),
    fetch(
      `https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=season,career&group=hitting,pitching&season=${year}`,
      { signal },
    ),
  ])
  if (!personResponse.ok) throw new Error("Profile unavailable")
  const personJson = (await personResponse.json()) as { people?: Person[] }
  const person = personJson.people?.[0]
  if (!person) throw new Error("Profile unavailable")
  const statJson = statResponse.ok ? ((await statResponse.json()) as { stats?: StatGroup[] }) : { stats: [] }
  const profile = profileFrom(person, statJson.stats ?? [])
  profile.id = id
  return profile
}
