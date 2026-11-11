"use client";

import React, { useMemo } from "react";
import { DashboardPanel, TimeRangePreset } from "@/types/dashboard";

interface MockPanelRendererProps {
  panel: DashboardPanel;
  timeRange: TimeRangePreset;
  environment: string;
  refreshNonce: number;
}

// Deterministic pseudo-random helper so charts update when timeRange/refreshNonce changes
function seededValue(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 9999.123) * 10000;
  const frac = x - Math.floor(x);
  return Math.round((min + frac * (max - min)) * 10) / 10;
}

const SERIES = {
  primary: "rgb(var(--accent))",
  secondary: "rgb(var(--muted))",
  warn: "rgb(var(--warn))",
  err: "rgb(var(--err))",
};

/* ---------- shared primitives ---------- */

function Stats({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid shrink-0 grid-cols-3 divide-x divide-line border-b border-line">
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  note,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: React.ReactNode;
  tone?: "ok" | "warn" | "err";
}) {
  const toneClass =
    tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "err" ? "text-err" : "text-ink";
  return (
    <div className="min-w-0 px-4 py-2.5">
      <div className="truncate text-2xs text-subtle">{label}</div>
      <div className={`tabular mt-0.5 text-base font-semibold leading-tight ${toneClass}`}>
        {value}
        {unit && <span className="ml-0.5 text-2xs font-normal text-subtle">{unit}</span>}
      </div>
      {note && <div className="truncate text-2xs text-subtle">{note}</div>}
    </div>
  );
}

function Meter({ value, tone }: { value: number; tone?: "warn" | "err" }) {
  const color = tone === "err" ? "bg-err" : tone === "warn" ? "bg-warn" : "bg-accent";
  return (
    <div className="h-1 w-full overflow-hidden rounded-sm bg-line">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-muted">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-0.5 w-3" style={{ backgroundColor: i.color }} />
          {i.label}
          {i.value && <span className="tabular text-ink">{i.value}</span>}
        </span>
      ))}
    </div>
  );
}

function LineChart({
  series,
  max,
  unit,
  xLabels,
}: {
  series: { values: number[]; color: string }[];
  max: number;
  unit: string;
  xLabels: [string, string];
}) {
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  return (
    <div
      role="img"
      aria-label={`Line chart, ${series.length} series, ${xLabels[0]} to ${xLabels[1]}`}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="relative min-h-0 flex-1 pl-9">
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute left-9 right-0 border-t border-line/70"
            style={{ top: `${(1 - t) * 100}%` }}
          >
            <span className="tabular absolute -left-9 -top-2 w-7 text-right text-2xs text-subtle">
              {Math.round(max * t)}
            </span>
          </div>
        ))}
        <svg
          className="absolute inset-0 left-9 h-full w-[calc(100%-2.25rem)] overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {series.map((s, si) => (
            <polyline
              key={si}
              fill="none"
              stroke={s.color}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              points={s.values
                .map((v, i) => `${(i / (s.values.length - 1)) * 100},${100 - (v / max) * 100}`)
                .join(" ")}
            />
          ))}
        </svg>
      </div>
      <div className="mt-1 flex justify-between pl-9 text-2xs text-subtle">
        <span>{xLabels[0]}</span>
        <span className="text-subtle/80">{unit}</span>
        <span>{xLabels[1]}</span>
      </div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col bg-surface text-xs">{children}</div>;
}

/* ---------- renderer ---------- */

