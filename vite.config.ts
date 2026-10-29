import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { allowedArticleUrl, briefFromHtml, sourceName } from "./src/brief"
import { VIDEO_CHANNELS } from "./src/channels"
import { atomFromEntries, channelEntries, datedUploads, mergeUploads, postedWithin, uploadsFromChannel } from "./src/feed"
import { videosFromYouTube } from "./src/scores"

const feedCache = new Map<string, { at: number; xml: string }>()

const youtubeClient = { clientName: "WEB", clientVersion: "2.20251021.00.00", hl: "en", gl: "US" }

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
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          body: JSON.stringify({ context: { client: youtubeClient }, videoId: id }),
          signal: AbortSignal.timeout(8000),
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
  await Promise.all(Array.from({ length: Math.min(8, ids.length) }, worker))
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
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          body: JSON.stringify({
            context: { client: youtubeClient },
            browseId: channel.id,
            params,
          }),
          signal: AbortSignal.timeout(12000),
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

const feeds: Record<string, string> = {
  "/api/feed/mlb": "https://www.mlb.com/feeds/news/rss.xml",
  "/api/feed/rumors": "https://www.mlbtraderumors.com/feed",
}

function mlbFeeds(): Plugin {
  const attach = (middlewares: { use: (handler: (req: { url?: string }, res: NodeResponse, next: () => void) => void) => void }) => {
    middlewares.use(async (req, res, next) => {
      const raw = req.url ?? ""
      const path = raw.split("?")[0]
      if (path === "/api/feed/videos" || path === "/api/feed/shorts") {
        const kind = path.endsWith("shorts") ? "short" : "video"
        try {
          const xml = await youtubeFeed(kind)
          if (xml === null) {
            res.statusCode = 502
            res.end("Feed unavailable")
            return
          }
          res.setHeader("Content-Type", "application/xml; charset=utf-8")
          res.setHeader("Cache-Control", "no-store")
          res.end(xml)
        } catch {
          res.statusCode = 502
          res.end("Feed unavailable")
        }
        return
      }
      if (path === "/api/highlight") {
        const query = new URL(raw, "http://127.0.0.1").searchParams.get("q")?.trim() ?? ""
        if (!query || query.length > 160) {
          res.statusCode = 400
          res.end("Unsupported search")
          return
        }
        try {
          const response = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            },
            body: JSON.stringify({
              context: { client: { clientName: "WEB", clientVersion: "2.20251021.00.00", hl: "en", gl: "US" } },
              query,
            }),
            signal: AbortSignal.timeout(12000),
          })
          if (!response.ok) {
            res.statusCode = 502
            res.end("Highlight unavailable")
            return
          }
          const videos = videosFromYouTube(await response.json()).slice(0, 20)
          res.setHeader("Content-Type", "application/json; charset=utf-8")
          res.setHeader("Cache-Control", "no-store")
          res.end(JSON.stringify({ videos }))
        } catch {
          res.statusCode = 502
          res.end("Highlight unavailable")
        }
        return
      }
      if (path === "/api/article") {
        const requested = new URL(raw, "http://127.0.0.1").searchParams.get("url") ?? ""
        const targetUrl = allowedArticleUrl(requested)
        if (!targetUrl) {
          res.statusCode = 400
          res.end("Unsupported article")
          return
        }
        try {
          const response = await fetch(targetUrl, {
            headers: {
              Accept: "text/html",
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(12000),
          })
          if (!response.ok) {
            res.statusCode = 502
            res.end("Article unavailable")
            return
          }
          const brief = briefFromHtml(await response.text(), targetUrl)
          res.setHeader("Content-Type", "application/json; charset=utf-8")
          res.setHeader("Cache-Control", "no-store")
          res.end(JSON.stringify(brief ?? { title: "", summary: "", terms: [], source: sourceName(targetUrl) }))
        } catch {
          res.statusCode = 502
          res.end("Article unavailable")
        }
        return
      }
      const target = path ? feeds[path] : undefined
      if (!target) {
        next()
        return
      }
      try {
        const response = await fetch(target, {
          headers: {
            Accept: "application/rss+xml, application/xml, text/xml, */*",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(12000),
        })
        if (!response.ok) {
          res.statusCode = 502
          res.end("Feed unavailable")
          return
        }
        const body = await response.text()
        res.setHeader("Content-Type", "application/xml; charset=utf-8")
        res.setHeader("Cache-Control", "no-store")
        res.end(body)
      } catch {
        res.statusCode = 502
        res.end("Feed unavailable")
      }
    })
  }

  return {
    name: "mlb-feeds",
    configureServer(server) {
      attach(server.middlewares)
    },
    configurePreviewServer(server) {
      attach(server.middlewares)
    },
  }
}

type NodeResponse = {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body?: string) => void
}

export default defineConfig({
  plugins: [react(), mlbFeeds()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
})
