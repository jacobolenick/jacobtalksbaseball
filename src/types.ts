export type Kind =
  | "trade"
  | "signing"
  | "contract"
  | "opt-out"
  | "staying"
  | "opt-in"
  | "option-exercised"
  | "option-declined"
  | "free-agency"
  | "claim"
  | "dfa"
  | "release"
  | "outright"

export type FilterId = "all" | "trade" | "signing" | "options" | "free-agency"

export type Move = {
  id: string
  date: string
  stamp: number
  playerName: string
  playerId?: number
  teamId?: number
  teamAbbr?: string
  teamIds: number[]
  kind: Kind
  chip: string
  detail: string
  blurb: string
  url?: string
  playerUrl?: string
  source: string
  minor: boolean
}
