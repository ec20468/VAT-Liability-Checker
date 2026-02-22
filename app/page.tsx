"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FlowResponse } from "@/lib/schemas/flow";

import { PasswordGate } from "@/components/vat/PasswordGate";
import { InitialScreen } from "@/components/vat/InitialScreen";
import { ActiveScreen } from "@/components/vat/ActiveScreen";

const SITE_PASSWORD = "vat2025"; // ← change this to your chosen password

type AnswersMap = Record<string, string>;

export type AnsweredPair = { id: string; value: string; label?: string };

export type RoundEntry = {
  id: string;
  answered: AnsweredPair[];
  data: FlowResponse;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Page() {
  // ── ALL hooks must come before any conditional return ──────────────────────
  const [unlocked, setUnlocked] = useState(false);

  const [draft, setDraft] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  const [rounds, setRounds] = useState<RoundEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingAnswers, setPendingAnswers] = useState<AnswersMap>({});
  const [showEvidence, setShowEvidence] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const latest = rounds[rounds.length - 1]?.data ?? null;
  const questions = latest?.questions ?? [];
  const isActive = submittedQuery !== null;

  const answeredChipsByRound = useMemo(() => {
    const map = new Map<string, AnsweredPair[]>();
    for (const r of rounds) map.set(r.id, r.answered);
    return map;
  }, [rounds]);

  useEffect(() => {
    if (!latest) return;

    const next: AnswersMap = {};
    for (const q of questions) {
      const existing = latest.state.answers[q.id];
      if (existing) next[q.id] = existing;
    }
    setPendingAnswers(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.state?.asked?.length, questions.length]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [rounds.length, loading, error]);
  // ──────────────────────────────────────────────────────────────────────────

  if (!unlocked) {
    return (
      <PasswordGate
        sitePassword={SITE_PASSWORD}
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  function startFresh() {
    setSubmittedQuery(null);
    setRounds([]);
    setPendingAnswers({});
    setError(null);
    setLoading(false);
    setShowEvidence(false);
  }

  async function callFlow(payload: unknown, answeredMeta: AnsweredPair[]) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/flow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          json
            ? JSON.stringify(json, null, 2)
            : `Request failed (${res.status}) with non-JSON response`,
        );
        return;
      }

      const data = json as FlowResponse;

      setRounds((cur) => [
        ...cur,
        {
          id: uid(),
          answered: answeredMeta,
          data,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submitInitial() {
    const q = draft.trim();
    if (!q) return;

    startFresh();
    setSubmittedQuery(q);
    callFlow({ userText: q }, []);
  }

  function submitClarifiers() {
    if (!latest || !submittedQuery) return;

    const answeredForThisRound: AnsweredPair[] = [];

    for (const q of questions) {
      const value = pendingAnswers[q.id];
      if (typeof value !== "string" || value.length === 0) continue;

      const opt = q.options.find((o) => o.value === value);
      answeredForThisRound.push({ id: q.id, value, label: opt?.label });
    }

    const answeredPayload = answeredForThisRound.map(({ id, value }) => ({
      id,
      value,
    }));

    callFlow(
      {
        userText: submittedQuery,
        answered: answeredPayload,
        state: latest.state,
      },
      answeredForThisRound,
    );
  }

  if (!isActive) {
    return (
      <InitialScreen
        draft={draft}
        setDraft={setDraft}
        loading={loading}
        error={error}
        onSubmitInitial={submitInitial}
      />
    );
  }

  return (
    <ActiveScreen
      draft={draft}
      setDraft={setDraft}
      submittedQuery={submittedQuery}
      rounds={rounds}
      latest={latest}
      loading={loading}
      error={error}
      showEvidence={showEvidence}
      setShowEvidence={setShowEvidence}
      pendingAnswers={pendingAnswers}
      setPendingAnswers={setPendingAnswers}
      answeredChipsByRound={answeredChipsByRound}
      scrollRef={scrollRef}
      onSubmitInitial={submitInitial}
      onSubmitClarifiers={submitClarifiers}
      onReset={startFresh}
    />
  );
}
