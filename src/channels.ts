import { clubsIn } from "./teams"

export type VideoChannel = {
  name: string
  id: string
  baseballOnly?: boolean
}

export const VIDEO_CHANNELS: VideoChannel[] = [
  { name: "MLB", id: "UCoLrcjPV5PbUrUyXq5mjc_A" },
  { name: "ESPN", id: "UCiWLfSweyRNmLpgEHekhoAg", baseballOnly: true },
  { name: "ESPN MLB", id: "UCvHm-lDQEhRJNCd8BdpzDkQ" },
  { name: "Los Angeles Angels", id: "UCS7H_WWPj5_qfD-zoUzuX2A" },
  { name: "Arizona Diamondbacks", id: "UCxeK534L7DDIwPFv_o9CZjw" },
  { name: "Baltimore Orioles", id: "UC2jqf9lgDjMUtTow1Q4IKzg" },
  { name: "Boston Red Sox", id: "UCoLrny_Oky6BE206kOfTmiw" },
  { name: "Chicago Cubs", id: "UCnU7B7B0U0t2vs-2HMLjgvg" },
  { name: "Cincinnati Reds", id: "UCENXPJrzbHXudxhURfk5NCg" },
  { name: "Cleveland Guardians", id: "UCpI50OSBxxalmRZRq4gtRDw" },
  { name: "Colorado Rockies", id: "UCBci3py0IfkjkjPKDE-B6Bw" },
  { name: "Detroit Tigers", id: "UCKKG465DFaJ3Yp-jQHA3jhw" },
  { name: "Houston Astros", id: "UC3RPfeyaEIPosC4eIcNr4Gw" },
  { name: "Kansas City Royals", id: "UCvA2SgPVi3Hw6n_WER0VrcQ" },
  { name: "Los Angeles Dodgers", id: "UC05cNJvMKzDLRPo59X2Xx7g" },
  { name: "Washington Nationals", id: "UCUnB3WNX238eraj5IK3fFEw" },
  { name: "New York Mets", id: "UCgIMbGazP0uBDy9JVCqBUaA" },
  { name: "Athletics", id: "UCeiRABiGBQTzpuEYohN_I1Q" },
  { name: "Pittsburgh Pirates", id: "UCmBaK2wdmP1LZ9gLkkHiM4Q" },
  { name: "San Diego Padres", id: "UCdhukF6o5_ENjbf_9oNGXNQ" },
  { name: "Seattle Mariners", id: "UCWWLs-O8JGYYcNea7AgumAA" },
  { name: "San Francisco Giants", id: "UCpXMHgjrpnynDSV5mXpqImw" },
  { name: "St. Louis Cardinals", id: "UCwaMqLYzbyp2IbFgcF_s5Og" },
  { name: "Tampa Bay Rays", id: "UCZaT7TplNF541ySP8SlHVGA" },
  { name: "Texas Rangers", id: "UCZjXWMvOrhc91chSDPDUspA" },
  { name: "Toronto Blue Jays", id: "UCVPkZh_H6m_stW8hq-2-yNw" },
  { name: "Minnesota Twins", id: "UCkXEh3jSl4oB1mQqjIePfTg" },
  { name: "Philadelphia Phillies", id: "UCWkTX0S0Ii5pT2aRVz7Zctw" },
  { name: "Atlanta Braves", id: "UCNWnkblY5_kmf4OQ9l0LgnA" },
  { name: "Chicago White Sox", id: "UCve-Ci-M4CkBOmNi2LQdCRg" },
  { name: "Miami Marlins", id: "UC1Gh_pQ7l41tyBn2HeJ1k-A" },
  { name: "New York Yankees", id: "UCmAQ_4ELJodnKuNqviK86Dg" },
  { name: "Milwaukee Brewers", id: "UCybiT6P8jSv7gIxC4cHXl2Q" },
]

const names = new Set(VIDEO_CHANNELS.map((channel) => channel.name.toLowerCase()))

export function allowedVideoAuthor(author: string): boolean {
  return names.has(author.trim().toLowerCase())
}

const BASEBALL = /\b(mlb|baseball|world series|home run|homer|pitcher|inning|batting|alcs|nlcs|wild[\s-]?card|pennant|cy young|silver slugger)\b/i
const OTHER_SPORT = /\b(nfl|nba|nhl|ufc|pga|nascar|mls|football|basketball|hockey|soccer)\b/i
const BASEBALL_FOCUS = /\b(baseball|world series|home run|homer|inning)\b/i

export function baseballClip(title: string): boolean {
  const lower = title.toLowerCase()
  const club = clubsIn(title).some((entry) => {
    if (entry.nick === "Giants") return /san francisco|\bsf\b/.test(lower)
    if (entry.nick === "Rangers") return /\btexas\b/.test(lower)
    if (entry.nick === "Cardinals") return /st\.?\s*louis/.test(lower)
    return true
  })
  if (!club && !BASEBALL.test(title)) return false
  if (OTHER_SPORT.test(title) && !club && !BASEBALL_FOCUS.test(title)) return false
  return true
}
