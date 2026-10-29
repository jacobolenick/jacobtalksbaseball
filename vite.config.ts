import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { handleApi } from "./src/server/api"

function mlbFeeds(): Plugin {
  const attach = (middlewares: { use: (handler: (req: { url?: string }, res: NodeResponse, next: () => void) => void) => void }) => {
    middlewares.use(async (req, res, next) => {
      const result = await handleApi(req.url ?? "")
      if (!result) {
        next()
        return
      }
      res.statusCode = result.status
      for (const [name, value] of Object.entries(result.headers)) {
        if (name.toLowerCase() === "netlify-cdn-cache-control") continue
        res.setHeader(name, value)
      }
      res.end(result.body)
    })
  }

  return {
    name: "mlb-feeds",
    configureServer(server) {
      attach(server.middlewares)
    },
    configurePreviewServer(server) {
      attach(server.middlewares)
    },
  }
}

type NodeResponse = {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body?: string) => void
}

export default defineConfig({
  plugins: [react(), mlbFeeds()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
})