export default function MockPanelRenderer({
  panel,
  timeRange,
  environment,
  refreshNonce,
}: MockPanelRendererProps) {
  const seedBase = useMemo(() => {
    const rangeWeight =
      timeRange === "15m"
        ? 1
        : timeRange === "1h"
        ? 2
        : timeRange === "6h"
        ? 3
        : timeRange === "24h"
        ? 4
        : 5;
    const envWeight = environment === "prod" ? 10 : 25;
    return rangeWeight + envWeight + refreshNonce;
  }, [timeRange, environment, refreshNonce]);

  const xLabels: [string, string] = [`-${timeRange}`, "now"];

  switch (panel.mockVisualization) {
    case "metricbeat-system": {
      const hosts = [
        {
          host: `id-jkt-${environment}-node-01`,
          cpu: seededValue(seedBase + 1, 42, 78),
          mem: seededValue(seedBase + 2, 61, 84),
          load: seededValue(seedBase + 3, 1.4, 3.8),
        },
        {
          host: `id-jkt-${environment}-node-02`,
          cpu: seededValue(seedBase + 4, 35, 72),
          mem: seededValue(seedBase + 5, 58, 79),
          load: seededValue(seedBase + 6, 1.1, 3.1),
        },
        {
          host: `id-jkt-${environment}-node-03`,
          cpu: seededValue(seedBase + 7, 55, 89),
          mem: seededValue(seedBase + 8, 69, 91),
          load: seededValue(seedBase + 9, 2.2, 4.6),
        },
        {
          host: `id-jkt-${environment}-elastic-01`,
          cpu: seededValue(seedBase + 10, 48, 81),
          mem: seededValue(seedBase + 11, 74, 88),
          load: seededValue(seedBase + 12, 1.9, 3.9),
        },
      ];
      const tone = (v: number) => (v >= 85 ? "err" : v >= 75 ? "warn" : undefined);

      return (
        <Frame>
          <Stats>
            <Stat label="Avg CPU" value={seededValue(seedBase + 20, 52, 68)} unit="%" note="system.cpu.total" />
            <Stat label="Memory used" value={seededValue(seedBase + 21, 68, 79)} unit="%" note="4 hosts" />
            <Stat label="Disk IOPS" value={Math.round(seededValue(seedBase + 22, 1240, 2180)).toLocaleString("en-US")} note="system.diskio" />
          </Stats>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="text-2xs text-subtle">
                <tr className="border-b border-line">
                  <th className="px-4 py-1.5 font-normal">Host</th>
                  <th className="w-[26%] px-2 py-1.5 font-normal">CPU</th>
                  <th className="w-[26%] px-2 py-1.5 font-normal">Memory</th>
                  <th className="px-4 py-1.5 text-right font-normal">Load</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {hosts.map((h) => (
                  <tr key={h.host}>
                    <td className="truncate px-4 py-2 font-mono text-2xs text-muted">{h.host}</td>
                    <td className="px-2 py-2">
                      <div className="tabular mb-1 text-2xs">{h.cpu}%</div>
                      <Meter value={h.cpu} tone={tone(h.cpu)} />
                    </td>
                    <td className="px-2 py-2">
                      <div className="tabular mb-1 text-2xs">{h.mem}%</div>
                      <Meter value={h.mem} tone={tone(h.mem)} />
                    </td>
                    <td className="tabular px-4 py-2 text-right">{h.load}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Frame>
      );
    }

    case "victoriametrics-cluster": {
      const a = Array.from({ length: 24 }, (_, i) => seededValue(seedBase + i * 3, 45, 92));
      const b = Array.from({ length: 24 }, (_, i) => seededValue(seedBase + i * 5 + 1, 25, 64));

      return (
        <Frame>
          <Stats>
            <Stat label="Ingestion" value={Math.round(seededValue(seedBase + 7, 145, 230))} unit="K/s" note="1.84M active series" />
            <Stat label="vmselect p99" value={seededValue(seedBase + 16, 12, 34)} unit="ms" />
            <Stat label="Cache hit" value="98.4" unit="%" />
          </Stats>
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 py-3">
            <Legend
              items={[
                { label: "vmstorage-prod-a", color: SERIES.primary },
                { label: "vmstorage-prod-b", color: SERIES.secondary },
              ]}
            />
            <LineChart
              series={[
                { values: a, color: SERIES.primary },
                { values: b, color: SERIES.secondary },
              ]}
              max={100}
              unit="K req/s"
              xLabels={xLabels}
            />
          </div>
        </Frame>
      );
    }

    case "victoriametrics-network": {
      const namespaces = [
        { ns: "trx-core-ns", rx: seededValue(seedBase + 31, 180, 340), tx: seededValue(seedBase + 32, 160, 290), drops: "0.00%" },
        { ns: "api-gateway-ns", rx: seededValue(seedBase + 33, 240, 410), tx: seededValue(seedBase + 34, 210, 390), drops: "0.01%" },
        { ns: "elastic-logging-ns", rx: seededValue(seedBase + 35, 130, 260), tx: seededValue(seedBase + 36, 45, 95), drops: "0.00%" },
        { ns: "kafka-event-mesh", rx: seededValue(seedBase + 37, 310, 490), tx: seededValue(seedBase + 38, 295, 470), drops: "0.00%" },
      ];
      return (
        <Frame>
          <div className="flex items-center justify-between border-b border-line px-4 py-2 text-2xs text-subtle">
            <span>Pod network by namespace</span>
            <span>CNI: Cilium eBPF</span>
          </div>
          <table className="w-full text-left">
            <thead className="text-2xs text-subtle">
              <tr className="border-b border-line">
                <th className="px-4 py-1.5 font-normal">Namespace</th>
                <th className="px-2 py-1.5 text-right font-normal">RX MB/s</th>
                <th className="px-2 py-1.5 text-right font-normal">TX MB/s</th>
                <th className="px-4 py-1.5 text-right font-normal">Drops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {namespaces.map((n) => (
                <tr key={n.ns}>
                  <td className="px-4 py-2.5 font-mono text-2xs text-muted">{n.ns}</td>
                  <td className="tabular px-2 py-2.5 text-right">{n.rx}</td>
                  <td className="tabular px-2 py-2.5 text-right">{n.tx}</td>
                  <td className={`tabular px-4 py-2.5 text-right ${n.drops !== "0.00%" ? "text-warn" : "text-subtle"}`}>
                    {n.drops}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Frame>
      );
    }

    case "kibana-trx-volume": {
      const channels = [
        { name: "QRIS Dynamic", success: Math.round(seededValue(seedBase + 41, 48200, 64900)), suspect: Math.round(seededValue(seedBase + 42, 120, 340)), failed: Math.round(seededValue(seedBase + 43, 45, 140)) },
        { name: "BI-FAST Transfer", success: Math.round(seededValue(seedBase + 44, 35100, 49200)), suspect: Math.round(seededValue(seedBase + 45, 85, 210)), failed: Math.round(seededValue(seedBase + 46, 30, 95)) },
        { name: "Virtual Account", success: Math.round(seededValue(seedBase + 47, 29400, 41800)), suspect: Math.round(seededValue(seedBase + 48, 60, 150)), failed: Math.round(seededValue(seedBase + 49, 25, 80)) },
        { name: "Credit Card / 3DS", success: Math.round(seededValue(seedBase + 50, 12800, 19500)), suspect: Math.round(seededValue(seedBase + 51, 90, 190)), failed: Math.round(seededValue(seedBase + 52, 65, 160)) },
      ];

      const totalSuccess = channels.reduce((a, b) => a + b.success, 0);
      const totalFailed = channels.reduce((a, b) => a + b.failed, 0);
      const sr = (totalSuccess / (totalSuccess + totalFailed)) * 100;
      const maxTotal = Math.max(...channels.map((c) => c.success + c.suspect + c.failed));

      return (
        <Frame>
          <Stats>
            <Stat label="Transactions" value={totalSuccess.toLocaleString("en-US")} note={`+8.4% vs previous ${timeRange}`} />
            <Stat label="Success rate (RC 00)" value={sr.toFixed(2)} unit="%" tone={sr >= 99.5 ? "ok" : "warn"} note="SLA 99.50%" />
            <Stat label="Failed / timeout" value={totalFailed.toLocaleString("en-US")} tone="err" note="RC 68 · 91 · 05" />
          </Stats>
          <table className="w-full text-left">
            <thead className="text-2xs text-subtle">
              <tr className="border-b border-line">
                <th className="px-4 py-1.5 font-normal">Channel</th>
                <th className="w-[30%] px-2 py-1.5 font-normal">Volume</th>
                <th className="px-2 py-1.5 text-right font-normal">OK</th>
                <th className="px-2 py-1.5 text-right font-normal">RC 68</th>
                <th className="px-4 py-1.5 text-right font-normal">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {channels.map((ch) => (
                <tr key={ch.name}>
                  <td className="px-4 py-2.5">{ch.name}</td>
                  <td className="px-2 py-2.5">
                    <Meter value={((ch.success + ch.suspect + ch.failed) / maxTotal) * 100} />
                  </td>
                  <td className="tabular px-2 py-2.5 text-right">{ch.success.toLocaleString("en-US")}</td>
                  <td className="tabular px-2 py-2.5 text-right text-warn">{ch.suspect}</td>
                  <td className="tabular px-4 py-2.5 text-right text-err">{ch.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Frame>
      );
    }

    case "kibana-trx-latency": {
      const n = 16;
      const p50 = Array.from({ length: n }, (_, i) => seededValue(seedBase + i * 2, 42, 78));
      const p95 = Array.from({ length: n }, (_, i) => seededValue(seedBase + i * 3, 140, 260));
      const p99 = Array.from({ length: n }, (_, i) => seededValue(seedBase + i * 5, 310, 590));

      return (
        <Frame>
          <Stats>
            <Stat label="p50" value="58" unit="ms" />
            <Stat label="p95" value="194" unit="ms" />
            <Stat label="p99" value="462" unit="ms" tone="warn" note="SLA 1500 ms" />
          </Stats>
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 py-3">
            <Legend
              items={[
                { label: "p50", color: SERIES.secondary },
                { label: "p95", color: SERIES.primary },
                { label: "p99", color: SERIES.warn },
              ]}
            />
            <LineChart
              series={[
                { values: p50, color: SERIES.secondary },
                { values: p95, color: SERIES.primary },
                { values: p99, color: SERIES.warn },
              ]}
              max={700}
              unit="ms"
              xLabels={xLabels}
            />
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-1.5 text-2xs text-subtle">
            <span className="font-mono">trx-events-{environment}-* · trx.duration_ms</span>
            <span>ISO 8583 / SNAP BI gateway</span>
          </div>
        </Frame>
      );
    }

    case "kibana-trx-logs": {
      const trxLogs = [
        { time: "17:41:09.214", rrn: "631517410921", channel: "BI-FAST", bank: "BCA → MANDIRI", amount: "Rp 14.500.000", rc: "68", msg: "Suspect / response timeout from switching", ms: 3002 },
        { time: "17:40:54.882", rrn: "631517405488", channel: "QRIS", bank: "BRI → GOPAY", amount: "Rp 325.000", rc: "91", msg: "Issuer or switch inoperative", ms: 1845 },
        { time: "17:40:31.105", rrn: "631517403110", channel: "VA", bank: "BNI → SHOPEE", amount: "Rp 1.280.000", rc: "05", msg: "Do not honor / insufficient balance", ms: 210 },
        { time: "17:39:58.640", rrn: "631517395864", channel: "CC-3DS", bank: "CIMB → VISA", amount: "Rp 4.750.000", rc: "96", msg: "System malfunction on downstream acquirer", ms: 1420 },
        { time: "17:39:12.009", rrn: "631517391200", channel: "BI-FAST", bank: "PERMATA → BCA", amount: "Rp 8.900.000", rc: "68", msg: "Suspect / pending settlement recon", ms: 3005 },
      ];

      return (
        <Frame>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full whitespace-nowrap text-left">
              <thead className="sticky top-0 bg-surface text-2xs text-subtle">
                <tr className="border-b border-line">
                  <th className="px-4 py-2 font-normal">Time</th>
                  <th className="px-2 py-2 font-normal">RRN</th>
                  <th className="px-2 py-2 font-normal">Channel</th>
                  <th className="px-2 py-2 font-normal">Route</th>
                  <th className="px-2 py-2 text-right font-normal">Amount</th>
                  <th className="px-2 py-2 font-normal">RC</th>
                  <th className="px-2 py-2 text-right font-normal">Duration</th>
                  <th className="px-4 py-2 font-normal">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {trxLogs.map((row) => (
                  <tr key={row.rrn} className="hover:bg-raised/50">
                    <td className="tabular px-4 py-2 font-mono text-2xs text-subtle">{row.time}</td>
                    <td className="tabular px-2 py-2 font-mono text-2xs text-muted">{row.rrn}</td>
                    <td className="px-2 py-2">{row.channel}</td>
                    <td className="px-2 py-2 text-muted">{row.bank}</td>
                    <td className="tabular px-2 py-2 text-right">{row.amount}</td>
                    <td className="px-2 py-2">
                      <span className="tabular font-mono font-medium text-err">{row.rc}</span>
                    </td>
                    <td className={`tabular px-2 py-2 text-right ${row.ms >= 3000 ? "text-warn" : ""}`}>
                      {row.ms.toLocaleString("en-US")} ms
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-2 text-muted">{row.msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Frame>
      );
    }

    case "datadog-apm-RED": {
      const rps = seededValue(seedBase + 60, 1840, 2650);
      const errRate = seededValue(seedBase + 61, 0.12, 0.48);
      const p99 = Math.round(seededValue(seedBase + 62, 210, 390));
      const services = [
        { svc: "payment-orchestrator", type: "Go · gRPC", rps: 940, p95: 84, err: 0.08 },
        { svc: "trx-ledger-writer", type: "Java · Spring", rps: 712, p95: 142, err: 0.21 },
        { svc: "fraud-scoring-engine", type: "Python · FastAPI", rps: 618, p95: 62, err: 0.02 },
        { svc: "iso8583-switch-adapter", type: "Rust · Tokio", rps: 495, p95: 195, err: 0.41 },
      ];

      return (
        <Frame>
          <Stats>
            <Stat label="Throughput" value={rps.toLocaleString("en-US")} unit="req/s" />
            <Stat label="Error rate" value={errRate} unit="%" tone={errRate >= 0.3 ? "err" : undefined} />
            <Stat label="p99 latency" value={p99} unit="ms" />
          </Stats>
          <table className="w-full text-left">
            <thead className="text-2xs text-subtle">
              <tr className="border-b border-line">
                <th className="px-4 py-1.5 font-normal">Service</th>
                <th className="px-2 py-1.5 text-right font-normal">Req/s</th>
                <th className="px-2 py-1.5 text-right font-normal">p95</th>
                <th className="px-4 py-1.5 text-right font-normal">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {services.map((s) => (
                <tr key={s.svc}>
                  <td className="px-4 py-2">
                    <div className="font-mono text-2xs">{s.svc}</div>
                    <div className="text-2xs text-subtle">{s.type}</div>
                  </td>
                  <td className="tabular px-2 py-2 text-right">{s.rps}</td>
                  <td className="tabular px-2 py-2 text-right">{s.p95} ms</td>
                  <td className={`tabular px-4 py-2 text-right ${s.err >= 0.3 ? "text-err" : "text-muted"}`}>
                    {s.err.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Frame>
      );
    }

    case "datadog-apm-traces": {
      const spans = [
        { service: "kong-api-gateway", op: "POST /v2/trx/transfer-bifast", offset: 0, width: 100, dur: "312.4", depth: 0 },
        { service: "auth-token-verifier", op: "grpc.VerifySnapSignature", offset: 3, width: 11, dur: "34.1", depth: 1 },
        { service: "fraud-scoring-engine", op: "POST /score/realtime", offset: 14, width: 18, dur: "56.2", depth: 1 },
        { service: "trx-core-engine", op: "TrxProcessor.ExecuteSettlement", offset: 32, width: 64, dur: "199.8", depth: 1 },
        { service: "postgres-trx-primary", op: "INSERT INTO trx_journal_entries", offset: 36, width: 22, dur: "68.5", depth: 2 },
        { service: "iso8583-switch-adapter", op: "tcp.send_0200_financial_req", offset: 58, width: 34, dur: "106.1", depth: 2, slow: true },
        { service: "elasticsearch-trx-sink", op: "BulkIndex trx-events-prod", offset: 92, width: 7, dur: "21.7", depth: 1 },
      ];

      return (
        <Frame>
          <div className="flex items-center justify-between border-b border-line px-4 py-2 text-2xs">
            <span className="font-mono text-muted">trace 67320984a91bc80419e</span>
            <span className="text-subtle">
              <span className="text-ok">200</span> · 312.4 ms · 7 spans
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {spans.map((sp, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center gap-3 px-4 py-1.5">
                <div className="col-span-5 min-w-0" style={{ paddingLeft: sp.depth * 10 }}>
                  <div className="truncate font-mono text-2xs">{sp.service}</div>
                  <div className="truncate text-2xs text-subtle">{sp.op}</div>
                </div>
                <div className="relative col-span-5 h-2.5 rounded-sm bg-line/50">
                  <div
                    className={`absolute inset-y-0 rounded-sm ${sp.slow ? "bg-warn" : sp.depth === 0 ? "bg-muted/60" : "bg-accent"}`}
                    style={{ left: `${sp.offset}%`, width: `${sp.width}%` }}
                  />
                </div>
                <div className="tabular col-span-2 text-right text-2xs text-muted">{sp.dur} ms</div>
              </div>
            ))}
          </div>
        </Frame>
      );
    }

    case "datadog-apm-servicemap":
    default: {
      const Node = ({ source, name, metric, warn }: { source: string; name: string; metric: string; warn?: boolean }) => (
        <div className="rounded border border-line bg-canvas px-3 py-2">
          <div className="text-2xs text-subtle">{source}</div>
          <div className="truncate font-medium">{name}</div>
          <div className={`tabular text-2xs ${warn ? "text-warn" : "text-muted"}`}>{metric}</div>
        </div>
      );

      return (
        <Frame>
          <div className="flex items-center justify-between border-b border-line px-4 py-2 text-2xs text-subtle">
            <span>Service dependencies</span>
            <span className="font-mono">env:{environment}</span>
          </div>
          <div className="grid flex-1 grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 px-4 py-3">
            <div className="space-y-2">
              <Node source="Datadog APM" name="API Gateway" metric="2.4k req/s" />
              <Node source="Metricbeat" name="K8s worker nodes" metric="CPU 61%" />
            </div>
            <div className="h-px w-4 bg-line-strong" />
            <div className="rounded border border-accent/50 bg-canvas px-3 py-2.5">
              <div className="text-2xs text-subtle">Datadog APM · VM</div>
              <div className="font-semibold">TRX Core Engine</div>
              <div className="tabular text-2xs text-muted">p95 142 ms</div>
            </div>
            <div className="h-px w-4 bg-line-strong" />
            <div className="space-y-2">
              <Node source="Kibana" name="Elasticsearch TRX" metric="99.78% RC 00" />
              <Node source="Grafana" name="VictoriaMetrics" metric="192K rows/s" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-1.5 text-2xs">
            <span className="text-subtle">3 of 3 sources reporting</span>
            <span className="text-warn">Latency spike on ISO 8583 switch</span>
          </div>
        </Frame>
      );
    }
  }
}
