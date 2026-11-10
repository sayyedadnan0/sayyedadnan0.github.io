# Architecture

## Boundaries

- Routes compose feature components and request data from src/server. Keep URL conventions in src/app; route groups do not alter public URLs.
- Feature UI owns its domain interactions. Import other shared UI from src/components, not from another feature's private component implementation.
- Shared UI accepts props and has no database dependency. Feature-to-server imports are blocked by ESLint.
- src/server owns Prisma, authentication, filesystem uploads, HTTP authorization helpers, and request-scoped data queries. Never import it into a client component.
- src/lib holds pure cross-environment helpers. src/config contains only public constants. src/types contains shared public contracts; feature-specific contracts live with their feature.

## Rendering and data

The root layout owns fonts, metadata defaults, cursor, and scrolling providers. The (site) layout owns the standard public header, main landmark, and footer. Home keeps its dedicated scroll-owned footer placement. The CMS has its own authenticated layout and provider.

React cache deduplicates site settings, socials, and project reads during one render request. It is not a persistent CMS cache. Public queries return only published projects. Drafts stay out of project pages, metadata, JSON-LD, and sitemap.xml.

HomeExperience owns interaction state. EclipseCanvas owns the renderer lifecycle. Scene shaders, silhouette data, and texture/radiance generation are separate modules. The refactor preserves the shader program text and scene constants.

## Reuse

Use CallToAction for portfolio section CTAs, Modal for focus-contained dialogs, MediaPickerDialog for CMS asset selection, the shared contact validator on client and server, and requireAdmin for common route authorization. Keep component variants explicit; do not hide unrelated page behavior in a universal component.

## Adding a feature

Create its UI and domain contracts under src/features, add a thin route under src/app, and put database reads under src/server/queries. Use createPageMetadata for public metadata. Add behavior tests for new parsers/validators and run npm run check plus a production build.
