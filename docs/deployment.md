# Free deployment: Netlify + Supabase

Use Netlify's Free credit-based plan and Supabase's Free plan. No domain purchase or paid Render service is required. Netlify provides an HTTPS netlify.app address. Stay on Free plans; do not start a paid trial or enable paid upgrades.

## Free-plan limits

Netlify includes 300 credits/month shared by deployments, requests, bandwidth, and function compute. The Free plan has a hard limit: projects pause when credits run out rather than charging automatically. Supabase includes a 500 MB database and 1 GB file storage, with bandwidth limits; inactive free projects may pause after one week. These are limited free plans, not an uptime guarantee.

Keep long films embedded from the existing Drive/Adobe sources. CMS direct uploads support files up to 50 MB and go straight to Supabase, avoiding Netlify's function request-size limit.

## Account setup

1. Sign in to Netlify using the owner's GitHub account. Choose Free.
2. Create a new Supabase project in a Free organization. Save its database password privately. Use a nearby region supported by the database pooler.
3. Import the existing GitHub repository into Netlify. It reads netlify.toml automatically.
4. Configure the following private environment values in the Netlify production context. Do not place credentials in Git or chat:

| Variable | Value |
| --- | --- |
| DATABASE_URL | Supabase transaction pooler URL, port 6543, with pgbouncer=true&connection_limit=1&schema=public&sslmode=require |
| DIRECT_URL | Supabase session pooler URL, port 5432, with schema=public&sslmode=require; used for migrations |
| STORAGE_PROVIDER | supabase |
| SUPABASE_URL | Project HTTPS origin |
| SUPABASE_SERVICE_ROLE_KEY | Secret server-side service-role key; never prefix with NEXT_PUBLIC_ |
| SUPABASE_STORAGE_BUCKET | portfolio-media |
| ADMIN_EMAIL | Owner's CMS email |
| ADMIN_PASSWORD | Unique initial password, at least 16 characters |
| JWT_SECRET | Random secret, at least 32 characters |
| SITE_INDEXABLE | true when launching publicly |
| MAX_FILE_SIZE | 50000000 |

Optionally leave [YOUR-PASSWORD] in both pooled connection URLs and set DATABASE_PASSWORD privately. The build and server encode that password safely; never put this variable in public configuration. Fully encoded connection URLs continue to work without the extra variable.

URL is supplied by Netlify and sets canonical URLs. When adding a custom domain later, configure NEXT_PUBLIC_SITE_URL to its HTTPS origin and rebuild. Never use the local .env DATABASE_URL online.

## Deployment and CMS

Netlify runs npm run build:netlify. It generates the database clients, applies the separate PostgreSQL migrations, creates the initial CMS account, imports the 19 published projects into an empty database, indexes the versioned portfolio media, creates the public portfolio-media bucket if needed, and builds Next.js. Existing accounts and edited portfolio projects are preserved on later builds.

The canonical model definitions remain in prisma/schema.prisma. scripts/generate-clients.mjs derives the ignored PostgreSQL schema and client; models are not manually maintained twice. Cloud migrations are committed under prisma/postgres/migrations. Local SQLite migrations remain separate. Do not apply SQLite migrations to Postgres or reset either live database.

The PostgreSQL migration enables row-level security on all CMS tables. Anonymous Supabase Data API access is denied. The Next.js server uses the private database connection. Media uploads require an authenticated CMS session and a signed, unique-object upload URL; completion verifies the stored size and MIME type. The storage service-role key stays on the server. Replacements update project references before removing the old cloud object.

After deployment, visit /api/health, public pages, and /admin/login. Sign in with ADMIN_EMAIL and the initial ADMIN_PASSWORD, then test uploading, replacing, publishing, and a contact enquiry. Credentials are not included in the repository. Changing the environment password later does not overwrite the existing CMS account.

Keep automatic deploy previews disabled until a separate preview database and storage are configured. The production build refuses preview contexts to prevent migrations against the live CMS.

The initial import excludes private local messages, unpublished drafts, and the existing local admin credentials. They remain on the computer. New online messages go to the CMS inbox; email notifications are not configured.

## Verification and backups

Run npm run check, npm run build, and npm run test:deployment. GitHub also runs the same upload/replacement/restart checks against an isolated PostgreSQL service. Cloud upload verification still requires the actual Supabase project and credentials.

Back up the cloud database and media independently before major changes. The versioned portfolio catalog is only an initial snapshot, not a backup of later CMS edits. Free plans do not include the same backup/availability features as paid plans.

The older render.yaml is an optional paid alternative retained for reference. Do not create its resources for this free deployment.
