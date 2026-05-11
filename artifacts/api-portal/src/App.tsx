import { useEffect, useState } from "react";

const MODELS = [
  { id: "claude-opus-4-20250514", name: "Claude Opus 4", tier: "Flagship" },
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", tier: "Balanced" },
  { id: "claude-haiku-4-20250514", name: "Claude Haiku 4", tier: "Fast" },
];

function App() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  useEffect(() => {
    fetch(`${baseUrl}/api/healthz`)
      .then((res) => {
        if (res.ok) setStatus("online");
        else setStatus("offline");
      })
      .catch(() => setStatus("offline"));
  }, [baseUrl]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Anthropic Reverse Proxy</h1>
        <p style={styles.subtitle}>OpenAI-compatible API Gateway for Claude Models</p>
        <div style={styles.statusBadge}>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor:
                status === "online" ? "#10b981" : status === "offline" ? "#ef4444" : "#f59e0b",
            }}
          />
          <span style={styles.statusText}>
            {status === "checking" ? "Checking..." : status === "online" ? "Online" : "Offline"}
          </span>
        </div>
      </header>

      {/* API Endpoints */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>API Endpoints</h2>
        <div style={styles.endpointGrid}>
          <EndpointCard
            method="GET"
            path="/v1/models"
            url={`${baseUrl}/v1/models`}
            description="List available models"
            copied={copied}
            onCopy={copyToClipboard}
          />
          <EndpointCard
            method="POST"
            path="/v1/chat/completions"
            url={`${baseUrl}/v1/chat/completions`}
            description="Create chat completion (streaming supported)"
            copied={copied}
            onCopy={copyToClipboard}
          />
        </div>
      </section>

      {/* Base URL */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Base URL</h2>
        <div style={styles.codeBlock}>
          <code style={styles.codeText}>{baseUrl}/v1</code>
          <button
            style={styles.copyBtn}
            onClick={() => copyToClipboard(`${baseUrl}/v1`, "baseurl")}
          >
            {copied === "baseurl" ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>

      {/* API Key */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Authentication</h2>
        <div style={styles.infoCard}>
          <p style={styles.infoText}>
            All requests require a Bearer token in the <code style={styles.inlineCode}>Authorization</code> header:
          </p>
          <div style={styles.codeBlock}>
            <code style={styles.codeText}>Authorization: Bearer YOUR_PROXY_API_KEY</code>
          </div>
          <p style={{ ...styles.infoText, marginTop: "12px", color: "#9ca3af" }}>
            The API Key is set via the <code style={styles.inlineCode}>PROXY_API_KEY</code> environment variable on the server.
          </p>
        </div>
      </section>

      {/* Models */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Available Models</h2>
        <div style={styles.modelGrid}>
          {MODELS.map((model) => (
            <div key={model.id} style={styles.modelCard}>
              <div style={styles.modelHeader}>
                <span style={styles.modelName}>{model.name}</span>
                <span style={styles.modelTier}>{model.tier}</span>
              </div>
              <code style={styles.modelId}>{model.id}</code>
            </div>
          ))}
        </div>
      </section>

      {/* CherryStudio Guide */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>CherryStudio Setup Guide</h2>
        <div style={styles.stepsContainer}>
          <Step
            number={1}
            title="Add Provider"
            description='Open CherryStudio Settings > Model Provider > Add new provider. Select "OpenAI Compatible" as the provider type.'
          />
          <Step
            number={2}
            title="Configure Base URL"
            description={`Set the API Base URL to:`}
            code={`${baseUrl}/v1`}
            copied={copied}
            onCopy={copyToClipboard}
            copyLabel="cherry-url"
          />
          <Step
            number={3}
            title="Set API Key"
            description="Enter your PROXY_API_KEY value as the API Key in CherryStudio."
          />
          <Step
            number={4}
            title="Add Models"
            description="Click 'Fetch Models' or manually add the model IDs listed above. Select a model and start chatting!"
          />
        </div>
      </section>

      {/* cURL Example */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Quick Test (cURL)</h2>
        <div style={styles.codeBlockLarge}>
          <pre style={styles.preText}>{`curl ${baseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \\
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ],
    "stream": false
  }'`}</pre>
          <button
            style={{ ...styles.copyBtn, position: "absolute", top: "12px", right: "12px" }}
            onClick={() =>
              copyToClipboard(
                `curl ${baseUrl}/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \\\n  -d '{\n    "model": "claude-sonnet-4-20250514",\n    "messages": [\n      {"role": "system", "content": "You are a helpful assistant."},\n      {"role": "user", "content": "Hello!"}\n    ],\n    "stream": false\n  }'`,
                "curl"
              )
            }
          >
            {copied === "curl" ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>

      <footer style={styles.footer}>
        <p>Powered by Anthropic Claude API | OpenAI-Compatible Reverse Proxy</p>
      </footer>
    </div>
  );
}

function EndpointCard({
  method,
  path,
  url,
  description,
  copied,
  onCopy,
}: {
  method: string;
  path: string;
  url: string;
  description: string;
  copied: string | null;
  onCopy: (text: string, label: string) => void;
}) {
  const label = `endpoint-${path}`;
  return (
    <div style={styles.endpointCard}>
      <div style={styles.endpointHeader}>
        <span
          style={{
            ...styles.methodBadge,
            backgroundColor: method === "GET" ? "#10b981" : "#3b82f6",
          }}
        >
          {method}
        </span>
        <code style={styles.endpointPath}>{path}</code>
      </div>
      <p style={styles.endpointDesc}>{description}</p>
      <div style={styles.endpointUrl}>
        <code style={styles.urlText}>{url}</code>
        <button style={styles.copyBtnSmall} onClick={() => onCopy(url, label)}>
          {copied === label ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  description,
  code,
  copied,
  onCopy,
  copyLabel,
}: {
  number: number;
  title: string;
  description: string;
  code?: string;
  copied?: string | null;
  onCopy?: (text: string, label: string) => void;
  copyLabel?: string;
}) {
  return (
    <div style={styles.step}>
      <div style={styles.stepNumber}>{number}</div>
      <div style={styles.stepContent}>
        <h3 style={styles.stepTitle}>{title}</h3>
        <p style={styles.stepDesc}>{description}</p>
        {code && (
          <div style={styles.codeBlock}>
            <code style={styles.codeText}>{code}</code>
            {onCopy && copyLabel && (
              <button style={styles.copyBtn} onClick={() => onCopy(code, copyLabel)}>
                {copied === copyLabel ? "Copied!" : "Copy"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: "40px 20px",
    maxWidth: "900px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "48px",
  },
  title: {
    fontSize: "36px",
    fontWeight: 700,
    background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: "16px",
    color: "#94a3b8",
    margin: "0 0 16px 0",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 14px",
    borderRadius: "20px",
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    display: "inline-block",
  },
  statusText: {
    fontSize: "13px",
    color: "#cbd5e1",
  },
  section: {
    marginBottom: "40px",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#f1f5f9",
    marginBottom: "16px",
    borderBottom: "1px solid #1e293b",
    paddingBottom: "8px",
  },
  endpointGrid: {
    display: "grid",
    gap: "16px",
  },
  endpointCard: {
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #334155",
  },
  endpointHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
  },
  methodBadge: {
    padding: "3px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#fff",
  },
  endpointPath: {
    fontSize: "15px",
    color: "#e2e8f0",
    fontFamily: "monospace",
  },
  endpointDesc: {
    fontSize: "14px",
    color: "#94a3b8",
    margin: "0 0 12px 0",
  },
  endpointUrl: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#0f172a",
    borderRadius: "8px",
    padding: "8px 12px",
  },
  urlText: {
    fontSize: "13px",
    color: "#7dd3fc",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  copyBtnSmall: {
    padding: "4px 10px",
    fontSize: "12px",
    borderRadius: "6px",
    border: "1px solid #475569",
    backgroundColor: "#334155",
    color: "#e2e8f0",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  codeBlock: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#1e293b",
    borderRadius: "8px",
    padding: "12px 16px",
    border: "1px solid #334155",
  },
  codeBlockLarge: {
    position: "relative" as const,
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #334155",
    overflow: "auto",
  },
  codeText: {
    fontSize: "14px",
    color: "#7dd3fc",
    fontFamily: "monospace",
    flex: 1,
  },
  preText: {
    fontSize: "13px",
    color: "#a5f3fc",
    fontFamily: "monospace",
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  copyBtn: {
    padding: "6px 14px",
    fontSize: "13px",
    borderRadius: "6px",
    border: "1px solid #475569",
    backgroundColor: "#334155",
    color: "#e2e8f0",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  infoCard: {
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #334155",
  },
  infoText: {
    fontSize: "14px",
    color: "#cbd5e1",
    margin: "0 0 12px 0",
    lineHeight: 1.6,
  },
  inlineCode: {
    backgroundColor: "#334155",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "13px",
    color: "#a5f3fc",
    fontFamily: "monospace",
  },
  modelGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "12px",
  },
  modelCard: {
    backgroundColor: "#1e293b",
    borderRadius: "10px",
    padding: "16px",
    border: "1px solid #334155",
  },
  modelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  modelName: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#f1f5f9",
  },
  modelTier: {
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "10px",
    backgroundColor: "#312e81",
    color: "#a5b4fc",
    fontWeight: 500,
  },
  modelId: {
    fontSize: "12px",
    color: "#7dd3fc",
    fontFamily: "monospace",
  },
  stepsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  step: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
  },
  stepNumber: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#3b82f6",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "14px",
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#f1f5f9",
    margin: "0 0 4px 0",
  },
  stepDesc: {
    fontSize: "14px",
    color: "#94a3b8",
    margin: "0 0 8px 0",
    lineHeight: 1.5,
  },
  footer: {
    textAlign: "center",
    marginTop: "60px",
    paddingTop: "20px",
    borderTop: "1px solid #1e293b",
    color: "#64748b",
    fontSize: "13px",
  },
};

export default App;
