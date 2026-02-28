import React from "react";

interface VATInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export default function VATInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'e.g. "importing a car from Argentina"',
  disabled = false,
  inputRef,
}: VATInputProps) {
  const [focused, setFocused] = React.useState(false);

  const canSubmit = !disabled && !!value.trim();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        background: "#fff",
        borderRadius: 10,
        border: "2px solid #0f172a",
        padding: "6px 6px 6px 20px",
        boxShadow: focused ? "6px 6px 0 #0f172a" : "4px 4px 0 #0f172a",
        transform: focused ? "translate(-1px, -1px)" : "translate(0, 0)",
        transition: "box-shadow 0.15s, transform 0.15s",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        ref={inputRef}
        id="supply-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          fontSize: 16,
          color: "#0f172a",
          fontFamily: "inherit",
          padding: "8px 0",
          background: "transparent",
        }}
      />
      <button
        onClick={() => {
          if (canSubmit) onSubmit();
        }}
        disabled={!canSubmit}
        aria-label="Submit"
        style={{
          background: canSubmit ? "#1d70b8" : "#93c5fd",
          border: "none",
          borderRadius: 7,
          cursor: canSubmit ? "pointer" : "not-allowed",
          width: 40,
          height: 40,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          if (canSubmit)
            (e.currentTarget as HTMLButtonElement).style.background = "#1d70b8";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = canSubmit
            ? "#1d70b8"
            : "#93c5fd";
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="8" x2="13" y2="8" />
          <polyline points="9 4 13 8 9 12" />
        </svg>
      </button>
    </div>
  );
}
