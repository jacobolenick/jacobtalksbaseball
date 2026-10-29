import { middayStamp } from "./dates"
import { chipFor, slugify } from "./classify"
import { clubById, type Club } from "./teams"
import type { Kind, Move } from "./types"

export type ApiTeam = { id?: number; name?: string }

export type ApiTransaction = {
  id: number
  date: string
  typeCode?: string
  description?: string
  person?: { id?: number; fullName?: string }
  fromTeam?: ApiTeam
  toTeam?: ApiTeam
}

function club(team?: ApiTeam): Club | undefined {
  return clubById(team?.id)
}

function arrow(from?: Club, to?: Club): string | undefined {
  if (from && to) return `${from.nick} → ${to.nick}`
  return undefined
}

function playerUrl(id: number, name: string): string {
  return `https://www.mlb.com/player/${slugify(name)}-${id}`
}

export function movesFromTransactions(transactions: ApiTransaction[]): Move[] {
  const seen = new Set<string>()
  const moves: Move[] = []

  for (const tx of transactions) {
    const name = tx.person?.fullName?.trim()
    const description = tx.description?.trim()
    if (!name || !description || !tx.date) continue

    const key = `${tx.person?.id ?? name}|${tx.date}|${tx.typeCode}|${description}`
    if (seen.has(key)) continue

    const from = club(tx.fromTeam)
    const to = club(tx.toTeam)
    const minor = /minor league/i.test(description)
    let kind: Kind | null = null

    switch (tx.typeCode) {
      case "TR":
        kind = "trade"
        break
      case "SFA":
        kind = "signing"
        break
      case "SE":
        kind = "contract"
        break
      case "DFA":
        kind = /elect/i.test(description) ? "free-agency" : "dfa"
        break
      case "DES":
        kind = "dfa"
        break
      case "CLW":
        kind = "claim"
        break
      case "REL":
        kind = "release"
        break
      case "OUT":
        kind = "outright"
        break
      default:
        kind = null
    }

    if (!kind) continue
    seen.add(key)

    const logo =
      kind === "outright" ? (from ?? to) : (to ?? from)
    const detail = detailFor(kind, from, to, minor, logo)
    const teamIds = [...new Set([from?.id, to?.id].filter((id): id is number => id != null))]

    moves.push({
      id: `tx-${tx.id}-${tx.person?.id ?? slugify(name)}`,
      date: tx.date,
      stamp: middayStamp(tx.date),
      playerName: name,
      playerId: tx.person?.id,
      teamId: logo?.id,
      teamAbbr: logo?.abbr,
      teamIds,
      kind,
      chip: chipFor(kind, minor),
      detail,
      blurb: description,
      playerUrl: tx.person?.id ? playerUrl(tx.person.id, name) : undefined,
      source: "MLB",
      minor,
    })
  }

  return moves
}

function detailFor(
  kind: Kind,
  from: Club | undefined,
  to: Club | undefined,
  minor: boolean,
  logo: Club | undefined,
): string {
  if (kind === "trade" || kind === "claim") return arrow(from, to) ?? logo?.nick ?? "Trade"
  if (kind === "signing") {
    const deal = minor ? "Minor league contract" : "Major league contract"
    return logo ? `${logo.nick} · ${deal}` : deal
  }
  if (kind === "contract") return logo ? `${logo.nick} · Roster contract` : "Roster contract"
  return logo?.nick ?? chipFor(kind)
}
