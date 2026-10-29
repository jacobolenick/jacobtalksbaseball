import assert from "node:assert/strict"
import test from "node:test"
import { movesFromReport, type Report } from "./headlines"
import { movesFromTransactions } from "./transactions"
import { assemble } from "./wire"
import { clubsIn } from "./teams"

const mariners =
  "The Mariners announced Thursday that they’ve exercised their $9MM club option on closer Andrés Muñoz. Seattle declined a $6.075MM club option on righty Bryce Miller and a $9MM club option on outfielder Victor Robles. Miller remains under club control through 2029 via arbitration. The one-year deal he signed when avoiding arbitration last offseason included a club option. Robles, meanwhile, receives a $500K buyout and is now a free agent."

function report(partial: Partial<Report> & Pick<Report, "title">): Report {
  return {
    link: "https://www.mlbtraderumors.com/example",
    date: "2026-10-29",
    stamp: Date.parse("2026-10-29T19:00:00Z"),
    categories: [],
    text: partial.title,
    source: "MLB Trade Rumors",
    ...partial,
  }
}

test("splits the Mariners option decisions by player", () => {
  const moves = movesFromReport(
    report({
      title: "Mariners Announce Three Option Decisions",
      categories: ["Seattle Mariners", "Transactions", "Andres Munoz", "Bryce Miller", "Victor Robles"],
      text: mariners,
    }),
  )
  const byName = Object.fromEntries(moves.map((move) => [move.playerName, move]))
  assert.equal(byName["Andres Munoz"].chip, "Picked up")
  assert.equal(byName["Andres Munoz"].detail, "Mariners · Club option")
  assert.equal(byName["Bryce Miller"].chip, "Declined")
  assert.equal(byName["Victor Robles"].chip, "Declined")
  assert.equal(byName["Victor Robles"].kind, "option-declined")
})

test("reads opt-outs, opt-ins, and club options from headlines", () => {
  const burnes = movesFromReport(
    report({
      title: "Corbin Burnes Will Not Opt Out Of Diamondbacks Deal",
      categories: ["Arizona Diamondbacks", "Corbin Burnes"],
      text: "Right-hander Corbin Burnes will not take the opt-out chance in his contract with the Diamondbacks. He will make $35MM annually through the 2030 season.",
    }),
  )
  assert.equal(burnes[0].chip, "Staying")
  assert.equal(burnes[0].detail, "D-backs · Opt-out declined")

  const king = movesFromReport(
    report({
      title: "Michael King Declines Player Option",
      categories: ["Newsstand", "San Diego Padres", "Transactions", "Michael King"],
      text: "Right-hander Michael King has declined his 2027 player option, reports Jon Heyman. He is now a free agent.",
    }),
  )
  assert.equal(king[0].chip, "Opted out")
  assert.equal(king[0].detail, "Padres · Player option")

  const helsley = movesFromReport(
    report({
      title: "Ryan Helsley To Exercise Player Option",
      categories: ["Baltimore Orioles", "Transactions", "Ryan Helsley"],
      text: "Orioles right-hander Ryan Helsley will exercise his $14MM player option and forgo a return to the open market.",
    }),
  )
  assert.equal(helsley[0].chip, "Opted in")
  assert.equal(helsley[0].detail, "Orioles · Player option")

  const weiss = movesFromReport(
    report({
      title: "Astros Decline Club Option On Ryan Weiss",
      categories: ["Houston Astros", "Transactions", "Ryan Weiss"],
      text: "The Astros have declined a $5MM club option on right-hander Ryan Weiss. Weiss will collect a $500K buyout as he returns to free agency.",
    }),
  )
  assert.equal(weiss[0].chip, "Declined")
  assert.equal(weiss[0].kind, "option-declined")

  const imai = movesFromReport(
    report({
      title: "Tatsuya Imai Will Not Opt Out Of Astros Deal",
      categories: ["Houston Astros", "Tatsuya Imai"],
      text: "Right-hander Tatsuya Imai will not opt out of his deal with the Astros. He will have another opt-out chance a year from now.",
    }),
  )
  assert.equal(imai[0].chip, "Staying")
})

