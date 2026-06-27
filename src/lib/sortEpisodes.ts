import type { CollectionEntry } from 'astro:content'

type Episode = CollectionEntry<'episodes'>

export type EpisodeOrder = 'newest' | 'oldest'

// Single factor for now: order by YouTube publish date.
// Tie-break on episodeNumber so equal/missing dates stay deterministic.
// Phase 2 will layer a second factor (liked) on top of this.
export function sortEpisodesByRecency(episodes: Episode[], order: EpisodeOrder = 'newest'): Episode[] {
  const dir = order === 'newest' ? 1 : -1
  return [...episodes].sort((a, b) => {
    const dateA = a.data.publishDate?.getTime() ?? 0
    const dateB = b.data.publishDate?.getTime() ?? 0
    if (dateA !== dateB) return (dateB - dateA) * dir
    return ((b.data.episodeNumber ?? 0) - (a.data.episodeNumber ?? 0)) * dir
  })
}
