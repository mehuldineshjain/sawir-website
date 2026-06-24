import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { glob } from 'astro/loaders'
import { youtubeLoader } from './lib/youtubeLoader'

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
  }),
})

// Switch to youtubeLoader() once your YouTube channel has public videos
const episodes = defineCollection({
  loader: youtubeLoader(),
  // loader: glob({ pattern: '**/*.md', base: './src/content/episodes' }),
  schema: z.object({
    title: z.string(),
    youtubeUrl: z.string().url(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('South Asian Women in Rare'),
    publishDate: z.date().optional(),
    episodeNumber: z.number().optional(),
    guestName: z.string().optional(),
    spotifyUrl: z.string().url().optional(),
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
      id: 'niveda',
      name: 'Niveda Kiridaran',
      role: 'Founder & Host',
      bio: "Rare Disease advocate, living with Osteogenesis Imperfecta (OI). Co-founder and co-host of South Asian Women in Rare. Passionate about raising awareness through advocacy, storytelling, and community engagement. Building connections, and helping drive positive change for people living with rare conditions.",
      initials: 'NK',
      color: 'primary',
      order: 1,

      img_url: '/team/Niveda.png',
    },
    {
      id: 'parvathy',
      name: 'Parvathy Raman Krishnan',
      role: 'Co-Host',
      bio: "Rare Disease specialist and a healthcare professional with a Masters in Clinical Nutrition. A dedicated patient advocate and caregiver, inspired by her journey as a mother of two children with multiple rare and ultra-rare conditions. Passionate about supporting families, advancing patient engagement, and creating spaces where lived experiences are heard and valued.",
      initials: 'PR',
      color: 'secondary',
      order: 2,

      // Public folder path
      img_url: '/team/Parvathy.png',
    },
    {
      id: 'bethany',
      name: 'Bethany',
      role: 'Content & Support',
      bio: "Librarian, poet and creative writer. Providing support for South Asian Women in Rare ensuring the content is clear, engaging and accessible. Best friends with Niveda living with Osteogenesis Imperfecta (OI) and is passionate about learning and supporting for the awareness and understanding of rare conditions",
      initials: 'B',
      color: 'primary',
      order: 3,

      img_url: '/team/Beth.svg',
    },
    {
      id: 'mehul-jain',
      name: 'Mehul Jain',
      role: 'Web Developer',
      bio: "Rare Disease Advocate and Software Engineer living with Hemophilia. Loves building solutions, networking and travel and fitness. Supporting South Asian Women in Rare through his technical expertise.  ",
      initials: 'MJ',
      color: 'secondary',
      order: 4,

      img_url: '/team/Mehul.png',
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