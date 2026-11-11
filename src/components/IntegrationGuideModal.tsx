"use client";

import React from "react";
import { X } from "lucide-react";
import { useEscape } from "@/lib/useEscape";

interface IntegrationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    title: "Grafana",
    scope: "Elasticsearch Metricbeat, VictoriaMetrics",
    file: "grafana.ini",
    body: (
      <>
        Enable <code>allow_embedding</code>, then copy the link from{" "}
        <strong>Panel → Share → Embed</strong> (<code>/d-solo/...</code>).
      </>
    ),
    code: `[security]
allow_embedding = true
cookie_samesite = none
cookie_secure = true

# Optional, no login (internal network / TV wall):
[auth.anonymous]
enabled = true
org_role = Viewer`,
  },
  {
    title: "Kibana",
    scope: "Elasticsearch Data TRX",
    file: "kibana.yml",
    body: (
      <>
        In a dashboard or Lens, choose <strong>Share → Embed code → Copy iFrame code</strong>.
        Make sure CSP <code>frame-ancestors</code> allows this dashboard's domain.
      </>
    ),
    code: `csp.rules:
  - "frame-ancestors 'self' http://localhost:3000 https://dashboard.internal.company.com"

# When using an Nginx reverse proxy for viewers:
xpack.security.sameSiteCookies: "None"`,
  },
  {
    title: "Datadog",
    scope: "APM services, traces, RED graphs",
    file: "Share → Embed",
    body: (
      <>
        On an APM widget or dashboard, choose <strong>Export / Share → Generate embed</strong>, or
        use a public dashboard URL.
      </>
    ),
    code: `https://app.datadoghq.com/graph/embed?token=<EMBED_TOKEN>&height=300&width=600&legend=true

# Sync parameters appended automatically:
# &timeframe=1_hour&theme=dark&live=true&tpl_var_env=prod`,
  },
];

export default function IntegrationGuideModal({
  isOpen,
  onClose,
}: IntegrationGuideModalProps) {
  useEscape(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        className="w-full max-w-3xl overflow-hidden rounded-lg border border-line-strong bg-surface shadow-xl shadow-black/40"
      >
        <div className="flex items-start justify-between border-b border-line px-5 py-3.5">
          <div>
            <h2 id="guide-title" className="text-sm font-semibold">Embed setup guide</h2>
            <p className="text-2xs text-subtle">
              Settings so browsers don't block the iframes (X-Frame-Options / CSP).
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-subtle hover:bg-raised hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] divide-y divide-line overflow-y-auto">
          {SECTIONS.map((s, i) => (
            <section key={s.title} className="px-5 py-4">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <h3 className="font-semibold">
                  <span className="tabular mr-2 text-subtle">{i + 1}.</span>
                  {s.title}
                  <span className="ml-2 font-normal text-subtle">{s.scope}</span>
                </h3>
                <span className="shrink-0 font-mono text-2xs text-subtle">{s.file}</span>
              </div>
              <p className="mb-2.5 text-muted [&_code]:font-mono [&_code]:text-xs [&_code]:text-ink [&_strong]:font-medium [&_strong]:text-ink">
                {s.body}
              </p>
              <pre className="overflow-x-auto rounded border border-line bg-canvas p-3 font-mono text-2xs leading-relaxed text-muted">
                {s.code}
              </pre>
            </section>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line bg-canvas/40 px-5 py-3">
          <p className="text-2xs text-subtle">
            Live and simulated mode can also be switched per panel from its header.
          </p>
          <button
            onClick={onClose}
            className="h-8 shrink-0 rounded bg-accent px-3 font-medium text-canvas hover:bg-accent/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
