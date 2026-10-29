import { chipFor, classifyAround, fold, isEditorial, isSectionLabel, slugify } from "./classify"
import { clubFromLabel, clubsIn, type Club } from "./teams"
import type { Kind, Move } from "./types"

export type Report = {
  title: string
  link: string
  date: string
  stamp: number
  categories: string[]
  text: string
  source: string
}

const NAME = "[\\p{L}][\\p{L}'’.-]*"
const FULL = `${NAME}(?:\\s+${NAME}){0,2}`

function uniqueClubs(clubs: (Club | undefined)[]): Club[] {
  const seen = new Set<number>()
  const result: Club[] = []
  for (const club of clubs) {
    if (!club || seen.has(club.id)) continue
    seen.add(club.id)
    result.push(club)
  }
  return result
}

function isPlayerLabel(label: string): boolean {
  if (!label || isSectionLabel(label) || clubFromLabel(label)) return false
  const words = label.trim().split(/\s+/)
  return words.length >= 1 && words.length <= 4 && /^[\p{L}]/u.test(label)
}

function blurbFor(text: string, player: string, title: string): string {
  const clean = text.replace(/\s*\.\.\.\s*$/, "").trim()
  const sentences = clean
    .split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
  const last = fold(player).split(" ").pop() ?? ""
  let start = sentences.findIndex((sentence) => fold(sentence).includes(last))
  if (start < 0) start = 0
  let chosen = sentences.slice(start, start + 2).join(" ")
  if (chosen.length < 40) chosen = title
  if (chosen.length > 460) chosen = `${chosen.slice(0, 440).replace(/\s+\S*$/, "")}...`
  return chosen
}

function present(
  kind: Kind,
  title: string,
  clubs: Club[],
  minor: boolean,
): { detail: string; logo?: Club } {
  const titled = clubsIn(title)
  const club = titled[0] ?? clubs[0]

  if (kind === "trade") {
    if (/acquir/i.test(title) && clubs.length >= 2) {
      return { detail: `${clubs[1].nick} → ${clubs[0].nick}`, logo: clubs[0] }
    }
    if (clubs.length >= 2) return { detail: `${clubs[0].nick} → ${clubs[1].nick}`, logo: clubs[1] }
    return { detail: club?.nick ?? "Trade", logo: club }
  }

  if (kind === "claim") {
    const claimer = titled[0] ?? clubs[0]
    const origin = clubs.find((entry) => entry.id !== claimer?.id)
    if (claimer && origin) return { detail: `${origin.nick} → ${claimer.nick}`, logo: claimer }
    return { detail: claimer?.nick ?? "Claimed", logo: claimer }
  }

  if (kind === "signing") {
    const deal = minor ? "Minor league contract" : "Major league contract"
    return { detail: club ? `${club.nick} · ${deal}` : deal, logo: club }
  }

  if (isOptionKind(kind)) {
    const line =
      kind === "staying" ? "Opt-out declined" : kind === "option-exercised" || kind === "option-declined" ? "Club option" : "Player option"
    return { detail: club ? `${club.nick} · ${line}` : line, logo: club }
  }

  return { detail: club?.nick ?? chipFor(kind), logo: club }
}

function isOptionKind(kind: Kind): boolean {
  return (
    kind === "opt-out" ||
    kind === "staying" ||
    kind === "opt-in" ||
    kind === "option-exercised" ||
    kind === "option-declined"
  )
}

function guessName(clause: string): string | null {
  const patterns = [
    new RegExp(
      `^(${FULL})\\s+(?:has |have )?(?:opts out|opted out|will not opt|declines|declined|to remain|opting|will exercise|exercises)\\b`,
      "iu",
    ),
    new RegExp(`\\bpick(?:s|ed)? up (${NAME})['’]s\\b`, "iu"),
    new RegExp(`\\b(${FULL})\\s+becomes?\\s+(?:a )?free agent\\b`, "iu"),
    new RegExp(`\\bon (${FULL})\\s*$`, "iu"),
    new RegExp(`\\bfor (?:[\\p{L}'’.-]+\\s+){0,3}(${NAME})\\s*$`, "iu"),
  ]
  for (const pattern of patterns) {
    const match = clause.match(pattern)
    const name = match?.[1]?.replace(/[,]+$/, "").trim()
    if (name && !clubFromLabel(name)) return name
  }
  return null
}

function moveFor(
  report: Report,
  player: string,
  kind: Kind,
  clubs: Club[],
): Move {
  const minor = kind === "signing" && /minor league/i.test(`${report.title} ${report.text}`)
  const view = present(kind, report.title, clubs, minor)
  const sourceSlug = report.source === "MLB.com" ? "mlbcom" : "mlbtr"
  return {
    id: `report-${sourceSlug}-${report.date}-${kind}-${slugify(player)}`,
    date: report.date,
    stamp: report.stamp,
    playerName: player,
    teamId: view.logo?.id,
    teamAbbr: view.logo?.abbr,
    teamIds: clubs.map((club) => club.id),
    kind,
    chip: chipFor(kind, minor),
    detail: view.detail,
    blurb: blurbFor(report.text, player, report.title),
    url: report.link,
    source: report.source,
    minor,
  }
}

export function movesFromReport(report: Report): Move[] {
  if (!report.title || isEditorial(report.title)) return []
  const clubs = uniqueClubs([
    ...report.categories.map((category) => clubFromLabel(category)),
    ...clubsIn(report.title),
  ])
  const players = report.categories.filter(isPlayerLabel)
  const blob = `${report.title}. ${report.text}`

  if (players.length) {
    const moves: Move[] = []
    const seen = new Set<string>()
    for (const player of players) {
      const kind = classifyAround(blob, player)
      if (!kind) continue
      const id = `${kind}-${fold(player)}`
      if (seen.has(id)) continue
      seen.add(id)
      moves.push(moveFor(report, player, kind, clubs))
    }
    return moves
  }

  return report.title
    .replace(/\s*\(source\)\s*$/i, "")
    .split(/\s*;\s*/)
    .flatMap((clause) => {
      const player = guessName(clause)
      if (!player) return []
      const kind = classifyAround(`${clause}. ${report.text}`, player)
      if (!kind) return []
      return [moveFor(report, player, kind, uniqueClubs([...clubs, ...clubsIn(clause)]))]
    })
}
