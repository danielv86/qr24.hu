import {
  siBandcamp,
  siBehance,
  siBluesky,
  siBuymeacoffee,
  siDiscord,
  siDribbble,
  siFacebook,
  siGithub,
  siGitlab,
  siInstagram,
  siKofi,
  siLine,
  siMastodon,
  siMedium,
  siMessenger,
  siPatreon,
  siPinterest,
  siReddit,
  siSignal,
  siSnapchat,
  siSoundcloud,
  siSpotify,
  siSubstack,
  siTelegram,
  siThreads,
  siTiktok,
  siTumblr,
  siTwitch,
  siViber,
  siVk,
  siWechat,
  siWhatsapp,
  siX,
  siYoutube,
} from 'simple-icons'

/**
 * Kész logók a QR-kód közepére. A márkaszínes négyzetet és a fehér (világos
 * márkáknál sötét) jelet a simple-icons készlete adja, így nincs szükség
 * feltöltésre vagy külső kérésre.
 */
export interface QrBrandLogo {
  id: string
  label: string
  /** Mi nyitható meg a logóval jelölt kód révén, magyarul. */
  description: string
  /** A négyzet márkaszíne, #RRGGBB. */
  color: string
  /** A jel színe a márkaszínen. */
  glyph: string
  /** A jel SVG-útvonala 24 × 24-es nézetben. */
  path: string
}

/** A márkalogó négyzetének lekerekítése a 24 × 24-es nézetben. */
export const BRAND_LOGO_CORNER_RX = 5.5

/** A négyzet lekerekítése százalékban – a kijelölést is ehhez igazítjuk. */
export const BRAND_LOGO_RADIUS_PERCENT = (BRAND_LOGO_CORNER_RX / 24) * 100

function channelLuminance(channel: number): number {
  const value = channel / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function isLight(hex: string): boolean {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  const luminance = 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
  return luminance > 0.55
}

function brand(
  id: string,
  label: string,
  description: string,
  icon: { hex: string; path: string },
): QrBrandLogo {
  const color = `#${icon.hex.toUpperCase()}`
  return {
    id,
    label,
    description,
    color,
    glyph: isLight(color) ? '#0F172A' : '#FFFFFF',
    path: icon.path,
  }
}

/**
 * A LinkedIn ikon a simple-icons készletéből kikerült, ezért a saját,
 * 24 × 24-es útvonalát használjuk.
 */
const LINKEDIN = {
  hex: '0A66C2',
  path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
}

export const SOCIAL_LOGOS: QrBrandLogo[] = [
  brand('instagram', 'Instagram', 'Instagram-profil', siInstagram),
  brand('facebook', 'Facebook', 'Oldal vagy profil', siFacebook),
  brand('tiktok', 'TikTok', 'TikTok-profil', siTiktok),
  brand('youtube', 'YouTube', 'Csatorna vagy videó', siYoutube),
  brand('linkedin', 'LinkedIn', 'Személyes profil vagy céges oldal', LINKEDIN),
  brand('whatsapp', 'WhatsApp', 'Üzenetindítás', siWhatsapp),
  brand('messenger', 'Messenger', 'Messenger-beszélgetés', siMessenger),
  brand('x', 'X', 'Korábbi Twitter', siX),
  brand('pinterest', 'Pinterest', 'Profil vagy gyűjtemény', siPinterest),
  brand('telegram', 'Telegram', 'Profil vagy csatorna', siTelegram),
  brand('snapchat', 'Snapchat', 'Profil', siSnapchat),
  brand('threads', 'Threads', 'Threads-profil', siThreads),
  brand('reddit', 'Reddit', 'Profil vagy subreddit', siReddit),
  brand('discord', 'Discord', 'Szervermeghívó', siDiscord),
  brand('twitch', 'Twitch', 'Streamerprofil', siTwitch),
  brand('spotify', 'Spotify', 'Előadó, album vagy lejátszási lista', siSpotify),
  brand('soundcloud', 'SoundCloud', 'Zenei profil vagy szám', siSoundcloud),
  brand('github', 'GitHub', 'Fejlesztői profil vagy projekt', siGithub),
  brand('behance', 'Behance', 'Portfólió', siBehance),
  brand('dribbble', 'Dribbble', 'Designportfólió', siDribbble),
  brand('bluesky', 'Bluesky', 'Profil', siBluesky),
  brand('mastodon', 'Mastodon', 'Profil', siMastodon),
  brand('tumblr', 'Tumblr', 'Blog vagy profil', siTumblr),
  brand('vk', 'VK', 'Közösségi profil', siVk),
  brand('wechat', 'WeChat', 'Profil vagy hivatalos fiók', siWechat),
  brand('line', 'LINE', 'Profil vagy hivatalos fiók', siLine),
  brand('viber', 'Viber', 'Kapcsolat vagy közösség', siViber),
  brand('signal', 'Signal', 'Üzenetküldési kapcsolat', siSignal),
  brand('medium', 'Medium', 'Szerzői profil vagy cikk', siMedium),
  brand('substack', 'Substack', 'Hírlevél vagy publikáció', siSubstack),
  brand('patreon', 'Patreon', 'Alkotói oldal', siPatreon),
  brand('kofi', 'Ko-fi', 'Támogatói oldal', siKofi),
  brand('buymeacoffee', 'Buy Me a Coffee', 'Támogatói oldal', siBuymeacoffee),
  brand('bandcamp', 'Bandcamp', 'Előadói profil vagy album', siBandcamp),
  brand('gitlab', 'GitLab', 'Fejlesztői profil vagy projekt', siGitlab),
]

export const SOCIAL_LOGO_MAP = new Map(SOCIAL_LOGOS.map(logo => [logo.id, logo]))

/** A márkalogó SVG-jét adat-URL-lé alakítja a QR-kód számára. */
export function brandLogoDataUrl(logo: QrBrandLogo): string {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24">',
    `<rect width="24" height="24" rx="${BRAND_LOGO_CORNER_RX}" fill="${logo.color}"/>`,
    `<g transform="translate(4.8 4.8) scale(0.6)" fill="${logo.glyph}"><path d="${logo.path}"/></g>`,
    '</svg>',
  ].join('')
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function getBrandLogoDataUrl(id: string | undefined): string {
  if (!id) return ''
  const logo = SOCIAL_LOGO_MAP.get(id)
  return logo ? brandLogoDataUrl(logo) : ''
}
