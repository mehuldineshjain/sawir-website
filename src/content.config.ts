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

// Fixed team collection
const team = defineCollection({
  loader: () => [
    {
      id: 'parvathy',
      name: 'Parvathy Raman Krishnan',
      role: 'Founder & Host',
      bio: 'Passionate about amplifying South Asian voices in the rare disease space and building community where there was none.',
      initials: 'PR',
      color: 'primary',
      order: 1,

      // Public folder path
      img_url: '/team/avatar.png',
    },
    {
      id: 'niveda',
      name: 'Niveda Kiridaran',
      role: 'Research & Partnerships',
      bio: 'Building bridges between patient communities and medical researchers working on rare conditions.',
      initials: 'AR',
      color: 'secondary',
      order: 2,

      img_url: '/team/avatar.png',
    },
    {
      id: 'beth',
      name: 'Beth',
      role: 'Content & Storytelling',
      bio: "Shaping each episode so that every guest's story is told with the care and nuance it deserves.",
      initials: 'B',
      color: 'primary',
      order: 3,

      img_url: '/team/avatar.png',
    },
    {
      id: 'mehul-jain',
      name: 'Mehul Jain',
      role: 'Web Developer',
      bio: 'Rare Disease Advocate and Software Engineer',
      initials: 'MJ',
      color: 'secondary',
      order: 4,

      img_url: '/team/avatar-man.png',
    },
  ],

  // IMPORTANT:
  // Since images are stored in /public/team,
  // these should remain simple string paths.
  // Do NOT use image() here.
  schema: z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    bio: z.string(),
    initials: z.string(),
    color: z.string(),
    order: z.number(),
    img_url: z.string(),
  }),
})

export const collections = { episodes, blog, projects, team }