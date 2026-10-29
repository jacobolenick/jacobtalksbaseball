import { daysBetween, isoInNewYork, todayISO, addDays } from "./dates"
import { chipFor, kindsCompatible, rank, samePlayer, slugify } from "./classify"
import { movesFromReport, type Report } from "./headlines"
import { movesFromTransactions, type ApiTransaction } from "./transactions"
import type { Move } from "./types"

export type WireResult = {
  moves: Move[]
  transactionFailed: boolean
  storiesFailed: boolean
}

type PersonHit = { id: number; fullName: string; slug: string }

const playerCache = new Map<string, PersonHit | null>()

export function sortMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    const byRank = rank(a.kind) - rank(b.kind)
    if (byRank) return byRank
    if (a.stamp !== b.stamp) return b.stamp - a.stamp
    return a.playerName.localeCompare(b.playerName)
  })
}

function mergePair(tx: Move, story: Move): Move {
  const storyWins = rank(story.kind) < rank(tx.kind)
  const kind = storyWins ? story.kind : tx.kind
  const structured =
    tx.kind === "trade" || tx.kind === "claim" || tx.kind === "signing" || tx.kind === "contract"
  return {
    ...tx,
    kind,
    chip: chipFor(kind, tx.minor),
    detail: storyWins && !structured ? story.detail : tx.detail,
    teamId: storyWins && story.teamId ? story.teamId : (tx.teamId ?? story.teamId),
    teamAbbr: storyWins && story.teamAbbr ? story.teamAbbr : (tx.teamAbbr ?? story.teamAbbr),
    teamIds: [...new Set([...tx.teamIds, ...story.teamIds])],
    blurb: story.blurb.length > tx.blurb.length ? story.blurb : tx.blurb,
    url: story.url ?? tx.url,
    source: `${tx.source} · ${story.source}`,
  }
}

