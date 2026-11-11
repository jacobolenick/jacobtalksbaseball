import assert from "node:assert/strict"
import test from "node:test"
import {
  decisionsFromLidom,
  decisionsFromNpb,
  directoryFromGames,
  gamesFromLmb,
  gamesFromSpaia,
  linescoreFromLidom,
  linescoreFromNpb,
  lmbStories,
  npbGameUrl,
  pitchersFromNpb,
  recordLabel,
  rosterFromLmb,
  rosterFromNpb,
  seriesName,
} from "./worldParse"

test("NPB schedule keeps league games and tags the Japan Series", () => {
  const games = gamesFromSpaia([
    { GameID: 1, GameKindID: 5, GameState: 2, DateJPN: 20260221, VTeamID: 1, HTeamID: 5, VScore: 1, HScore: 2 },
    { GameID: 2, GameKindID: 2, GameState: 2, DateJPN: 20260327, VTeamID: 7, HTeamID: 9, VScore: 1, HScore: 3, Visitor_StarterPitcher_NameL: "Imai", Home_StarterPitcher_NameL: "Sasaki" },
    { GameID: 10, GameKindID: 1, GameState: 2, DateJPN: 20261001, VTeamID: 1, HTeamID: 5, VScore: 1, HScore: 4 },
    { GameID: 3, GameKindID: 26, GameState: 2, DateJPN: 20260602, VTeamID: 1, HTeamID: 12, VScore: 4, HScore: 2 },
    { GameID: 4, GameKindID: 36, GameState: 2, DateJPN: 20261010, VTeamID: 1, HTeamID: 5, VScore: 1, HScore: 3 },
    { GameID: 5, GameKindID: 3, GameState: 2, DateJPN: 20261024, VTeamID: 5, HTeamID: 12, VScore: 2, HScore: 5 },
    { GameID: 6, GameKindID: 3, GameState: 2, DateJPN: 20261025, VTeamID: 5, HTeamID: 12, VScore: 1, HScore: 4 },
    { GameID: 7, GameKindID: 3, GameState: 2, DateJPN: 20261026, VTeamID: 12, HTeamID: 5, VScore: 6, HScore: 3 },
    { GameID: 8, GameKindID: 3, GameState: 2, DateJPN: 20261027, VTeamID: 12, HTeamID: 5, VScore: 2, HScore: 1 },
    { GameID: 9, GameKindID: 1, GameState: 1, DateJPN: 20260401, VTeamID: 1, HTeamID: 5, VScore: null, HScore: null },
  ])
  assert.equal(games.some((game) => game.id === 1), false)
  assert.equal(games.find((game) => game.id === 2)?.gameType, "R")
  assert.equal(games.find((game) => game.id === 2)?.awayName, "Lions")
  assert.equal(games.find((game) => game.id === 3)?.gameType, "I")
  assert.equal(games.find((game) => game.id === 4)?.gameType, "C")
  assert.equal(games.find((game) => game.id === 5)?.gameType, "W")
  assert.equal(npbGameUrl(games, 2), "https://npb.jp/scores/2026/0327/m-l-01/")
  const directory = directoryFromGames("npb", games, "2026-11-10")
  assert.equal(directory.honors.championId, 12)
  assert.ok(directory.honors.divisionIds.includes(5))
  assert.equal(seriesName("W"), "Japan Series")
})

test("NPB linescore, decisions, pitchers, and roster parse the official markup", () => {
  const lines = linescoreFromNpb(`
    <table id="tablefix_ls"><tbody>
      <tr class="top"><th>阪神</th><td>0</td><td>1</td><td class="total-1">1</td><td class="total-2">4</td><td class="total-2">0</td></tr>
      <tr><th>巨人</th><td>2</td><td>x</td><td class="total-1">3</td><td class="total-2">6</td><td class="total-2">0</td></tr>
    </tbody></table>`)
  assert.equal(lines?.away.runs, 1)
  assert.equal(lines?.innings[1]?.home, null)
  assert.deepEqual(decisionsFromNpb("【勝投手】<a>竹丸</a>【敗投手】<a>村上</a>"), { win: "竹丸", loss: "村上", save: "" })
  const pitchers = pitchersFromNpb(`<tbody><tr><td>●</td><td class="player"><a>村上</a></td><td>101</td><td>23</td><td><table class="table_inning"><tr><th>6</th><td></td></tr></table></td><td>5</td><td>2</td><td>2</td><td>0</td><td>7</td><td>0</td><td>0</td><td>3</td><td>3</td></tr></tbody>`)
  assert.equal(pitchers[0]?.name, "村上")
  assert.equal(pitchers[0]?.ip, "6.0")
  assert.equal(pitchers[0]?.k, "7")
  assert.equal(pitchers[0]?.started, true)
  const roster = rosterFromNpb(`<table class="rosterlisttbl">
    <tr class="rosterMainHead"><th class="rosterPos">監督</th></tr>
    <tr class="rosterPlayer"><td>83</td><td class="rosterRegister">阿部　慎之助</td></tr>
    <tr class="rosterMainHead"><th class="rosterPos"><a name="pit">投手</a></th></tr>
    <tr class="rosterPlayer"><td>18</td><td class="rosterRegister">菅野</td></tr>
  </table>`)
  assert.equal(roster.coaches[0]?.name, "阿部 慎之助")
  assert.equal(roster.groups[0]?.label, "Pitchers")
  assert.equal(roster.groups[0]?.players[0]?.number, "18")
})

