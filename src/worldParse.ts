import { seriesWinner } from "./club"
import { addDays } from "./dates"
import type { BoxScore, Decisions, Linescore, PitcherLine, ScoreGame, Starter } from "./scores"

export type WorldClub = {
  id: number
  abbr: string
  nick: string
  code: string
  slug: string
  division: string
  logo: string
  manager?: string
  city?: string
  stadium?: string
}

export type WorldGame = ScoreGame & {
  awayStarter?: string
  homeStarter?: string
  linescore?: Linescore | null
  decisions?: Decisions
  seq?: number
}

export type WorldStanding = {
  id: number
  wins: number
  losses: number
  ties: number
}

export type WorldDirectory = {
  season: string
  divisions: { id: string; name: string; teams: (WorldClub & WorldStanding)[] }[]
  honors: { divisionIds: number[]; championId: number | null; championLabel: string }
}

export type WorldPlayer = {
  id: number
  name: string
  position: string
  number: string
  photo?: string
}

export type WorldRoster = {
  coaches: { id: number; name: string; title: string }[]
  groups: { label: string; players: WorldPlayer[] }[]
}

export const NPB_CLUBS: WorldClub[] = [
  { id: 1, abbr: "G", code: "g", nick: "Giants", slug: "giants", division: "Central League", logo: "https://p.npb.jp/img/common/logo/2026/logo_g_m.gif" },
  { id: 2, abbr: "S", code: "s", nick: "Swallows", slug: "swallows", division: "Central League", logo: "https://p.npb.jp/img/common/logo/2026/logo_s_m.gif" },
  { id: 3, abbr: "DB", code: "db", nick: "BayStars", slug: "baystars", division: "Central League", logo: "https://p.npb.jp/img/common/logo/2026/logo_db_m.gif" },
  { id: 5, abbr: "T", code: "t", nick: "Tigers", slug: "tigers", division: "Central League", logo: "https://p.npb.jp/img/common/logo/2026/logo_t_m.gif" },
  { id: 6, abbr: "C", code: "c", nick: "Carp", slug: "carp", division: "Central League", logo: "https://p.npb.jp/img/common/logo/2026/logo_c_m.gif" },
  { id: 4, abbr: "D", code: "d", nick: "Dragons", slug: "dragons", division: "Central League", logo: "https://p.npb.jp/img/common/logo/2026/logo_d_m.gif" },
  { id: 12, abbr: "H", code: "h", nick: "Hawks", slug: "hawks", division: "Pacific League", logo: "https://p.npb.jp/img/common/logo/2026/logo_h_m.gif" },
  { id: 7, abbr: "L", code: "l", nick: "Lions", slug: "lions", division: "Pacific League", logo: "https://p.npb.jp/img/common/logo/2026/logo_l_m.gif" },
  { id: 8, abbr: "F", code: "f", nick: "Fighters", slug: "fighters", division: "Pacific League", logo: "https://p.npb.jp/img/common/logo/2026/logo_f_m.gif" },
  { id: 11, abbr: "B", code: "b", nick: "Buffaloes", slug: "buffaloes", division: "Pacific League", logo: "https://p.npb.jp/img/common/logo/2026/logo_b_m.gif" },
  { id: 9, abbr: "M", code: "m", nick: "Marines", slug: "marines", division: "Pacific League", logo: "https://p.npb.jp/img/common/logo/2026/logo_m_m.gif" },
  { id: 376, abbr: "E", code: "e", nick: "Eagles", slug: "eagles", division: "Pacific League", logo: "https://p.npb.jp/img/common/logo/2026/logo_e_m.gif" },
]

