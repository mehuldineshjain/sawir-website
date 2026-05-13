export type EpisodeVideo = {
  title: string
  youtubeUrl: string
  description: string
  episodeNumber?: number
  guestName?: string
}

export async function getYoutubeVideos(): Promise<EpisodeVideo[]> {
  return [
    {
      title: 'Test Episode',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      description: 'Temporary hardcoded episode',
      episodeNumber: 1,
      guestName: 'Test Guest',
    },
  ]
}

// Replace with API logic