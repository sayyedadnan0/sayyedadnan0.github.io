# GitHub content manager

Website: https://sayyedadnanali.com/
Content manager: https://sayyedadnanali.com/admin/

Sign in to GitHub using the repository owner's account. No separate CMS credentials are required. The website's content manager links to GitHub's file editor and upload tools; it is not a visual form-based editor.

Edit prisma/data/portfolio.json using GitHub's pencil button. Projects are in projects; page text and contact details are key/value entries in settings; social links are in socials. Preserve valid JSON, unique lowercase project slugs, and local media paths. published controls public visibility; featured and order control the home gallery. Only published entries are exported.

Upload images, videos, or PDFs into public/portfolio using Add file > Upload files. Reference a file as /portfolio/filename.webp in the content file. Keep long videos embedded at the existing Drive/Adobe sources. Never upload private documents or passwords to this public repository.

Choose Commit changes to save. The Publish GitHub Pages workflow rebuilds and deploys the website. Check Actions for its green success indicator before refreshing the site. If a build fails, the previous successful website stays live. Use the file's History to review and revert an incorrect edit.

The contact form opens a draft in the visitor's email application. The visitor must send that email. There is no server inbox on GitHub Pages. The original database CMS remains available only in the server/local build; it does not publish changes to the GitHub Pages content file.

GitHub Pages supplies this free address; it is not a separately purchased custom domain. The repository was renamed for the account's root github.io address. Old repository links redirect automatically.
