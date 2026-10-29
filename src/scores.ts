import { allowedVideoAuthor } from "./channels"
import { clubById } from "./teams"

export type ScoreGame = {
  id: number
  date: string
  gameType: string
  awayId: number
  homeId: number
  awayName: string
  homeName: string
  awayScore: number
  homeScore: number
}

export type HighlightHit = {
  id: string
  title: string
  author: string
}

export type InningLine = {
  num: number
  away: number | null
  home: number | null
}

export type LineTotals = {
  runs: number
  hits: number
  errors: number
}

export type Linescore = {
  innings: InningLine[]
  away: LineTotals
  home: LineTotals
}

export type Starter = {
  id: number
  name: string
  pos: string
  order: number
}

export type PitcherLine = {
  id: number
  name: string
  started: boolean
  ip: string
  h: string
  er: string
  bb: string
  k: string
}

export type SideBox = {
  starters: Starter[]
  pitchers: PitcherLine[]
}

export type BoxScore = {
  away: SideBox
  home: SideBox
}

export type Decisions = {
  win?: string
  loss?: string
  save?: string
}

const SERIES: Record<string, string> = {
  F: "Wild Card",
  D: "Division Series",
  L: "Championship Series",
  W: "World Series",
}

export function seriesLabel(gameType: string): string {
  return SERIES[gameType] ?? ""
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function textStat(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "string" && value.trim()) return value.trim()
  return "—"
}

function sideName(id: number, fallback: string): string {
  return clubById(id)?.nick ?? fallback
}

export function gamesFromSchedule(data: unknown): ScoreGame[] {
  const root = asRecord(data)
  const dates = root?.dates
  if (!Array.isArray(dates)) return []
  const games: ScoreGame[] = []
  for (const day of dates) {
    const date = asRecord(day)
    const iso = typeof date?.date === "string" ? date.date : ""
    const list = date?.games
    if (!iso || !Array.isArray(list)) continue
    for (const item of list) {
      const game = asRecord(item)
      const id = num(game?.gamePk)
      const teams = asRecord(game?.teams)
      const away = asRecord(teams?.away)
      const home = asRecord(teams?.home)
      const awayTeam = asRecord(away?.team)
      const homeTeam = asRecord(home?.team)
      const awayId = num(awayTeam?.id)
      const homeId = num(homeTeam?.id)
      const awayScore = num(away?.score)
      const homeScore = num(home?.score)
      const state = asRecord(game?.status)
      const final = !state || state.abstractGameState === "Final" || state.abstractGameState === undefined
      if (!id || !awayId || !homeId || awayScore === null || homeScore === null || !final) continue
      if (state?.abstractGameState && state.abstractGameState !== "Final") continue
      games.push({
        id,
        date: iso,
        gameType: typeof game?.gameType === "string" ? game.gameType : "R",
        awayId,
        homeId,
        awayName: sideName(awayId, typeof awayTeam?.name === "string" ? awayTeam.name : "Away"),
        homeName: sideName(homeId, typeof homeTeam?.name === "string" ? homeTeam.name : "Home"),
        awayScore,
        homeScore,
      })
    }
  }
  return games.sort((a, b) => b.date.localeCompare(a.date) || a.id - b.id)
}

export function highlightQuery(away: string, home: string, iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  return `${away} vs. ${home} Game Highlights ${month}/${day}/${String(year).slice(2)} MLB`
}

function textOf(value: unknown): string {
  const record = asRecord(value)
  if (!record) return ""
  if (typeof record.simpleText === "string") return record.simpleText
  if (!Array.isArray(record.runs)) return ""
  return record.runs
    .map((run) => {
      const item = asRecord(run)
      return typeof item?.text === "string" ? item.text : ""
    })
    .join("")
}

export function videosFromYouTube(data: unknown): HighlightHit[] {
  const hits: HighlightHit[] = []
  const seen = new Set<string>()
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    const record = asRecord(node)
    if (!record) return
    const renderer = asRecord(record.videoRenderer)
    if (renderer) {
      const id = typeof renderer.videoId === "string" ? renderer.videoId : ""
      const title = textOf(renderer.title)
      const author = textOf(renderer.ownerText)
      if (id && title && !seen.has(id)) {
        seen.add(id)
        hits.push({ id, title, author })
      }
    }
    for (const value of Object.values(record)) walk(value)
  }
  walk(data)
  return hits
}

