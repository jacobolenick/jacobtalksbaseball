import { baseballClip, type VideoChannel } from "./channels"
import { isoInNewYork, shortDate } from "./dates"

export type FeedKind = "news" | "video" | "short"

export type FeedItem = {
  id: string
  kind: FeedKind
  title: string
  text: string
  url: string
  stamp: number
  source: string
  author: string
  image?: string
  videoId?: string
}

function decode(value: string): string {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
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

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return match ? decode(match[1] ?? "") : ""
}

function attr(block: string, tagName: string, attribute: string): string {
  const match = block.match(new RegExp(`<${tagName}\\b[^>]*\\b${attribute}="([^"]+)"`))
  return match?.[1] ?? ""
}

function blocks(xml: string, name: string): string[] {
  return [...xml.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "g"))].map((match) => match[1] ?? "")
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, max).replace(/\s+\S*$/, "")}...`
}

export function newsFromRss(xml: string): FeedItem[] {
  const items: FeedItem[] = []
  const seen = new Set<string>()
  for (const block of blocks(xml, "item")) {
    const title = tag(block, "title")
    const url = tag(block, "link")
    const published = new Date(tag(block, "pubDate"))
    if (!title || !url.includes("mlb.com/news") || Number.isNaN(published.getTime())) continue
    if (seen.has(url)) continue
    seen.add(url)
    const text = clip(tag(block, "description") || tag(block, "content:encoded"), 220)
    items.push({
      id: `news-${url}`,
      kind: "news",
      title,
      text,
      url,
      stamp: published.getTime(),
      source: "MLB.com",
      author: tag(block, "dc:creator"),
      image: attr(block, "image", "href") || undefined,
    })
  }
  return items
}

export function videosFromAtom(xml: string, kind: "video" | "short"): FeedItem[] {
  const items: FeedItem[] = []
  for (const block of blocks(xml, "entry")) {
    const videoId = tag(block, "yt:videoId")
    const title = tag(block, "title") || tag(block, "media:title")
    const published = new Date(tag(block, "published"))
    if (!videoId || !title || Number.isNaN(published.getTime())) continue
    const description = tag(block, "media:description")
    const text = /don't forget to subscribe|follow us elsewhere/i.test(description) ? "" : clip(description, 180)
    const author = tag(block, "name") || "MLB"
    items.push({
      id: `${kind}-${videoId}`,
      kind,
      title,
      text,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      stamp: published.getTime(),
      source: author,
      author,
      image: attr(block, "media:thumbnail", "url") || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      videoId,
    })
  }
  return items
}

export type ChannelEntry = { id: string; title: string; published: string; author?: string; views?: number; length?: string }

export function parseViewCount(text: string): number | null {
  const match = /([\d,.]+)\s*(thousand|million|billion|[kmb])?\s*views/i.exec(text)
  if (!match) return null
  const amount = Number(match[1]?.replace(/,/g, ""))
  if (!Number.isFinite(amount)) return null
  const unit = (match[2] ?? "").toLowerCase()
  const scale =
    unit === "k" || unit === "thousand" ? 1_000 : unit === "m" || unit === "million" ? 1_000_000 : unit === "b" || unit === "billion" ? 1_000_000_000 : 1
  return Math.round(amount * scale)
}

export function formatViews(count: number): string {
  const views = Math.max(0, Math.round(count))
  const compact = (value: number) => {
    const rounded = Math.round(value * 10) / 10
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  }
  if (views >= 1_000_000_000) return `${compact(views / 1_000_000_000)}B views`
  if (views >= 1_000_000) return `${compact(views / 1_000_000)}M views`
  if (views >= 1_000) return `${compact(views / 1_000)}K views`
  return `${views.toLocaleString("en-US")} ${views === 1 ? "view" : "views"}`
}

export function postedAgo(published: string, now = Date.now()): string {
  const stamp = Date.parse(published)
  if (!Number.isFinite(stamp)) return ""
  if (stamp > now) {
    const when = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "America/New_York",
    }).format(new Date(stamp))
    return `Premieres ${when}`
  }
  const days = Math.floor((now - stamp) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function publishedFromAgo(text: string, now: number): string {
  const match = /(\d+)\s+(minute|hour|day|week|month|year)/i.exec(text)
  const unit = match?.[2]?.toLowerCase()
  const amount = match ? Number(match[1]) : 0
  const span: Record<string, number> = {
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 604_800_000,
    month: 2_592_000_000,
    year: 31_536_000_000,
  }
  const ms = unit ? span[unit] : 0
  return new Date(now - amount * ms).toISOString()
}

function textContents(value: unknown): string[] {
  const found: string[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    const record = asRecord(node)
    if (!record) return
    if (typeof record.content === "string") found.push(record.content)
    Object.values(record).forEach(walk)
  }
  walk(value)
  return found
}

function easternToIso(year: number, month: number, day: number, hour: number, minute: number): string {
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(guess))
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  const rendered = Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour") % 24, pick("minute"))
  return new Date(guess - (rendered - guess)).toISOString()
}

function publishedFromPremiere(text: string): string | null {
  const cleaned = text.replace(/[\u202f\u00a0]/g, " ")
  const match = /Premieres\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:,\s*(\d{1,2}):(\d{2})\s*([AP]M))?/i.exec(cleaned)
  if (!match) return null
  let year = Number(match[3])
  if (year < 100) year += 2000
  let hour = Number(match[4] ?? 0)
  const minute = Number(match[5] ?? 0)
  const meridiem = match[6]?.toUpperCase()
  if (meridiem === "PM" && hour < 12) hour += 12
  if (meridiem === "AM" && hour === 12) hour = 0
  return easternToIso(year, Number(match[1]), Number(match[2]), hour, minute)
}

function videoLength(card: Record<string, unknown> | null): string | null {
  const found: string[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    const record = asRecord(node)
    if (!record) return
    const badge = asRecord(record.thumbnailBadgeViewModel)
    if (typeof badge?.text === "string") found.push(badge.text)
    Object.values(record).forEach(walk)
  }
  walk(asRecord(asRecord(card?.contentImage)?.thumbnailViewModel)?.overlays)
  return found.find((value) => /^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) ?? null
}

function agoText(value: unknown): string {
  const found: string[] = []
  const walk = (node: unknown) => {
    const record = asRecord(node)
    if (!record) {
      if (Array.isArray(node)) node.forEach(walk)
      return
    }
    if (typeof record.content === "string" && /ago/i.test(record.content)) found.push(record.content)
    Object.values(record).forEach(walk)
  }
  walk(value)
  return found.find((text) => /(\d+)\s+(minute|hour|day|week|month|year)/i.test(text)) ?? ""
}

export function channelEntries(data: unknown, kind: "video" | "short", now = Date.now()): ChannelEntry[] {
  const entries: ChannelEntry[] = []
  const seen = new Set<string>()
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    const record = asRecord(node)
    if (!record) return
    if (kind === "video") {
      const card = asRecord(record.lockupViewModel)
      const viewModel = asRecord(asRecord(card?.metadata)?.lockupMetadataViewModel)
      const id = typeof card?.contentId === "string" ? card.contentId : ""
      const title = asRecord(viewModel?.title)?.content
      if (id && typeof title === "string" && !seen.has(id)) {
        seen.add(id)
        const parts = textContents(viewModel?.metadata)
        const ago = parts.find((text) => /(\d+)\s+(minute|hour|day|week|month|year)/i.test(text)) ?? agoText(card)
        const premiere = parts.find((text) => /^premieres\b/i.test(text))
        const views = parseViewCount(parts.find((text) => /views/i.test(text)) ?? "")
        const length = videoLength(card)
        const scheduled = !ago && premiere ? publishedFromPremiere(premiere) : null
        entries.push({
          id,
          title,
          published: ago ? publishedFromAgo(ago, now) : scheduled ?? new Date(now - entries.length * 60_000).toISOString(),
          ...(views === null ? {} : { views }),
          ...(length ? { length } : {}),
        })
      }
    }
    if (kind === "short") {
      const card = asRecord(record.shortsLockupViewModel)
      const endpoint = asRecord(asRecord(asRecord(asRecord(card?.onTap)?.innertubeCommand)?.reelWatchEndpoint))
      const id = typeof endpoint?.videoId === "string" ? endpoint.videoId : ""
      const raw = typeof card?.accessibilityText === "string" ? card.accessibilityText : ""
      const title = raw.replace(/,\s*[\d.]+\s*(thousand|million|billion|[kmb])?\s*views.*$/i, "").trim()
      if (id && title && !seen.has(id)) {
        seen.add(id)
        const views = parseViewCount(raw)
        entries.push({
          id,
          title,
          published: new Date(now - entries.length * 60_000).toISOString(),
          ...(views === null ? {} : { views }),
        })
      }
    }
    Object.values(record).forEach(walk)
  }
  walk(data)
  return entries
}

export function uploadsFromChannel(channel: VideoChannel, entries: ChannelEntry[], limit = 4): ChannelEntry[] {
  const eligible = channel.baseballOnly ? entries.filter((entry) => baseballClip(entry.title)) : entries
  return eligible.slice(0, limit).map((entry) => ({ ...entry, author: channel.name }))
}

export function datedUploads(entries: ChannelEntry[], dates: ReadonlyMap<string, string>): ChannelEntry[] {
  return entries.flatMap((entry) => {
    const raw = dates.get(entry.id)
    const stamp = raw ? Date.parse(raw) : Number.NaN
    if (!Number.isFinite(stamp)) return []
    return [{ ...entry, published: new Date(stamp).toISOString() }]
  })
}

export function dateFromEtag(etag: string | null, now = Date.now()): string | null {
  const seconds = Number((etag ?? "").replace(/"/g, ""))
  if (!Number.isFinite(seconds) || seconds < 1_577_836_800) return null
  const stamp = seconds * 1000
  if (stamp > now + 86_400_000) return null
  return new Date(stamp).toISOString()
}

export function postedWithin(entries: ChannelEntry[], days: number, now = Date.now()): ChannelEntry[] {
  const windowMs = days * 24 * 60 * 60 * 1000
  return entries.filter((entry) => {
    const stamp = Date.parse(entry.published)
    return Number.isFinite(stamp) && stamp <= now + 86_400_000 && now - stamp <= windowMs
  })
}

export function mergeUploads(groups: ChannelEntry[][], limit = 60): ChannelEntry[] {
  const seen = new Set<string>()
  return groups
    .flat()
    .filter((entry) => {
      if (seen.has(entry.id)) return false
      seen.add(entry.id)
      return true
    })
    .sort((a, b) => b.published.localeCompare(a.published))
    .slice(0, limit)
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function atomFromEntries(entries: ChannelEntry[]): string {
  const body = entries
    .map(
      (entry) => `<entry>
        <yt:videoId>${xmlEscape(entry.id)}</yt:videoId>
        <title>${xmlEscape(entry.title)}</title>
        <published>${entry.published}</published>
        <author><name>${xmlEscape(entry.author || "MLB")}</name></author>
        <media:group>
          <media:thumbnail url="https://i.ytimg.com/vi/${xmlEscape(entry.id)}/hqdefault.jpg"/>
          <media:description></media:description>
        </media:group>
      </entry>`,
    )
    .join("")
  return `<?xml version="1.0" encoding="UTF-8"?><feed>${body}</feed>`
}

export function feedWhen(stamp: number, now = Date.now()): string {
  const minutes = Math.round(Math.max(0, now - stamp) / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  return shortDate(isoInNewYork(new Date(stamp)))
}

async function readXml(url: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error("Feed unavailable")
  return response.text()
}

export async function loadFeed(signal: AbortSignal): Promise<FeedItem[]> {
  const results = await Promise.allSettled([
    readXml("/api/feed/mlb", signal),
    readXml("/api/feed/videos", signal),
    readXml("/api/feed/shorts", signal),
  ])
  const news = results[0].status === "fulfilled" ? newsFromRss(results[0].value) : []
  const videos = results[1].status === "fulfilled" ? videosFromAtom(results[1].value, "video") : []
  const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000
  const shorts =
    results[2].status === "fulfilled"
      ? videosFromAtom(results[2].value, "short").filter((item) => item.stamp >= cutoff && item.stamp <= Date.now() + 86_400_000)
      : []
  if (!news.length && !videos.length && !shorts.length) throw new Error("The feed didn’t load.")
  return [...news, ...videos, ...shorts].sort((a, b) => b.stamp - a.stamp)
}
