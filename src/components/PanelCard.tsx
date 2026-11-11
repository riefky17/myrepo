"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  DashboardPanel,
  PanelWidth,
  RefreshInterval,
  TimeRangePreset,
} from "@/types/dashboard";
import { DATASOURCE_META, PROVIDER_META } from "@/lib/defaultPanels";
import { buildSynchronizedEmbedUrl } from "@/lib/urlBuilder";
import MockPanelRenderer from "./MockPanelRenderer";
import {
  ArrowLeft,
  ArrowRight,
  Code2,
  Columns,
  ExternalLink,
  Maximize2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface PanelCardProps {
  panel: DashboardPanel;
  globalLiveMode: boolean;
  timeRange: TimeRangePreset;
  refreshInterval: RefreshInterval;
  environment: string;
  refreshNonce: number;
  onEdit: (panel: DashboardPanel) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "left" | "right") => void;
  onWidthChange: (id: string, width: PanelWidth) => void;
  onMaximize: (panel: DashboardPanel) => void;
}

const WIDTH_CYCLE: PanelWidth[] = ["1/3", "1/2", "2/3", "full"];

const iconBtn =
  "flex h-7 w-7 items-center justify-center rounded text-subtle hover:bg-raised hover:text-ink [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11";

export default function PanelCard({
  panel,
  globalLiveMode,
  timeRange,
  refreshInterval,
  environment,
  refreshNonce,
  onEdit,
  onDelete,
  onMove,
  onWidthChange,
  onMaximize,
}: PanelCardProps) {
  const [localLiveOverride, setLocalLiveOverride] = useState<boolean | null>(
    null
  );
  const [localNonce, setLocalNonce] = useState(0);
  const [showUrlInspector, setShowUrlInspector] = useState(false);

  const isLive =
    localLiveOverride !== null ? localLiveOverride : globalLiveMode;

  const providerInfo = PROVIDER_META[panel.provider];
  const datasourceInfo = DATASOURCE_META[panel.datasource];

  const syncedUrl = buildSynchronizedEmbedUrl(
    panel.embedUrl,
    panel.provider,
    timeRange,
    refreshInterval,
    environment,
    refreshNonce + localNonce
  );

  const nextWidth = () => {
    const idx = WIDTH_CYCLE.indexOf(panel.width);
    const next = WIDTH_CYCLE[(idx + 1) % WIDTH_CYCLE.length];
    onWidthChange(panel.id, next);
  };

  const heightClass =
    panel.height === "sm"
      ? "h-[250px]"
      : panel.height === "lg"
      ? "h-[430px]"
      : "h-[330px]";

  // Native <details> as the overflow menu; closed on outside click and Escape.
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      const d = menuRef.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e instanceof MouseEvent && d.contains(e.target as Node)) return;
      d.open = false;
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  const menuItem = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    danger = false
  ) => (
    <button
      type="button"
      onClick={(e) => {
        action();
        const d = e.currentTarget.closest("details");
        if (d) d.open = false;
      }}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-raised ${
        danger ? "text-err" : "text-muted hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <section className="flex h-full flex-col rounded-md border border-line bg-surface">
      {/* Header */}
      <header className="flex min-h-[96px] items-start gap-3 px-4 pb-3 pt-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 text-2xs text-subtle">
            <span
              className="h-1.5 w-1.5 rounded-sm"
              style={{ backgroundColor: providerInfo.accentColor }}
            />
            <span>{providerInfo.label}</span>
            <span>·</span>
            <span>{datasourceInfo.shortLabel}</span>
          </div>
          <h3 className="line-clamp-2 font-semibold leading-snug" title={panel.title}>
            {panel.title}
          </h3>
          <p className="truncate text-2xs text-muted">{panel.subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => setLocalLiveOverride(!isLive)}
            aria-pressed={isLive}
            className="mr-1 flex h-6 items-center [@media(pointer:coarse)]:h-11 gap-1.5 rounded border border-line px-1.5 text-2xs text-muted hover:text-ink"
            title="Switch between live iframe and simulated preview"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-ok" : "bg-subtle"}`}
            />
            {isLive ? "Live" : "Sim"}
          </button>
          <button
            onClick={() => setLocalNonce((n) => n + 1)}
            className={iconBtn}
            title="Reload panel"
            aria-label="Reload panel"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onMaximize(panel)}
            className={iconBtn}
            title="Fullscreen"
            aria-label="Open panel fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <details ref={menuRef} className="relative">
            <summary
              className={`${iconBtn} cursor-pointer`}
              title="More actions"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 top-8 z-10 w-48 overflow-hidden rounded-md border border-line-strong bg-surface py-1 text-xs shadow-lg shadow-black/40">
              {menuItem(
                showUrlInspector ? "Hide embed URL" : "Show embed URL",
                <Code2 className="h-3.5 w-3.5" />,
                () => setShowUrlInspector(!showUrlInspector)
              )}
              {menuItem(
                `Width: ${panel.width}`,
                <Columns className="h-3.5 w-3.5" />,
                nextWidth
              )}
              {menuItem("Move left", <ArrowLeft className="h-3.5 w-3.5" />, () =>
                onMove(panel.id, "left")
              )}
              {menuItem("Move right", <ArrowRight className="h-3.5 w-3.5" />, () =>
                onMove(panel.id, "right")
              )}
              {menuItem("Edit panel", <Pencil className="h-3.5 w-3.5" />, () =>
                onEdit(panel)
              )}
              <div className="my-1 border-t border-line" />
              {menuItem(
                "Remove panel",
                <Trash2 className="h-3.5 w-3.5" />,
                () => onDelete(panel.id),
                true
              )}
            </div>
          </details>
        </div>
      </header>

      {/* URL inspector */}
      {showUrlInspector && (
        <div className="space-y-1 border-t border-line bg-canvas px-4 py-2 font-mono text-2xs">
          {panel.queryHint && (
            <div className="truncate text-muted">
              <span className="text-subtle">query </span>
              {panel.queryHint}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-muted">
              <span className="text-subtle">url </span>
              {syncedUrl}
            </div>
            <a
              href={syncedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-accent hover:underline"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Body */}
      <div className={`relative w-full overflow-hidden border-t border-line ${heightClass}`}>
        {isLive ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center bg-canvas text-2xs text-subtle">
              Loading {providerInfo.label} panel…
            </div>
            <iframe
              key={`${panel.id}-${syncedUrl}`}
              src={syncedUrl}
              title={panel.title}
              className="absolute inset-0 h-full w-full border-0 bg-transparent"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              loading="lazy"
            />
          </>
        ) : (
          <MockPanelRenderer
            panel={panel}
            timeRange={timeRange}
            environment={environment}
            refreshNonce={refreshNonce + localNonce}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 text-2xs text-subtle">
        <span className="truncate font-mono">{datasourceInfo.indexOrQueryType}</span>
        <span className="hidden shrink-0 truncate md:block">
          {panel.tags.join(" · ")}
        </span>
      </footer>
    </section>
  );
}