function mentions(title: string, names: string[]): boolean {
  const hay = title.toLowerCase()
  return names.some((name) => name && hay.includes(name.toLowerCase()))
}

function sameDay(token: string, month: number, day: number, year: number): boolean {
  const [m, d, y] = token.split("/")
  if (!m || !d || !y) return false
  const fullYear = y.length === 2 ? 2000 + Number(y) : Number(y)
  return Number(m) === month && Number(d) === day && fullYear === year
}

export function pickHighlight(hits: HighlightHit[], awayNames: string[], homeNames: string[], iso: string): string | null {
  const [year, month, day] = iso.split("-").map(Number)
  if (!year || !month || !day) return null
  const long = new Date(Date.UTC(year, month - 1, day))
    .toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })
    .toLowerCase()
  let best: { id: string; score: number } | null = null
  for (const hit of hits) {
    const title = hit.title.toLowerCase()
    if (!title.includes("highlight")) continue
    if (!mentions(title, awayNames) || !mentions(title, homeNames)) continue
    const slashDates = title.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) ?? []
    if (slashDates.length && !slashDates.some((token) => sameDay(token, month, day, year))) continue
    const longAt = title.indexOf(long)
    const longMatch = longAt >= 0 && !/\d/.test(title[longAt + long.length] ?? "")
    const dated = slashDates.some((token) => sameDay(token, month, day, year)) || longMatch
    if (!dated || !allowedVideoAuthor(hit.author)) continue
    let score = hit.author.trim().toLowerCase() === "mlb" ? 50 : 10
    if (title.includes("game highlights") || title.includes("full game")) score += 20
    if (/\binning\b|final out|react/.test(title)) score -= 30
    if (!best || score > best.score) best = { id: hit.id, score }
  }
  return best && best.score >= 20 ? best.id : null
}

function totals(value: unknown): LineTotals {
  const side = asRecord(value)
  return {
    runs: num(side?.runs) ?? 0,
    hits: num(side?.hits) ?? 0,
    errors: num(side?.errors) ?? 0,
  }
}

export function linescoreFromApi(data: unknown): Linescore | null {
  const root = asRecord(data)
  const innings = root?.innings
  const teams = asRecord(root?.teams)
  if (!Array.isArray(innings) || !teams) return null
  return {
    innings: innings.map((item) => {
      const inning = asRecord(item)
      return {
        num: num(inning?.num) ?? 0,
        away: num(asRecord(inning?.away)?.runs),
        home: num(asRecord(inning?.home)?.runs),
      }
    }),
    away: totals(teams.away),
    home: totals(teams.home),
  }
}

function sideBox(value: unknown): SideBox {
  const side = asRecord(value)
  const players = asRecord(side?.players) ?? {}
  const byId = new Map<number, Record<string, unknown>>()
  for (const entry of Object.values(players)) {
    const player = asRecord(entry)
    const person = asRecord(player?.person)
    const id = num(person?.id)
    if (player && id) byId.set(id, player)
  }
  const starters: Starter[] = []
  for (const player of byId.values()) {
    const order = typeof player.battingOrder === "string" ? Number(player.battingOrder) : NaN
    if (!Number.isFinite(order) || order % 100 !== 0) continue
    const person = asRecord(player.person)
    const id = num(person?.id)
    if (!id) continue
    starters.push({
      id,
      name: typeof person?.fullName === "string" ? person.fullName : "Player",
      pos: typeof asRecord(player.position)?.abbreviation === "string" ? String(asRecord(player.position)?.abbreviation) : "",
      order,
    })
  }
  starters.sort((a, b) => a.order - b.order)
  const ids = Array.isArray(side?.pitchers) ? side.pitchers : []
  const pitchers: PitcherLine[] = []
  for (const raw of ids) {
    const id = num(raw)
    const player = id ? byId.get(id) : undefined
    if (!id || !player) continue
    const person = asRecord(player.person)
    const pitching = asRecord(asRecord(player.stats)?.pitching) ?? {}
    pitchers.push({
      id,
      name: typeof person?.fullName === "string" ? person.fullName : "Pitcher",
      started: (num(pitching.gamesStarted) ?? 0) > 0,
      ip: textStat(pitching.inningsPitched),
      h: textStat(pitching.hits),
      er: textStat(pitching.earnedRuns),
      bb: textStat(pitching.baseOnBalls),
      k: textStat(pitching.strikeOuts),
    })
  }
  return { starters, pitchers }
}

