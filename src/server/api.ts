import { allowedArticleUrl, briefFromHtml, sourceName } from "../brief"
import { VIDEO_CHANNELS } from "../channels"
import { atomFromEntries, channelEntries, datedUploads, mergeUploads, postedWithin, uploadsFromChannel } from "../feed"
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
      try {
        const response = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": UA },
          body: JSON.stringify({ context: { client: youtubeClient }, videoId: id }),
          signal: AbortSignal.timeout(5000),
        })
        if (!response.ok) continue
        const data = (await response.json()) as { microformat?: { playerMicroformatRenderer?: { publishDate?: string } } }
        const published = data.microformat?.playerMicroformatRenderer?.publishDate
        if (published) dates.set(id, published)
      } catch {
        continue
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(16, ids.length) }, worker))
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
    if (ids.length && dates.size === 0) return null
    lists = groups.map((group) => postedWithin(datedUploads(group, dates), 3, now))
  }
  const xml = atomFromEntries(mergeUploads(lists))
  feedCache.set(kind, { at: Date.now(), xml })
  return xml
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
