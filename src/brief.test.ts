import assert from "node:assert/strict"
import test from "node:test"
import { briefFromHtml } from "./brief"
import { linesFromStats } from "./profile"

const html = `
<h1>Michael King Declines Player Option</h1>
<div class="entry-content">
  <p>Right-hander Michael King has declined his 2027 player option, reports Jon Heyman. He is now a free agent.</p>
  <p>It was technically a three-year, $75MM guarantee. That broke down as a $12MM signing bonus, a $5MM salary in 2026, a $28MM player option for 2027 with a $5MM buyout, followed by a $30MM player option for 2028.</p>
</div>
<div id="comments"><p>This comment should not be summarized into the brief at all, even though it is long enough.</p></div>
`

test("report brief keeps the lead and pulls contract figures", () => {
  const brief = briefFromHtml(html, "https://www.mlbtraderumors.com/example")
  assert.ok(brief)
  assert.equal(brief?.title, "Michael King Declines Player Option")
  assert.match(brief?.summary ?? "", /declined his 2027 player option/)
  assert.doesNotMatch(brief?.summary ?? "", /comment should not/)
  assert.ok(brief?.terms.includes("three-year, $75MM guarantee"))
  assert.ok(brief?.terms.some((term) => term.includes("$28MM player option")))
  assert.equal(brief?.source, "MLB Trade Rumors")
})

test("pitching and hitting lines use the right columns", () => {
  const lines = linesFromStats(
    [
      {
        type: { displayName: "season" },
        group: { displayName: "pitching" },
        splits: [
          {
            season: "2026",
            team: { id: 135, name: "San Diego Padres" },
            stat: {
              wins: 12,
              losses: 10,
              era: "3.21",
              inningsPitched: "185.0",
              strikeOuts: 159,
              gamesStarted: 32,
              gamesPlayed: 32,
              whip: "1.18",
              baseOnBalls: 70,
              hits: 148,
            },
          },
        ],
      },
      {
        type: { displayName: "career" },
        group: { displayName: "hitting" },
        splits: [{ stat: { avg: ".000", plateAppearances: 4, atBats: 4, gamesPlayed: 4 } }],
      },
    ],
    true,
  )
  assert.equal(lines.length, 1)
  assert.equal(lines[0]?.heading, "2026 · San Diego Padres")
  assert.equal(lines[0]?.cells[0]?.value, "12-10")
  assert.equal(lines[0]?.cells[4]?.value, "1.18")
})
