import assert from "node:assert/strict"
import test from "node:test"
import { boxFromApi, gamesFromSchedule, linescoreFromApi, pickHighlight, videosFromYouTube } from "./scores"

const schedule = {
  dates: [
    {
      date: "2026-10-28",
      games: [
        {
          gamePk: 849799,
          gameType: "W",
          status: { abstractGameState: "Final" },
          teams: {
            away: { score: 4, team: { id: 158, name: "Milwaukee Brewers" } },
            home: { score: 1, team: { id: 139, name: "Tampa Bay Rays" } },
          },
        },
      ],
    },
    {
      date: "2026-06-15",
      games: [
        {
          gamePk: 823452,
          gameType: "R",
          status: { abstractGameState: "Final" },
          teams: {
            away: { score: 0, team: { id: 146, name: "Miami Marlins" } },
            home: { score: 7, team: { id: 143, name: "Philadelphia Phillies" } },
          },
        },
        {
          gamePk: 1,
          gameType: "R",
          status: { abstractGameState: "Preview" },
          teams: {
            away: { team: { id: 147, name: "New York Yankees" } },
            home: { team: { id: 111, name: "Boston Red Sox" } },
          },
        },
      ],
    },
  ],
}

test("schedule keeps final scores and drops games without a result", () => {
  const games = gamesFromSchedule(schedule)
  assert.deepEqual(
    games.map((game) => [game.date, game.awayName, game.awayScore, game.homeName, game.homeScore]),
    [
      ["2026-10-28", "Brewers", 4, "Rays", 1],
      ["2026-06-15", "Marlins", 0, "Phillies", 7],
    ],
  )
})

test("highlight picker stays on the MLB recap for that date", () => {
  const id = pickHighlight(
    [
      { id: "old", title: "Marlins vs. Phillies Game Highlights (6/15/22) | MLB Highlights", author: "MLB" },
      { id: "next", title: "MARLINS vs. PHILLIES Full Game Highlights (6/16/26) | MLB Highlights", author: "MLB" },
      { id: "right", title: "MARLINS vs. PHILLIES Game Highlights (6/15/26) | MLB Highlights", author: "MLB" },
      { id: "sim", title: "Philadelphia Phillies Vs Miami Marlins Full Game Highlights June 15, 2026", author: "MLB SIM CENTRAL" },
    ],
    ["Marlins"],
    ["Phillies"],
    "2026-06-15",
  )
  assert.equal(id, "right")
})

test("highlight picker prefers the MLB full game over a single inning", () => {
  const id = pickHighlight(
    [
      { id: "inning", title: "5th INNING FRENZY: Brewers add on against the Rays | MLB Highlights (October 28)", author: "MLB" },
      { id: "game4", title: "BREWERS vs. RAYS: World Series Full Game 4 Highlights (October 27) | 2026 MLB Postseason", author: "MLB" },
      { id: "full", title: "BREWERS vs. RAYS: World Series Full Game 5 Highlights (October 28) | 2026 MLB Postseason", author: "MLB" },
    ],
    ["Brewers"],
    ["Rays"],
    "2026-10-28",
  )
  assert.equal(id, "full")
})

test("highlights stay on MLB, ESPN, and club channels", () => {
  const id = pickHighlight(
    [
      { id: "fan", title: "MARLINS vs. PHILLIES Game Highlights (6/15/26) | MLB Highlights", author: "MLB SIM CENTRAL" },
      { id: "espn", title: "MARLINS vs. PHILLIES Game Highlights (6/15/26)", author: "ESPN" },
    ],
    ["Marlins"],
    ["Phillies"],
    "2026-06-15",
  )
  assert.equal(id, "espn")
  const none = pickHighlight(
    [{ id: "fan", title: "MARLINS vs. PHILLIES Game Highlights (6/15/26)", author: "Highlight Heaven" }],
    ["Marlins"],
    ["Phillies"],
    "2026-06-15",
  )
  assert.equal(none, null)
})

test("youtube search results become highlight hits", () => {
  const hits = videosFromYouTube({
    contents: { videoRenderer: { videoId: "abc123def45", title: { simpleText: "A highlight" }, ownerText: { runs: [{ text: "MLB" }] } } },
  })
  assert.deepEqual(hits, [{ id: "abc123def45", title: "A highlight", author: "MLB" }])
})

test("box score keeps the starters and every pitcher", () => {
  const box = boxFromApi({
    teams: {
      away: { pitchers: [], players: {} },
      home: {
        pitchers: [1, 2],
        players: {
          ID1: {
            person: { id: 1, fullName: "Drew Rasmussen" },
            position: { abbreviation: "P" },
            battingOrder: "900",
            stats: { pitching: { inningsPitched: "4.0", hits: 5, earnedRuns: 1, baseOnBalls: 1, strikeOuts: 4, gamesStarted: 1 } },
          },
          ID2: {
            person: { id: 2, fullName: "Kevin Kelly" },
            position: { abbreviation: "P" },
            stats: { pitching: { inningsPitched: "0.2", hits: 2, earnedRuns: 1, baseOnBalls: 0, strikeOuts: 1, gamesStarted: 0 } },
          },
          ID3: {
            person: { id: 3, fullName: "Yandy Díaz" },
            position: { abbreviation: "DH" },
            battingOrder: "100",
            stats: {},
          },
          ID4: {
            person: { id: 4, fullName: "Richie Palacios" },
            position: { abbreviation: "2B" },
            battingOrder: "701",
            stats: {},
          },
        },
      },
    },
  })
  assert.deepEqual(
    box?.home.starters.map((starter) => starter.name),
    ["Yandy Díaz", "Drew Rasmussen"],
  )
  assert.equal(box?.home.pitchers[0]?.started, true)
  assert.equal(box?.home.pitchers[1]?.name, "Kevin Kelly")
  assert.equal(box?.home.pitchers[0]?.ip, "4.0")
})

test("linescore keeps each inning", () => {
  const line = linescoreFromApi({
    innings: [
      { num: 1, away: { runs: 0 }, home: { runs: 1 } },
      { num: 2, away: { runs: 2 }, home: { runs: 0 } },
    ],
    teams: { away: { runs: 2, hits: 6, errors: 1 }, home: { runs: 1, hits: 4, errors: 0 } },
  })
  assert.equal(line?.innings.length, 2)
  assert.equal(line?.away.runs, 2)
  assert.equal(line?.innings[1]?.home, 0)
})
