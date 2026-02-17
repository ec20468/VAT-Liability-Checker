"use server";

import { Resend } from "resend";
import { z } from "zod";
import { headers } from "next/headers";

export type EnquiryActionState =
  | { status: "idle" }
  | { status: "success"; ref?: string }
  | { status: "error"; message?: string };

const Schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(80, "Name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email.")
    .max(120, "Email is too long."),
  goals: z
    .string()
    .trim()
    .min(10, "Please enter a longer message (at least 10 characters).")
    .max(2000, "Message is too long."),
  termsAccepted: z.literal("on"),
  marketingOptIn: z.string().optional(),
  website: z.string().optional(),
  turnstileToken: z
    .string()
    .trim()
    .min(1, "Please complete the verification and try again."),
});

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = mustGetEnv("TURNSTILE_SECRET_KEY");

  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() || undefined;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);

  const resp = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body },
  );

  if (!resp.ok) return false;

  const data = (await resp.json()) as { success?: boolean };
  return data.success === true;
}

export async function createEnquiry(
  _prev: EnquiryActionState,
  formData: FormData,
): Promise<EnquiryActionState> {
  try {
    const website = String(formData.get("website") ?? "").trim();
    if (website) return { status: "success" };

    const raw = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      goals: String(formData.get("goals") ?? ""),
      termsAccepted: formData.get("termsAccepted"),
      marketingOptIn: String(formData.get("marketingOptIn") ?? ""),
      website: String(formData.get("website") ?? ""),
      turnstileToken: String(formData.get("cf-turnstile-response") ?? ""),
    };

    const parsed = Schema.safeParse(raw);

    if (!parsed.success) {
      const issues = parsed.error.issues;
      const field = (path: string) => issues.find((i) => i.path[0] === path);

      if (field("termsAccepted")) {
        return {
          status: "error",
          message: "Please accept the terms to continue.",
        };
      }

      const turnErr = field("turnstileToken");
      if (turnErr) {
        return {
          status: "error",
          message: "Please complete the verification and try again.",
        };
      }

      const emailErr = field("email");
      if (emailErr) {
        return { status: "error", message: "Please enter a valid email." };
      }

      const nameErr = field("name");
      if (nameErr) {
        return { status: "error", message: "Please enter your name." };
      }

      const goalsErr = field("goals");
      if (goalsErr) {
        return {
          status: "error",
          message: "Please enter a longer message (at least 10 characters).",
        };
      }

      return {
        status: "error",
        message:
          issues[0]?.message ?? "Please check your details and try again.",
      };
    }

    const ok = await verifyTurnstile(parsed.data.turnstileToken);
    if (!ok) {
      return {
        status: "error",
        message: "Verification failed. Please try again.",
      };
    }

    const resend = new Resend(mustGetEnv("RESEND_API_KEY"));
    const ownerEmail = mustGetEnv("OWNER_EMAIL");
    const fromEmail = mustGetEnv("FROM_EMAIL");

    const subjectOwner = `New KH Elevate enquiry: ${parsed.data.name}`;
    const ownerHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>New enquiry</h2>
        <p><b>Name:</b> ${escapeHtml(parsed.data.name)}</p>
        <p><b>Email:</b> ${escapeHtml(parsed.data.email)}</p>
        <p><b>Marketing opt-in:</b> ${parsed.data.marketingOptIn ? "Yes" : "No"}</p>
        <p><b>Message:</b></p>
        <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px">${escapeHtml(parsed.data.goals)}</pre>
      </div>
    `.trim();

    const ownerSend = await resend.emails.send({
      from: fromEmail,
      to: ownerEmail,
      replyTo: parsed.data.email,
      subject: subjectOwner,
      html: ownerHtml,
    });

    if (ownerSend.error) {
      return {
        status: "error",
        message: `Admin email failed: ${ownerSend.error.message ?? "Unknown error"}`,
      };
    }

    const subjectUser = "We received your enquiry — KH Elevate";
    const userHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Enquiry received</h2>
        <p>Thanks, ${escapeHtml(parsed.data.name)} — we’ve got your message.</p>
        <p>We’ll reply within <b>1 business day</b> (Mon–Fri).</p>
        <p style="margin-top:18px"><b>Your message:</b></p>
        <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px">${escapeHtml(parsed.data.goals)}</pre>
        <p style="margin-top:18px">If you don’t see our reply soon, please check Junk/Spam.</p>
      </div>
    `.trim();

    const userSend = await resend.emails.send({
      from: fromEmail,
      to: parsed.data.email,
      subject: subjectUser,
      html: userHtml,
    });

    if (userSend.error) {
      return {
        status: "error",
        message: `User email failed: ${userSend.error.message ?? "Unknown error"}`,
      };
    }

    const ref = ownerSend.data?.id;
    return { status: "success", ref };
  } catch (e) {
    const msg =
      e instanceof Error && e.message.startsWith("Missing env:")
        ? e.message
        : "Something went wrong. Please try again.";

    return { status: "error", message: msg };
  }
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
