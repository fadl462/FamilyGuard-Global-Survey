// Email notifications use Resend. Missing or failed email configuration must never
// prevent a successfully validated record from being saved to D1.
const NOTIFY_TO = "fadl_rahman3@yahoo.com";

export async function notifyNewData(env, {kind, createdAt, detail}) {
  if (!env.RESEND_API_KEY || !env.NOTIFICATION_FROM) return;
  const subject = `FamilyGuard: new ${kind} received`;
  const text = [
    "New data has been received by the FamilyGuard Global Survey website.",
    "",
    `Data type: ${kind}`,
    `Received at (UTC): ${createdAt}`,
    detail || "The record was saved to the Cloudflare D1 database.",
    "",
    "This notification does not contain the respondent's answers or email address.",
    "Manage and export records securely from your Cloudflare D1 database/admin export endpoint."
  ].join("\n");
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.NOTIFICATION_FROM,
        to: [NOTIFY_TO],
        subject,
        text
      })
    });
  } catch (_) {
    // Notification is best-effort; data persistence takes priority.
  }
}
