import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";
import { aiEnabled } from "@/lib/ai";

/**
 * A suggested reply to a guest request, for staff to read, edit and send. A person always sends it: nothing here reaches a guest by itself.
 * The model is told what it may not say (times, compensation, codes, passwords) and the house guide is the only source of facts it may use.
 * Without an AI key a short, safe template is returned instead, so the button still helps.
 */
export type DraftLang = "en" | "ar";

export interface DraftInput {
  lang: DraftLang;
  firstName: string;
  propertyName: string;
  requestBody: string;
  category: string;
  urgency: "normal" | "urgent";
  status: string;
  stage: string;
  guide: string;                // published house-guide text, already trimmed
}

const TEMPLATES: Record<DraftLang, (i: DraftInput) => string> = {
  en: (i) => i.urgency === "urgent"
    ? `Hi ${i.firstName}, thank you for letting us know. We understand this is urgent and our team is on it now. We will update you here as soon as we have news.`
    : `Hi ${i.firstName}, thank you for your message. We have passed it to our team and will come back to you here shortly.`,
  ar: (i) => i.urgency === "urgent"
    ? `أهلاً ${i.firstName}، شكراً لإبلاغنا. نتفهم أن الأمر عاجل وفريقنا يعمل عليه الآن، وسنوافيك بالتفاصيل هنا فور توفرها.`
    : `أهلاً ${i.firstName}، شكراً لرسالتك. أحلناها إلى فريقنا وسنعود إليك هنا قريباً.`,
};

const SYSTEM = (i: DraftInput) => `You write replies for the guest team at JOOD, a hosted private-homes company in Egypt, to a guest who sent a request from their stay page.
Write ONE short reply, in ${i.lang === "ar" ? "Arabic (Modern Standard, friendly, not stiff)" : "English"}. Two to four sentences, warm and plain, no greeting formulas beyond the guest's first name, no emojis, no signature.
Rules:
- Say what we will do, and only what we can honestly say. Never promise an exact time, a price, a refund, a discount or compensation.
- If the guest needs something done in person, say the team will arrange it and will update them in the app.
- If the answer is in the HOUSE GUIDE below, give it. If it is not, do not invent: say the team will confirm.
- Never write a door code, a Wi-Fi password, a phone number or any other private detail.
- If the request is urgent or a safety matter, acknowledge it first and say the team is on it now.
- If you truly need one more detail, ask for exactly one.
Reply with the message text only.`;

export async function draftReply(i: DraftInput): Promise<{ text: string; ai: boolean }> {
  if (!aiEnabled()) return { text: TEMPLATES[i.lang](i), ai: false };
  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM(i),
      messages: [{
        role: "user",
        content: [
          `Guest first name: ${i.firstName}`, `Property: ${i.propertyName}`, `Stay stage: ${i.stage}`, `Request category: ${i.category}; urgency: ${i.urgency}; current status: ${i.status}`,
          "", "GUEST REQUEST:", i.requestBody.slice(0, 1200), "", "HOUSE GUIDE (the only facts you may use):", i.guide || "No house guide has been written for this property.",
        ].join("\n"),
      }],
    });
    const block = res.content[0];
    const text = block && block.type === "text" ? block.text.trim() : "";
    if (!text) return { text: TEMPLATES[i.lang](i), ai: false };
    return { text: text.slice(0, 900), ai: true };
  } catch (err) {
    Sentry.captureException(err);
    return { text: TEMPLATES[i.lang](i), ai: false };
  }
}
