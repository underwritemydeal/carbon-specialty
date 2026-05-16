<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Deploy safety

Production deploys require explicit operator confirmation immediately before
execution, separate from any prior conversation about deployment. Pattern:

1. Operator asks for deploy: "deploy to vercel"
2. Agent responds: "This will deploy to production at
   https://carbon-specialty.vercel.app/. Site is currently configured to
   [indexable | noindex]. Confirm proceed to production, or specify
   --preview for a preview deploy."
3. Wait for explicit "yes proceed to production" or equivalent.
4. Only then run `vercel deploy --prod`.

This applies to first deploy, post-DNS-cutover deploys, and any deploy after
significant marketing copy or stats changes. Preview deploys
(`vercel` without `--prod`, or `vercel --preview`) do not require this
confirmation step.

## Pre-launch lockdown (sprint C.S.1.1)

While the site is pre-launch:

- Root `metadata.robots` is set to `{ index: false, follow: false,
  googleBot: { index: false, follow: false } }` in `src/app/layout.tsx`.
- `src/app/robots.ts` returns `{ rules: [{ userAgent: "*", disallow: "/" }] }`
  (no sitemap, no per-rule allow).
- `/llms.txt` carries a "Status: Pre-launch" line at the top.
- `SITE.phone`, `SITE.phoneDisplay`, and `SITE.email` are `null`. No surface
  may emit them; the `tel:`/`mailto:` shortcuts and the Stats fabricated
  numbers were removed in this sprint.

To exit lockdown: flip `metadata.robots`, restore the per-rule allow + sitemap
reference in `robots.ts`, drop the status line in `/llms.txt`, populate the
three `SITE` constants with real values, and put `telephone`/`email` back into
`insuranceAgency()` and `localBusiness()` in `src/lib/schema.ts`. Then
exercise the Deploy safety pattern above.
