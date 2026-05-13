import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { glob } from 'astro/loaders'

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
  }),
})


const episodes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/episodes' }),
  schema: z.object({
    title: z.string(),
    youtubeUrl: z.string().url(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('South Asian Women in Rare'),
    publishDate: z.date().optional(),
    episodeNumber: z.number().optional(),
    guestName: z.string().optional(),
  }),
})

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    publishDate: z.date(),
    tags: z.array(z.string()).default([]),
    featuredImage: z.string().optional(),
  }),
})

export const collections = { episodes, blog, projects }