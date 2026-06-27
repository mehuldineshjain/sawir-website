import crypto from 'node:crypto'

// YouTube WebSub (PubSubHubbub) callback.
//
// GET  — subscription verification handshake. Google's hub calls this with
//        hub.mode / hub.topic / hub.challenge; we echo hub.challenge to confirm.
// POST — a publish/update notification. We never parse the Atom body: any
//        notification carrying a valid HMAC signature simply triggers a Netlify
//        rebuild, which re-fetches all episodes via youtubeLoader at build time.
//
// Env (set in Netlify, not GitHub):
//   BUILD_HOOK_URL  — Netlify build hook to POST on a valid notification
//   WEBSUB_SECRET   — shared secret used for X-Hub-Signature HMAC verification
//   YOUTUBE_CHANNEL_ID — optional; if set, GET handshakes for other topics are rejected

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url)

  // 1. Verification handshake
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const topic = url.searchParams.get('hub.topic')
    const challenge = url.searchParams.get('hub.challenge')

    if (!challenge || (mode !== 'subscribe' && mode !== 'unsubscribe')) {
      return new Response('Bad Request', { status: 400 })
    }

    // Only confirm subscriptions for our own channel, when we know it.
    const channelId = process.env.YOUTUBE_CHANNEL_ID
    if (channelId && topic && !topic.includes(channelId)) {
      return new Response('Unknown topic', { status: 404 })
    }

    return new Response(challenge, {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    })
  }

  // 2. Publish/update notification
  if (req.method === 'POST') {
    const body = await req.text()

    const secret = process.env.WEBSUB_SECRET
    if (secret) {
      const received = req.headers.get('x-hub-signature') ?? ''
      const expected = 'sha1=' + crypto.createHmac('sha1', secret).update(body).digest('hex')
      const a = Buffer.from(received)
      const b = Buffer.from(expected)
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return new Response('Invalid signature', { status: 403 })
      }
    }

    const hook = process.env.BUILD_HOOK_URL
    if (hook) {
      await fetch(hook, { method: 'POST' })
    }

    return new Response(null, { status: 204 })
  }

  return new Response('Method Not Allowed', { status: 405 })
}
