FAMILYGUARD SURVEY — CSS RESTORATION HOTFIX

Replace only the existing styles.css in the GitHub repository with this styles.css.
Do not upload the containing folder or replace other files.

This hotfix ensures:
- The welcome screen is hidden after the survey starts, so the welcome page and questionnaire do not appear together.
- The layout is shown only after the survey starts.
- The test banner has a visible, readable style when the API reports testMode=true.

After committing, wait for Cloudflare Pages to deploy, then open the survey in a private/incognito window or clear the site cache and hard-refresh (Ctrl+F5).

This CSS does not send email or change D1 data. The test banner still depends on the existing API confirming test mode.