test("reads trades, claims, free agency, and skips columns", () => {
  const eaton = movesFromReport(
    report({
      title: "Athletics Acquire Nate Eaton From Red Sox",
      categories: ["Athletics", "Boston Red Sox", "Transactions", "Nate Eaton"],
      text: "The Athletics acquired Nate Eaton from the Red Sox in exchange for Jareth Rayo.",
    }),
  )
  assert.equal(eaton[0].chip, "Traded")
  assert.equal(eaton[0].detail, "Red Sox → A's")

  const claim = movesFromReport(
    report({
      title: "Nationals Claim Braxton Roxby, Designate Zak Kent",
      categories: ["San Francisco Giants", "Washington Nationals", "Transactions", "Braxton Roxby", "Zak Kent"],
      text: "The Nationals have claimed right-hander Braxton Roxby off waivers from the Giants and designated fellow righty Zak Kent for assignment.",
    }),
  )
  const roxby = claim.find((move) => move.playerName === "Braxton Roxby")
  const kent = claim.find((move) => move.playerName === "Zak Kent")
  assert.equal(roxby?.chip, "Claimed")
  assert.equal(roxby?.detail, "Giants → Nationals")
  assert.equal(kent?.chip, "DFA")
  assert.equal(kent?.detail, "Nationals")

  const barrero = movesFromReport(
    report({
      title: "José Barrero Elects Free Agency",
      categories: ["Baltimore Orioles", "Transactions", "Jose Barrero"],
      text: "Infielder José Barrero has elected free agency after being outrighted by the Orioles.",
    }),
  )
  assert.equal(barrero[0].chip, "Free agent")
  assert.equal(barrero[0].detail, "Orioles")

  assert.deepEqual(
    movesFromReport(report({ title: "Diamondbacks Considering First Base Work For Nolan Arenado", categories: ["Nolan Arenado"] })),
    [],
  )
  assert.deepEqual(movesFromReport(report({ title: "Offseason Outlook: Milwaukee Brewers", categories: ["Milwaukee Brewers"] })), [])
  assert.deepEqual(
    movesFromReport(report({ title: "Top 40 Trade Candidates Of The 2026-27 MLB Offseason" })),
    [],
  )
})

test("parses MLB.com style headlines when there is no player tag", () => {
  const king = movesFromReport(
    report({
      title: "King opts out of deal with Padres to become free agent (source)",
      source: "MLB.com",
      text: "Michael King is opting out.",
    }),
  )
  assert.equal(king[0].playerName, "King")
  assert.equal(king[0].chip, "Opted out")
  assert.equal(king[0].detail, "Padres · Player option")

  const split = movesFromReport(
    report({
      title: "Mariners pick up Muñoz's option; Robles becomes free agent",
      source: "MLB.com",
      text: "Seattle made a pair of roster decisions.",
    }),
  )
  assert.equal(split.find((move) => move.playerName === "Muñoz")?.chip, "Picked up")
  assert.equal(split.find((move) => move.playerName === "Robles")?.chip, "Free agent")
})

