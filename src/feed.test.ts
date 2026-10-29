import assert from "node:assert/strict"
import test from "node:test"
import { baseballClip } from "./channels"
import { channelEntries, datedUploads, mergeUploads, newsFromRss, postedWithin, uploadsFromChannel, videosFromAtom } from "./feed"
import { handleApi } from "./server/api"

const news = `
<item>
  <title><![CDATA[King opts out of deal with Padres]]></title>
  <link>https://www.mlb.com/news/michael-king-free-agent-2027</link>
  <pubDate>Thu, 29 Oct 2026 18:22:00 GMT</pubDate>
  <dc:creator>Max Ralph</dc:creator>
  <description><![CDATA[The right-hander declined his option.]]></description>
  <image href="https://img.mlbstatic.com/mlb-images/example.jpg"/>
</item>
<item>
  <title>Watch the clincher</title>
  <link>https://mlb-cuts-diamond.mlb.com/highlight.mp4</link>
  <pubDate>Thu, 29 Oct 2026 04:26:53 GMT</pubDate>
</item>
`

const video = `
<entry>
  <yt:videoId>mn4Phl8gmY4</yt:videoId>
  <title>Jacob Misiorowski picked up two wins</title>
  <published>2026-10-29T20:00:29+00:00</published>
  <author><name>MLB</name></author>
  <media:group>
    <media:thumbnail url="https://i.ytimg.com/vi/mn4Phl8gmY4/hqdefault.jpg" width="480" height="360"/>
    <media:description>Don't forget to subscribe!</media:description>
  </media:group>
</entry>
`

test("news keeps MLB.com stories and drops raw video files", () => {
  const items = newsFromRss(news)
  assert.equal(items.length, 1)
  assert.equal(items[0]?.title, "King opts out of deal with Padres")
  assert.equal(items[0]?.author, "Max Ralph")
  assert.equal(items[0]?.text, "The right-hander declined his option.")
  assert.equal(items[0]?.image, "https://img.mlbstatic.com/mlb-images/example.jpg")
  assert.equal(items[0]?.kind, "news")
})

test("youtube entries become playable videos", () => {
  const items = videosFromAtom(video, "short")
  assert.equal(items.length, 1)
  assert.equal(items[0]?.videoId, "mn4Phl8gmY4")
  assert.equal(items[0]?.kind, "short")
  assert.equal(items[0]?.text, "")
  assert.match(items[0]?.image ?? "", /hqdefault/)
})

test("channel videos and shorts become feed entries", () => {
  const now = Date.parse("2026-10-29T23:00:00Z")
  const videos = channelEntries(
    {
      lockupViewModel: {
        contentId: "c8VkFj_mlGI",
        metadata: {
          lockupMetadataViewModel: {
            title: { content: "Aaron Ashby heroics" },
            metadata: { contentMetadataViewModel: { metadataRows: [{ metadataParts: [{ text: { content: "7 minutes ago" } }] }] } },
          },
        },
      },
    },
    "video",
    now,
  )
  assert.equal(videos[0]?.id, "c8VkFj_mlGI")
  assert.equal(videos[0]?.title, "Aaron Ashby heroics")
  assert.equal(videos[0]?.published, "2026-10-29T22:53:00.000Z")
  const shorts = channelEntries(
    {
      shortsLockupViewModel: {
        accessibilityText: "Contreras doubles, 5.5 thousand views - play Short",
        onTap: { innertubeCommand: { reelWatchEndpoint: { videoId: "38fgWxWs__0" } } },
      },
    },
    "short",
    now,
  )
  assert.equal(shorts[0]?.id, "38fgWxWs__0")
  assert.equal(shorts[0]?.title, "Contreras doubles")
})

test("espn clips stay on baseball and club uploads keep their name", () => {
  const espn = uploadsFromChannel(
    { name: "ESPN", id: "espn", baseballOnly: true },
    [
      { id: "base", title: "Dodgers walk off in the 9th", published: "2026-10-29T00:00:00.000Z" },
      { id: "nfl", title: "Giants beat the Cowboys on Sunday", published: "2026-10-29T01:00:00.000Z" },
      { id: "hockey", title: "Rangers win in overtime", published: "2026-10-29T02:00:00.000Z" },
    ],
  )
  assert.deepEqual(espn.map((entry) => entry.id), ["base"])
  assert.equal(espn[0]?.author, "ESPN")
  assert.equal(baseballClip("Texas Rangers homer"), true)
  assert.equal(baseballClip("St. Louis Cardinals"), true)
  assert.equal(baseballClip("NFL trades, MLB champions crowned, and NHL latest"), false)
  const merged = mergeUploads([
    [{ id: "a", title: "A", published: "2026-10-28T00:00:00.000Z", author: "MLB" }],
    [
      { id: "a", title: "A again", published: "2026-10-29T00:00:00.000Z", author: "New York Yankees" },
      { id: "b", title: "B", published: "2026-10-29T01:00:00.000Z", author: "ESPN MLB" },
    ],
  ])
  assert.deepEqual(merged.map((entry) => entry.id), ["b", "a"])
  assert.equal(merged[1]?.author, "MLB")
})

test("site pages are not feed routes", async () => {
  assert.equal(await handleApi("/"), null)
  const empty = await handleApi("/api/highlight?q=")
  assert.equal(empty?.status, 400)
})

test("shorts keep the last three days", () => {
  const now = Date.parse("2026-10-29T23:00:00Z")
  const dated = datedUploads(
    [
      { id: "new", title: "New", published: "1970-01-01T00:00:00.000Z" },
      { id: "old", title: "Old", published: "1970-01-01T00:00:00.000Z" },
      { id: "missing", title: "Missing", published: "1970-01-01T00:00:00.000Z" },
    ],
    new Map([
      ["new", "2026-10-28T12:00:00Z"],
      ["old", "2026-10-20T12:00:00Z"],
    ]),
  )
  assert.deepEqual(
    postedWithin(dated, 3, now).map((entry) => entry.id),
    ["new"],
  )
})