export function boxFromApi(data: unknown): BoxScore | null {
  const teams = asRecord(asRecord(data)?.teams)
  if (!teams?.away || !teams.home) return null
  return { away: sideBox(teams.away), home: sideBox(teams.home) }
}

export function decisionsFromSchedule(data: unknown): Decisions {
  const dates = asRecord(data)?.dates
  const games = Array.isArray(dates) ? asRecord(dates[0])?.games : undefined
  const decisions = asRecord(Array.isArray(games) ? asRecord(games[0])?.decisions : undefined)
  const name = (value: unknown) => {
    const full = asRecord(value)?.fullName
    return typeof full === "string" ? full : undefined
  }
  return { win: name(decisions?.winner), loss: name(decisions?.loser), save: name(decisions?.save) }
}

function hitsFromApi(data: unknown): HighlightHit[] {
  const videos = asRecord(data)?.videos
  if (!Array.isArray(videos)) return []
  return videos.flatMap((item) => {
    const hit = asRecord(item)
    if (typeof hit?.id !== "string" || typeof hit.title !== "string") return []
    return [{ id: hit.id, title: hit.title, author: typeof hit.author === "string" ? hit.author : "" }]
  })
}

const SCHEDULE =
  "https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=2026&gameTypes=R,F,D,L,W&fields=dates,date,games,gamePk,gameType,status,abstractGameState,teams,away,home,team,id,name,score"

export async function loadScores(signal: AbortSignal): Promise<ScoreGame[]> {
  const response = await fetch(SCHEDULE, { signal })
  if (!response.ok) throw new Error("Scores didn’t load.")
  const games = gamesFromSchedule(await response.json())
  if (!games.length) throw new Error("Scores didn’t load.")
  return games
}

export type GameDetail = {
  videoId: string | null
  linescore: Linescore | null
  box: BoxScore | null
  decisions: Decisions
}

async function readJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error("Game unavailable")
  return response.json()
}

export async function loadGame(game: ScoreGame, signal: AbortSignal): Promise<GameDetail> {
  const away = clubById(game.awayId)
  const home = clubById(game.homeId)
  const query = highlightQuery(away?.nick ?? game.awayName, home?.nick ?? game.homeName, game.date)
  const [linescore, box, decisions, highlight] = await Promise.allSettled([
    readJson(`https://statsapi.mlb.com/api/v1/game/${game.id}/linescore`, signal),
    readJson(`https://statsapi.mlb.com/api/v1/game/${game.id}/boxscore`, signal),
    readJson(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&gamePk=${game.id}&hydrate=decisions`, signal),
    readJson(`/api/highlight?q=${encodeURIComponent(query)}`, signal),
  ])
  const hits = highlight.status === "fulfilled" ? hitsFromApi(highlight.value) : []
  const videoId = pickHighlight(
    hits,
    [away?.nick ?? game.awayName, ...(away?.aliases ?? [])],
    [home?.nick ?? game.homeName, ...(home?.aliases ?? [])],
    game.date,
  )
  const detail: GameDetail = {
    videoId,
    linescore: linescore.status === "fulfilled" ? linescoreFromApi(linescore.value) : null,
    box: box.status === "fulfilled" ? boxFromApi(box.value) : null,
    decisions: decisions.status === "fulfilled" ? decisionsFromSchedule(decisions.value) : {},
  }
  if (!detail.videoId && !detail.linescore && !detail.box) throw new Error("This game didn’t load.")
  return detail
}
