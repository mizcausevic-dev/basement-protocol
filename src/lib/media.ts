export const MEDIA_BASE = 'media/'

export type Ratio = '16x9' | '9x16' | '1x1'

export interface MediaVideo {
  ratio: Ratio
  label: string
  use: string
  width: number
  height: number
  file: string
  poster: string
  bytes: number
  duration_s: number
  bitrate_kbps: number
  video: string
  audio: string
  loudness: { integrated_lufs: number; true_peak_dbfs: number }
}

export interface MediaImage {
  id: string
  network: string
  also: string[]
  layout: string
  use: string
  width: number
  height: number
  file: string
  preview: string
  bytes: number
  alt: string
}

export interface MediaManifest {
  title: string
  duration_s: number
  fps: number
  captions: string
  soundtrack: string
  videos: MediaVideo[]
  images: MediaImage[]
  carousel_pdf: { file: string; bytes: number; pages: number } | null
  copy_sheet: { markdown: string; json: string } | null
}

export interface PostCheck {
  field: string
  length: number
  max: number
  unit: string
  hashtags: number
  maxHashtags: number | null
  ok: boolean
}

export interface SocialPost {
  label: string
  video: Ratio | null
  pdf: string | null
  assets: string[]
  notes: string | null
  fields: Record<string, string>
  checks: PostCheck[]
}

export interface SocialNetwork {
  id: string
  name: string
  why: string
  posts: SocialPost[]
}

export interface PostsSheet {
  site: string
  media_page: string
  limits_as_of: string
  networks: SocialNetwork[]
  problems: string[]
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export function loadMediaKit() {
  return Promise.all([
    getJson<MediaManifest>(`${MEDIA_BASE}media-manifest-Cursor.json`),
    getJson<PostsSheet>(`${MEDIA_BASE}social/posts-Cursor.json`),
  ])
}

export const mediaUrl = (path: string) => `${MEDIA_BASE}${path}`

export function formatBytes(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  return `${Math.round(n / 1e3)} KB`
}

export const COMMERCIAL_16X9 = {
  src: mediaUrl('basement-protocol-commercial-16x9-Cursor.mp4'),
  poster: mediaUrl('basement-protocol-commercial-16x9-poster-Cursor.jpg'),
  captions: mediaUrl('basement-protocol-commercial-Cursor.vtt'),
}
