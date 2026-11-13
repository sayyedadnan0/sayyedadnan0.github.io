# GitHub website: completed setup

Website: https://sayyedadnanali.com/
Content manager: https://sayyedadnanali.com/admin/
Source: https://github.com/sayyedadnan0/sayyedadnan0.github.io

The repository is public, GitHub Pages is enabled, and the public build reads versioned portfolio content without an online database. Netlify and Supabase are not required for this deployment. The original server-backed CMS remains in the repository for local/alternative server use.

## Edit and publish

1. Open the website's content manager and follow Edit projects and page text.
2. Sign in to your GitHub account. Edit prisma/data/portfolio.json and commit your changes.
3. Upload new public media into public/portfolio and reference it as /portfolio/filename.webp.
4. Wait for the Publish GitHub Pages workflow to succeed, then refresh the website.

See [the editing guide](github-content-guide.md) for fields, rollback, and media instructions. This content manager uses GitHub's file editor, not the old visual database editor. There is no separate CMS password.

The contact form opens an email draft, which the visitor must send. GitHub Pages does not run a contact inbox. Keep passwords, private enquiries, databases, and confidential drafts outside this public repository.

The supplied github.io address is free. A separately owned custom domain is optional and would require obtaining that domain.
