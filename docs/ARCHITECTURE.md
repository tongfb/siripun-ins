# Architecture

WordPress page `/ins` owns the page, theme, SEO and AdSense. The shortcode loads JS/CSS/data from `/ins-assets/*`. Cloudflare Worker handles only that asset namespace and `/ins-assets/api/update`; all other `siripun.com` traffic continues to the existing WordPress origin.

Update flow:

WordPress Admin → server-side POST with shared trigger secret → Cloudflare Worker → GitHub workflow_dispatch → source check report / review PR → human review → merge to main → Cloudflare deploy.

The GitHub token is stored only as a Cloudflare Worker secret. It is never sent to the browser or stored in JavaScript.
