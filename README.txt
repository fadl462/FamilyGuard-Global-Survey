FamilyGuard Intelligence — Question-Level Validation Hint Fix

Files included:
- app.js
- styles.css

What changed:
- Selection-limit warnings now appear beside the exact question they refer to instead of at the top of the survey step.
- Required-answer validation messages appear beside the relevant question or consent/email option.
- Question-level warnings clear when the respondent changes that question.
- Preserves the previously corrected ineligible-respondent closing page and the disabled Close button behaviour.
- Keeps the existing survey submission endpoints and consent/data-storage logic unchanged.

Apply:
1. Replace app.js and styles.css in the FamilyGuard-Global-Survey GitHub repository with these files.
2. Commit the changes and wait for Cloudflare Pages to deploy.
3. Refresh the survey (Ctrl+F5) and test the concerns question by selecting four options; the warning should appear directly under that question's helper text.

Do not replace index.html, functions/, schema.sql, or wrangler.toml for this update.