export const LMB_CLUBS: WorldClub[] = [
  { id: 201, abbr: "ACE", code: "ace", nick: "Acereros", slug: "acereros", division: "Norte", logo: "https://d11rb39sj794dg.cloudfront.net/public/2024-04/Acereros.png", manager: "Juan Gabriel Castro", city: "Monclova", stadium: "Kickapoo Lucky Eagle" },
  { id: 202, abbr: "ALG", code: "alg", nick: "Algodoneros", slug: "algodoneros", division: "Norte", logo: "https://d11rb39sj794dg.cloudfront.net/public/2024-04/Algodoneros.png", manager: "Ramón Santiago", city: "Torreón", stadium: "Estadio Revolución" },
  { id: 203, abbr: "DUR", code: "dur", nick: "Caliente", slug: "caliente", division: "Norte", logo: "https://d11rb39sj794dg.cloudfront.net/public/2025-03/caliente.png", manager: "Óscar Robles", city: "Durango", stadium: "Francisco Villa" },
  { id: 204, abbr: "CHA", code: "cha", nick: "Charros", slug: "charros", division: "Norte", logo: "https://d11rb39sj794dg.cloudfront.net/public/2026-01/LOGO%20CH%20AZUL_1a1.png", manager: "Benjamín Gil", city: "Zapopan", stadium: "Estadio Panamericano" },
  { id: 205, abbr: "DOR", code: "dor", nick: "Dorados", slug: "dorados", division: "Norte", logo: "https://d11rb39sj794dg.cloudfront.net/public/2024-04/Dorados1.png", manager: "Homar Rojas", city: "Chihuahua", stadium: "Monumental Chihuahua" },
  { id: 206, abbr: "RIE", code: "rie", nick: "Rieleros", slug: "rieleros", division: "Norte", logo: "https://d11rb39sj794dg.cloudfront.net/public/2026-01/rieleros_azul.png", manager: "Adán Muñoz", city: "Aguascalientes", stadium: "Alberto Romo Chávez" },
  { id: 207, abbr: "SAR", code: "sar", nick: "Saraperos", slug: "saraperos", division: "Norte", logo: "https://d11rb39sj794dg.cloudfront.net/public/2024-04/Saraperos.png", manager: "José Molina", city: "Saltillo", stadium: "Francisco I. Madero" },
  { id: 208, abbr: "SUL", code: "sul", nick: "Sultanes", slug: "sultanes", division: "Norte", logo: "https://d11rb39sj794dg.cloudfront.net/public/2024-04/Sultanes.png", manager: "Henry Blanco", city: "Monterrey", stadium: "Walmart Park" },
  { id: 209, abbr: "TEC", code: "tec", nick: "Tecos", slug: "tecos", division: "Norte", logo: "https://d11rb39sj794dg.cloudfront.net/public/2024-04/Tecolotes.png", manager: "Mendy López", city: "Dos Laredos", stadium: "Uni-Trade" },
  { id: 210, abbr: "TIJ", code: "tij", nick: "Toros", slug: "toros", division: "Norte", logo: "https://d11rb39sj794dg.cloudfront.net/public/2024-04/Toros.png", manager: "Roberto Kelly", city: "Tijuana", stadium: "Toros Mobil Super" },
  { id: 211, abbr: "LEO", code: "leo", nick: "Bravos", slug: "bravos", division: "Sur", logo: "https://d11rb39sj794dg.cloudfront.net/public/2025-04/contactos%20Dimo%20fix.png", manager: "Miguel Tejada", city: "León", stadium: "Domingo Santana" },
  { id: 212, abbr: "QRO", code: "qro", nick: "Conspiradores", slug: "conspiradores", division: "Sur", logo: "https://d11rb39sj794dg.cloudfront.net/public/2024-04/Conspiradores.png", manager: "Francisco Rodríguez", city: "Querétaro", stadium: "Finsus Conspiradores" },
  { id: 213, abbr: "MEX", code: "mex", nick: "Diablos", slug: "diablos-rojos", division: "Sur", logo: "https://d11rb39sj794dg.cloudfront.net/public/2024-04/Diablos.png", manager: "Lorenzo Bundy", city: "Mexico City", stadium: "Alfredo Harp Helú" },
  { id: 214, abbr: "VER", code: "ver", nick: "Águila", slug: "el-aguila", division: "Sur", logo: "https://d11rb39sj794dg.cloudfront.net/public/2025-05/veracruz.png", manager: "Gabriel Álvarez", city: "Veracruz", stadium: "Universitario Beto Ávila" },
  { id: 215, abbr: "OAX", code: "oax", nick: "Guerreros", slug: "guerreros", division: "Sur", logo: "https://d11rb39sj794dg.cloudfront.net/public/2024-04/Guerreros.png", manager: "Javier Valentín", city: "Oaxaca", stadium: "Estadio Yu'Va" },
  { id: 216, abbr: "YUC", code: "yuc", nick: "Leones", slug: "leones", division: "Sur", logo: "https://d11rb39sj794dg.cloudfront.net/public/2025-05/LOGO%20LEONES%202025.png", manager: "Hensley Meulens", city: "Mérida", stadium: "Kukulcán" },
  { id: 217, abbr: "TAB", code: "tab", nick: "Olmecas", slug: "olmecas", division: "Sur", logo: "https://d11rb39sj794dg.cloudfront.net/public/2026-03/olmecas_azul.png", manager: "Luis Carlos Rivera", city: "Villahermosa", stadium: "Centenario 27 de Febrero" },
  { id: 218, abbr: "PUE", code: "pue", nick: "Pericos", slug: "pericos", division: "Sur", logo: "https://d11rb39sj794dg.cloudfront.net/public/2024-04/Pericos.png", manager: "Ramón Orantes", city: "Puebla", stadium: "Hermanos Serdán" },
  { id: 219, abbr: "CAM", code: "cam", nick: "Piratas", slug: "piratas", division: "Sur", logo: "https://d11rb39sj794dg.cloudfront.net/public/2024-04/Piratas.png", manager: "Lloyd McClendon", city: "Campeche", stadium: "Nelson Barrera" },
  { id: 220, abbr: "TIG", code: "tig", nick: "Tigres", slug: "tigres", division: "Sur", logo: "https://d11rb39sj794dg.cloudfront.net/public/2025-04/Tigres_2025.png", manager: "Joe Thurston", city: "Cancún", stadium: "Beto Ávila" },
]

