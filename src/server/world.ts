import type { FeedItem } from "../feed"
import { atomFromEntries, channelEntries, mergeUploads, uploadsFromChannel, videosFromAtom, type ChannelEntry } from "../feed"
import { videosFromYouTube } from "../scores"
import type { BoxScore, Decisions, Linescore, PitcherLine, Starter } from "../scores"
import {
  boxFromSides,
  clubByLeagueId,
  decisionsFromLidom,
  decisionsFromNpb,
  directoryFromGames,
  gamesFromLidomList,
  gamesFromLmb,
  gamesFromSpaia,
  lidomClub,
  lidomDates,
  linescoreFromLidom,
  linescoreFromNpb,
  lmbStories,
  npbGameUrl,
  npbStories,
  pitchersFromNpbBox,
  rosterFromLmb,
  rosterFromNpb,
  startersFromLidom,
  type WorldDirectory,
  type WorldGame,
  type WorldRoster,
} from "../worldParse"
import type { ApiResult } from "./api"

function reply(status: number, contentType: string, body: string, cache: boolean): ApiResult {
  const headers: Record<string, string> = { "Content-Type": contentType }
  if (cache && status < 400) {
    headers["Cache-Control"] = "public, max-age=60"
    headers["Netlify-CDN-Cache-Control"] = "public, s-maxage=300, stale-while-revalidate=600"
  } else {
    headers["Cache-Control"] = "no-store"
  }
  return { status, headers, body }
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

const youtubeClient = { clientName: "WEB", clientVersion: "2.20251021.00.00", hl: "en", gl: "US" }

const memory = new Map<string, { at: number; body: string }>()

const VIDEO_CHANNELS: Record<"lmb" | "lidom", { name: string; id: string }> = {
  lmb: { name: "LMB", id: "UCK2zXiKpzbIrooNi6oRBLvg" },
  lidom: { name: "LIDOM", id: "UCEqhcOIa_Z1uhbQmMb0lM2g" },
}

function remember<T>(key: string, maxAge: number, load: () => Promise<T>): Promise<T> {
  const cached = memory.get(key)
  if (cached && Date.now() - cached.at < maxAge) return Promise.resolve(JSON.parse(cached.body) as T)
  return load().then((value) => {
    memory.set(key, { at: Date.now(), body: JSON.stringify(value) })
    return value
  })
}

async function textFrom(url: string, timeout = 8000): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/json,*/*" },
    signal: AbortSignal.timeout(timeout),
  })
  if (!response.ok) throw new Error(`Request failed ${response.status}`)
  return response.text()
}

async function readPartial(url: string, until: (text: string) => boolean, max = 160_000): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok || !response.body) throw new Error(`Request failed ${response.status}`)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = ""
  while (text.length < max) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    if (until(text)) break
  }
  await reader.cancel().catch(() => undefined)
  return text
}

async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await task(items[index] as T)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function npbGames(): Promise<WorldGame[]> {
  return remember("npb-games", 10 * 60 * 1000, async () => {
    const response = await fetch("https://spaia.jp/baseball/npb/api/schedules?Year=2026", {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) throw new Error("NPB schedule unavailable")
    const games = gamesFromSpaia(await response.json())
    if (!games.length) throw new Error("NPB schedule unavailable")
    return games
  })
}

function mexicoStamp(iso: string, end: boolean): number {
  const [year, month, day] = iso.split("-").map(Number)
  return Date.UTC(year, month - 1, day, end ? 29 : 6, end ? 59 : 0, end ? 59 : 0)
}

function usDate(iso: string): string {
  const [year, month, day] = iso.split("-")
  return `${Number(month)}/${Number(day)}/${year}`
}

function isoList(data: unknown): string[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((item) => {
    if (typeof item !== "string") return []
    if (/^\d{4}-\d{2}-\d{2}$/.test(item)) return [item]
    const match = item.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    return match ? [`${match[3]}-${match[2]}-${match[1]}`] : []
  })
}

function usablePitchers(lines: PitcherLine[]): PitcherLine[] {
  return lines.filter((line) => line.name.length >= 1 && !/^\d+$/.test(line.name) && /^\d+(\.\d+)?$/.test(line.ip))
}

async function lmbWindow(start: string): Promise<unknown> {
  const url = `https://lmb.com.mx/juegos/api/calendar?date=${usDate(start)}&daysFromNow=1&startDate=${mexicoStamp(start, false)}&endDate=${mexicoStamp(start, true)}`
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", Referer: "https://lmb.com.mx/juegos" },
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) return { games_info: [] }
  return response.json()
}

async function lmbGames(): Promise<WorldGame[]> {
  return remember("lmb-games", 30 * 60 * 1000, async () => {
    const days: string[] = []
    let cursor = Date.parse("2026-04-16T00:00:00Z")
    const stop = Date.parse("2026-09-20T00:00:00Z")
    while (cursor <= stop) {
      days.push(new Date(cursor).toISOString().slice(0, 10))
      cursor += 86_400_000
    }
    const pages = await pool(days, 16, (day) => lmbWindow(day))
    const games = gamesFromLmb(pages)
    if (!games.length) throw new Error("Mexican League scores unavailable")
    return games
  })
}

async function lidomGames(): Promise<WorldGame[]> {
  return remember("lidom-games", 3 * 60 * 1000, async () => {
    const response = await fetch("http://estadisticas.lidom.com/Partido/SelectFechas", {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: "{}",
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error("LIDOM schedule unavailable")
    const dates = lidomDates(isoList(await response.json()), "2026-10-15", new Date().toISOString().slice(0, 10))
    const lists = await pool(dates, 6, async (iso) => {
      const [year, month, day] = iso.split("-")
      const fecha = `${day}/${month}/${year}`
      const page = await fetch(`http://estadisticas.lidom.com/Partido/PartidosFecha?fecha=${fecha}`, {
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: "{}",
        signal: AbortSignal.timeout(8000),
      })
      if (!page.ok) return []
      return gamesFromLidomList(await page.text(), iso).map((game) => ({ ...game, date: iso }))
    })
    const listed = lists.flat()
    const detailed = await pool(listed, 8, async (game) => {
      try {
        const html = await readPartial(
          `http://estadisticas.lidom.com/Partido/Detalle?idPartido=${game.id}`,
          (text) => text.includes('id="juego_1"') && /W:\s/.test(text),
        )
        const away = lidomClub(game.away)
        const home = lidomClub(game.home)
        if (!away || !home) return null
        const linescore = linescoreFromLidom(html, away.nick, home.nick)
        if (!linescore) return null
        const next: WorldGame = {
          id: game.id,
          date: game.date,
          gameType: "R",
          awayId: away.id,
          homeId: home.id,
          awayName: away.nick,
          homeName: home.nick,
          awayScore: linescore.away.runs,
          homeScore: linescore.home.runs,
          linescore,
          decisions: decisionsFromLidom(html),
        }
        return next
      } catch {
        return null
      }
    })
    const games = detailed.filter((game): game is WorldGame => Boolean(game))
    if (!games.length) throw new Error("LIDOM scores unavailable")
    return games.sort((a, b) => b.date.localeCompare(a.date) || a.id - b.id)
  })
}

async function gamesFor(league: "npb" | "lmb" | "lidom"): Promise<WorldGame[]> {
  if (league === "npb") return npbGames()
  if (league === "lmb") return lmbGames()
  return lidomGames()
}

async function youtubeSearch(query: string): Promise<{ id: string; title: string; author: string }[]> {
  const response = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ context: { client: youtubeClient }, query }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) return []
  return videosFromYouTube(await response.json())
}

async function channelFeed(channel: { name: string; id: string }, kind: "video" | "short"): Promise<ChannelEntry[]> {
  const params = kind === "short" ? "EgZzaG9ydHPyBgUKA5oBAA==" : "EgZ2aWRlb3PyBgQKAjoA"
  const response = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ context: { client: youtubeClient }, browseId: channel.id, params }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) return []
  return uploadsFromChannel(channel, channelEntries(await response.json(), kind, Date.now()), kind === "short" ? 8 : 6)
}

function videoItems(entries: ChannelEntry[], kind: "video" | "short"): FeedItem[] {
  return videosFromAtom(atomFromEntries(entries), kind)
}

async function feedFor(league: "npb" | "lmb" | "lidom"): Promise<FeedItem[]> {
  return remember(`feed-${league}`, 10 * 60 * 1000, async () => {
    const newsPromise =
      league === "npb"
        ? textFrom("https://npb.jp/games/2026/").then(npbStories).catch(() => [])
        : league === "lmb"
          ? textFrom("https://lmb.com.mx/noticias").then(lmbStories).catch(() => [])
          : Promise.resolve([])
    const query = league === "npb" ? "NPB プロ野球 ハイライト" : league === "lmb" ? "Liga Mexicana de Beisbol highlights" : "LIDOM resumen"
    const channel = league === "npb" ? null : VIDEO_CHANNELS[league]
    const [stories, search, videos, shorts] = await Promise.all([
      newsPromise,
      youtubeSearch(query),
      channel ? channelFeed(channel, "video") : Promise.resolve([]),
      channel ? channelFeed(channel, "short") : Promise.resolve([]),
    ])
    const now = Date.now()
    const news: FeedItem[] = stories.map((story, index) => ({
      id: `news-${story.url}`,
      kind: "news",
      title: story.title,
      text: "",
      url: story.url,
      stamp: now - index * 3_600_000,
      source: league === "npb" ? "NPB.jp" : league === "lmb" ? "LMB" : "LIDOM",
      author: "",
    }))
    const found: FeedItem[] = search.slice(0, 8).map((hit, index) => ({
      id: `video-${hit.id}`,
      kind: "video",
      title: hit.title,
      text: "",
      url: `https://www.youtube.com/watch?v=${hit.id}`,
      stamp: now - index * 1_800_000,
      source: hit.author || "YouTube",
      author: hit.author || "YouTube",
      image: `https://i.ytimg.com/vi/${hit.id}/hqdefault.jpg`,
      videoId: hit.id,
    }))
    const seen = new Set<string>()
    const items = [...news, ...found, ...videoItems(mergeUploads([videos]), "video"), ...videoItems(shorts, "short")].filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    if (!items.length) throw new Error("Feed unavailable")
    return items.sort((a, b) => b.stamp - a.stamp)
  })
}

function starterLine(name: string | undefined, id: number): Starter[] {
  if (!name) return []
  return [{ id, name, pos: "P", order: 1 }]
}

async function gameDetail(league: "npb" | "lmb" | "lidom", id: number): Promise<{ linescore: Linescore | null; box: BoxScore | null; decisions: Decisions }> {
  const games = await gamesFor(league)
  const game = games.find((item) => item.id === id)
  if (!game) throw new Error("Game unavailable")
  if (league === "lmb") {
    return {
      linescore: game.linescore ?? null,
      decisions: game.decisions ?? {},
      box: boxFromSides([], [], starterLine(game.awayStarter, 1), starterLine(game.homeStarter, 2)),
    }
  }
  if (league === "lidom") {
    const html = await textFrom(`http://estadisticas.lidom.com/Partido/Detalle?idPartido=${id}`, 12000)
    const orders = startersFromLidom(html)
    return {
      linescore: linescoreFromLidom(html, game.awayName, game.homeName) ?? game.linescore ?? null,
      decisions: decisionsFromLidom(html),
      box: boxFromSides([], [], orders.away, orders.home),
    }
  }
  const url = npbGameUrl(games, id)
  const [page, boxPage] = await Promise.all([
    url ? textFrom(url).catch(() => "") : Promise.resolve(""),
    url ? textFrom(`${url}box.html`).catch(() => "") : Promise.resolve(""),
  ])
  const pitching = pitchersFromNpbBox(boxPage)
  const awayPitchers = usablePitchers(pitching.away)
  const homePitchers = usablePitchers(pitching.home)
  if (awayPitchers[0]) awayPitchers[0].started = true
  if (homePitchers[0]) homePitchers[0].started = true
  return {
    linescore: linescoreFromNpb(page),
    decisions: decisionsFromNpb(page),
    box: boxFromSides(
      awayPitchers,
      homePitchers,
      awayPitchers.length ? [] : starterLine(game.awayStarter, 1),
      homePitchers.length ? [] : starterLine(game.homeStarter, 2),
    ),
  }
}

async function rosterFor(league: "npb" | "lmb" | "lidom", id: number): Promise<WorldRoster & { clubId: number }> {
  const club = clubByLeagueId(league, id)
  if (!club) throw new Error("Team unavailable")
  if (league === "npb") {
    const roster = rosterFromNpb(await textFrom(`https://npb.jp/bis/teams/rst_${club.code}.html`))
    return { clubId: id, ...roster }
  }
  if (league === "lmb") {
    const roster = rosterFromLmb(await textFrom(`https://lmb.com.mx/roster/${club.slug}`))
    const coaches = club.manager ? [{ id: club.id, name: club.manager, title: "Manager" }] : roster.coaches
    return { clubId: id, coaches, groups: roster.groups }
  }
  return { clubId: id, coaches: [], groups: [] }
}

export async function handleWorld(rawUrl: string, cache: boolean): Promise<ApiResult | null> {
  const url = new URL(rawUrl, "http://127.0.0.1")
  const parts = url.pathname.split("/").filter(Boolean)
  if (parts[0] !== "api" || parts[1] !== "world") return null
  const league = parts[2]
  const action = parts[3]
  if (league !== "npb" && league !== "lmb" && league !== "lidom") return reply(404, "text/plain; charset=utf-8", "Unknown league", false)
  try {
    if (action === "scores") {
      const games = await gamesFor(league)
      return reply(200, "application/json; charset=utf-8", JSON.stringify({ games }), cache)
    }
    if (action === "teams") {
      const games = await gamesFor(league)
      const directory: WorldDirectory = directoryFromGames(league, games, new Date().toISOString().slice(0, 10))
      return reply(200, "application/json; charset=utf-8", JSON.stringify(directory), cache)
    }
    if (action === "club") {
      const id = Number(url.searchParams.get("id"))
      if (!id) return reply(400, "text/plain; charset=utf-8", "Missing team", cache)
      const roster = await remember(`club-${league}-${id}`, 30 * 60 * 1000, () => rosterFor(league, id))
      const club = clubByLeagueId(league, id)
      return reply(200, "application/json; charset=utf-8", JSON.stringify({ club, ...roster }), cache)
    }
    if (action === "game") {
      const id = Number(url.searchParams.get("id"))
      if (!id) return reply(400, "text/plain; charset=utf-8", "Missing game", cache)
      const detail = await remember(`game-${league}-${id}`, 30 * 60 * 1000, () => gameDetail(league, id))
      return reply(200, "application/json; charset=utf-8", JSON.stringify(detail), cache)
    }
    if (action === "feed") {
      const items = await feedFor(league)
      return reply(200, "application/json; charset=utf-8", JSON.stringify({ items }), cache)
    }
  } catch {
    return reply(502, "text/plain; charset=utf-8", "League data unavailable", cache)
  }
  return reply(404, "text/plain; charset=utf-8", "Unknown league route", false)
}