test("Mexican League games keep linescores and the Serie del Rey", () => {
  const regular = lmbGame(1, "2026-04-16", "Piratas", "Diablos Rojos", 2, 4)
  const finalGames = [1, 2, 3, 4].map((index) => lmbGame(10 + index, "2026-09-10", "Olmecas", "Toros", 1, 4))
  const games = gamesFromLmb([{ games_info: [regular, ...finalGames] }])
  assert.equal(games.find((game) => game.id === 1)?.gameType, "R")
  assert.equal(games.find((game) => game.id === 1)?.linescore?.home.runs, 4)
  assert.equal(games.filter((game) => game.gameType === "K").length, 4)
  const directory = directoryFromGames("lmb", games, "2026-11-10")
  assert.equal(directory.honors.championLabel, "Serie del Rey")
  assert.equal(directory.honors.championId, 210)
  assert.equal(recordLabel({ id: 1, wins: 60, losses: 31, ties: 0 }), "60–31")
})

test("LIDOM linescore follows the away and home names", () => {
  const html = `
    <table id="juego_1"><tbody>
      <tr><td>Leones del Escogido</td><td>1</td><td>0</td><td>6</td><td>11</td><td>1</td></tr>
      <tr><td>Estrellas Orientales</td><td>0</td><td>4</td><td>4</td><td>8</td><td>0</td></tr>
    </tbody></table>
    W: Kelly Austin (3-1) L: Eddy Yean (0-1) SV: Robinson Martinez`
  const lines = linescoreFromLidom(html, "Escogido", "Estrellas")
  assert.equal(lines?.away.runs, 6)
  assert.equal(lines?.home.runs, 4)
  assert.equal(decisionsFromLidom(html).win, "Kelly Austin")
})

test("league news and roster cards keep real titles and players", () => {
  const stories = lmbStories(`"Diablos Rojos y Teamworks unen fuerzas","/noticias/diablos-rojos-y-teamworks-unen-fuerzas"`)
  assert.equal(stories[0]?.title, "Diablos Rojos y Teamworks unen fuerzas")
  const roster = rosterFromLmb(`<h3 class="RosterList_headerTitle__qz7Np">Lanzadores</h3><a href="/jugador/571736"><img alt="Brooks Hall #19"><p class="RosterList_playerStatValue__YWjJ7">P</p></a>`)
  assert.equal(roster.groups[0]?.players[0]?.name, "Brooks Hall")
  assert.equal(roster.groups[0]?.players[0]?.number, "19")
  assert.equal(roster.groups[0]?.players[0]?.position, "P")
})

function lmbGame(id: number, iso: string, away: string, home: string, awayScore: number, homeScore: number) {
  const [year, month, day] = iso.split("-").map(Number)
  const stamp = Date.UTC(year, month - 1, day, 19 + 6, 0, 0) / 1000
  return {
    gameId: id,
    status: "F",
    canceledSubStatus: "",
    date_time: stamp,
    awayTeam: { name: away, runsScored: awayScore, totalHits: 7, totalErrors: 0, probablePitcher: "Away Starter" },
    localTeam: { name: home, runsScored: homeScore, totalHits: 8, totalErrors: 1, probablePitcher: "Home Starter" },
    winningPitcher: { name: "Winner" },
    losingPitcher: { name: "Loser" },
    savedBy: { name: "" },
    lineScore: [{ inningNumber: 1, awayTeamRuns: awayScore, homeTeamRuns: homeScore }],
  }
}
