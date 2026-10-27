FamilyGuard survey scroll-position fix

Replace the existing app.js in the project root with the app.js in this ZIP, then commit and deploy to Cloudflare Pages. This change makes each survey step and the acknowledgement/closing screens open at the top. It preserves the saved survey step and answers on refresh but no longer restores an old scroll position. No database or survey wording changes are included.
