export function YouTubeFrame({ id, title }: { id: string; title: string }) {
  const origin = window.location.origin
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    playsinline: "1",
    origin,
    widget_referrer: `${origin}/`,
  })
  return (
    <iframe
      src={`https://www.youtube.com/embed/${id}?${params.toString()}`}
      title={title}
      referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  )
}