export const LIDOM_CLUBS: WorldClub[] = [
  { id: 301, abbr: "AGU", code: "01", nick: "Águilas", slug: "aguilas", division: "LIDOM", logo: "" },
  { id: 302, abbr: "LIC", code: "02", nick: "Licey", slug: "licey", division: "LIDOM", logo: "" },
  { id: 303, abbr: "ESC", code: "03", nick: "Escogido", slug: "escogido", division: "LIDOM", logo: "" },
  { id: 304, abbr: "GIG", code: "04", nick: "Gigantes", slug: "gigantes", division: "LIDOM", logo: "" },
  { id: 305, abbr: "EST", code: "05", nick: "Toros", slug: "toros", division: "LIDOM", logo: "" },
  { id: 306, abbr: "ORI", code: "06", nick: "Estrellas", slug: "estrellas", division: "LIDOM", logo: "" },
]

const LMB_ALIASES: Record<number, string[]> = {
  201: ["acereros", "monclova"],
  202: ["algodoneros", "laguna"],
  203: ["caliente", "durango"],
  204: ["charros", "jalisco"],
  205: ["dorados", "chihuahua"],
  206: ["rieleros", "aguascalientes"],
  207: ["saraperos", "saltillo"],
  208: ["sultanes", "monterrey"],
  209: ["tecos", "tecolotes", "laredos"],
  210: ["toros", "tijuana"],
  211: ["bravos", "leon"],
  212: ["conspiradores", "queretaro"],
  213: ["diablos", "mexico"],
  214: ["aguila", "veracruz"],
  215: ["guerreros", "oaxaca"],
  216: ["leones", "yucatan"],
  217: ["olmecas", "tabasco"],
  218: ["pericos", "puebla"],
  219: ["piratas", "campeche"],
  220: ["tigres", "quintana"],
}

const LIDOM_ALIASES: Record<number, string[]> = {
  301: ["aguilas", "aguila"],
  302: ["licey", "tigres del licey"],
  303: ["escogido", "leones"],
  304: ["gigantes", "cibao"],
  305: ["toros", "este"],
  306: ["estrellas", "orientales"],
}

export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function clubsFor(league: "npb" | "lmb" | "lidom"): WorldClub[] {
  if (league === "npb") return NPB_CLUBS
  if (league === "lmb") return LMB_CLUBS
  return LIDOM_CLUBS
}

export function clubByLeagueId(league: "npb" | "lmb" | "lidom", id: number): WorldClub | undefined {
  return clubsFor(league).find((club) => club.id === id)
}

function matchNamed(clubs: WorldClub[], aliases: Record<number, string[]>, name: string): WorldClub | undefined {
  const folded = fold(name)
  let best: { club: WorldClub; size: number } | undefined
  for (const club of clubs) {
    const names = [club.nick, ...(aliases[club.id] ?? [])]
    for (const alias of names) {
      const needle = fold(alias)
      if (!needle || !folded.includes(needle)) continue
      if (!best || needle.length > best.size) best = { club, size: needle.length }
    }
  }
  return best?.club
}

export function lmbClub(name: string): WorldClub | undefined {
  return matchNamed(LMB_CLUBS, LMB_ALIASES, name)
}

