"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FlowResponse } from "@/lib/schemas/flow";

import { PasswordGate } from "@/components/vat/PasswordGate";
import { InitialScreen } from "@/components/vat/InitialScreen";

import { AnswerScreen } from "@/components/vat/AnswerScreen";
import { ClarifierScreen } from "@/components/vat/ClarifierScreen";
import { LoadingScreen } from "@/components/vat/LoadingScreen";

const SITE_PASSWORD = "vat2025";

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

// Shape LoadingScreen POSTs to /api/flow
type PendingRequest = {
  userText: string;
  answered?: { id: string; value: string }[];
  state?: FlowResponse["state"];
};

export default function Page() {
  const [unlocked, setUnlocked] = useState(false);

  const [draft, setDraft] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  const [rounds, setRounds] = useState<RoundEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingAnswers, setPendingAnswers] = useState<AnswersMap>({});
  const [showEvidence, setShowEvidence] = useState(false);

  // when set, LoadingScreen renders and owns the fetch
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(
    null,
  );

  // carries answeredMeta across the async boundary
  const pendingAnsweredMetaRef = useRef<AnsweredPair[]>([]);

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
    setPendingRequest(null);
  }

  // Called by LoadingScreen when stream emits { type: "done" }
  function handleStreamDone(data: FlowResponse) {
    setRounds((cur) => [
      ...cur,
      { id: uid(), answered: pendingAnsweredMetaRef.current, data },
    ]);
    setLoading(false);
    setPendingRequest(null);
    pendingAnsweredMetaRef.current = [];
  }

  function handleStreamError(msg: string) {
    setError(msg);
    setLoading(false);
    setPendingRequest(null);
  }

  // Initial submit
  function submitInitial() {
    const q = draft.trim();
    if (!q) return;
    startFresh();
    setSubmittedQuery(q);
    pendingAnsweredMetaRef.current = [];
    setPendingRequest({ userText: q });
    setLoading(true);
  }

  // Clarifier submit
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

    pendingAnsweredMetaRef.current = answeredForThisRound;
    setPendingRequest({
      userText: submittedQuery,
      answered: answeredPayload,
      state: latest.state,
    });
    setLoading(true);
  }

  // Render

  // LoadingScreen takes over while streaming
  if (loading && pendingRequest) {
    return (
      <LoadingScreen
        request={pendingRequest}
        onDone={handleStreamDone}
        onError={handleStreamError}
      />
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

  if (latest?.answer) {
    return (
      <AnswerScreen
        query={submittedQuery}
        response={latest}
        onReset={startFresh}
      />
    );
  }

  if (latest?.questions.length) {
    return (
      <ClarifierScreen
        query={submittedQuery}
        response={latest}
        onSubmitAnswer={(questionId, value) => {
          setPendingAnswers(() => ({ [questionId]: value }));
          submitClarifiers();
        }}
        onReset={startFresh}
      />
    );
  }
}
