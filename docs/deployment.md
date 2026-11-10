# Render deployment

The repository includes a Render Blueprint (render.yaml) for one paid Node web service and one persistent disk. A domain purchase is optional; Render supplies an HTTPS onrender.com address. Review and approve the service and disk cost in your own account before creating them.

## What the deployment does

- Builds with Node 24 and a locked npm dependency tree.
- Stores SQLite at /var/data/portfolio.db and CMS uploads at /var/data/uploads.
- Runs committed Prisma migrations at startup, when the persistent disk is mounted.
- Creates the owner's first admin account from private Render environment values without resetting an existing account.
- Imports the 19 published portfolio entries only into an empty database and indexes the 53 intentional public media files without duplicates.
- Serves new CMS uploads through a streaming route, including video range requests.
- Uses /api/health to verify database and upload-storage readiness.
- Uses RENDER_EXTERNAL_URL for canonical URLs unless NEXT_PUBLIC_SITE_URL is explicitly configured.

## First launch

1. Push the reviewed source to the linked GitHub main branch. Never push .env, SQLite files, uploaded files, or private credentials.
2. In Render, create a Blueprint from the repository and review render.yaml. The default compute plan is 0.5c-512mb with a 1 GB disk in Frankfurt.
3. Approve the displayed hosting cost. The Blueprint generates separate random JWT_SECRET and ADMIN_PASSWORD values in your account. It uses the owner's verified contact email as ADMIN_EMAIL.
4. Deploy and wait for the health check. The CMS is at /admin/login on the resulting HTTPS address. Retrieve ADMIN_PASSWORD privately from the service's environment settings; never put it in repository documentation.
5. Test the website, login, media upload, project publishing, and contact inbox. Restart the service and verify the uploaded file still loads.

Private local messages, drafts, and existing local admin credentials are not included in the public seed. They remain on your computer. The public catalog is an initial snapshot, not a backup of later online CMS edits.

## Updates and recovery

GitHub CI runs source checks, a production build, production dependency audit, and an isolated upload/restart persistence test. Automatic deploys wait for CI checks. Startup seeds preserve existing accounts, edited projects, and media. Future schema changes need a new migration; do not reset a live database.

Render's persistent-disk snapshots cover its database and uploads together. Keep an independent backup before major CMS or schema changes and test restoration. A disk permits one service instance and briefly interrupts service during redeployment.

## Custom domains and media

When adding your own domain, update NEXT_PUBLIC_SITE_URL to its HTTPS origin and rebuild. Keep SITE_INDEXABLE=false on staging. Local previews stay noindex. Cover artwork should be uploaded through the CMS; arbitrary remote image hosts are disabled. Embedded films remain dependent on their original Adobe/Drive providers. Contact enquiries are saved to the CMS inbox; automatic email notifications are not configured.

## Local verification

Run npm run check, npm run build, and npm run test:deployment. The deployment test uses a fresh temporary database and upload directory, starts only on loopback, verifies file streaming and persistence across restart, and removes only its own temporary files. It does not use your working CMS database.

Do not point deploy:start at an existing database created with db:push without first baselining its migration history. The supplied public deployment starts with a new database on the disk. Local development can continue to use the existing db:push workflow.