export function lidomClub(name: string): WorldClub | undefined {
  return matchNamed(LIDOM_CLUBS, LIDOM_ALIASES, name)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function isoFromCompact(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "")
  if (digits.length < 8) return ""
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

const CENTRAL = new Set(NPB_CLUBS.filter((club) => club.division === "Central League").map((club) => club.id))

export function gamesFromSpaia(data: unknown): WorldGame[] {
  if (!Array.isArray(data)) return []
  const games: WorldGame[] = []
  for (const item of data) {
    const game = asRecord(item)
    const id = num(game?.GameID)
    const state = num(game?.GameState)
    const kind = num(game?.GameKindID)
    const awayId = num(game?.VTeamID)
    const homeId = num(game?.HTeamID)
    const awayScore = num(game?.VScore)
    const homeScore = num(game?.HScore)
    const date = isoFromCompact(game?.DateJPN)
    if (!id || state !== 2 || !kind || !awayId || !homeId || awayScore === null || homeScore === null || !date) continue
    if (kind === 5 || awayId === 15 || awayId === 16 || homeId === 15 || homeId === 16) continue
    const away = NPB_CLUBS.find((club) => club.id === awayId)
    const home = NPB_CLUBS.find((club) => club.id === homeId)
    if (!away || !home) continue
    const gameType = kind === 26 ? "I" : kind === 1 || kind === 2 ? "R" : "P"
    games.push({
      id,
      date,
      gameType,
      awayId,
      homeId,
      awayName: away.nick,
      homeName: home.nick,
      awayScore,
      homeScore,
      awayStarter: text(game?.Visitor_StarterPitcher_NameL),
      homeStarter: text(game?.Home_StarterPitcher_NameL),
      seq: num(game?.SeqNo) ?? undefined,
    })
  }
  return finishNpb(games.sort((a, b) => b.date.localeCompare(a.date) || a.id - b.id))
}

function finishNpb(games: WorldGame[]): WorldGame[] {
  const cross = games.filter((game) => game.gameType === "P" && CENTRAL.has(game.awayId) !== CENTRAL.has(game.homeId))
  const decided = seriesWinner(cross.map((game) => ({ ...game, final: true })))
  return games.map((game) => {
    if (game.gameType !== "P") return game
    const crossLeague = CENTRAL.has(game.awayId) !== CENTRAL.has(game.homeId)
    if (crossLeague && decided) return { ...game, gameType: "W" }
    if (!crossLeague) return { ...game, gameType: "C" }
    return game
  })
}

export function npbGameUrl(games: WorldGame[], id: number): string | null {
  const game = games.find((item) => item.id === id)
  if (!game) return null
  const home = NPB_CLUBS.find((club) => club.id === game.homeId)
  const away = NPB_CLUBS.find((club) => club.id === game.awayId)
  if (!home || !away) return null
  const regular = game.gameType === "R" || game.gameType === "I"
  const series = regular
    ? games
        .filter((item) => (item.gameType === "R" || item.gameType === "I") && item.homeId === game.homeId && item.awayId === game.awayId)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
    : []
  const index = series.length ? series.findIndex((item) => item.id === id) + 1 : (game.seq ?? 0)
  if (index < 1) return null
  const [year, month, day] = game.date.split("-")
  return `https://npb.jp/scores/${year}/${month}${day}/${home.code}-${away.code}-${String(index).padStart(2, "0")}/`
}

export function gamesFromLmb(days: unknown[], seasonStart = "2026-04-16"): WorldGame[] {
  const games: WorldGame[] = []
  const seen = new Set<number>()
  for (const day of days) {
    const record = asRecord(day)
    const list = record?.games_info
    if (!Array.isArray(list)) continue
    for (const item of list) {
      const game = asRecord(item)
      const id = num(game?.gameId)
      const status = game?.status
      if (!id || seen.has(id) || status !== "F" || game?.canceledSubStatus) continue
      const awayTeam = asRecord(game?.awayTeam)
      const homeTeam = asRecord(game?.localTeam)
      const away = lmbClub(text(awayTeam?.name))
      const home = lmbClub(text(homeTeam?.name))
      const awayScore = num(awayTeam?.runsScored)
      const homeScore = num(homeTeam?.runsScored)
      const stamp = num(game?.date_time)
      if (!away || !home || awayScore === null || homeScore === null || !stamp) continue
      const date = mexicoDate(stamp)
      if (!date || date < seasonStart) continue
      seen.add(id)
      const lines = Array.isArray(game?.lineScore) ? lmbLines(game.lineScore, awayScore, homeScore, awayTeam, homeTeam) : null
      games.push({
        id,
        date,
        gameType: date < "2026-08-07" ? "R" : "Z",
        awayId: away.id,
        homeId: home.id,
        awayName: away.nick,
        homeName: home.nick,
        awayScore,
        homeScore,
        awayStarter: text(awayTeam?.probablePitcher),
        homeStarter: text(homeTeam?.probablePitcher),
        linescore: lines,
        decisions: {
          win: text(asRecord(game?.winningPitcher)?.name),
          loss: text(asRecord(game?.losingPitcher)?.name),
          save: text(asRecord(game?.savedBy)?.name),
        },
      })
    }
  }
  return finishLmb(games.sort((a, b) => b.date.localeCompare(a.date) || a.id - b.id))
}

function finishLmb(games: WorldGame[]): WorldGame[] {
  const late = games.filter((game) => game.date >= "2026-09-08")
  const pairs = new Map<string, WorldGame[]>()
  for (const game of late) {
    const key = [game.awayId, game.homeId].sort((a, b) => a - b).join("-")
    const group = pairs.get(key) ?? []
    group.push(game)
    pairs.set(key, group)
  }
  let best: WorldGame[] = []
  for (const group of pairs.values()) {
    if (group.length > best.length) best = group
  }
  const decided = seriesWinner(best.map((game) => ({ ...game, final: true })))
  if (!decided) return games
  const ids = new Set(best.map((game) => game.id))
  return games.map((game) => (ids.has(game.id) ? { ...game, gameType: "K" } : game))
}

function lmbLines(rows: unknown[], awayRuns: number, homeRuns: number, awayTeam: Record<string, unknown> | null, homeTeam: Record<string, unknown> | null): Linescore | null {
  const innings = rows.flatMap((row) => {
    const record = asRecord(row)
    const inning = num(record?.inningNumber)
    const away = num(record?.awayTeamRuns)
    const home = num(record?.homeTeamRuns)
    if (!inning || away === null || home === null) return []
    return [{ num: inning, away, home }]
  })
  if (!innings.length) return null
  return {
    innings,
    away: { runs: awayRuns, hits: num(awayTeam?.totalHits) ?? 0, errors: num(awayTeam?.totalErrors) ?? 0 },
    home: { runs: homeRuns, hits: num(homeTeam?.totalHits) ?? 0, errors: num(homeTeam?.totalErrors) ?? 0 },
  }
}

export function mexicoDate(seconds: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(seconds * 1000))
}