export function assemble(transactions: Move[], reports: Move[]): Move[] {
  const used = new Set<string>()
  const merged = transactions.map((tx) => {
    const story = reports.find(
      (report) =>
        !used.has(report.id) &&
        samePlayer(report.playerName, tx.playerName) &&
        daysBetween(report.date, tx.date) <= 2 &&
        kindsCompatible(report.kind, tx.kind),
    )
    if (!story) return tx
    used.add(story.id)
    return mergePair(tx, story)
  })

  const extras: Move[] = []
  for (const report of reports) {
    if (used.has(report.id)) continue
    const covered = [...merged, ...extras].some(
      (move) =>
        samePlayer(move.playerName, report.playerName) &&
        daysBetween(move.date, report.date) <= 2 &&
        kindsCompatible(move.kind, report.kind),
    )
    if (!covered) extras.push(report)
  }

  return sortMoves([...merged, ...extras])
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#8217;|&rsquo;|[’‘]/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|[“”]/g, '"')
    .replace(/&#038;|&amp;/g, "&")
    .replace(/&#8230;|&hellip;|…/g, "...")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

function childText(parent: Element, name: string): string {
  for (const child of parent.children) {
    if (child.localName === name) return child.textContent?.trim() ?? ""
  }
  return ""
}

function childTexts(parent: Element, name: string): string[] {
  const values: string[] = []
  for (const child of parent.children) {
    if (child.localName === name) values.push(child.textContent?.trim() ?? "")
  }
  return values.filter(Boolean)
}

export function parseRss(xml: string, source: string): Report[] {
  if (!xml.includes("<item")) return []
  const doc = new DOMParser().parseFromString(xml, "text/xml")
  if (doc.querySelector("parsererror")) return []
  const reports: Report[] = []

  for (const item of doc.querySelectorAll("item")) {
    const title = childText(item, "title")
    const link = childText(item, "link") || childText(item, "guid")
    const published = new Date(childText(item, "pubDate"))
    if (!title || Number.isNaN(published.getTime())) continue
    const encoded = stripHtml(childText(item, "encoded"))
    const description = stripHtml(childText(item, "description"))
    reports.push({
      title,
      link,
      date: isoInNewYork(published),
      stamp: published.getTime(),
      categories: childTexts(item, "category"),
      text: encoded.length > description.length ? encoded : description,
      source,
    })
  }

  return reports
}

async function readText(url: string, signal: AbortSignal): Promise<string | null> {
  try {
    const timeout = AbortSignal.timeout(12000)
    const response = await fetch(url, {
      signal: AbortSignal.any([signal, timeout]),
      headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" },
    })
    if (!response.ok) return null
    const text = await response.text()
    return text.includes("<item") ? text : null
  } catch (error) {
    if (signal.aborted) throw error
    return null
  }
}

async function loadTransactions(signal: AbortSignal): Promise<ApiTransaction[] | null> {
  const end = todayISO()
  const start = addDays(end, -35)
  const url = `https://statsapi.mlb.com/api/v1/transactions?sportId=1&startDate=${start}&endDate=${end}`
  try {
    const timeout = AbortSignal.timeout(12000)
    const response = await fetch(url, { signal: AbortSignal.any([signal, timeout]) })
    if (!response.ok) return null
    const data = (await response.json()) as { transactions?: ApiTransaction[] }
    return data.transactions ?? []
  } catch (error) {
    if (signal.aborted) throw error
    return null
  }
}

export async function loadWire(signal: AbortSignal): Promise<WireResult> {
  const [transactions, rumorsXml, newsXml] = await Promise.all([
    loadTransactions(signal),
    readText("/api/feed/rumors", signal),
    readText("/api/feed/mlb", signal),
  ])

  const transactionFailed = transactions === null
  const storiesFailed = !rumorsXml && !newsXml
  const reports = [
    ...(rumorsXml ? parseRss(rumorsXml, "MLB Trade Rumors") : []),
    ...(newsXml ? parseRss(newsXml, "MLB.com") : []),
  ]
  const moves = assemble(
    movesFromTransactions(transactions ?? []),
    reports.flatMap((report) => movesFromReport(report)),
  )

  if (!moves.length && (transactionFailed || storiesFailed)) {
    throw new Error("The wire didn’t load.")
  }

  return { moves, transactionFailed, storiesFailed }
}

type ApiPerson = { id: number; fullName: string; nameSlug?: string; active?: boolean }

async function searchPlayer(name: string, signal: AbortSignal): Promise<PersonHit | null> {
  const key = name
  if (playerCache.has(key)) return playerCache.get(key) ?? null
  const response = await fetch(
    `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(name)}`,
    { signal },
  )
  if (!response.ok) return null
  const data = (await response.json()) as { people?: ApiPerson[] }
  const people = data.people ?? []
  const wanted = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, " ")
    .trim()
  const last = wanted.split(" ").pop()
  const sameLast = people.filter((person) =>
    person.fullName
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .endsWith(last ?? ""),
  )
  const exact = sameLast.filter((person) => {
    const folded = person.fullName
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9']+/g, " ")
      .trim()
    return folded === wanted
  })
  const pool = exact.length ? exact : sameLast
  const pick = pool.find((person) => person.active) ?? pool[0]
  if (!pick) {
    playerCache.set(key, null)
    return null
  }
  const slug = pick.nameSlug || slugify(pick.fullName)
  const hit = {
    id: pick.id,
    fullName: pick.fullName,
    slug: slug.endsWith(String(pick.id)) ? slug : `${slug}-${pick.id}`,
  }
  playerCache.set(key, hit)
  return hit
}

async function pool<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let index = 0
  async function worker() {
    while (index < items.length) {
      const current = items[index]
      index += 1
      await task(current)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
}

export async function hydratePlayers(moves: Move[], signal: AbortSignal): Promise<Move[]> {
  const names = [
    ...new Set(
      moves
        .filter((move) => !move.playerId && move.playerName.trim().split(/\s+/).length >= 2)
        .map((move) => move.playerName),
    ),
  ].slice(0, 24)

  const found = new Map<string, PersonHit>()
  try {
    await pool(names, 4, async (name) => {
      const hit = await searchPlayer(name, signal)
      if (hit) found.set(name, hit)
    })
  } catch (error) {
    if (signal.aborted) throw error
    return moves
  }

  if (!found.size) return moves
  return moves.map((move) => {
    const hit = found.get(move.playerName)
    if (!hit || move.playerId) return move
    return {
      ...move,
      playerId: hit.id,
      playerName: hit.fullName || move.playerName,
      playerUrl: `https://www.mlb.com/player/${hit.slug}`,
    }
  })
}
