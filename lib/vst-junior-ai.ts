import "server-only";
import { intelligenceRuntimeAvailability } from "@/lib/exchange/runtime-policy";

type ContactSuggestion = {
  email: string | null;
  sourceUrl: string | null;
  contactPage: string | null;
  confidence: "high" | "medium" | "none";
  note: string;
  provider?: "openai" | "mock";
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

export async function findPublicCompanyContact(
  companyName: string,
  website?: string,
  options?: { mode?: "openai" | "mock"; model?: string; allowWebSearch?: boolean },
): Promise<ContactSuggestion> {
  const mode = options?.mode || "mock";
  const model = options?.model || process.env.MR_VI_MODEL || "gpt-6-luna";
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (mode !== "openai" || !apiKey || options?.allowWebSearch !== true || !intelligenceRuntimeAvailability().available) {
    return {
      email: null,
      sourceUrl: null,
      contactPage: null,
      confidence: "none",
      provider: "mock",
      note: options?.allowWebSearch === false
        ? "Mr. Vi is running in zero-cost test mode. Live OpenAI web search is disabled until explicitly enabled."
        : "Mr. Vi is running in zero-cost test mode. The OpenAI connection can be tested separately in Data & AI Control.",
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
        model,
        store: false,
        background: false,
        reasoning: { effort: "none" },
        tools: [{ type: "web_search", search_context_size: "low" }],
        input: prompt,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      return {
        email: null,
        sourceUrl: null,
        contactPage: null,
        confidence: "none",
        provider: "mock",
        note: `OpenAI lookup was unavailable (${response.status}); Mr. Vi stayed in safe test mode.`,
      };
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
      provider: "openai",
      note: typeof parsed.note === "string" ? parsed.note.slice(0, 500) : (email ? "Public company contact found." : "No verified public email found."),
    };
  } catch {
    return {
      email: null,
      sourceUrl: null,
      contactPage: null,
      confidence: "none",
      provider: "mock",
      note: "OpenAI could not complete the lookup; Mr. Vi stayed in safe test mode.",
    };
  }
}
