# FamilyGuard Intelligence — Global Survey

A responsive six-step global research survey for Cloudflare Pages. Survey answers, report-delivery email addresses, and product-testing interest email addresses are stored in separate D1 tables. Emails are never included in the survey-response payload.

## What's included
- Responsive survey UI (`index.html`, `styles.css`, `app.js`)
- Cloudflare Pages Functions for survey submissions and two optional follow-up purposes
- Admin-only CSV export endpoint
- D1 schema (`schema.sql`)
- Cloudflare configuration starter (`wrangler.toml`)

## Survey screening and consent
- The target respondent is a parent or legal guardian of at least one child under 18.
- Country is required and includes a broad country list for international research.
- Child age bands, device types, current safety practices, and satisfaction are collected as context; no child names or dates of birth are requested.
- People who do not meet the parent/legal-guardian screening criterion are not eligible to continue this parent-focused survey. If the study scope later expands to educators or other caregivers, create a separate survey path rather than silently mixing those populations.
- Report delivery and product-testing interest are independent, optional choices. Each has its own email field and purpose-specific consent. Neither is required to submit the survey.
- Testing interest is not agreement to participate in a specific test. Before any pilot, provide details about the product, what data it processes, participant requirements, risks and safeguards, and obtain separate informed consent.

## Deploy to Cloudflare Pages + D1

1. Create a D1 database in Cloudflare dashboard: **Workers & Pages → D1 SQL Database → Create database**. Name it `familyguard-survey-db`.
2. Open the database Console and execute the entire `schema.sql` file. If you already deployed an earlier version of this survey, run the updated schema against the existing database to add the two new contact tables; do not drop existing survey data.
3. Update `wrangler.toml`: replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` with your D1 database ID. Keep the database name consistent.
4. Put this project in a GitHub repository, then create a Cloudflare Pages project connected to that repository.
   - Framework preset: **None**
   - Build command: leave blank
   - Build output directory: `/` or `.` (project root)
5. In Pages project **Settings → Functions → D1 database bindings**, add binding variable `DB` and select `familyguard-survey-db`.
6. Add a secret in **Settings → Variables and Secrets**: `ADMIN_TOKEN` with a long random secret of at least 32 characters. Do not commit it to Git.
7. Redeploy after updating bindings/secrets. Test a survey response with no email opt-ins, report-only, testing-only, and both options.

### Optional: Wrangler CLI
Install Wrangler and authenticate, then:
- `npx wrangler d1 create familyguard-survey-db`
- Run schema: `npx wrangler d1 execute familyguard-survey-db --remote --file=./schema.sql`
- Replace the database ID in `wrangler.toml`.
- Deploy through your normal Pages/Git workflow. For a direct upload, ensure Functions are deployed using Wrangler's supported Pages workflow; dashboard Git integration is the simplest route.

## Exporting data
Use an Authorization header: `Bearer YOUR_ADMIN_TOKEN`. Do not put the token in a public URL or expose it in frontend JavaScript.
- `/api/admin/export` — survey response CSV
- `/api/admin/export?kind=report` — people who consented to receive the final report
- `/api/admin/export?kind=testers` — people who consented to be contacted about testing

## Privacy and security notes
- The survey asks for general family context, not children's names, dates of birth, private messages, screenshots or account credentials.
- Survey answers and the two email lists are stored in separate tables with no shared respondent ID.
- Before public launch, publish a proper privacy notice naming the responsible organisation, purposes, retention period, contact details, applicable rights, and how data is handled. Get appropriate legal/privacy review for the countries targeted.
- Have a clear retention/deletion process and a way to honour unsubscribe or withdrawal requests. Email systems should not send updates beyond the purpose the person selected.
- This is a research MVP. Add rate limiting and bot protection (for example, Cloudflare Turnstile) before a large campaign. The current endpoints validate required fields but do not implement rate limiting or CAPTCHA.
- Do not promise absolute anonymity: Cloudflare and hosting infrastructure may process technical metadata under their policies.
- Test keyboard accessibility, mobile layout, the full submission flow, and all three CSV exports before sharing widely.

## Local preview
Open `index.html` in a browser to inspect the UI. API submissions will not save without Cloudflare Pages Functions and the D1 binding. For full local testing, use Wrangler Pages dev with D1 configured.


## 20-response batch export (optional)

This project can flag a private export batch after every 20 new survey responses. The export is an Excel-compatible CSV (opens in Excel), with JSON answers expanded into separate columns. It does not email or store a file automatically; an administrator downloads each ready batch using the authenticated endpoint.

1. Run `export-tracker-migration.sql` once in the existing D1 database Console. It initializes the cursor at the current response count, so existing responses are preserved and not included in the first new batch.
2. Deploy the updated Pages Functions. Keep the existing `DB` binding and `ADMIN_TOKEN` secret.
3. Check readiness at `/api/admin/export?kind=status` with the `Authorization: Bearer YOUR_ADMIN_TOKEN` header.
4. When 20 new responses are ready, download `/api/admin/export?kind=batch` with the same header. It downloads a CSV that opens in Excel.
5. The existing `/api/admin/export`, `?kind=report`, and `?kind=testers` routes remain available.

Important: do not put the admin token in a URL or in public frontend code. Batch export is download-on-demand after the threshold is reached, not an automatic email attachment.


## Download a full Excel workbook

After deploying, open `/admin-export.html` on your survey domain. Enter the existing `ADMIN_TOKEN` secret and select **Download Excel workbook (.xlsx)**. The workbook contains three sheets: Survey Responses, Report Subscribers, and Testing Interest. It reads the existing authenticated export endpoints and does not alter the database. The workbook library loads from jsDelivr, so an internet connection is required. Keep the admin token private; do not put it in a URL or commit it to the repository.
