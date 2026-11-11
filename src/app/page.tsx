"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  DashboardPanel,
  DatasourceType,
  EndpointConfig,
  PanelWidth,
  ProviderType,
  RefreshInterval,
  TimeRangePreset,
} from "@/types/dashboard";
import {
  DATASOURCE_META,
  DEFAULT_ENDPOINT_CONFIG,
  DEFAULT_PANELS,
  PROVIDER_META,
} from "@/lib/defaultPanels";
import { buildSynchronizedEmbedUrl } from "@/lib/urlBuilder";
import PanelCard from "@/components/PanelCard";
import PanelModal from "@/components/PanelModal";
import IntegrationGuideModal from "@/components/IntegrationGuideModal";
import MockPanelRenderer from "@/components/MockPanelRenderer";
import { useEscape } from "@/lib/useEscape";
import {
  BookOpen,
  Download,
  LayoutGrid,
  Menu,
  Monitor,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Upload,
  X,
} from "lucide-react";

const STORAGE_KEY_PANELS = "unified_obs_dashboard_panels_v1";
const STORAGE_KEY_ENDPOINTS = "unified_obs_dashboard_endpoints_v1";

const TIME_RANGES: TimeRangePreset[] = ["15m", "1h", "6h", "24h", "7d"];
const PROVIDERS: ProviderType[] = ["grafana", "kibana", "datadog"];
const DATASOURCES: DatasourceType[] = [
  "elasticsearch-metricbeat",
  "victoriametrics",
  "elasticsearch-trx",
  "datadog-apm",
];

const inputClass =
  "h-8 rounded border border-line bg-canvas px-2.5 text-[13px] text-ink placeholder:text-subtle focus:border-accent focus:outline-none";

