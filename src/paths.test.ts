import assert from "node:assert/strict"
import test from "node:test"
import { pathForTab, tabFromPath } from "./paths"

test("each tab has its own path", () => {
  assert.equal(pathForTab("moves"), "/mlbmoves")
  assert.equal(pathForTab("feed"), "/newsfeed")
  assert.equal(pathForTab("scores"), "/scores")
  assert.equal(pathForTab("teams"), "/teams")
  assert.equal(pathForTab("profile"), "/jacob")
  assert.equal(tabFromPath("/mlbmoves"), "moves")
  assert.equal(tabFromPath("/newsfeed/"), "feed")
  assert.equal(tabFromPath("/scores"), "scores")
  assert.equal(tabFromPath("/teams"), "teams")
  assert.equal(tabFromPath("/jacob"), "profile")
  assert.equal(tabFromPath("/"), "moves")
  assert.equal(tabFromPath("/anything-else"), "moves")
})
