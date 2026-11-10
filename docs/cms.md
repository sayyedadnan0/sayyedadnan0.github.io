# CMS guide

Open /admin/login and sign in with the account created by db:seed. Credentials are local environment/database state, never repository documentation.

| Section | Use |
| --- | --- |
| Projects | Create/edit a project, add its cover and gallery, save a draft or publish |
| Media Library | Upload images, MP4/WebM video, and PDF documents |
| Categories | Organize project disciplines |
| Messages | Read contact-form enquiries |
| Site Settings | Edit homepage, About, résumé, contact details, socials, and SEO fields |

Only published projects appear publicly. Featured on Homepage makes a published project eligible for the five-panel home selection; lower Display Order values come first. For project changes use Publish Project; Save as Draft hides that project publicly. Refresh the public page after publishing.

Site Settings has Homepage, About Page, Contact Page, and Global & SEO tabs. Finish with Publish Live to Website. Experience lines use Role | Organisation | Dates. Education lines use Qualification | Institution | Dates. Skills are comma-separated. Upload a replacement résumé in Media Library, then select it in About Page settings.

Existing embedded-video URLs are preserved in project records. The editor supports uploaded gallery media; do not replace an existing embedded video with a generic website URL. Keep large films at their original source unless a dedicated streaming setup is added.

The CMS edits content and media. Camera positions, WebGL effects, and layout code remain developer-managed. There is no account/password-reset screen; an existing password must be changed in the database, not merely in .env.
