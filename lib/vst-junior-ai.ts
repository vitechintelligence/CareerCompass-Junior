import "server-only";

type ContactSuggestion = {
  email: string | null;
  sourceUrl: string | null;
  contactPage: string | null;
  confidence: "high" | "medium" | "none";
  note: string;
};

function outputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as { output_text?: unknown; output?: unknown[] };
  if (typeof root.output_text === "string") return root.output_text;
  const output = Array.isArray(root.output) ? root.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown[] }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return String((part as { text: string }).text);
      }
    }
  }
  return "";
}

export async function findPublicCompanyContact(companyName: string, website?: string): Promise<ContactSuggestion> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      email: null,
      sourceUrl: null,
      contactPage: null,
      confidence: "none",
      note: "Ask Mr. Vi web lookup is not configured yet. Add OPENAI_API_KEY to the server environment.",
    };
  }

  const prompt = `Find a PUBLICLY PUBLISHED business contact email for this company using the official company website or an official company-controlled page.
Company: ${companyName}
Known website: ${website || "not provided"}

Rules:
- Prefer a general company, education, partnerships, community, CSR, careers, HR or contact address suitable for a school partnership.
- Never guess an email address, infer a person's private address, or use scraped personal-contact databases.
- If no official published email can be verified, return null for email.
- Return exactly one JSON object with: email, sourceUrl, contactPage, confidence ("high","medium","none"), note.
- sourceUrl must be the public page supporting the email.`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MR_VI_MODEL || "gpt-5.6-luna",
        tools: [{ type: "web_search", search_context_size: "low" }],
        input: prompt,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      return { email: null, sourceUrl: null, contactPage: null, confidence: "none", note: `Mr. Vi lookup failed (${response.status}).` };
    }
    const payload = await response.json();
    const text = outputText(payload).trim().replace(/^\`\`\`json\s*/i, "").replace(/\`\`\`$/i, "").trim();
    const parsed = JSON.parse(text) as Partial<ContactSuggestion>;
    const email = typeof parsed.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.email) ? parsed.email : null;
    const confidence = parsed.confidence === "high" || parsed.confidence === "medium" ? parsed.confidence : "none";
    return {
      email,
      sourceUrl: typeof parsed.sourceUrl === "string" ? parsed.sourceUrl : null,
      contactPage: typeof parsed.contactPage === "string" ? parsed.contactPage : null,
      confidence: email ? confidence : "none",
      note: typeof parsed.note === "string" ? parsed.note.slice(0, 500) : (email ? "Public company contact found." : "No verified public email found."),
    };
  } catch {
    return { email: null, sourceUrl: null, contactPage: null, confidence: "none", note: "Mr. Vi could not verify a public company email." };
  }
}
