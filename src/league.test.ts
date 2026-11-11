import assert from "node:assert/strict"
import test from "node:test"
import { placePath, readPlace } from "./league"

test("foreign leagues have scores, teams, and feed paths", () => {
  assert.deepEqual(readPlace("/npb"), { league: "npb", tab: "scores" })
  assert.deepEqual(readPlace("/npb/feed/"), { league: "npb", tab: "feed" })
  assert.deepEqual(readPlace("/lmb/teams"), { league: "lmb", tab: "teams" })
  assert.deepEqual(readPlace("/lidom/scores"), { league: "lidom", tab: "scores" })
  assert.equal(placePath("npb", "feed"), "/npb/feed")
  assert.equal(placePath("lmb", "moves"), "/lmb/scores")
  assert.equal(placePath("lidom", "teams"), "/lidom/teams")
})

test("MLB paths stay on the original routes", () => {
  assert.deepEqual(readPlace("/"), { league: "mlb", tab: "moves" })
  assert.deepEqual(readPlace("/newsfeed"), { league: "mlb", tab: "feed" })
  assert.deepEqual(readPlace("/jacob"), { league: "mlb", tab: "profile" })
  assert.equal(placePath("mlb", "scores"), "/scores")
  assert.equal(placePath("mlb", "moves"), "/mlbmoves")
})
