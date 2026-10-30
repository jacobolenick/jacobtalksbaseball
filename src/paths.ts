export type PageTab = "moves" | "feed" | "scores" | "teams" | "profile"

const PATHS: Record<PageTab, string> = {
  moves: "/mlbmoves",
  feed: "/newsfeed",
  scores: "/scores",
  teams: "/teams",
  profile: "/jacob",
}

export function pathForTab(tab: PageTab): string {
  return PATHS[tab]
}

export function tabFromPath(pathname: string): PageTab {
  const path = pathname.replace(/\/+$/, "") || "/"
  const match = (Object.entries(PATHS) as [PageTab, string][]).find(([, value]) => value === path)
  return match?.[0] ?? "moves"
}