export function lidomDates(data: unknown, start: string, end: string): string[] {
  if (!Array.isArray(data)) return []
  return data
    .filter((item): item is string => typeof item === "string" && item >= start && item <= end)
    .sort()
}

export function gamesFromLidomList(html: string, iso: string): { id: number; away: string; home: string }[] {
  const games: { id: number; away: string; home: string }[] = []
  for (const row of html.match(/<tr>([\s\S]*?)<\/tr>/g) ?? []) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) => clean(match[1] ?? ""))
    const id = Number(row.match(/idPartido=(\d+)/)?.[1])
    if (!id || cells.length < 5) continue
    const status = fold(cells[4] ?? "")
    if (!status.includes("jugado") && !status.includes("final")) continue
    games.push({ id, away: cells[0] ?? "", home: cells[1] ?? "" })
  }
  return games.map((game) => ({ ...game, away: game.away, home: game.home, iso })).map(({ id, away, home }) => ({ id, away, home }))
}

export function directoryFromGames(
  league: "npb" | "lmb" | "lidom",
  games: WorldGame[],
  today: string,
): WorldDirectory {
  const clubs = clubsFor(league)
  const counted = games.filter((game) => game.gameType === "R" || (league === "npb" && game.gameType === "I"))
  const rows = new Map<number, WorldStanding & { diff: number }>()
  for (const club of clubs) rows.set(club.id, { id: club.id, wins: 0, losses: 0, ties: 0, diff: 0 })
  for (const game of counted) {
    const away = rows.get(game.awayId)
    const home = rows.get(game.homeId)
    if (!away || !home) continue
    away.diff += game.awayScore - game.homeScore
    home.diff += game.homeScore - game.awayScore
    if (game.awayScore === game.homeScore) {
      away.ties += 1
      home.ties += 1
    } else if (game.awayScore > game.homeScore) {
      away.wins += 1
      home.losses += 1
    } else {
      home.wins += 1
      away.losses += 1
    }
  }
  const lastRegular = counted.reduce((latest, game) => (game.date > latest ? game.date : latest), "")
  const settled = Boolean(lastRegular) && lastRegular <= addDays(today, -7)
  const names = [...new Set(clubs.map((club) => club.division))]
  const divisionIds: number[] = []
  if (settled && names.length > 1) {
    for (const name of names) {
      const leader = clubs
        .filter((club) => club.division === name)
        .map((club) => rows.get(club.id))
        .filter((row): row is WorldStanding & { diff: number } => Boolean(row))
        .sort((a, b) => rate(b) - rate(a) || b.wins - a.wins || b.diff - a.diff)[0]
      if (leader && leader.wins + leader.losses > 0) divisionIds.push(leader.id)
    }
  }
  const championGames =
    league === "npb"
      ? games.filter((game) => game.gameType === "W")
      : league === "lmb"
        ? games.filter((game) => game.gameType === "K")
        : []
  const championId = seriesWinner(championGames.map((game) => ({ ...game, final: true })))
  return {
    season: league === "lidom" ? "2026–27" : "2026",
    divisions: names.map((name) => ({
      id: fold(name).replace(/ /g, "-"),
      name,
      teams: clubs
        .filter((club) => club.division === name)
        .map((club) => {
          const row = rows.get(club.id)
          return { ...club, wins: row?.wins ?? 0, losses: row?.losses ?? 0, ties: row?.ties ?? 0 }
        }),
    })),
    honors: {
      divisionIds,
      championId,
      championLabel: league === "npb" ? "Japan Series" : league === "lmb" ? "Serie del Rey" : "",
    },
  }
}

