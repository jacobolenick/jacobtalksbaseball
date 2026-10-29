import type { Kind } from "./types"

export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&amp;|&#0?38;/g, " and ")
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9']+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function lastName(name: string): string {
  const parts = fold(name).split(" ").filter(Boolean)
  return parts[parts.length - 1] ?? ""
}

export function samePlayer(a: string, b: string): boolean {
  const left = fold(a).split(" ").filter(Boolean)
  const right = fold(b).split(" ").filter(Boolean)
  if (!left.length || !right.length) return false
  if (left[left.length - 1] !== right[right.length - 1]) return false
  if (left.length >= 2 && right.length >= 2) return left[0] === right[0]
  return true
}

export function slugify(name: string): string {
  return fold(name).replace(/'/g, "").replace(/\s+/g, "-")
}

export function isEditorial(title: string): boolean {
  return /outlook|candidates|considering|gm search|front office|mailbag|power ranking|prediction|roundup|what to expect/i.test(
    title,
  )
}

const SECTION_LABELS = new Set([
  "transactions",
  "newsstand",
  "mlbtr originals",
  "front office originals",
  "top offseason trade candidates",
])

export function isSectionLabel(label: string): boolean {
  const folded = fold(label)
  if (SECTION_LABELS.has(folded)) return true
  return /outlook|originals|newsstand|mailbag|candidates/.test(folded)
}

type Anchor = {
  re: RegExp
  kind: (before: string) => Kind | null
}

function negated(before: string): boolean {
  return /\b(not|never|won't|wont|won t)\b[\w\s'$]{0,28}$/.test(before.slice(-64))
}

function closestOption(before: string, club: boolean): Kind | null {
  const verbs: { index: number; exercised: boolean }[] = []
  for (const index of indexes(before, /declin\w*/g)) verbs.push({ index, exercised: false })
  for (const index of indexes(before, /exercis\w*|pick(?:s|ed)? up|opting in/g)) {
    verbs.push({ index, exercised: true })
  }
  if (!verbs.length) return null
  verbs.sort((a, b) => b.index - a.index)
  const verb = verbs[0]
  const negatedVerb = /\b(not|never|won't|wont|won t)\b[\w\s'$]*$/.test(
    before.slice(Math.max(0, verb.index - 28), verb.index),
  )
  if (club) return verb.exercised && !negatedVerb ? "option-exercised" : "option-declined"
  return !verb.exercised || negatedVerb ? "opt-out" : "opt-in"
}

const ANCHORS: Anchor[] = [
  {
    re: /player option/g,
    kind: (before) => closestOption(before, false),
  },
  {
    re: /club option/g,
    kind: (before) => closestOption(before, true),
  },
  {
    re: /pick(?:s|ed)? up [\w\s']{0,24}option/g,
    kind: () => "option-exercised",
  },
  {
    re: /opts out|opted out|opt out/g,
    kind: (before) => (negated(before) ? "staying" : "opt-out"),
  },
  {
    re: /free agency|free agent/g,
    kind: () => "free-agency",
  },
  {
    re: /\boutright(?:ed)?\b/g,
    kind: () => "outright",
  },
  {
    re: /\bdesignat(?:e|es|ed)\b/g,
    kind: () => "dfa",
  },
  {
    re: /\breleas(?:e|ed|es)\b/g,
    kind: () => "release",
  },
  {
    re: /\bclaim(?:s|ed)?\b/g,
    kind: () => "claim",
  },
  {
    re: /\btraded\b|\btrades\b|\btrade\b|\bacquir(?:e|es|ed)\b/g,
    kind: () => "trade",
  },
  {
    re: /\bsign(?:s|ed)\b|\bminor league\b|\bagreed to\b/g,
    kind: () => "signing",
  },
]

function indexes(text: string, re: RegExp): number[] {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`
  const pattern = new RegExp(re.source, flags)
  const found: number[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    found.push(match.index)
    if (match[0].length === 0) pattern.lastIndex += 1
  }
  return found
}

export function classifyAround(raw: string, player: string): Kind | null {
  const text = fold(raw)
  const foldedPlayer = fold(player)
  const last = foldedPlayer.split(" ").filter(Boolean).pop() ?? ""
  if (last.length < 3) return null

  let nameAt = text.indexOf(foldedPlayer)
  if (nameAt < 0) nameAt = text.indexOf(last)
  if (nameAt < 0) return null

  const from = Math.max(0, nameAt - 240)
  const to = Math.min(text.length, nameAt + Math.max(foldedPlayer.length, last.length) + 160)
  const window = text.slice(from, to)
  const localName = nameAt - from

  let best: { dist: number; kind: Kind } | null = null
  for (const anchor of ANCHORS) {
    for (const index of indexes(window, anchor.re)) {
      const before = window.slice(Math.max(0, index - 90), index)
      const kind = anchor.kind(before)
      if (!kind) continue
      const dist = Math.abs(index - localName)
      if (!best || dist < best.dist) best = { dist, kind }
    }
  }
  return best?.kind ?? null
}

export function chipFor(kind: Kind, minor = false): string {
  if (minor && kind === "signing") return "Minors"
  switch (kind) {
    case "trade":
      return "Traded"
    case "signing":
      return "Signed"
    case "contract":
      return "Contract"
    case "opt-out":
      return "Opted out"
    case "staying":
      return "Staying"
    case "opt-in":
      return "Opted in"
    case "option-exercised":
      return "Picked up"
    case "option-declined":
      return "Declined"
    case "free-agency":
      return "Free agent"
    case "claim":
      return "Claimed"
    case "dfa":
      return "DFA"
    case "release":
      return "Released"
    case "outright":
      return "Outrighted"
  }
}

export function isOption(kind: Kind): boolean {
  return OPTION_KINDS.has(kind)
}

export function rank(kind: Kind): number {
  switch (kind) {
    case "opt-out":
    case "staying":
    case "opt-in":
    case "option-exercised":
    case "option-declined":
      return 0
    case "trade":
      return 1
    case "free-agency":
      return 2
    case "contract":
      return 3
    case "claim":
      return 4
    case "dfa":
      return 5
    case "release":
      return 6
    case "outright":
      return 7
    case "signing":
      return 8
  }
}

const OPTION_KINDS = new Set<Kind>([
  "opt-out",
  "staying",
  "opt-in",
  "option-exercised",
  "option-declined",
])

const MARKET_KINDS = new Set<Kind>(["free-agency", "release", "option-declined"])

export function kindsCompatible(a: Kind, b: Kind): boolean {
  if (a === b) return true
  if (OPTION_KINDS.has(a) && OPTION_KINDS.has(b)) return true
  if (MARKET_KINDS.has(a) && MARKET_KINDS.has(b)) return true
  if (OPTION_KINDS.has(a) && MARKET_KINDS.has(b)) return true
  if (MARKET_KINDS.has(a) && OPTION_KINDS.has(b)) return true
  return false
}
