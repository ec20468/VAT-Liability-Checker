"use client";

import { useState } from "react";

export function PasswordGate({
  sitePassword,
  onUnlock,
}: {
  sitePassword: string;
  onUnlock: () => void;
}) {
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);

  function attempt() {
    if (value === sitePassword) {
      onUnlock();
    } else {
      setShake(true);
      setValue("");
      setTimeout(() => setShake(false), 600);
    }
  }

  return (
    <main className="min-h-screen px-6">
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center">
        <div
          className="w-full space-y-3 rounded-2xl border border-khgreen/12 bg-white p-6"
          style={shake ? { animation: "shake 0.4s ease-in-out" } : {}}
        >
          <div className="text-center">
            <div className="text-xl font-semibold">VAT liability helper</div>
            <div className="mt-1 text-sm opacity-70">
              Enter the access password
            </div>
          </div>

          <input
            type="password"
            autoFocus
            className="w-full rounded-xl border border-khgreen/12 px-4 py-3 text-sm"
            placeholder="Password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") attempt();
            }}
          />

          <button
            className="w-full rounded-xl border border-khgreen/12 px-4 py-2 text-sm"
            onClick={attempt}
            type="button"
          >
            Enter
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px); }
        }
      `}</style>
    </main>
  );
}