export default function UnifiedDashboardPage() {
  const [panels, setPanels] = useState<DashboardPanel[]>(DEFAULT_PANELS);
  const [endpoints, setEndpoints] = useState<EndpointConfig>(
    DEFAULT_ENDPOINT_CONFIG
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Global controls
  const [providerFilter, setProviderFilter] = useState<ProviderType | "all">(
    "all"
  );
  const [datasourceFilter, setDatasourceFilter] = useState<
    DatasourceType | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRangePreset>("1h");
  const [refreshInterval, setRefreshInterval] =
    useState<RefreshInterval>("30s");
  const [globalLiveMode, setGlobalLiveMode] = useState<boolean>(false);
  const [refreshNonce, setRefreshNonce] = useState<number>(0);
  const [kioskMode, setKioskMode] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  // Modals
  const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<DashboardPanel | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isEndpointDrawerOpen, setIsEndpointDrawerOpen] = useState(false);
  const [maximizedPanel, setMaximizedPanel] = useState<DashboardPanel | null>(
    null
  );

  useEscape(maximizedPanel !== null, () => setMaximizedPanel(null));

  // Load saved state from localStorage
  useEffect(() => {
    try {
      const savedPanels = localStorage.getItem(STORAGE_KEY_PANELS);
      if (savedPanels) {
        const parsed = JSON.parse(savedPanels);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPanels(parsed);
        }
      }
      const savedEndpoints = localStorage.getItem(STORAGE_KEY_ENDPOINTS);
      if (savedEndpoints) {
        setEndpoints(JSON.parse(savedEndpoints));
      }
    } catch (e) {
      console.error("Failed to load saved dashboard state:", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Persist panels
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY_PANELS, JSON.stringify(panels));
    } catch (e) {
      console.error("Failed to save panels:", e);
    }
  }, [panels, isLoaded]);

  // Persist endpoints
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY_ENDPOINTS, JSON.stringify(endpoints));
    } catch (e) {
      console.error("Failed to save endpoints:", e);
    }
  }, [endpoints, isLoaded]);

  // Auto-refresh interval effect
  useEffect(() => {
    if (refreshInterval === "off") return;
    const msMap: Record<Exclude<RefreshInterval, "off">, number> = {
      "10s": 10000,
      "30s": 30000,
      "1m": 60000,
      "5m": 300000,
    };
    const timer = setInterval(() => {
      setRefreshNonce((n) => n + 1);
    }, msMap[refreshInterval]);
    return () => clearInterval(timer);
  }, [refreshInterval]);

  // Client-only timestamp (avoids SSR hydration mismatch)
  useEffect(() => {
    setLastRefreshed(new Date());
  }, [refreshNonce, timeRange, endpoints.environment]);

  // Filtered panels
  const filteredPanels = useMemo(() => {
    return panels.filter((p) => {
      if (providerFilter !== "all" && p.provider !== providerFilter) {
        return false;
      }
      if (datasourceFilter !== "all" && p.datasource !== datasourceFilter) {
        return false;
      }
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchSub = p.subtitle.toLowerCase().includes(q);
        const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
        const matchQuery = (p.queryHint || "").toLowerCase().includes(q);
        return matchTitle || matchSub || matchTags || matchQuery;
      }
      return true;
    });
  }, [panels, providerFilter, datasourceFilter, searchQuery]);

  const countBy = useMemo(() => {
    const provider: Record<string, number> = {};
    const datasource: Record<string, number> = {};
    for (const p of panels) {
      provider[p.provider] = (provider[p.provider] || 0) + 1;
      datasource[p.datasource] = (datasource[p.datasource] || 0) + 1;
    }
    return { provider, datasource };
  }, [panels]);

  // CRUD handlers
  const handleSavePanel = (saved: DashboardPanel) => {
    setPanels((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      if (exists) {
        return prev.map((p) => (p.id === saved.id ? saved : p));
      }
      return [...prev, saved];
    });
  };

  const handleDeletePanel = (id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  };

  const handleMovePanel = (id: string, direction: "left" | "right") => {
    setPanels((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === "left" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleWidthChange = (id: string, width: PanelWidth) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, width } : p))
    );
  };

  const handleApplyBaseUrlsToAll = () => {
    setPanels((prev) =>
      prev.map((p) => {
        try {
          const current = new URL(p.embedUrl);
          if (p.provider === "grafana") {
            const base = new URL(endpoints.grafanaBaseUrl);
            current.protocol = base.protocol;
            current.host = base.host;
          } else if (p.provider === "kibana") {
            const base = new URL(endpoints.kibanaBaseUrl);
            current.protocol = base.protocol;
            current.host = base.host;
          } else if (p.provider === "datadog") {
            const base = new URL(endpoints.datadogSite);
            current.protocol = base.protocol;
            current.host = base.host;
          }
          return { ...p, embedUrl: current.toString() };
        } catch {
          return p;
        }
      })
    );
    setIsEndpointDrawerOpen(false);
  };

  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify({ endpoints, panels }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `unified-dashboard-config-${endpoints.environment}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result));
        if (Array.isArray(parsed.panels)) {
          setPanels(parsed.panels);
        }
        if (parsed.endpoints) {
          setEndpoints(parsed.endpoints);
        }
      } catch {
        alert("Invalid JSON config file.");
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    setPanels(DEFAULT_PANELS);
    setEndpoints(DEFAULT_ENDPOINT_CONFIG);
    setProviderFilter("all");
    setDatasourceFilter("all");
    setSearchQuery("");
  };

  const selectView = (
    provider: ProviderType | "all",
    datasource: DatasourceType | "all"
  ) => {
    setProviderFilter(provider);
    setDatasourceFilter(datasource);
    setNavOpen(false);
  };

  const openNewPanel = () => {
    setEditingPanel(null);
    setIsPanelModalOpen(true);
  };

  const getColSpanClass = (width: PanelWidth) => {
    switch (width) {
      case "1/3":
        return "col-span-12 lg:col-span-6 2xl:col-span-4";
      case "1/2":
        return "col-span-12 lg:col-span-6";
      case "2/3":
        return "col-span-12 2xl:col-span-8";
      case "full":
        return "col-span-12";
    }
  };

  const viewTitle =
    datasourceFilter !== "all"
      ? DATASOURCE_META[datasourceFilter].label
      : providerFilter !== "all"
      ? PROVIDER_META[providerFilter].label
      : "Overview";

  const viewDescription =
    datasourceFilter !== "all"
      ? DATASOURCE_META[datasourceFilter].indexOrQueryType
      : providerFilter !== "all"
      ? PROVIDER_META[providerFilter].description
      : "Grafana, Kibana and Datadog panels on a shared time range and environment.";

  const isActive = (
    provider: ProviderType | "all",
    datasource: DatasourceType | "all"
  ) => providerFilter === provider && datasourceFilter === datasource;

  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-accent px-3 py-1.5 font-medium text-canvas focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      {/* Sidebar */}
      {!kioskMode && (
        <>
          {navOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/50 lg:hidden"
              onClick={() => setNavOpen(false)}
            />
          )}
          <aside
            className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-surface transition-transform motion-reduce:transition-none lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
              navOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex h-12 items-center gap-2.5 border-b border-line px-4">
              <div className="leading-tight">
                <div className="text-[13px] font-semibold">Observability</div>
                <div className="text-2xs text-subtle">Unified dashboard</div>
              </div>
            </div>

            <nav aria-label="Views" className="flex-1 overflow-y-auto px-2 py-3">
              <NavItem
                active={isActive("all", "all")}
                onClick={() => selectView("all", "all")}
                count={panels.length}
              >
                <LayoutGrid className="h-4 w-4 text-subtle" />
                Overview
              </NavItem>

              <NavSection label="Platforms">
                {PROVIDERS.map((p) => (
                  <NavItem
                    key={p}
                    active={isActive(p, "all")}
                    onClick={() => selectView(p, "all")}
                    count={countBy.provider[p] || 0}
                  >
                    <span
                      className="h-2 w-2 rounded-sm"
                      style={{ backgroundColor: PROVIDER_META[p].accentColor }}
                    />
                    {PROVIDER_META[p].label}
                  </NavItem>
                ))}
              </NavSection>

              <NavSection label="Data sources">
                {DATASOURCES.map((ds) => (
                  <NavItem
                    key={ds}
                    active={isActive("all", ds)}
                    onClick={() => selectView("all", ds)}
                    count={countBy.datasource[ds] || 0}
                  >
                    <span className="w-2" />
                    {DATASOURCE_META[ds].shortLabel}
                  </NavItem>
                ))}
              </NavSection>
            </nav>

            <div className="border-t border-line p-2">
              <button
                onClick={() => setIsEndpointDrawerOpen(!isEndpointDrawerOpen)}
                className={`flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-muted hover:bg-raised hover:text-ink ${
                  isEndpointDrawerOpen ? "bg-raised text-ink" : ""
                }`}
              >
                <Settings2 className="h-4 w-4" />
                Endpoints &amp; config
              </button>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-muted hover:bg-raised hover:text-ink"
              >
                <BookOpen className="h-4 w-4" />
                Embed setup guide
              </button>
            </div>
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-line bg-canvas">
          <div className="flex h-12 items-center gap-2 px-4">
            {!kioskMode && (
              <button
                onClick={() => setNavOpen(true)}
                className="rounded p-1.5 text-muted hover:bg-raised lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}

            <div className="relative hidden min-w-0 max-w-72 flex-1 md:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search panels, tags, RC, service"
                aria-label="Search panels"
                className={`${inputClass} w-full pl-8 pr-7`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-subtle hover:text-ink"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2 overflow-x-auto max-sm:shrink">

              <label className="flex h-8 items-center gap-1.5 rounded border border-line px-2 text-muted">
                <span className="text-2xs">Env</span>
                <select
                  value={endpoints.environment}
                  onChange={(e) =>
                    setEndpoints({ ...endpoints, environment: e.target.value })
                  }
                  aria-label="Environment"
                  className="cursor-pointer bg-transparent font-medium text-ink focus:outline-none"
                >
                  <option value="prod">prod</option>
                  <option value="staging">staging</option>
                  <option value="dr">dr-site</option>
                  <option value="all">all</option>
                </select>
              </label>

              <Segmented
                options={TIME_RANGES.map((t) => ({ value: t, label: t }))}
                value={timeRange}
                onChange={(v) => setTimeRange(v as TimeRangePreset)}
                className="hidden lg:flex"
              />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRangePreset)}
                className="h-8 cursor-pointer rounded border border-line bg-transparent px-1.5 text-muted focus:outline-none lg:hidden"
                aria-label="Time range"
              >
                {TIME_RANGES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <div className="flex h-8 items-center rounded border border-line">
                <button
                  onClick={() => setRefreshNonce((n) => n + 1)}
                  className="flex h-full items-center px-2 text-muted hover:text-ink"
                  title="Refresh all panels now"
                  aria-label="Refresh all panels now"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <select
                  value={refreshInterval}
                  onChange={(e) =>
                    setRefreshInterval(e.target.value as RefreshInterval)
                  }
                  className="h-full cursor-pointer border-l border-line bg-transparent px-1.5 text-muted focus:outline-none"
                  title="Auto-refresh interval"
                  aria-label="Auto-refresh interval"
                >
                  <option value="off">Off</option>
                  <option value="10s">10s</option>
                  <option value="30s">30s</option>
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                </select>
              </div>

              <Segmented
                options={[
                  { value: "sim", label: "Simulated" },
                  { value: "live", label: "Live" },
                ]}
                value={globalLiveMode ? "live" : "sim"}
                onChange={(v) => setGlobalLiveMode(v === "live")}
                className="flex"
              />

              <button
                onClick={() => setKioskMode(!kioskMode)}
                className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded border sm:flex ${
                  kioskMode
                    ? "border-accent/60 text-accent"
                    : "border-line text-muted hover:text-ink"
                }`}
                title="TV / kiosk mode (hide navigation)"
                aria-label="TV / kiosk mode"
                aria-pressed={kioskMode}
              >
                <Monitor className="h-4 w-4" />
              </button>

              <button
                onClick={openNewPanel}
                className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded bg-accent px-3 font-medium text-canvas hover:bg-accent/90"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add panel</span>
              </button>
            </div>
          </div>

          {/* Endpoint configuration */}
          {isEndpointDrawerOpen && (
            <div className="border-t border-line bg-surface px-4 py-4">
              <div className="mb-3 flex items-baseline justify-between">
                <div>
                  <h2 className="text-[13px] font-semibold">Endpoints</h2>
                  <p className="text-2xs text-subtle">
                    Base hosts used when re-pointing panel embed URLs.
                  </p>
                </div>
                <button
                  onClick={() => setIsEndpointDrawerOpen(false)}
                  className="rounded p-1 text-subtle hover:bg-raised hover:text-ink"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Grafana base URL" hint="Metricbeat, VictoriaMetrics">
                  <input
                    type="text"
                    value={endpoints.grafanaBaseUrl}
                    onChange={(e) =>
                      setEndpoints({ ...endpoints, grafanaBaseUrl: e.target.value })
                    }
                    className={`${inputClass} w-full font-mono text-xs`}
                  />
                </Field>
                <Field label="Kibana base URL" hint="Elasticsearch Data TRX">
                  <input
                    type="text"
                    value={endpoints.kibanaBaseUrl}
                    onChange={(e) =>
                      setEndpoints({ ...endpoints, kibanaBaseUrl: e.target.value })
                    }
                    className={`${inputClass} w-full font-mono text-xs`}
                  />
                </Field>
                <Field label="Datadog site" hint="APM">
                  <input
                    type="text"
                    value={endpoints.datadogSite}
                    onChange={(e) =>
                      setEndpoints({ ...endpoints, datadogSite: e.target.value })
                    }
                    className={`${inputClass} w-full font-mono text-xs`}
                  />
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleApplyBaseUrlsToAll}
                  className="h-8 rounded bg-accent px-3 font-medium text-canvas hover:bg-accent/90"
                >
                  Apply hosts to all panels
                </button>
                <span className="mx-1 h-5 w-px bg-line" />
                <button
                  onClick={handleExportJson}
                  className="flex h-8 items-center gap-1.5 rounded border border-line px-3 text-muted hover:text-ink"
                >
                  <Download className="h-3.5 w-3.5" /> Export JSON
                </button>
                <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded border border-line px-3 text-muted hover:text-ink">
                  <Upload className="h-3.5 w-3.5" /> Import JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJson}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handleResetDefaults}
                  className="ml-auto flex h-8 items-center gap-1.5 rounded px-3 text-muted hover:text-err"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
                </button>
              </div>
            </div>
          )}
        </header>

        <main id="main" tabIndex={-1} className="flex-1 px-4 py-5 outline-none lg:px-6">
          {/* Page heading */}
          <div className="mb-4">
            <h1 className="text-lg font-semibold tracking-tight">{viewTitle}</h1>
            <p className="mt-0.5 text-muted">{viewDescription}</p>
          </div>

          {/* Summary strip — one bordered row, not separate cards */}
          <dl className="mb-5 grid grid-cols-2 divide-line rounded-md border border-line bg-surface sm:grid-cols-5 sm:divide-x">
            <Stat label="Panels" value={`${filteredPanels.length} / ${panels.length}`} />
            <Stat label="Environment" value={endpoints.environment} />
            <Stat
              label="Time range"
              value={`Last ${timeRange}`}
              sub={refreshInterval === "off" ? "Auto-refresh off" : `Every ${refreshInterval}`}
            />
            <Stat
              label="Source mode"
              value={globalLiveMode ? "Live embed" : "Simulated"}
              sub={globalLiveMode ? "iframes from origin" : "no network needed"}
            />
            <Stat
              label="Last refresh"
              value={lastRefreshed ? lastRefreshed.toLocaleTimeString("id-ID") : "—"}
            />
          </dl>

          {filteredPanels.length === 0 ? (
            <div className="rounded-md border border-dashed border-line-strong px-6 py-14 text-center">
              <h3 className="font-semibold">No panels match the current filters</h3>
              <p className="mt-1 text-muted">
                Clear the filters or add a panel from Grafana, Kibana or Datadog.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    selectView("all", "all");
                    setSearchQuery("");
                  }}
                  className="h-8 rounded border border-line px-3 text-muted hover:text-ink"
                >
                  Clear filters
                </button>
                <button
                  onClick={openNewPanel}
                  className="h-8 rounded bg-accent px-3 font-medium text-canvas hover:bg-accent/90"
                >
                  Add panel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-4">
              {filteredPanels.map((panel) => (
                <div key={panel.id} className={getColSpanClass(panel.width)}>
                  <PanelCard
                    panel={panel}
                    globalLiveMode={globalLiveMode}
                    timeRange={timeRange}
                    refreshInterval={refreshInterval}
                    environment={endpoints.environment}
                    refreshNonce={refreshNonce}
                    onEdit={(p) => {
                      setEditingPanel(p);
                      setIsPanelModalOpen(true);
                    }}
                    onDelete={handleDeletePanel}
                    onMove={handleMovePanel}
                    onWidthChange={handleWidthChange}
                    onMaximize={(p) => setMaximizedPanel(p)}
                  />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Fullscreen panel */}
      {maximizedPanel && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={maximizedPanel.title}
          className="fixed inset-0 z-50 flex flex-col bg-canvas"
        >
          <div className="flex h-12 items-center justify-between border-b border-line px-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-2xs font-medium uppercase tracking-wide text-subtle">
                {PROVIDER_META[maximizedPanel.provider].label} ·{" "}
                {DATASOURCE_META[maximizedPanel.datasource].shortLabel}
              </span>
              <h2 className="truncate font-semibold">{maximizedPanel.title}</h2>
            </div>
            <button
              onClick={() => setMaximizedPanel(null)}
              className="flex h-8 items-center gap-1.5 rounded border border-line px-2.5 text-muted hover:text-ink"
            >
              <X className="h-4 w-4" /> Close
            </button>
          </div>

          <div className="relative flex-1">
            {globalLiveMode ? (
              <iframe
                src={buildSynchronizedEmbedUrl(
                  maximizedPanel.embedUrl,
                  maximizedPanel.provider,
                  timeRange,
                  refreshInterval,
                  endpoints.environment,
                  refreshNonce
                )}
                title={maximizedPanel.title}
                className="h-full w-full border-0"
              />
            ) : (
              <MockPanelRenderer
                panel={maximizedPanel}
                timeRange={timeRange}
                environment={endpoints.environment}
                refreshNonce={refreshNonce}
              />
            )}
          </div>
        </div>
      )}

      <PanelModal
        isOpen={isPanelModalOpen}
        editingPanel={editingPanel}
        onClose={() => setIsPanelModalOpen(false)}
        onSave={handleSavePanel}
      />

      <IntegrationGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}

function NavSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="mb-1 px-2.5 text-2xs font-medium uppercase tracking-wide text-subtle">
        {label}
      </div>
      {children}
    </div>
  );
}

function NavItem({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left ${
        active
          ? "bg-raised font-medium text-ink shadow-[inset_2px_0_0_rgb(var(--accent))]"
          : "text-muted hover:bg-raised/60 hover:text-ink"
      }`}
    >
      {children}
      <span className="tabular ml-auto text-2xs text-subtle">{count}</span>
    </button>
  );
}

function Segmented({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      className={`h-8 items-center rounded border border-line p-0.5 ${className}`}
      role="radiogroup"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-full whitespace-nowrap rounded-sm px-2 text-xs ${
            value === o.value
              ? "bg-raised font-medium text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline gap-1.5">
        <span className="font-medium">{label}</span>
        <span className="text-2xs text-subtle">{hint}</span>
      </span>
      {children}
    </label>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="px-4 py-3">
      <dt className="text-2xs text-subtle">{label}</dt>
      <dd className="tabular mt-0.5 font-semibold">{value}</dd>
      {sub && <dd className="text-2xs text-subtle">{sub}</dd>}
    </div>
  );
}
