# Embe Bot (Cloudflare Workers)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/callbacked/embebot-cf)

[![](https://github.com/callbacked/embebot/blob/main/assets/add.png)](https://discord.com/oauth2/authorize?client_id=1100908930458198098&permissions=27648&integration_type=0&scope=bot) 

(or if you want to just add the bot to your server)

A quick and silly little bot that utilizes services such as vxtwitter, vxtiktok, vxreddit, and ddinstagram in one bot to properly embed media for the user.

This is (another) rewrite of the [original Embe Bot](https://github.com/callbacked/embebot) I made (which went from Python → Go) but for Cloudflare Workers. My homelab was growing too unreliable, and I wanted to leverage my Cloudflare sub that has long gone unused so I made a workers friendly version of it. Uses Durable Objects to maintain a persistent WebSocket connection to Discord's Gateway.


## How it works

Rather than re-inventing the wheel and creating a way to fix embeds on Discord for every major social media site — I opted to automate the manual way of using these services so it's done for you.

![Manual embed process](https://github.com/callbacked/embebot/blob/main/assets/manual-embed.gif)

### Just post a link and send

![Automatic embed](https://github.com/callbacked/embebot/blob/main/assets/embed.gif)

Post a link from Twitter/X, TikTok, Instagram (reels/posts), or Reddit — Embe Bot detects it, replies with the fixed embed link, and suppresses the original broken embed.

## Slash Commands -- saved per server

| Command | Description |
|---------|-------------|
| `/enable <service>` | Enable a service (twitter, x, tiktok, instagram, reddit, or all) |
| `/disable <service>` | Disable a service |
| `/settings` | View current enabled/disabled services and endpoints |
| `/endpoint set <service> <url>` | Set a custom endpoint (e.g., `fxtwitter.com`) |
| `/endpoint reset <service>` | Reset a service to its default endpoint |

## Self-Hosting

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Neon](https://neon.tech) (or any Postgres)
- Discord bot application with:
  - `Guild Messages` and `Message Content` intents enabled
  - Bot invited to your server with `Send Messages` and `Manage Messages` permissions

### Setup

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/callbacked/embebot-cf
   cd embebot-cf
   pnpm install
   ```

2. Set up the database:
   ```bash
   pnpm db:migrate
   ```

3. Configure secrets:
   ```bash
   wrangler secret put DISCORD_BOT_TOKEN
   wrangler secret put DISCORD_PUBLIC_KEY
   wrangler secret put DISCORD_APPLICATION_ID
   wrangler secret put DATABASE_URL
   ```

4. Deploy:
   ```bash
   pnpm deploy
   ```

### Local Development

```bash
pnpm dev
```

(note: since the local dev version of the cron worker doesn't work you'll have to probably write a hook to start the worker)

## Arch

- **Cloudflare Workers** — Runs bot logic
- **Durable Objects** — Persistent WebSocket connection to Discord Gateway, slash command handling, embed suppression scheduling
- **Neon Postgres** — Per-server settings storage w/ Drizzle

<img width="879" height="803" alt="image" src="https://github.com/user-attachments/assets/ba4f39b1-92b3-4475-85b5-188cf87c6ea9" />


## Thanks

This bot wouldn't exist without these projects doing the heavy lifting:

- [vxtwitter/BetterTwitFix](https://github.com/dylanpdx/BetterTwitFix) — dylanpdx
- [vxtiktok](https://github.com/dylanpdx/vxtiktok) — dylanpdx
- [vxreddit](https://github.com/dylanpdx/vxReddit) — dylanpdx
- [InstaFix](https://github.com/Wikidepia/InstaFix) — Wikidepia

## License

Do whatever you want idc