test("keeps baseball transactions and drops routine roster shuttling", () => {
  const moves = movesFromTransactions([
    {
      id: 1,
      date: "2026-10-29",
      typeCode: "TR",
      description: "Athletics traded RHP Jareth Rayo to Boston Red Sox for LF Nate Eaton.",
      person: { id: 10, fullName: "Jareth Rayo" },
      fromTeam: { id: 133, name: "Athletics" },
      toTeam: { id: 111, name: "Boston Red Sox" },
    },
    {
      id: 2,
      date: "2026-10-29",
      typeCode: "TR",
      description: "Athletics traded RHP Jareth Rayo to Boston Red Sox for LF Nate Eaton.",
      person: { id: 11, fullName: "Nate Eaton" },
      fromTeam: { id: 111, name: "Boston Red Sox" },
      toTeam: { id: 133, name: "Athletics" },
    },
    {
      id: 3,
      date: "2026-10-29",
      typeCode: "SC",
      description: "Houston Astros activated CF Jorge Barrosa.",
      person: { id: 12, fullName: "Jorge Barrosa" },
      toTeam: { id: 117, name: "Houston Astros" },
    },
    {
      id: 4,
      date: "2026-10-29",
      typeCode: "SFA",
      description: "Cleveland Guardians signed free agent LHP Elian Vasquez to a minor league contract.",
      person: { id: 13, fullName: "Elian Vasquez" },
      toTeam: { id: 114, name: "Cleveland Guardians" },
    },
    {
      id: 5,
      date: "2026-10-29",
      typeCode: "DFA",
      description: "LHP Brock Burke elected free agency.",
      person: { id: 14, fullName: "Brock Burke" },
      toTeam: { id: 113, name: "Cincinnati Reds" },
    },
    {
      id: 4,
      date: "2026-10-29",
      typeCode: "SFA",
      description: "Cleveland Guardians signed free agent LHP Elian Vasquez to a minor league contract.",
      person: { id: 13, fullName: "Elian Vasquez" },
      toTeam: { id: 114, name: "Cleveland Guardians" },
    },
  ])

  assert.deepEqual(
    moves.map((move) => `${move.playerName}:${move.chip}:${move.detail}`),
    [
      "Jareth Rayo:Traded:A's → Red Sox",
      "Nate Eaton:Traded:Red Sox → A's",
      "Elian Vasquez:Minors:Guardians · Minor league contract",
      "Brock Burke:Free agent:Reds",
    ],
  )
  assert.deepEqual(moves.find((move) => move.playerName === "Jareth Rayo")?.teamIds, [133, 111])
  assert.deepEqual(moves.find((move) => move.playerName === "Elian Vasquez")?.teamIds, [114])
})

test("lets an option report replace a generic free-agency transaction", () => {
  const txs = movesFromTransactions([
    {
      id: 9,
      date: "2026-10-29",
      typeCode: "DFA",
      description: "RF Victor Robles elected free agency.",
      person: { id: 99, fullName: "Victor Robles" },
      toTeam: { id: 136, name: "Seattle Mariners" },
    },
  ])
  const stories = movesFromReport(
    report({
      title: "Mariners Announce Three Option Decisions",
      categories: ["Seattle Mariners", "Victor Robles"],
      text: "Seattle declined a $9MM club option on outfielder Victor Robles.",
    }),
  )
  const [move] = assemble(txs, stories)
  assert.equal(move.chip, "Declined")
  assert.equal(move.playerId, 99)
  assert.equal(move.detail, "Mariners · Club option")
  assert.match(move.source, /MLB Trade Rumors/)
})

test("a short MLB.com headline does not duplicate a full report", () => {
  const full = movesFromReport(
    report({
      title: "Michael King Declines Player Option",
      categories: ["San Diego Padres", "Michael King"],
      text: "Michael King has declined his 2027 player option.",
    }),
  )
  const short = movesFromReport(
    report({
      title: "King opts out of deal with Padres to become free agent (source)",
      source: "MLB.com",
      text: "King is opting out.",
    }),
  )
  const moves = assemble([], [...full, ...short])
  assert.equal(moves.length, 1)
  assert.equal(moves[0].playerName, "Michael King")
  assert.equal(moves[0].chip, "Opted out")
})

test("club nicknames stay specific", () => {
  assert.deepEqual(
    clubsIn("Chicago White Sox and the Chicago Cubs").map((club) => club.nick),
    ["White Sox", "Cubs"],
  )
  assert.equal(clubsIn("Helsley to remain with O's")[0]?.nick, "Orioles")
  assert.deepEqual(
    clubsIn("Athletics Acquire Nate Eaton From Red Sox").map((club) => club.nick),
    ["A's", "Red Sox"],
  )
})
