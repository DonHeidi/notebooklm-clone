"use client";

// Last-resort boundary: catches failures in the root layout itself, so it
// must render its own <html>/<body> and cannot rely on the app shell,
// fonts, or Tailwind theme tokens beyond the compiled globals.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>
          Something went wrong
        </h1>
        <p style={{ maxWidth: "24rem", fontSize: "0.875rem", color: "#666" }}>
          An unexpected error interrupted the app. Your data is safe.
          {error.digest ? ` (Error code: ${error.digest})` : ""}
        </p>
        <button
          onClick={reset}
          style={{
            border: "1px solid #ccc",
            borderRadius: "0.5rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            cursor: "pointer",
            background: "transparent",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
