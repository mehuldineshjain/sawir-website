import type { Loader, LoaderContext } from 'astro/loaders'

const BASE_URL = 'https://www.googleapis.com/youtube/v3'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildEpisodeId(episodeNumber: number, title: string): string {
  const slug = slugify(title).slice(0, 50).replace(/-+$/, '')
  return `ep-${String(episodeNumber).padStart(3, '0')}-${slug}`
}

interface ParsedTitle {
  episodeNumber: number | undefined
  guestName: string | undefined
  topic: string | undefined
}

// Expected format: "Episode N: Guest Name | Topic" (topic is optional)
function parseTitleParts(rawTitle: string): ParsedTitle {
  const match = rawTitle.match(/^Episode\s+(\d+)\s*:\s*([^|]+?)(?:\s*\|\s*(.+))?$/i)
  if (!match) return { episodeNumber: undefined, guestName: undefined, topic: undefined }
  return {
    episodeNumber: parseInt(match[1], 10),
    guestName: match[2].trim() || undefined,
    topic: match[3]?.trim() || undefined,
  }
}

interface PlaylistItem {
  videoId: string
  publishedAt: string
}

interface VideoDetail {
  id: string
  title: string
  description: string
  publishedAt: string
  tags: string[]
  privacyStatus: string
}

async function fetchUploadsPlaylistId(channelId: string, apiKey: string): Promise<string> {
  const url = `${BASE_URL}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`channels.list failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const uploadsId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) throw new Error('Could not find uploads playlist for channel')
  return uploadsId
}

async function fetchAllPlaylistItems(playlistId: string, apiKey: string): Promise<PlaylistItem[]> {
  const items: PlaylistItem[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(`${BASE_URL}/playlistItems`)
    url.searchParams.set('part', 'snippet,contentDetails')
    url.searchParams.set('playlistId', playlistId)
    url.searchParams.set('maxResults', '50')
    url.searchParams.set('key', apiKey)
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url.toString())
    if (res.status === 404) {
      // Channel exists but has no public videos yet
      return []
    }
    if (!res.ok) throw new Error(`playlistItems.list failed: ${res.status} ${await res.text()}`)
    const data = await res.json()

    for (const item of data.items ?? []) {
      const title = item.snippet?.title
      if (title === 'Private video' || title === 'Deleted video') continue
      const videoId = item.snippet?.resourceId?.videoId
      const publishedAt = item.snippet?.publishedAt
      if (videoId && publishedAt) items.push({ videoId, publishedAt })
    }

    pageToken = data.nextPageToken
  } while (pageToken)

  return items
}

async function fetchVideoDetails(videoIds: string[], apiKey: string): Promise<VideoDetail[]> {
  const details: VideoDetail[] = []

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    const url = `${BASE_URL}/videos?part=snippet,status&id=${batch.join(',')}&key=${apiKey}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`videos.list failed: ${res.status}`)
    const data = await res.json()

    for (const item of data.items ?? []) {
      details.push({
        id: item.id,
        title: item.snippet?.title ?? '',
        description: item.snippet?.description ?? '',
        publishedAt: item.snippet?.publishedAt ?? '',
        tags: item.snippet?.tags ?? [],
        privacyStatus: item.status?.privacyStatus ?? 'private',
      })
    }
  }

  return details
}

// ---------------------------------------------------------------------------
// Spotify — fetch the same podcast's episodes and match them to YouTube videos
// by episode number, so each episode can link to its Spotify counterpart.
// All Spotify failures are non-fatal: episodes still load from YouTube without
// a spotifyUrl, and the reason is logged.
// ---------------------------------------------------------------------------

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_URL = 'https://api.spotify.com/v1'

interface SpotifyEpisode {
  title: string
  url: string
}

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  if (!data.access_token) throw new Error('Spotify token response had no access_token')
  return data.access_token
}

async function fetchSpotifyEpisodes(showId: string, token: string): Promise<SpotifyEpisode[]> {
  const episodes: SpotifyEpisode[] = []
  // `market` is required, otherwise the API returns an empty items array.
  let next: string | null = `${SPOTIFY_API_URL}/shows/${showId}/episodes?market=US&limit=50`

  while (next) {
    const res: Response = await fetch(next, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Spotify shows.episodes failed: ${res.status} ${await res.text()}`)
    const data = await res.json()

    for (const item of data.items ?? []) {
      // Spotify can return null items for unavailable episodes in a market.
      const url = item?.external_urls?.spotify
      const title = item?.name
      if (url && title) episodes.push({ title, url })
    }

    next = data.next ?? null
  }

  return episodes
}

