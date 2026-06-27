# Handoff: GitHub Actions Smart Rebuild

## Problem
Site is static (Astro SSG). YouTube episodes are fetched at build time only. New YouTube uploads don't trigger a Netlify rebuild — so new episodes never appear on the live site without a manual deploy.

## Goal
Replace the naive daily rebuild (which always POSTs to Netlify) with a **smart check** that:
1. Fetches the YouTube channel RSS feed (free, no API key)
2. Extracts the latest video ID
3. Compares to the previously cached video ID (GitHub Actions cache)
4. Only triggers a Netlify rebuild if a new video is detected
5. Skips the rebuild if nothing changed (saves Netlify build minutes)

## What Was Done
- Created `.github/workflows/scheduled-rebuild.yml` with a simple daily cron that POSTs unconditionally to `secrets.NETLIFY_BUILD_HOOK`
- The user rejected replacing it with the smart version before it was written

## What Needs to Be Done
Replace the contents of `.github/workflows/scheduled-rebuild.yml` with this smart workflow:

```yaml
name: Scheduled Netlify Rebuild

on:
  schedule:
    - cron: '0 8 * * *'
  workflow_dispatch:

jobs:
  trigger-build:
    runs-on: ubuntu-latest
    steps:
      - name: Get latest YouTube video ID from RSS (no API key needed)
        id: yt_check
        run: |
          FEED="https://www.youtube.com/feeds/videos.xml?channel_id=${{ secrets.YOUTUBE_CHANNEL_ID }}"
          LATEST_ID=$(curl -s "$FEED" | grep -o '<yt:videoId>[^<]*</yt:videoId>' | head -1 | sed 's/<[^>]*>//g')
          echo "latest_id=$LATEST_ID" >> "$GITHUB_OUTPUT"
          echo "Latest video ID: $LATEST_ID"

      - name: Restore cached last-known video ID
        id: cache
        uses: actions/cache@v4
        with:
          path: .last-video-id
          key: last-video-id-${{ steps.yt_check.outputs.latest_id }}
          restore-keys: last-video-id-

      - name: Check if new video exists
        id: diff
        run: |
          LATEST="${{ steps.yt_check.outputs.latest_id }}"
          CACHED=""
          if [ -f .last-video-id ]; then
            CACHED=$(cat .last-video-id)
          fi
          echo "Cached: $CACHED | Latest: $LATEST"
          if [ "$LATEST" != "$CACHED" ] && [ -n "$LATEST" ]; then
            echo "new_video=true" >> "$GITHUB_OUTPUT"
            echo "$LATEST" > .last-video-id
          else
            echo "new_video=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Trigger Netlify rebuild (only if new video)
        if: steps.diff.outputs.new_video == 'true'
        run: |
          echo "New video detected — triggering Netlify rebuild"
          curl --fail -s -X POST "${{ secrets.NETLIFY_BUILD_HOOK }}"

      - name: Skip rebuild
        if: steps.diff.outputs.new_video == 'false'
        run: echo "No new video — skipping rebuild"
```

## GitHub Secrets Required
Two secrets must be set in the GitHub repo (Settings → Secrets → Actions):
- `NETLIFY_BUILD_HOOK` — URL from Netlify → Site config → Build hooks
- `YOUTUBE_CHANNEL_ID` — the channel ID (e.g. `UCxxxxxxxxxxxxxxxxxx`)

## Context
- Repo: `sawir-website` (Astro 6, static output, deployed on Netlify)
- YouTube loader: `src/lib/youtubeLoader.ts` — fetches all public uploads at build time
- YouTube RSS feed URL pattern: `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`
- RSS returns latest 15 videos, no API key needed, free
- The cache key technique ensures GitHub's cache layer stores the last-seen video ID across daily runs
