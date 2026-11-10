# ADNAN portfolio

A Next.js portfolio and private CMS for Sayyed Adnan Ali. The homepage uses Three.js; public project pages, About, Contact, and the CMS use server-rendered routes and reusable React components.

## Local setup

Use Node.js 24 and npm. From the repository root:

1. Run `npm ci`.
2. Copy `.env.example` to `.env`.
3. Set your admin email, a password of at least 12 characters, and a random JWT secret. Generate a secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
4. Run `npm run db:push`, then `npm run db:seed` to create your CMS account.
5. Optionally run `npm run db:seed:portfolio` to import the versioned public portfolio catalog into an empty database.
6. Run `npm run dev` and open http://localhost:3000. The CMS is at /admin/login.

The seed commands preserve existing accounts and content. Do not run database reset commands against your working portfolio. The portfolio catalog contains published work and public page settings only: no passwords, admin accounts, messages, or draft projects.

## Structure

```text
src/
  app/                 # Routes, layouts, API endpoints, metadata conventions
    (site)/            # Shared public layout: About, Contact, Work, project pages
    admin/             # Authenticated CMS routes and login
    api/               # HTTP handlers
  components/          # Shared layout, providers, UI primitives, structured data
  config/              # Public site constants and defaults
  features/
    about/             # About content UI
    admin/             # CMS editors and media picker
    contact/           # Contact UI and shared validation
    home/              # Experience UI, scene shaders, geometry, textures, types
    work/              # Work grid, project detail UI, and feature types
  lib/                 # Pure utilities usable by either client or server
  server/              # Database, auth, upload storage, API helpers, queries, SEO
  styles/              # Design tokens, global styles, and portfolio page styles
prisma/                # Schema, safe seeds, and public portfolio catalog
public/portfolio/      # Versioned artwork, selected portrait, and documents
public/uploads/        # Runtime CMS uploads; ignored by Git
tests/unit/            # Validation, media URL, JSON, and SEO utility checks
scripts/               # Maintained verification commands
docs/                  # Architecture, CMS, and deployment notes
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development |
| `npm run check` | Route types, TypeScript, ESLint, and unit tests |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run test:smoke` | Read-only HTTP checks against a running site |
| `npm run db:studio` | Inspect your local database |

The smoke command defaults to http://127.0.0.1:3000. Set PORTFOLIO_TEST_URL to check a different local preview.

## SEO and deployment

Set NEXT_PUBLIC_SITE_URL to your actual HTTPS origin before building. Set SITE_INDEXABLE=true only when the public website is ready. Local previews remain noindex. Render can supply its generated HTTPS origin automatically. Canonical URLs, page-specific Open Graph/Twitter metadata, JSON-LD, robots.txt, and a dynamic published-project sitemap use the same origin configuration. Admin routes stay noindex.

See [deployment notes](docs/deployment.md), [architecture](docs/architecture.md), and [CMS guide](docs/cms.md). The included Render Blueprint configures a persistent SQLite database and upload directory, with startup migrations and a streaming upload route. The current site does not send email notifications: enquiries are saved to the CMS inbox.

## Repository hygiene

Commit source, configuration, package-lock.json, schema/seeds, tests, documentation, and intentional public portfolio assets. Never commit .env, CMS database files, uploads, credentials, node_modules, build output, or local review recordings. Existing research and backups are retained in the ignored .local-archive directory.

This repository contains the owner's portfolio media and personal résumé. Reuse of those assets requires the owner's permission.
