import { useEffect, useRef } from "react"
import banner from "./assets/banner.jpg"
import photo from "./assets/jacob.jpg"

const LINKS = [
  { name: "Instagram", href: "https://www.instagram.com/jacobtalksbaseball/" },
  { name: "TikTok", href: "https://www.tiktok.com/@jacobtalksbaseball" },
  { name: "YouTube", href: "https://www.youtube.com/@jacobtalks-baseball" },
  { name: "Facebook", href: "https://www.facebook.com/profile.php?id=61595596657892" },
]

export function ProfileButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="profile-fab" onClick={onOpen} aria-label="Jacob Olenick">
      <img src={photo} alt="" />
    </button>
  )
}

export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    dialog.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  return (
    <div className="sheet-root" onClick={onClose}>
      <div
        ref={dialog}
        className="sheet profile-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <img className="profile-banner" src={banner} alt="" />
        <button type="button" className="sheet-close profile-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2 L12 12 M12 2 L2 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <img className="profile-photo" src={photo} alt="" />
        <div className="profile-body">
          <h2 id="profile-title">Jacob Olenick</h2>
          <p>A baseball creator and fan of the game.</p>
          <div className="social-list">
            {LINKS.map((link) => (
              <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer">
                <span>{link.name}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M4 10 L10 4 M6 4 H10 V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
