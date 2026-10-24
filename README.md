# ohno.media

Static site in `public/` with an in-page editor.

- Edit the live site: visit `/?edit`, enter the password (Netlify env var `EDIT_PASSWORD`).
- Edits are stored in Netlify Blobs (`site-content`, `site-images`) and applied on page load.
- Functions: `netlify/functions/` (content, image, admin).

To change the edit password: Netlify → Project configuration → Environment variables → `EDIT_PASSWORD`, then trigger a new deploy.