function rate(row: WorldStanding): number {
  const decisions = row.wins + row.losses
  return decisions ? row.wins / decisions : 0
}

export function recordLabel(row: WorldStanding): string {
  return row.ties ? `${row.wins}–${row.losses}–${row.ties}` : `${row.wins}–${row.losses}`
}

export function seriesName(gameType: string): string {
  if (gameType === "I") return "Interleague"
  if (gameType === "C") return "Climax Series"
  if (gameType === "W") return "Japan Series"
  if (gameType === "Z") return "Playoffs"
  if (gameType === "K") return "Serie del Rey"
  if (gameType === "P") return "Postseason"
  return ""
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
}

export function clean(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCharCode(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_, digits: string) => String.fromCharCode(parseInt(digits, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#241;|&ntilde;/gi, "ñ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function linescoreFromNpb(html: string): Linescore | null {
  const table = html.match(/<table[^>]*id="tablefix_ls"[\s\S]*?<\/table>/i)?.[0]
  if (!table) return null
  const body = table.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? ""
  const rows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((match) => match[1] ?? "")
  if (rows.length < 2) return null
  const away = sideFromNpb(rows[0] ?? "")
  const home = sideFromNpb(rows[1] ?? "")
  if (!away || !home) return null
  const count = Math.max(away.innings.length, home.innings.length)
  return {
    innings: Array.from({ length: count }, (_, index) => ({
      num: index + 1,
      away: away.innings[index] ?? null,
      home: home.innings[index] ?? null,
    })),
    away: away.totals,
    home: home.totals,
  }
}

function sideFromNpb(row: string): { innings: (number | null)[]; totals: { runs: number; hits: number; errors: number } } | null {
  const innings = [...row.matchAll(/<td(?![^>]*total)[^>]*>([\s\S]*?)<\/td>/g)].map((match) => inningCell(clean(match[1] ?? "")))
  const totals = [...row.matchAll(/<td[^>]*class="total-[12]"[^>]*>([\s\S]*?)<\/td>/g)].map((match) => num(clean(match[1] ?? "")) ?? 0)
  if (totals.length < 3 || !innings.length) return null
  return { innings, totals: { runs: totals[0] ?? 0, hits: totals[1] ?? 0, errors: totals[2] ?? 0 } }
}

function inningCell(value: string): number | null {
  if (!value || value.toLowerCase() === "x") return null
  return num(value)
}

export function decisionsFromNpb(html: string): Decisions {
  const named = (label: string) => clean(html.match(new RegExp(`${label}[\\s\\S]{0,280}?<a[^>]*>([^<]+)</a>`))?.[1] ?? "")
  const win = named("勝投手")
  const loss = named("敗投手")
  const save = named("セーブ")
  return {
    win: clean(win ?? ""),
    loss: clean(loss ?? ""),
    save: clean(save ?? ""),
  }
}

export function pitchersFromNpb(html: string): PitcherLine[] {
  const flatHtml = html.replace(/<table\b[^>]*class="table_inning"[\s\S]*?<\/table>/g, (table) => {
    const innings = clean(table.match(/<th>([\s\S]*?)<\/th>/)?.[1] ?? "")
    const fraction = clean(table.match(/<td>([\s\S]*?)<\/td>/)?.[1] ?? "")
    return `<td>${inningLabel(innings, fraction)}</td>`
  })
  const body = flatHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? flatHtml
  const pitchers: PitcherLine[] = []
  for (const row of body.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? []) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) => clean(match[1] ?? ""))
    const name = cells[1]
    if (!name || cells.length < 8) continue
    pitchers.push({
      id: pitchers.length + 1,
      name,
      started: pitchers.length === 0,
      ip: cells[4] || "—",
      h: cells[5] || "—",
      er: cells[13] || cells[12] || "—",
      bb: cells[7] || "—",
      k: cells[9] || "—",
    })
  }
  return pitchers
}

export function pitchersFromNpbBox(html: string): { away: PitcherLine[]; home: PitcherLine[] } {
  const flat = html.replace(/<table\b[^>]*class="table_inning"[\s\S]*?<\/table>/g, (table) => {
    const innings = clean(table.match(/<th>([\s\S]*?)<\/th>/)?.[1] ?? "")
    const fraction = clean(table.match(/<td>([\s\S]*?)<\/td>/)?.[1] ?? "")
    return `<td>${inningLabel(innings, fraction)}</td>`
  })
  const table = (id: string) => flat.match(new RegExp(`<table[^>]*id="${id}"[\\s\\S]*?</table>`, "i"))?.[0] ?? ""
  return { away: pitchersFromNpb(table("tablefix_t_p")), home: pitchersFromNpb(table("tablefix_b_p")) }
}

