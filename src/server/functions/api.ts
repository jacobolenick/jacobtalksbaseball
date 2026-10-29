import { handleApi } from "../api"

export default async (req: Request) => {
  const url = new URL(req.url)
  const result = await handleApi(`${url.pathname}${url.search}`, { cache: true })
  if (!result) return new Response("Not found", { status: 404 })
  return new Response(result.body, { status: result.status, headers: result.headers })
}

export const config = {
  path: "/api/*",
}
