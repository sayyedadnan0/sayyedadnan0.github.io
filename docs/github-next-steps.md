# GitHub checkpoint and next steps

The website source, CMS source, public portfolio catalog, chosen portrait, resume, artwork, database schemas, migrations, and verification commands are saved in this repository. Private passwords, local databases, messages, runtime uploads, dependencies, and generated builds are intentionally excluded.

## Current state

- The public catalog in prisma/data/portfolio.json contains the initial 19 published projects and public site settings. Intentional media lives in public/portfolio.
- The existing CMS still writes to a database. It has NOT been converted into a Git-based CMS. Editing the local CMS does not automatically update the versioned catalog.
- The source has passed code checks, production builds, and isolated SQLite/PostgreSQL persistence checks.
- The website has not been published. No paid hosting resources were created.
- Netlify/Supabase configuration remains an optional implementation in the source. Account setup and deployment are paused at the owner's request.

## Next work for a GitHub-based site

1. Make versioned content files the authoritative source for projects, page text, settings, and media. Export only approved public content from the existing local database; preserve private state locally.
2. Replace database-backed public reads with shared content readers, and provide a Git-based editing workflow. Initially, GitHub's file editor can edit content and upload media without another CMS account. A visual editor would require a separately configured secure GitHub authorization flow.
3. Convert the public Next.js site to static output while preserving the homepage's client-side Three.js interaction, project pages, About, and Contact. The current API routes, database-backed admin pages, and server-side contact inbox cannot run on GitHub Pages.
4. Use email/contact links for enquiries unless a separate form backend is chosen. Do not imply a static site saves messages to the existing CMS inbox.
5. Add a GitHub Actions build-and-publish workflow, validate every public route and media path, and enable GitHub Pages. Content commits will then trigger a rebuild.
6. Review repository visibility before publishing. GitHub Pages on GitHub Free requires a public repository. This repository is currently private; do not make it public without the owner's explicit approval.

A GitHub checkpoint is a backup of versioned files, not a running online CMS. The Git-based conversion and static publishing work above remain to be implemented. Existing deployment notes describe the alternative server-backed setup, not a completed Git-based CMS.