// Build a lookup of episodeNumber -> Spotify URL using the same title
// convention as YouTube ("Episode N: Guest | Topic").
function buildSpotifyEpisodeMap(episodes: SpotifyEpisode[]): Map<number, string> {
  const map = new Map<number, string>()
  for (const ep of episodes) {
    const { episodeNumber } = parseTitleParts(ep.title)
    if (episodeNumber != null) map.set(episodeNumber, ep.url)
  }
  return map
}

export function youtubeLoader(): Loader {
  return {
    name: 'youtube-channel-loader',
    load: async (context: LoaderContext) => {
      // astro:env/server is only available after Astro's env system initialises,
      // so we dynamic-import it inside load() rather than at module top-level.
      const {
        YOUTUBE_API_KEY: apiKey,
        YOUTUBE_CHANNEL_ID: channelId,
        SPOTIFY_CLIENT_ID: spotifyClientId,
        SPOTIFY_CLIENT_SECRET: spotifyClientSecret,
        SPOTIFY_SHOW_ID: spotifyShowId,
      } = await import('astro:env/server')

      if (!apiKey || !channelId) {
        context.logger.warn('YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID not set — skipping YouTube episode fetch')
        return
      }

      // Spotify is optional. Fetch the episode map up front; any failure here is
      // non-fatal — episodes still load from YouTube, just without spotifyUrl.
      let spotifyMap = new Map<number, string>()
      if (spotifyClientId && spotifyClientSecret && spotifyShowId) {
        try {
          const token = await getSpotifyToken(spotifyClientId, spotifyClientSecret)
          const spotifyEpisodes = await fetchSpotifyEpisodes(spotifyShowId, token)
          spotifyMap = buildSpotifyEpisodeMap(spotifyEpisodes)
          context.logger.info(`Fetched ${spotifyEpisodes.length} Spotify episodes (${spotifyMap.size} with parseable episode numbers)`)
        } catch (err) {
          context.logger.error(
            `Spotify fetch failed — episodes will load without Spotify links: ${err instanceof Error ? err.message : String(err)}`,
          )
        }
      } else {
        context.logger.warn('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET / SPOTIFY_SHOW_ID not set — episodes will have no Spotify links')
      }

      try {
        const uploadsPlaylistId = await fetchUploadsPlaylistId(channelId, apiKey)
        const playlistItems = await fetchAllPlaylistItems(uploadsPlaylistId, apiKey)

        if (playlistItems.length === 0) {
          context.logger.warn('No public videos found on the channel — publish videos on YouTube to populate episodes')
          return
        }

        // Sort ascending by publishedAt so oldest video gets episode number 1
        playlistItems.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())

        const videoIds = playlistItems.map((item) => item.videoId)
        const videoDetails = await fetchVideoDetails(videoIds, apiKey)
        const detailMap = new Map(videoDetails.map((v) => [v.id, v]))

        context.store.clear()

        let stored = 0
        let spotifyMatched = 0
        const missingSpotify: number[] = []

        for (let i = 0; i < playlistItems.length; i++) {
          const { videoId, publishedAt } = playlistItems[i]
          const detail = detailMap.get(videoId)
          if (!detail) continue
          // Skip unlisted/private/scheduled videos — only published-public episodes
          if (detail.privacyStatus !== 'public') continue

          const parsed = parseTitleParts(detail.title)
          // Use the episode number from the title; fall back to publish-date rank
          const episodeNumber = parsed.episodeNumber ?? i + 1
          // Use the topic as the display title; fall back to the full YouTube title
          const displayTitle = parsed.topic ?? detail.title
          const id = buildEpisodeId(episodeNumber, parsed.topic ?? parsed.guestName ?? detail.title)

          // Attach the matching Spotify link if one exists for this episode number.
          const spotifyUrl = spotifyMap.get(episodeNumber)
          if (spotifyUrl) spotifyMatched++
          else if (spotifyMap.size > 0) missingSpotify.push(episodeNumber)

          const data = await context.parseData({
            id,
            data: {
              title: displayTitle,
              youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
              description: detail.description,
              tags: detail.tags,
              author: 'South Asian Women in Rare',
              publishDate: new Date(publishedAt),
              episodeNumber,
              guestName: parsed.guestName,
              spotifyUrl,
            },
          })

          context.store.set({ id, data })
          stored++
        }

        context.logger.info(`Loaded ${stored} episodes from YouTube`)
        if (spotifyMap.size > 0) {
          context.logger.info(`Matched ${spotifyMatched}/${stored} episodes to Spotify`)
          if (missingSpotify.length > 0) {
            context.logger.warn(
              `No Spotify link for episode number(s): ${missingSpotify.sort((a, b) => a - b).join(', ')} — check the title convention "Episode N: ..." matches on both platforms`,
            )
          }
        }
      } catch (err) {
        context.logger.error(`YouTube loader failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  }
}
