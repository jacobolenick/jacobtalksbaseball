export type Brief = {
  title: string
  summary: string
  terms: string[]
  source: string
}

const HOSTS = new Set(["www.mlbtraderumors.com", "mlbtraderumors.com", "www.mlb.com", "mlb.com"])

export function allowedArticleUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return null
    if (!HOSTS.has(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

export function sourceName(url: string): string {
  return url.includes("mlbtraderumors.com") ? "MLB Trade Rumors" : "MLB.com"
}

function decode(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8217;|&rsquo;|[’‘]/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|[“”]/g, '"')
    .replace(/&#038;|&amp;/g, "&")
    .replace(/&#8230;|&hellip;|…/g, "...")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

function articleHtml(html: string): string {
  const start = html.search(/class="entry-content/)
  if (start < 0) return html
  const markers = ['id="comments"', "id='comments'", "jp-relatedposts", "class=\"comments"]
  let end = html.length
  for (const marker of markers) {
    const index = html.indexOf(marker, start + 20)
    if (index > start && index < end) end = index
  }
  return html.slice(start, end)
}

function paragraphs(html: string): string[] {
  const scoped = articleHtml(html)
  const found: string[] = []
  for (const match of scoped.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = decode(match[1] ?? "")
    if (text.length < 40) continue
    if (/register login|related reading|^more to come\.?$/i.test(text)) continue
    found.push(text)
  }
  return found
}

function titleFrom(html: string): string {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
  return match ? decode(match[1] ?? "") : ""
}

function summarize(paragraph: string): string {
  const sentences = paragraph.split(/(?<=\.)\s+(?=[A-Z"“])/).filter(Boolean)
  const lead = (sentences.length > 1 ? sentences.slice(0, 2) : sentences).join(" ")
  if (lead.length <= 520) return lead
  return `${lead.slice(0, 500).replace(/\s+\S*$/, "")}...`
}

const TERM =
  /(?:(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)-year,\s*)?\$\d[\d,]*(?:\.\d+)?\s*(?:MM|million|K)\s+(?:(?:player|club)\s+option|buyout|signing bonus|salary|guarantee)|(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)-year,\s*\$\d[\d,]*(?:\.\d+)?\s*(?:MM|million|K)\b/gi

function termsFrom(paragraphsIn: string[]): string[] {
  const body = paragraphsIn.slice(1).join(" ")
  const found: string[] = []
  const seen = new Set<string>()
  for (const match of body.matchAll(TERM)) {
    const term = match[0].replace(/\s+/g, " ").trim()
    const key = term.toLowerCase()
    if (seen.has(key) || term.length > 72) continue
    seen.add(key)
    found.push(term)
    if (found.length === 6) break
  }
  return found
}

export function briefFromHtml(html: string, pageUrl = ""): Brief | null {
  if (!/class="entry-content/.test(html)) return null
  const title = titleFrom(html)
  const body = paragraphs(html)
  if (!title && body.length === 0) return null
  const summary = body[0] ? summarize(body[0]) : ""
  return {
    title,
    summary: /^more to come\.?$/i.test(summary) ? "" : summary,
    terms: termsFrom(body),
    source: pageUrl ? sourceName(pageUrl) : "",
  }
}

export async function loadBrief(pageUrl: string, signal: AbortSignal): Promise<Brief | null> {
  const response = await fetch(`/api/article?url=${encodeURIComponent(pageUrl)}`, { signal })
  if (!response.ok) return null
  const data = (await response.json()) as Brief
  if (!data || (!data.summary && !data.title && !(data.terms ?? []).length)) return null
  return data
}
