# Rizog Labs Studio — RizogKey V1

Internal web control center for the Rizog Labs Studio activation engine.

## Architecture
- `index.html` — page structure
- `css/app.css` — responsive/custom CSS
- `js/config.js` — public Supabase client configuration
- `js/app.js` — UI, auth and RizogKey client logic
- Supabase Edge Function `rizogkey-admin` — server-side activation generation/history/revoke
- Supabase PostgreSQL — persistent data
- GitHub Pages — static frontend hosting

## Security
`js/config.js` contains only the Supabase publishable client key. Never place a Supabase secret/service-role key in this repository.
Activation codes are generated server-side by the Edge Function and stored as hashes.

## GitHub Pages
Enable **Settings → Pages → Source: GitHub Actions**. The included workflow deploys the repository on every push to `main`.
After the first deployment, use the generated GitHub Pages URL as the Supabase Auth Site URL and add the same URL to allowed redirect URLs.

## Product Registry
- Product catalog with unique, stable Product Codes
- Product metadata, platform and lifecycle status management
- Product detail with Installation and License totals from RizogKey
- Product Code is immutable after creation; products are archived instead of deleted
- Product operations use the authenticated `rizogkey-admin` Edge Function

## V1
- Email/password login
- Activation Generator
- Test Installation Code generator
- 1 Month / 6 Months / 1 Year / Lifetime
- Default device limit: 1
- Activation History
- Search/filter
- Revoke
- Responsive desktop/tablet/mobile UI

## Build

V1 deployment baseline — 2026-10-05.


## Production URL

https://rizoglabs.github.io/rizog-labs-studio/