function inningLabel(innings: string, fraction: string): string {
  if (!innings) return fraction || "—"
  if (fraction === "1/3" || fraction === ".1") return `${innings}.1`
  if (fraction === "2/3" || fraction === ".2") return `${innings}.2`
  if (!fraction || fraction === ".0" || fraction === "0") return innings.includes(".") ? innings : `${innings}.0`
  return `${innings}.${fraction.replace(".", "")}`
}

export function rosterFromNpb(html: string): WorldRoster {
  const table = html.match(/<table[^>]*class="rosterlisttbl"[\s\S]*?<\/table>/i)?.[0] ?? ""
  const coaches: WorldRoster["coaches"] = []
  const groups: WorldRoster["groups"] = []
  let label = ""
  const ensure = (next: string) => {
    label = next
    if (next && next !== "manager" && !groups.some((group) => group.label === next)) groups.push({ label: next, players: [] })
  }
  for (const row of table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? []) {
    if (row.includes("rosterMainHead") || row.includes("rosterPos")) {
      if (row.includes("監督")) ensure("manager")
      else if (row.includes("投手")) ensure("Pitchers")
      else if (row.includes("捕手")) ensure("Catchers")
      else if (row.includes("内野手")) ensure("Infielders")
      else if (row.includes("外野手")) ensure("Outfielders")
      continue
    }
    if (!row.includes("rosterPlayer")) continue
    const number = clean(row.match(/<td[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? "")
    const name = clean(row.match(/rosterRegister[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? "").replace(/\u3000/g, " ")
    if (!name) continue
    if (label === "manager") {
      coaches.push({ id: hashId(name), name, title: "Manager" })
      continue
    }
    const group = groups.find((item) => item.label === label)
    const position = label === "Pitchers" ? "P" : label === "Catchers" ? "C" : label === "Infielders" ? "INF" : "OF"
    group?.players.push({ id: hashId(`${name}-${number}`), name, position, number })
  }
  return { coaches, groups }
}

export function rosterFromLmb(html: string): WorldRoster {
  const groups: WorldRoster["groups"] = []
  const labels: Record<string, string> = {
    Lanzadores: "Pitchers",
    Receptores: "Catchers",
    "Jugadores del cuadro": "Infielders",
    Jardineros: "Outfielders",
  }
  for (const section of html.matchAll(/headerTitle__[^"]*">([^<]+)<\/h3>([\s\S]*?)(?=headerTitle__|$)/g)) {
    const label = labels[clean(section[1] ?? "")] ?? ""
    if (!label) continue
    const players: WorldPlayer[] = []
    for (const row of (section[2] ?? "").matchAll(/href="\/jugador\/(\d+)"[\s\S]*?alt="([^"]+)"[\s\S]*?playerStatValue__[^"]*">([^<]+)/g)) {
      const id = Number(row[1])
      const alt = clean(row[2] ?? "")
      const named = alt.match(/^(.*?)(?:\s+#(\d+))?$/)
      const name = named?.[1]?.trim() || alt
      if (!id || !name) continue
      players.push({
        id,
        name,
        number: named?.[2] ?? "",
        position: clean(row[3] ?? ""),
        photo: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_180,q_auto:best/v1/people/${id}/headshot/milb/current`,
      })
    }
    if (players.length) groups.push({ label, players })
  }
  return { coaches: [], groups }
}

function lidomSide(row: string[]): { name: string; innings: (number | null)[]; totals: { runs: number; hits: number; errors: number } } | null {
  const named = Boolean(row[0] && !/^\d+$/.test(row[0]) && row[0].toLowerCase() !== "x")
  const marks = (named ? row.slice(1) : row).filter((value) => value.toLowerCase() === "x" || /^\d+$/.test(value))
  if (marks.length < 4) return null
  const totals = marks.slice(-3).map((value) => Number(value))
  return {
    name: named ? (row[0] ?? "") : "",
    innings: marks.slice(0, -3).map((value) => (value.toLowerCase() === "x" ? null : Number(value))),
    totals: { runs: totals[0] ?? 0, hits: totals[1] ?? 0, errors: totals[2] ?? 0 },
  }
}

export function linescoreFromLidom(html: string, awayName: string, homeName: string): Linescore | null {
  const table = html.match(/<table[^>]*id="juego_1"[\s\S]*?<\/table>/i)?.[0]
  if (!table) return null
  const body = table.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? ""
  const sides = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].flatMap((match) => {
    const side = lidomSide(cells(match[1] ?? ""))
    return side ? [side] : []
  })
  const away = sides.find((side) => side.name && (fold(side.name).includes(fold(awayName)) || fold(awayName).includes(fold(side.name))))
  const home = sides.find((side) => side !== away && side.name && (fold(side.name).includes(fold(homeName)) || fold(homeName).includes(fold(side.name))))
  const first = away ?? sides[0]
  const second = home ?? sides.find((side) => side !== first)
  if (!first || !second) return null
  const count = Math.max(first.innings.length, second.innings.length)
  return {
    innings: Array.from({ length: count }, (_, index) => ({
      num: index + 1,
      away: first.innings[index] ?? null,
      home: second.innings[index] ?? null,
    })),
    away: first.totals,
    home: second.totals,
  }
}

export function decisionsFromLidom(html: string): Decisions {
  const win = html.match(/W:\s*([^<(]+)/)?.[1]
  const loss = html.match(/L:\s*([^<(]+)/)?.[1]
  const save = html.match(/SV:\s*([^<\d]+)/)?.[1]
  return { win: clean(win ?? ""), loss: clean(loss ?? ""), save: clean(save ?? "") }
}

export function startersFromLidom(html: string): { away: Starter[]; home: Starter[] } {
  const blocks = [...html.matchAll(/BATEADORES([\s\S]*?)Total/g)].slice(0, 2)
  return {
    away: startersIn(blocks[0]?.[1] ?? ""),
    home: startersIn(blocks[1]?.[1] ?? ""),
  }
}

function startersIn(block: string): Starter[] {
  const starters: Starter[] = []
  for (const match of block.matchAll(/([A-Za-zÁÉÍÓÚÑáéíóúñ.'’\- ]{2,40}?)\s*\(([A-Z0-9]{1,3})\)/g)) {
    const raw = match[1] ?? ""
    if (raw.includes("*")) continue
    const name = clean(raw).replace(/^\*\s*/, "")
    if (!name || name.length < 3) continue
    starters.push({ id: hashId(name), name, pos: match[2] ?? "", order: starters.length + 1 })
    if (starters.length === 9) break
  }
  return starters
}

function cells(row: string): string[] {
  return [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((match) => clean(match[1] ?? ""))
}

export function lmbStories(html: string): { url: string; title: string }[] {
  const seen = new Set<string>()
  const stories: { url: string; title: string }[] = []
  for (const match of html.matchAll(/\/noticias\/[a-z0-9-]{8,}/g)) {
    const slug = match[0]
    if (seen.has(slug)) continue
    seen.add(slug)
    const at = match.index ?? 0
    const window = html.slice(Math.max(0, at - 700), at)
    const quoted = [...window.matchAll(/"([^"\\]{24,170})"/g)].map((item) => item[1] ?? "")
    const title = quoted.reverse().find((value) => !value.includes("/") && !value.includes("http") && !value.includes("_") && !/^page\s+[0-9a-f]+$/i.test(value))
    if (!title) continue
    stories.push({ url: `https://lmb.com.mx${slug}`, title })
    if (stories.length === 12) break
  }
  return stories
}

export function npbStories(html: string): { url: string; title: string }[] {
  const stories: { url: string; title: string }[] = []
  const seen = new Set<string>()
  for (const match of html.matchAll(/<a[^>]+href="(\/news\/detail\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const path = match[1] ?? ""
    const title = clean(match[2] ?? "")
    if (!path || !title || seen.has(path) || title.length < 8) continue
    seen.add(path)
    stories.push({ url: `https://npb.jp${path}`, title })
    if (stories.length === 12) break
  }
  return stories
}

function hashId(name: string): number {
  let hash = 0
  for (const char of name) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  return hash || 1
}

export function highlightPick(titles: { id: string; title: string }[], away: string[], home: string[]): string | null {
  let best: { id: string; score: number } | null = null
  for (const hit of titles) {
    const title = fold(hit.title)
    const awayHit = away.some((name) => name && title.includes(fold(name)))
    const homeHit = home.some((name) => name && title.includes(fold(name)))
    if (!awayHit || !homeHit) continue
    let score = 10
    if (/highlight|resumen|ハイライト|digest|condensed/.test(hit.title.toLowerCase())) score += 30
    if (!best || score > best.score) best = { id: hit.id, score }
  }
  return best && best.score >= 10 ? best.id : null
}

export function boxFromSides(away: PitcherLine[], home: PitcherLine[], awayOrder: Starter[] = [], homeOrder: Starter[] = []): BoxScore | null {
  if (!away.length && !home.length && !awayOrder.length && !homeOrder.length) return null
  return { away: { starters: awayOrder, pitchers: away }, home: { starters: homeOrder, pitchers: home } }
}
