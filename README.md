# South Asian Women in Rare — Website

[![Netlify Status](https://api.netlify.com/api/v1/badges/b2c82c74-40af-4df2-8f3a-be6094e5628c/deploy-status)](https://southasianwomeninrare.org)
[![Built with Astro](https://astro.badg.es/v2/built-with-astro/small.svg)](https://astro.build)

The official website for **South Asian Women in Rare** — a podcast platform amplifying the voices of South Asian women navigating the rare disease world. Built and maintained by [Mehul Jain](https://github.com/mehulj999).

**Live site:** [southasianwomeninrare.org](https://southasianwomeninrare.org)

---

## About the project

South Asian Women in Rare is a podcast that creates space for South Asian women to share unfiltered stories about living with rare conditions, being caregivers, and advocating for change. This website serves as the platform's public face — surfacing episodes, telling the team's story, and making it easy for new guests to get in touch.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Astro 6](https://astro.build) with TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) + SCSS (Sass) |
| Icons | [astro-icon](https://github.com/natemoo-re/astro-icon) with Lucide |
| Video | YouTube Data API v3 (server-side, secret key) |
| Forms | Netlify Forms with accessible validation |
| Deployment | [Netlify](https://netlify.com) with CI/CD on push |
| SEO | [astro-seo](https://github.com/jonasmerlin/astro-seo) + `@astrojs/sitemap` |
| Content | MDX via `@astrojs/mdx` |
| Compression | [astro-compress](https://github.com/playform/compress) (HTML, CSS, JS, images) |
| Components | [accessible-astro-components](https://github.com/incluud/accessible-astro-components) |

---

## Features

### Content & pages
- **Episodes** — dynamic routes (`/episodes/[episode].astro`) pulling from YouTube via the Data API, with embedded player, tags, and pagination
- **About** — mission, team, and feature cards built with reusable `Feature.astro` components
- **Contact** — Netlify Forms–powered contact form with full accessible validation (WCAG 2.2)
- **404, Sitemap, Accessibility Statement** — complete page set

### Technical highlights
- **YouTube API integration** — server-side API calls at build time using env vars (`YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`) injected via Netlify's environment variable dashboard; graceful fallback when the key is absent
- **Fully typed** — TypeScript throughout, with path aliases (`@components`, `@layouts`, `@assets`) configured in both `tsconfig.json` and Vite
- **Fluid spacing & colour system** — OKLCH-based colour palette generated from two brand tokens, fluid spacing scale with CSS custom properties (`--space-l`, `--space-m`, etc.)
- **Scoped component styles** — Astro's CSS scoping with SCSS for component-level encapsulation; resolved a production-only CSS stripping bug (Vite + astro-compress pipeline) by migrating scoped SCSS to plain CSS and moving critical properties to Tailwind utility classes
- **Accessible by default** — skip links, ARIA landmarks, keyboard-navigable dropdown navigation, focus indicators visible on both light and dark backgrounds
- **Preference toggles** — dark mode, high contrast, and reduced motion, each persisted to `localStorage` and synced across Astro view transitions
- **View transitions** — Astro's client-side routing with `ViewTransitions` for page-to-page fade animations
- **SEO** — per-page `<title>`, `<meta description>`, Open Graph, and Twitter Card tags; canonical URLs; auto-generated XML sitemap
- **Performance** — static output with `astro-compress` minifying HTML, CSS, JS, and images; `loading="lazy"` on below-fold images; inline critical CSS

---

## Project structure

```
src/
├── components/       # Reusable Astro components
│   ├── Feature.astro         # Feature card with icon, heading, and slot
│   ├── YouTubePlayer.astro   # Responsive iframe embed with URL parsing
│   ├── TeamCarousel.astro    # Team member showcase
│   ├── Hero.astro            # Homepage hero section
│   └── ...
├── layouts/
│   └── DefaultLayout.astro   # Shell: SEO, header, footer, view transitions
├── pages/
│   ├── index.astro           # Homepage
│   ├── about.astro           # About page
│   ├── contact.astro         # Contact form
│   └── episodes/
│       ├── [...page].astro   # Paginated episode listing
│       └── [episode].astro   # Individual episode page
└── assets/
    └── scss/                 # Global SCSS tokens and utilities
```

---

## Local development

```bash
npm install
npm run dev       # Dev server at localhost:4321
npm run build     # Production build to ./dist/
npm run preview   # Preview production build locally
```

For the YouTube feed to work locally, create a `.env` file:

```
YOUTUBE_API_KEY=your_key_here
YOUTUBE_CHANNEL_ID=your_channel_id_here
```

---

## Deployment

The site deploys automatically to Netlify on every push to `main`. Environment variables (`YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`) are set in the Netlify dashboard under **Site configuration → Environment variables**.

---

## Author

Built by **Mehul Jain** — [github.com/mehulj999](https://github.com/mehulj999)
