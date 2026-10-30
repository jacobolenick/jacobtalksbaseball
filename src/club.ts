import { CLUBS } from "./teams"

export const SEASON = 2026

export type Division = {
  id: string
  name: string
  teams: number[]
}

export const DIVISIONS: Division[] = [
  { id: "al-east", name: "AL East", teams: [110, 111, 147, 139, 141] },
  { id: "al-central", name: "AL Central", teams: [145, 114, 116, 118, 142] },
  { id: "al-west", name: "AL West", teams: [117, 108, 133, 136, 140] },
  { id: "nl-east", name: "NL East", teams: [144, 146, 121, 143, 120] },
  { id: "nl-central", name: "NL Central", teams: [112, 113, 158, 134, 138] },
  { id: "nl-west", name: "NL West", teams: [109, 115, 119, 135, 137] },
]

export type Office = {
  owner: string
  baseball: string
  baseballTitle: string
}

const PBO = "President of baseball operations"
const GM = "General manager"

export const OFFICE: Record<number, Office> = {
  108: { owner: "Arte Moreno", baseball: "Perry Minasian", baseballTitle: GM },
  109: { owner: "Ken Kendrick", baseball: "Mike Hazen", baseballTitle: GM },
  110: { owner: "David Rubenstein", baseball: "Mike Elias", baseballTitle: GM },
  111: { owner: "John W. Henry", baseball: "Craig Breslow", baseballTitle: PBO },
  112: { owner: "Tom Ricketts", baseball: "Jed Hoyer", baseballTitle: PBO },
  113: { owner: "Bob Castellini", baseball: "Nick Krall", baseballTitle: PBO },
  114: { owner: "Paul Dolan", baseball: "Chris Antonetti", baseballTitle: PBO },
  115: { owner: "Dick and Charlie Monfort", baseball: "Paul DePodesta", baseballTitle: PBO },
  116: { owner: "Christopher Ilitch", baseball: "Scott Harris", baseballTitle: PBO },
  117: { owner: "Jim Crane", baseball: "Dana Brown", baseballTitle: GM },
  118: { owner: "John Sherman", baseball: "J.J. Picollo", baseballTitle: GM },
  119: { owner: "Mark Walter", baseball: "Andrew Friedman", baseballTitle: PBO },
  120: { owner: "Mark Lerner", baseball: "Paul Toboni", baseballTitle: PBO },
  121: { owner: "Steve Cohen", baseball: "David Stearns", baseballTitle: PBO },
  133: { owner: "John Fisher", baseball: "Taylor Smith", baseballTitle: PBO },
  134: { owner: "Robert Nutting", baseball: "Ben Cherington", baseballTitle: GM },
  135: { owner: "José E. Feliciano and Kwanza Jones", baseball: "A.J. Preller", baseballTitle: GM },
  136: { owner: "John Stanton", baseball: "Jerry Dipoto", baseballTitle: PBO },
  137: { owner: "Charles B. Johnson", baseball: "Buster Posey", baseballTitle: PBO },
  138: { owner: "Bill DeWitt Jr.", baseball: "Chaim Bloom", baseballTitle: PBO },
  139: { owner: "Patrick Zalupski", baseball: "Erik Neander", baseballTitle: PBO },
  140: { owner: "Ray Davis", baseball: "Chris Young", baseballTitle: PBO },
  141: { owner: "Rogers Communications", baseball: "Ross Atkins", baseballTitle: GM },
  142: { owner: "Jim Pohlad", baseball: "Derek Falvey", baseballTitle: PBO },
  143: { owner: "John Middleton", baseball: "Dave Dombrowski", baseballTitle: PBO },
  144: { owner: "Atlanta Braves Holdings", baseball: "Alex Anthopoulos", baseballTitle: GM },
  145: { owner: "Jerry Reinsdorf", baseball: "Chris Getz", baseballTitle: GM },
  146: { owner: "Bruce Sherman", baseball: "Peter Bendix", baseballTitle: PBO },
  147: { owner: "Hal Steinbrenner", baseball: "Brian Cashman", baseballTitle: GM },
  158: { owner: "Mark Attanasio", baseball: "Matt Arnold", baseballTitle: GM },
}

/** 2026 player payroll, in dollars. */
export const PAYROLL: Record<number, number> = {
  108: 182_509_023,
  109: 192_670_027,
  110: 167_039_211,
  111: 207_988_016,
  112: 249_319_956,
  113: 128_223_748,
  114: 74_459_014,
  115: 121_526_751,
  116: 202_081_991,
  117: 239_763_783,
  118: 150_429_892,
  119: 339_319_244,
  120: 101_639_888,
  121: 346_736_805,
  133: 98_948_812,
  134: 106_728_501,
  135: 218_252_715,
  136: 169_556_014,
  137: 190_174_131,
  138: 96_396_498,
  139: 95_615_469,
  140: 191_262_798,
  141: 276_130_679,
  142: 115_748_036,
  143: 291_951_676,
  144: 262_962_842,
  145: 103_330_141,
  146: 83_298_123,
  147: 308_336_780,
  158: 146_206_320,
}

export type Honors = {
  divisionIds: number[]
  worldSeriesId: number | null
}

export type Player = {
  id: number
  name: string
  position: string
  number: string
}

export type Coach = {
  id: number
  name: string
  title: string
}

export type RosterGroup = {
  label: string
  players: Player[]
}

const GROUPS: { label: string; positions: string[] }[] = [
  { label: "Pitchers", positions: ["P"] },
  { label: "Catchers", positions: ["C"] },
  { label: "Infielders", positions: ["1B", "2B", "3B", "SS"] },
  { label: "Outfielders", positions: ["LF", "CF", "RF", "OF"] },
  { label: "Designated hitter", positions: ["DH"] },
]

