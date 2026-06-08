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
    const url = `${BASE_URL}/videos?part=snippet&id=${batch.join(',')}&key=${apiKey}`
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
      })
    }
  }

  return details
}

export function youtubeLoader(): Loader {
  return {
    name: 'youtube-channel-loader',
    load: async (context: LoaderContext) => {
      // astro:env/server is only available after Astro's env system initialises,
      // so we dynamic-import it inside load() rather than at module top-level.
      const { YOUTUBE_API_KEY: apiKey, YOUTUBE_CHANNEL_ID: channelId } =
        await import('astro:env/server')

      if (!apiKey || !channelId) {
        context.logger.warn('YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID not set — skipping YouTube episode fetch')
        return
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

        for (let i = 0; i < playlistItems.length; i++) {
          const { videoId, publishedAt } = playlistItems[i]
          const detail = detailMap.get(videoId)
          if (!detail) continue

          const parsed = parseTitleParts(detail.title)
          // Use the episode number from the title; fall back to publish-date rank
          const episodeNumber = parsed.episodeNumber ?? i + 1
          // Use the topic as the display title; fall back to the full YouTube title
          const displayTitle = parsed.topic ?? detail.title
          const id = buildEpisodeId(episodeNumber, parsed.topic ?? parsed.guestName ?? detail.title)

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
            },
          })

          context.store.set({ id, data })
        }

        context.logger.info(`Loaded ${playlistItems.length} episodes from YouTube`)
      } catch (err) {
        context.logger.error(`YouTube loader failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  }
}
