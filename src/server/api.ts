import { allowedArticleUrl, briefFromHtml, sourceName } from "../brief"
import { VIDEO_CHANNELS } from "../channels"
import { atomFromEntries, channelEntries, dateFromEtag, datedUploads, mergeUploads, postedWithin, uploadsFromChannel, type ChannelEntry } from "../feed"
import { videosFromYouTube } from "../scores"

export type ApiResult = {
  status: number
  headers: Record<string, string>
  body: string
}

const feedCache = new Map<string, { at: number; xml: string }>()

const youtubeClient = { clientName: "WEB", clientVersion: "2.20251021.00.00", hl: "en", gl: "US" }

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

const feeds: Record<string, string> = {
  "/api/feed/mlb": "https://www.mlb.com/feeds/news/rss.xml",
  "/api/feed/rumors": "https://www.mlbtraderumors.com/feed",
}

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

async function publishDates(ids: string[]): Promise<Map<string, string>> {
  const dates = new Map<string, string>()
  const queue = [...ids]
  const worker = async () => {
    while (queue.length) {
      const id = queue.shift()
      if (!id) return
      for (const file of ["frame0.jpg", "hqdefault.jpg"]) {
        try {
          const response = await fetch(`https://i.ytimg.com/vi/${id}/${file}`, {
            method: "HEAD",
            signal: AbortSignal.timeout(4000),
          })
          const published = dateFromEtag(response.headers.get("etag"))
          if (!published) continue
          dates.set(id, published)
          break
        } catch {
          continue
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(20, ids.length) }, worker))
  return dates
}

async function youtubeFeed(kind: "video" | "short"): Promise<string | null> {
  const cached = feedCache.get(kind)
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.xml
  const params = kind === "short" ? "EgZzaG9ydHPyBgUKA5oBAA==" : "EgZ2aWRlb3PyBgQKAjoA"
  const now = Date.now()
  let reached = false
  const groups = await Promise.all(
    VIDEO_CHANNELS.map(async (channel) => {
      try {
        const response = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": UA },
          body: JSON.stringify({
            context: { client: youtubeClient },
            browseId: channel.id,
            params,
          }),
          signal: AbortSignal.timeout(6000),
        })
        if (!response.ok) return []
        reached = true
        return uploadsFromChannel(channel, channelEntries(await response.json(), kind, now))
      } catch {
        return []
      }
    }),
  )
  if (!reached) return null
  let lists = groups
  if (kind === "short") {
    const ids = [...new Set(groups.flat().map((entry) => entry.id))]
    const dates = await publishDates(ids)
    lists = groups.map((group) => postedWithin(datedUploads(group, dates), 3, now))
  }
  const xml = atomFromEntries(mergeUploads(lists))
  feedCache.set(kind, { at: Date.now(), xml })
  return xml
}

const JACOB_CHANNEL = "UCNdzT3Xk9gRy613TC5wP6Kw"

async function browseChannel(channelId: string, kind: "video" | "short"): Promise<ChannelEntry[] | null> {
  const params = kind === "short" ? "EgZzaG9ydHPyBgUKA5oBAA==" : "EgZ2aWRlb3PyBgQKAjoA"
  try {
    const response = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ context: { client: youtubeClient }, browseId: channelId, params }),
      signal: AbortSignal.timeout(6000),
    })
    if (!response.ok) return null
    return channelEntries(await response.json(), kind, Date.now())
  } catch {
    return null
  }
}

function newest(entries: ChannelEntry[]): { id: string; title: string; published: string; views: number | null; length: string | null }[] {
  return [...entries]
    .sort((a, b) => b.published.localeCompare(a.published))
    .slice(0, 30)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      published: entry.published,
      views: entry.views ?? null,
      length: entry.length ?? null,
    }))
}

async function jacobFeed(): Promise<string | null> {
  const cached = feedCache.get("jacob")
  if (cached && Date.now() - cached.at < 30 * 1000) return cached.xml
  const [videos, shorts] = await Promise.all([
    browseChannel(JACOB_CHANNEL, "video"),
    browseChannel(JACOB_CHANNEL, "short"),
  ])
  if (!videos && !shorts) return null
  const body = JSON.stringify({ videos: newest(videos ?? []), shorts: newest(shorts ?? []) })
  feedCache.set("jacob", { at: Date.now(), xml: body })
  return body
}

export async function handleApi(rawUrl: string, options?: { cache?: boolean }): Promise<ApiResult | null> {
  const cache = options?.cache ?? false
  const path = rawUrl.split("?")[0]
  if (path === "/api/feed/videos" || path === "/api/feed/shorts") {
    const kind = path.endsWith("shorts") ? "short" : "video"
    try {
      const xml = await youtubeFeed(kind)
      if (xml === null) return reply(502, "text/plain; charset=utf-8", "Feed unavailable", cache)
      return reply(200, "application/xml; charset=utf-8", xml, cache)
    } catch {
      return reply(502, "text/plain; charset=utf-8", "Feed unavailable", cache)
    }
  }
  if (path === "/api/feed/jacob") {
    try {
      const body = await jacobFeed()
      if (body === null) return reply(502, "text/plain; charset=utf-8", "Feed unavailable", cache)
      return {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=30",
          "Netlify-CDN-Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
        },
        body,
      }
    } catch {
      return reply(502, "text/plain; charset=utf-8", "Feed unavailable", cache)
    }
  }
  if (path === "/api/highlight") {
    const query = new URL(rawUrl, "http://127.0.0.1").searchParams.get("q")?.trim() ?? ""
    if (!query || query.length > 160) return reply(400, "text/plain; charset=utf-8", "Unsupported search", cache)
    try {
      const response = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": UA },
        body: JSON.stringify({ context: { client: youtubeClient }, query }),
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) return reply(502, "text/plain; charset=utf-8", "Highlight unavailable", cache)
      const videos = videosFromYouTube(await response.json()).slice(0, 20)
      return reply(200, "application/json; charset=utf-8", JSON.stringify({ videos }), cache)
    } catch {
      return reply(502, "text/plain; charset=utf-8", "Highlight unavailable", cache)
    }
  }
  if (path === "/api/article") {
    const requested = new URL(rawUrl, "http://127.0.0.1").searchParams.get("url") ?? ""
    const targetUrl = allowedArticleUrl(requested)
    if (!targetUrl) return reply(400, "text/plain; charset=utf-8", "Unsupported article", cache)
    try {
      const response = await fetch(targetUrl, {
        headers: { Accept: "text/html", "User-Agent": UA },
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) return reply(502, "text/plain; charset=utf-8", "Article unavailable", cache)
      const brief = briefFromHtml(await response.text(), targetUrl)
      return reply(
        200,
        "application/json; charset=utf-8",
        JSON.stringify(brief ?? { title: "", summary: "", terms: [], source: sourceName(targetUrl) }),
        cache,
      )
    } catch {
      return reply(502, "text/plain; charset=utf-8", "Article unavailable", cache)
    }
  }
  const target = path ? feeds[path] : undefined
  if (!target) return null
  try {
    const response = await fetch(target, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml, */*", "User-Agent": UA },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return reply(502, "text/plain; charset=utf-8", "Feed unavailable", cache)
    return reply(200, "application/xml; charset=utf-8", await response.text(), cache)
  } catch {
    return reply(502, "text/plain; charset=utf-8", "Feed unavailable", cache)
  }
}
