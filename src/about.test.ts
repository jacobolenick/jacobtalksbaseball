import assert from "node:assert/strict"
import test from "node:test"
import { BONUS_PARKS, PARKS } from "./about"
import { CLUBS } from "./teams"

test("the ballpark list is the 30 current parks", () => {
  assert.equal(PARKS.length, 30)
  assert.deepEqual(
    [...PARKS.map((park) => park.teamId)].sort((a, b) => a - b),
    CLUBS.map((club) => club.id).sort((a, b) => a - b),
  )
})

test("visited parks are Pittsburgh, Yankee Stadium, Citi Field, Dodger Stadium, Cleveland, and Miami", () => {
  assert.deepEqual(
    PARKS.filter((park) => park.been).map((park) => park.name).sort(),
    ["Citi Field", "Dodger Stadium", "PNC Park", "Progressive Field", "Yankee Stadium", "loanDepot park"],
  )
  assert.deepEqual(
    BONUS_PARKS.map((park) => park.name),
    ["Shea Stadium", "Old Yankee Stadium"],
  )
})
