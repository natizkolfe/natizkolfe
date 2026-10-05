# Deploying Gebeta

Gebeta is a Next.js app that stores every order, account, promo code, care sheet, and kitchen setting in one file: `data/db.json`. The server has to be a single long-running Node process with a disk that keeps that file. A host that throws the disk away after each request, or that runs several copies of the app at once, will lose or overwrite orders.

Payments and text messages are still a demo. A public link is for friends to try the site, not for taking real cards.

## What the server needs

- Node.js 20 or newer. This project is developed on Node 24.
- `npm install` once, from the project directory.
- Outbound HTTPS, so delivery quotes can reach the US Census geocoder, OpenStreetMap Nominatim, and the public OSRM driving router.
- One process only. Writes to `data/db.json` are queued inside that process. A second process writing the same file can drop an order.
- A durable copy of `data/db.json`. It is listed in `.gitignore` and is not in git. Copy it yourself before you replace the server.

### Required environment variable

`ADMIN_PASSWORD`

Configure a strong Admin password directly through the production hosting environment before starting Gebeta. Do not write that password into the source code, this document, a GitHub file, or a `NEXT_PUBLIC_` variable.

On this computer, put the same variable in `.env.local` for `npm run dev`. That file is ignored by git. If `ADMIN_PASSWORD` is missing, the kitchen login is refused and the server log says `ADMIN_PASSWORD is not configured.` Customer ordering still runs.

Customer and staff sessions are random tokens stored as hashes in `data/db.json`. There is no separate session secret to configure.

## Share the app with friends

This is the setup used for a temporary public link. It serves the development server on this computer through a Cloudflare quick tunnel. The link works only while this computer is awake and both processes are still running. Starting the tunnel again creates a new address. The old address stops working.

1. Start the app if it is not already listening:

```bash
npm run dev
```

That binds port `47231` on all network interfaces. On this computer, open `http://127.0.0.1:47231`.

2. Open the tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:47231 --no-autoupdate
```

`cloudflared` is installed at `~/.local/bin/cloudflared`. The command prints an `https://….trycloudflare.com` address. That is the link to send. `next.config.ts` already allows `*.trycloudflare.com`, so the development server accepts requests from that host.

3. Confirm the link before you send it. The page should show the Gebeta home page, including the plan-ahead notice.

Friends on the same Wi-Fi can skip the tunnel and use this computer’s LAN address on port `47231`, for example `http://10.0.0.91:47231`. That address also has to be allowed in `allowedDevOrigins` in `next.config.ts`. `10.0.0.91` is already listed. A different LAN address needs to be added there, or the browser will reload the page and clear what someone is typing.

Stop the tunnel with Ctrl-C in that terminal when you are done sharing. Leave `npm run dev` running if you are still working on the app.

## Run a production build

Use this when the site should stay up without the development server. Build first, then start. Do not run `npm run dev` and `next start` on the same port.

Set `ADMIN_PASSWORD` in the hosting environment first, then:

```bash
npm install
npm run build
export PORT=47231
npm start
```

`npm start` runs `next start`. The port comes from `PORT` and defaults to `3000`. The process listens on all interfaces.

Put the same `data` directory next to the app so existing orders are still there. If `data/db.json` is missing, the first launch creates a new file with the seed menu and no orders.

Check these URLs after it starts:

- `/` shows the home page.
- `/order?kind=weekly` and `/order?kind=catering` open the order forms. The earliest date is today plus the kitchen lead time, which is 5 days unless that setting was changed.
- `/admin` asks for the kitchen password.

To put this behind a public hostname, point a reverse proxy at `http://127.0.0.1:47231` and keep this one Node process running. Restarting the process is safe. Orders are on disk, not only in memory. Back up `data/db.json` before a restart or a deploy. The app writes that file through `data/db.json.tmp` and then renames it, so copy the finished `data/db.json`, not a `*.tmp` file.

## What a deploy does not change

These stay as they are until a later project replaces them:

- Checkout accepts the demo card `4242 4242 4242 4242`. Numbers starting with `4000` are declined. No bank is charged.
- Ready-for-pickup and out-for-delivery messages are stored on the order. They are not sent by SMS or email.
- Delivery price is `$2` per driving mile from `4473 Rowland N Dr`, unless the kitchen settings say otherwise.
- Lead time, guest limits, and the pickup note are kitchen settings in `data/db.json`, not environment variables. Change them at `/admin/settings` after the site is up.

## What not to use

Do not deploy this app to a serverless host that gives each request a fresh filesystem. Vercel, and hosts like it, will not keep `data/db.json`. Do not run more than one copy of the server against that file. Do not commit `data/db.json` or `.env` files. Do not delete `data/db.json` on a server that already has real orders. Deleting it wipes accounts, orders, promo codes, and care sheets and replaces them with the seed menu.
