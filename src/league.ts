import { pathForTab, tabFromPath, type PageTab } from "./paths"

export type LeagueId = "mlb" | "npb" | "lmb" | "lidom"
export type ForeignLeague = Exclude<LeagueId, "mlb">

export type LeagueOption = {
  id: LeagueId
  short: string
  name: string
  detail: string
  logo: string
}

export const LEAGUES: LeagueOption[] = [
  { id: "mlb", short: "MLB", name: "MLB", detail: "Major League Baseball", logo: "https://www.mlbstatic.com/team-logos/league-on-light/1.svg" },
  { id: "npb", short: "NPB", name: "NPB", detail: "Japan · Central and Pacific", logo: "https://storage.googleapis.com/mlb-bdp-npb-static-images-prod/npb.png" },
  { id: "lmb", short: "LMB", name: "Mexican League", detail: "Liga Mexicana de Béisbol", logo: "https://lmb.com.mx/images/logo.png" },
  { id: "lidom", short: "LIDOM", name: "Dominican Republic", detail: "LIDOM winter league", logo: "https://lidom.com/resources/logos/512x512.png" },
]

const FOREIGN = new Set<string>(["npb", "lmb", "lidom"])

export function isForeignLeague(value: string): value is ForeignLeague {
  return value === "npb" || value === "lmb" || value === "lidom"
}

export function leagueOption(id: LeagueId): LeagueOption {
  return LEAGUES.find((league) => league.id === id) ?? LEAGUES[0]
}

export type Place = { league: LeagueId; tab: PageTab }

export function placePath(league: LeagueId, tab: PageTab): string {
  if (league === "mlb") return pathForTab(tab)
  if (tab === "feed") return `/${league}/feed`
  if (tab === "teams") return `/${league}/teams`
  return `/${league}/scores`
}

export function readPlace(pathname: string): Place {
  const path = pathname.replace(/\/+$/, "") || "/"
  const [first, second] = path.split("/").filter(Boolean)
  if (first && FOREIGN.has(first) && isForeignLeague(first)) {
    const tab: PageTab = second === "feed" || second === "newsfeed" ? "feed" : second === "teams" ? "teams" : "scores"
    return { league: first, tab }
  }
  return { league: "mlb", tab: tabFromPath(path) }
}

export function feedLede(league: LeagueId): string {
  if (league === "npb") return "News and video from NPB."
  if (league === "lmb") return "News and video from the Mexican League."
  if (league === "lidom") return "News and video from LIDOM."
  return "News from MLB.com. Video and shorts from MLB, ESPN, and the clubs."
}

export function scoresLede(league: ForeignLeague, count: number): string {
  const season = league === "lidom" ? "2026–27" : "2026"
  const name = league === "npb" ? "NPB" : league === "lmb" ? "Mexican League" : "LIDOM"
  if (!count) return `Finals from the ${season} ${name} season.`
  return `${count.toLocaleString("en-US")} finals from the ${season} ${name} season.`
}

export function teamsLede(league: ForeignLeague): string {
  if (league === "npb") return "Central League and Pacific League."
  if (league === "lmb") return "Norte and Sur, with the 2026 clubs."
  return "The six clubs of the Dominican winter league."
}
