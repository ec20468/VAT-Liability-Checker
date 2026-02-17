"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createEnquiry } from "@/app/actions/create-enquiry";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

declare global {
  interface Window {
    turnstile?: { reset?: () => void };
  }
}

type EnquiryActionState =
  | { status: "idle" }
  | { status: "success"; ref?: string }
  | { status: "error"; message?: string };

const initialState: EnquiryActionState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Sending…" : "Submit"}
    </Button>
  );
}

function SuccessReceipt({ refId }: { refId?: string }) {
  return (
    <div className="space-y-3">
      <div className="text-xl font-bold">Enquiry received.</div>
      <div className="text-sm opacity-80">
        We’ll reply within 1 business day (Mon–Fri).
      </div>
      {refId ? (
        <div className="text-xs opacity-70">Reference: {refId}</div>
      ) : null}
      <div className="rounded-xl border border-khgreen/15 bg-cream p-4 text-sm">
        If you don’t see our reply soon, please check Junk/Spam and mark it Not
        junk.
      </div>
    </div>
  );
}

export function ContactSection() {
  const [state, formAction] = useFormState(createEnquiry, initialState);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (state.status === "error") {
      try {
        window.turnstile?.reset?.();
      } catch {}
    }
  }, [state.status]);

  return (
    <section id="contact" className="py-12 sm:py-16 scroll-mt-24">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />
      <Container>
        <div className="rounded-2xl bg-khgreen p-6 text-cream shadow-soft sm:p-10">
          <div className="grid gap-8 sm:grid-cols-2 sm:items-start">
            <div>
              <div className="text-xs font-semibold tracking-[0.22em] opacity-80">
                CONTACT
              </div>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                Let’s talk.
              </h2>
              <p className="mt-3 max-w-md text-sm opacity-85">
                Send your details and what you’re trying to achieve. We’ll reply
                within 1 business day.
              </p>
            </div>

            <div className="rounded-2xl bg-cream p-6 text-khgreen sm:p-7">
              {state.status === "success" ? (
                <SuccessReceipt refId={state.ref} />
              ) : (
                <form action={formAction} className="space-y-4">
                  <div className="sr-only" aria-hidden="true">
                    <label htmlFor="website">Website</label>
                    <input
                      id="website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      defaultValue=""
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Your Name</label>
                    <input
                      name="name"
                      required
                      className="mt-1 h-11 w-full rounded-xl border border-khgreen/20 bg-cream px-4 text-sm outline-none focus:ring-2 focus:ring-khgreen/20"
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Your Email</label>
                    <input
                      name="email"
                      type="email"
                      required
                      className="mt-1 h-11 w-full rounded-xl border border-khgreen/20 bg-cream px-4 text-sm outline-none focus:ring-2 focus:ring-khgreen/20"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Tell us about your project
                    </label>
                    <textarea
                      name="goals"
                      required
                      rows={5}
                      className="mt-1 w-full rounded-xl border border-khgreen/20 bg-cream px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-khgreen/20 resize-none"
                      placeholder="Describe your goals and what success looks like."
                    />
                  </div>

                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      required
                      className="mt-1"
                    />
                    <span className="opacity-80">
                      I agree to the terms and understand my data will be used
                      to respond.
                    </span>
                  </label>

                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="marketingOptIn"
                      className="mt-1"
                    />
                    <span className="opacity-80">
                      I’d like occasional updates by email.
                    </span>
                  </label>

                  {siteKey ? (
                    <div className="pt-2">
                      <div className="cf-turnstile" data-sitekey={siteKey} />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm">
                      Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY.
                    </div>
                  )}

                  {state.status === "error" ? (
                    <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm">
                      {state.message ?? "Couldn’t send. Please try again."}
                    </div>
                  ) : null}

                  <SubmitButton />
                  <div className="text-center text-xs opacity-70">
                    No spam. Ever.
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
