import type { FeedItem } from "./feed"
import type { ForeignLeague } from "./league"
import type { BoxScore, Decisions, HighlightHit, Linescore } from "./scores"
import { highlightPick, type WorldClub, type WorldDirectory, type WorldGame, type WorldRoster } from "./worldParse"

export type WorldDetail = {
  linescore: Linescore | null
  box: BoxScore | null
  decisions: Decisions
}

export type WorldClubPage = WorldRoster & {
  club: WorldClub | null
}

async function readJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } })
  if (!response.ok) throw new Error("League data unavailable")
  return response.json() as Promise<T>
}

export function loadWorldScores(league: ForeignLeague, signal: AbortSignal): Promise<WorldGame[]> {
  return readJson<{ games: WorldGame[] }>(`/api/world/${league}/scores`, signal).then((body) => body.games)
}

export function loadWorldGame(league: ForeignLeague, id: number, signal: AbortSignal): Promise<WorldDetail> {
  return readJson<WorldDetail>(`/api/world/${league}/game?id=${id}`, signal)
}

export function loadWorldTeams(league: ForeignLeague, signal: AbortSignal): Promise<WorldDirectory> {
  return readJson<WorldDirectory>(`/api/world/${league}/teams`, signal)
}

export function loadWorldClub(league: ForeignLeague, id: number, signal: AbortSignal): Promise<WorldClubPage> {
  return readJson<WorldClubPage>(`/api/world/${league}/club?id=${id}`, signal)
}

export function loadWorldFeed(league: ForeignLeague, signal: AbortSignal): Promise<FeedItem[]> {
  return readJson<{ items: FeedItem[] }>(`/api/world/${league}/feed`, signal).then((body) => body.items)
}

export async function loadWorldHighlight(away: string, home: string, signal: AbortSignal): Promise<string | null> {
  const query = `${away} ${home} highlight`
  const response = await fetch(`/api/highlight?q=${encodeURIComponent(query)}`, { signal })
  if (!response.ok) return null
  const body = (await response.json()) as { videos?: HighlightHit[] }
  return highlightPick(body.videos ?? [], [away], [home])
}