export function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function everyClubIsListed(): boolean {
  const listed = DIVISIONS.flatMap((division) => division.teams)
  if (listed.length !== CLUBS.length || new Set(listed).size !== CLUBS.length) return false
  return CLUBS.every((club) => OFFICE[club.id] && PAYROLL[club.id] > 0)
}

type SeriesGame = {
  awayId: number
  homeId: number
  awayScore: number
  homeScore: number
  final: boolean
}

export function seriesWinner(games: SeriesGame[]): number | null {
  const wins = new Map<number, number>()
  for (const game of games) {
    if (!game.final || game.awayScore === game.homeScore) continue
    const winner = game.awayScore > game.homeScore ? game.awayId : game.homeId
    wins.set(winner, (wins.get(winner) ?? 0) + 1)
  }
  let leader: number | null = null
  let lead = 0
  for (const [id, count] of wins) {
    if (count > lead) {
      leader = id
      lead = count
    }
  }
  return lead >= 4 ? leader : null
}

export function divisionWinnerIds(flags: { teamId: number; divisionChamp: boolean }[]): number[] {
  return flags.filter((team) => team.divisionChamp).map((team) => team.teamId)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function personName(value: unknown): { id: number; name: string } | null {
  const person = asRecord(value)
  const id = person?.id
  const name = person?.fullName
  if (typeof id !== "number" || typeof name !== "string" || !name) return null
  return { id, name }
}

export function coachesFromRoster(roster: unknown): Coach[] {
  if (!Array.isArray(roster)) return []
  const seen = new Set<number>()
  const coaches: Coach[] = []
  for (const row of roster) {
    const record = asRecord(row)
    const person = personName(record?.person)
    if (!person || seen.has(person.id)) continue
    seen.add(person.id)
    const title = record?.title
    const job = record?.job
    coaches.push({
      id: person.id,
      name: person.name,
      title: typeof title === "string" && title ? title : typeof job === "string" && job ? job : "Coach",
    })
  }
  coaches.sort((a, b) => Number(b.title === "Manager") - Number(a.title === "Manager"))
  return coaches
}

export function rosterGroups(roster: unknown): RosterGroup[] {
  if (!Array.isArray(roster)) return []
  const players: Player[] = []
  for (const row of roster) {
    const record = asRecord(row)
    const person = personName(record?.person)
    const position = asRecord(record?.position)
    const abbreviation = position?.abbreviation
    if (!person || typeof abbreviation !== "string") continue
    const number = record?.jerseyNumber
    players.push({
      id: person.id,
      name: person.name,
      position: abbreviation,
      number: typeof number === "string" ? number : "",
    })
  }
  players.sort((a, b) => a.name.localeCompare(b.name))
  const used = new Set<number>()
  const groups = GROUPS.map((group) => {
    const members = players.filter((player) => group.positions.includes(player.position))
    for (const player of members) used.add(player.id)
    return { label: group.label, players: members }
  }).filter((group) => group.players.length > 0)
  const rest = players.filter((player) => !used.has(player.id))
  if (rest.length) groups.push({ label: "Roster", players: rest })
  return groups
}

function honorsFromPayload(standings: unknown, schedule: unknown): Honors {
  const divisionIds: number[] = []
  const records = asRecord(standings)?.records
  if (Array.isArray(records)) {
    for (const record of records) {
      const teams = asRecord(record)?.teamRecords
      if (!Array.isArray(teams)) continue
      for (const team of teams) {
        const row = asRecord(team)
        const id = asRecord(row?.team)?.id
        if (row?.divisionChamp === true && typeof id === "number") divisionIds.push(id)
      }
    }
  }
  const games: SeriesGame[] = []
  const dates = asRecord(schedule)?.dates
  if (Array.isArray(dates)) {
    for (const date of dates) {
      const listed = asRecord(date)?.games
      if (!Array.isArray(listed)) continue
      for (const game of listed) {
        const row = asRecord(game)
        const sides = asRecord(row?.teams)
        const away = asRecord(sides?.away)
        const home = asRecord(sides?.home)
        const awayId = asRecord(away?.team)?.id
        const homeId = asRecord(home?.team)?.id
        const status = asRecord(row?.status)?.abstractGameState
        if (typeof awayId !== "number" || typeof homeId !== "number") continue
        if (typeof away?.score !== "number" || typeof home?.score !== "number") continue
        games.push({
          awayId,
          homeId,
          awayScore: away.score,
          homeScore: home.score,
          final: status === "Final",
        })
      }
    }
  }
  return { divisionIds, worldSeriesId: seriesWinner(games) }
}

async function readJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error("Club details didn’t load.")
  return response.json()
}

export async function loadHonors(signal: AbortSignal): Promise<Honors> {
  const [standings, schedule] = await Promise.all([
    readJson(
      `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=${SEASON}&standingsTypes=regularSeason`,
      signal,
    ),
    readJson(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=${SEASON}&gameType=W`, signal),
  ])
  return honorsFromPayload(standings, schedule)
}

export async function loadClub(teamId: number, signal: AbortSignal): Promise<{ groups: RosterGroup[]; coaches: Coach[] }> {
  const [active, staff] = await Promise.all([
    readJson(`https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=active&season=${SEASON}`, signal),
    readJson(`https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=coach&season=${SEASON}`, signal),
  ])
  return {
    groups: rosterGroups(asRecord(active)?.roster),
    coaches: coachesFromRoster(asRecord(staff)?.roster),
  }
}
