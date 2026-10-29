export type Club = {
  id: number
  abbr: string
  nick: string
  aliases: string[]
}

export const CLUBS: Club[] = [
  { id: 108, abbr: "LAA", nick: "Angels", aliases: ["angels"] },
  { id: 109, abbr: "AZ", nick: "D-backs", aliases: ["diamondbacks", "d-backs", "dbacks"] },
  { id: 110, abbr: "BAL", nick: "Orioles", aliases: ["orioles", "o's"] },
  { id: 111, abbr: "BOS", nick: "Red Sox", aliases: ["red sox"] },
  { id: 112, abbr: "CHC", nick: "Cubs", aliases: ["cubs"] },
  { id: 113, abbr: "CIN", nick: "Reds", aliases: ["reds"] },
  { id: 114, abbr: "CLE", nick: "Guardians", aliases: ["guardians"] },
  { id: 115, abbr: "COL", nick: "Rockies", aliases: ["rockies"] },
  { id: 116, abbr: "DET", nick: "Tigers", aliases: ["tigers"] },
  { id: 117, abbr: "HOU", nick: "Astros", aliases: ["astros"] },
  { id: 118, abbr: "KC", nick: "Royals", aliases: ["royals"] },
  { id: 119, abbr: "LAD", nick: "Dodgers", aliases: ["dodgers"] },
  { id: 120, abbr: "WSH", nick: "Nationals", aliases: ["nationals"] },
  { id: 121, abbr: "NYM", nick: "Mets", aliases: ["mets"] },
  { id: 133, abbr: "ATH", nick: "A's", aliases: ["athletics", "a's"] },
  { id: 134, abbr: "PIT", nick: "Pirates", aliases: ["pirates"] },
  { id: 135, abbr: "SD", nick: "Padres", aliases: ["padres"] },
  { id: 136, abbr: "SEA", nick: "Mariners", aliases: ["mariners"] },
  { id: 137, abbr: "SF", nick: "Giants", aliases: ["giants"] },
  { id: 138, abbr: "STL", nick: "Cardinals", aliases: ["cardinals"] },
  { id: 139, abbr: "TB", nick: "Rays", aliases: ["rays"] },
  { id: 140, abbr: "TEX", nick: "Rangers", aliases: ["rangers"] },
  { id: 141, abbr: "TOR", nick: "Blue Jays", aliases: ["blue jays", "jays"] },
  { id: 142, abbr: "MIN", nick: "Twins", aliases: ["twins"] },
  { id: 143, abbr: "PHI", nick: "Phillies", aliases: ["phillies"] },
  { id: 144, abbr: "ATL", nick: "Braves", aliases: ["braves"] },
  { id: 145, abbr: "CWS", nick: "White Sox", aliases: ["white sox"] },
  { id: 146, abbr: "MIA", nick: "Marlins", aliases: ["marlins"] },
  { id: 147, abbr: "NYY", nick: "Yankees", aliases: ["yankees"] },
  { id: 158, abbr: "MIL", nick: "Brewers", aliases: ["brewers"] },
]

const byId = new Map(CLUBS.map((club) => [club.id, club]))

export function clubById(id?: number): Club | undefined {
  if (!id) return undefined
  return byId.get(id)
}

function aliasPattern(alias: string): RegExp {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?=[^a-z0-9]|$)`, "i")
}

export function clubsIn(text: string): Club[] {
  const found: { club: Club; index: number }[] = []
  for (const club of CLUBS) {
    let index = -1
    for (const alias of club.aliases) {
      const match = aliasPattern(alias).exec(text)
      if (match && (index < 0 || match.index < index)) index = match.index
    }
    if (index >= 0) found.push({ club, index })
  }
  found.sort((a, b) => a.index - b.index)
  return found.map((entry) => entry.club)
}

export function clubFromLabel(label: string): Club | undefined {
  const exact = clubsIn(label)
  if (exact.length === 1) return exact[0]
  const folded = label.trim().toLowerCase()
  return CLUBS.find(
    (club) =>
      club.nick.toLowerCase() === folded ||
      club.aliases.some((alias) => alias === folded),
  )
}

export function teamLogo(id?: number): string | undefined {
  if (!id) return undefined
  return `https://www.mlbstatic.com/team-logos/${id}.svg`
}

export const mlbLogo = "https://www.mlbstatic.com/team-logos/league-on-light/1.svg"

export function headshot(id: number): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_180,q_auto:best/v1/people/${id}/headshot/67/current`
}
