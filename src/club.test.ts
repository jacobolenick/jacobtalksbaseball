import assert from "node:assert/strict"
import test from "node:test"
import { coachesFromRoster, divisionWinnerIds, everyClubIsListed, money, rosterGroups, seriesWinner } from "./club"

test("every club is listed once with a payroll and front office", () => {
  assert.equal(everyClubIsListed(), true)
})

test("money formats whole dollars", () => {
  assert.equal(money(146_206_320), "$146,206,320")
})

test("a World Series winner needs four wins", () => {
  const games = [
    { awayId: 139, homeId: 158, awayScore: 2, homeScore: 3, final: true },
    { awayId: 139, homeId: 158, awayScore: 4, homeScore: 5, final: true },
    { awayId: 158, homeId: 139, awayScore: 10, homeScore: 1, final: true },
    { awayId: 158, homeId: 139, awayScore: 3, homeScore: 4, final: true },
    { awayId: 158, homeId: 139, awayScore: 4, homeScore: 1, final: true },
  ]
  assert.equal(seriesWinner(games), 158)
  assert.equal(seriesWinner(games.slice(0, 3)), null)
})

test("division titles follow the standings flag", () => {
  assert.deepEqual(
    divisionWinnerIds([
      { teamId: 139, divisionChamp: true },
      { teamId: 147, divisionChamp: false },
    ]),
    [139],
  )
})

test("coaches keep one row per person and list the manager first", () => {
  const coaches = coachesFromRoster([
    { person: { id: 1, fullName: "Chris Hook" }, title: "Pitching Coach", job: "Pitching Coach" },
    { person: { id: 2, fullName: "Pat Murphy" }, title: "Manager", job: "Manager" },
    { person: { id: 2, fullName: "Pat Murphy" }, title: "Manager", job: "Manager" },
  ])
  assert.deepEqual(
    coaches.map((coach) => coach.name),
    ["Pat Murphy", "Chris Hook"],
  )
})

test("roster groups players and skips a repeated person id only by position", () => {
  const groups = rosterGroups([
    { person: { id: 10, fullName: "Aaron Ashby" }, position: { abbreviation: "P" }, jerseyNumber: "26" },
    { person: { id: 11, fullName: "William Contreras" }, position: { abbreviation: "C" }, jerseyNumber: "24" },
    { person: { id: 12, fullName: "Sal Frelick" }, position: { abbreviation: "RF" }, jerseyNumber: "10" },
  ])
  assert.deepEqual(
    groups.map((group) => group.label),
    ["Pitchers", "Catchers", "Outfielders"],
  )
  assert.equal(groups[0]?.players[0]?.number, "26")
})
