import "server-only";

type InvitationEmail = {
  to: string;
  companyName: string;
  institutionName: string;
  inviteUrl: string;
  collaborationTypes: string[];
  note?: string | null;
};

export type MailResult = {
  status: "sent" | "failed";
  providerMessageId?: string;
  error?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[char] || char);
}

export async function sendVstJuniorInvitation(input: InvitationEmail): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.VST_JUNIOR_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    return { status: "failed", error: "Email delivery is not configured. Set RESEND_API_KEY and VST_JUNIOR_FROM_EMAIL." };
  }

  const safeCompany = escapeHtml(input.companyName);
  const safeInstitution = escapeHtml(input.institutionName);
  const safeNote = escapeHtml(input.note || "");
  const safeTypes = input.collaborationTypes.map((item) => escapeHtml(item.replaceAll("_", " "))).join(" · ");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:auto;color:#10233f;line-height:1.6">
      <div style="padding:24px;border-radius:20px;background:#0f2745;color:white">
        <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#9ddfe8">VinaSkillTrust Junior · Grade 11–12</div>
        <h1 style="font-size:28px;line-height:1.15;margin:10px 0">A school would like to connect with ${safeCompany}</h1>
        <p style="margin:0;opacity:.86">Career exploration and age-appropriate work simulation, moderated by ViTech.</p>
      </div>
      <div style="padding:26px 8px">
        <p><strong>${safeInstitution}</strong> has requested a company connection through VinaSkillTrust Junior.</p>
        <p><strong>Requested collaboration:</strong> ${safeTypes || "Career exposure"}</p>
        ${safeNote ? `<p><strong>School note:</strong> ${safeNote}</p>` : ""}
        <p>No student personal data is included in this invitation. Company-created simulations are not published automatically and remain subject to ViTech review for Grade 11–12 suitability and safety.</p>
        <p style="margin:28px 0"><a href="${input.inviteUrl}" style="background:#0f2745;color:white;text-decoration:none;padding:13px 20px;border-radius:12px;font-weight:800">View & respond to request</a></p>
        <p style="font-size:12px;color:#617189">This secure invitation link expires automatically. If you were not expecting this request, you may decline it from the response page.</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: `${input.institutionName} invited ${input.companyName} to VinaSkillTrust Junior`,
        html,
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) return { status: "failed", error: payload.message || `Email provider returned ${response.status}.` };
    return { status: "sent", providerMessageId: payload.id };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message.slice(0, 500) : "Email delivery failed." };
  }
}
