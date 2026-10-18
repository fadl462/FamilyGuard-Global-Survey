FAMILYGUARD INTELLIGENCE — STABILITY FIX

Files in this ZIP:
- app.js: saves the active survey step and form answers in sessionStorage, restores the same step/answers/scroll position after refresh, and preserves the terminal ineligible/submitted page within the same browser tab.
- styles.css: removes the large blank space above the left-panel introduction by top-aligning the content on desktop. Existing footer and question-hint styles are retained.

Apply safely:
1. Extract this ZIP.
2. In the FamilyGuard-Global-Survey GitHub repository, replace ONLY app.js and styles.css with these files.
3. Commit the changes and wait for Cloudflare Pages to deploy.
4. Open the survey, move to step 2 or 3, select a few answers, refresh the page, and confirm that the same step and answers remain.
5. Test the ineligible route by selecting "No" for the parent/legal guardian question. Refresh on the closing page; it should remain on the closing page in that same browser tab.

Important:
- Do not replace index.html, functions/, schema.sql, or wrangler.toml for this update.
- Draft state is scoped to the current browser tab using sessionStorage. It is not a permanent account-level record and does not replace server-side submission protection.
- A new tab or cleared browser session may start a fresh survey.
