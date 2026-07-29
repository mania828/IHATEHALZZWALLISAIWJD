# HALZZ WALL — setup guide

This is a full video-feed app: public uploads, accounts, likes ("L"s),
comments, reporting, and an admin moderation queue. Everything here is
static frontend code — the real backend is Supabase (database + auth +
serverless function) and Cloudflare Stream (video hosting/encoding). Follow
these steps in order; nothing will work until steps 1–4 are done.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Once it's created, go to **Project Settings → API** and copy:
   - Project URL
   - anon public key
3. Open `js/supabase-client.js` in this folder and paste both in at the top.

## 2. Run the database schema

1. In your Supabase project, go to **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this folder, copy the whole thing, paste
   it in, and click **Run**.
3. This creates every table (profiles, videos, L's, comments, reports),
   the counters, and all the Row Level Security policies that keep users
   from editing each other's data.

## 3. Create your Cloudflare Stream account

1. Go to [cloudflare.com/products/cloudflare-stream](https://www.cloudflare.com/products/cloudflare-stream/)
   and enable Stream on your account. **This has a real monthly cost** once
   you're storing/serving actual video — budget for it before launching
   publicly.
2. Go to **Stream** in your Cloudflare dashboard, open any video (or the
   overview page), and copy your **Customer Subdomain** (looks like
   `customer-xxxxxxxx.cloudflarestream.com`). Paste it into
   `CLOUDFLARE_STREAM_SUBDOMAIN` in `js/supabase-client.js`.
3. Create an API token: **My Profile → API Tokens → Create Token**, with
   the **Stream: Edit** permission. Keep this secret — it goes in step 4,
   never in frontend code.

## 4. Deploy the upload edge function

This is the one piece of backend code — it asks Cloudflare for a one-time
upload link without ever exposing your API token to visitors.

You'll need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed. Then, from this project folder:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF   # find this in your project URL
supabase secrets set CLOUDFLARE_ACCOUNT_ID=your_account_id
supabase secrets set CLOUDFLARE_API_TOKEN=your_api_token
supabase functions deploy create-upload-url
```

After deploying, copy the function's URL (Supabase will print it, or find
it under **Edge Functions** in your dashboard) into
`CREATE_UPLOAD_URL_ENDPOINT` in `js/supabase-client.js`.

## 5. Make yourself an admin

Sign up once through the live site first (so your profile row exists),
then in the Supabase SQL Editor:

```sql
update public.profiles set is_admin = true where username = 'yourusername';
```

This unlocks `/admin/` for your account — the moderation queue for
reported videos.

## 6. Deploy the frontend

Everything else here is static files, so it deploys the same way your
other sites have — push this whole `halzzwall` folder to your GitHub repo
root and point your custom domain at it via GitHub Pages, same DNS setup
as before.

## Permalink URLs (/@username/vid/{id})

Every post now has its own shareable link — the **share** button on a feed
card copies something like:

```
https://halzzwall.org/@floorpizza/vid/6f2a1c9e-1234-4a8b-9d21-abcdef012345
```

This works via `404.html`, which is a standard trick for single-page apps
on GitHub Pages: since GitHub Pages has no real server-side router, a
direct visit to that URL would normally show a 404. `404.html` catches
that, redirects to `index.html` with the intended path attached, and the
app restores the clean URL and renders just that one video.

**One real limitation**: this only works for people actually clicking
the link in a browser. Link-preview crawlers (Discord, Twitter/X,
iMessage, etc.) don't run JavaScript, so they won't see the correct
video-specific title/thumbnail when the link is pasted elsewhere — they'll
see the site's generic info instead. Fixing that properly requires
server-side rendering, which is a bigger infrastructure change than
what's built here. Worth planning for later if link-preview quality
matters to you, but it doesn't block the feature from working today.

## What's deliberately not built yet (phase 2 ideas)

To keep the first version shippable, these are left out — happy to add
any of them once the core is live and working:

- Search / hashtags
- A "following" feed (right now everyone sees everything, newest first)
- Push notifications
- Video transcript/captions for accessibility
- Rate-limiting on uploads (worth adding early if spam becomes a problem —
  Supabase Edge Functions can enforce this)
- A real recommendation algorithm (currently: reverse-chronological, same
  as most platforms start with)

## File map

```
halzzwall/
├── index.html              feed page
├── css/style.css           design system
├── js/
│   ├── supabase-client.js  ← YOUR CONFIG GOES HERE
│   ├── auth.js             sign up / log in modal + session state
│   ├── nav.js               shared top bar + bottom nav
│   ├── feed.js              video feed, L's, report button
│   └── comments.js          comment drawer
├── upload/
│   ├── index.html
│   └── upload.js            talks to the edge function + Cloudflare
├── profile/
│   ├── index.html
│   └── profile.js
├── admin/
│   ├── index.html
│   └── admin.js              moderation queue
└── supabase/
    ├── schema.sql            run this in the Supabase SQL editor
    └── functions/create-upload-url/index.ts   deploy via Supabase CLI
```
