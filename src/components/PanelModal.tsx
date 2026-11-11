"use client";

import React, { useState, useEffect } from "react";
import {
  DashboardPanel,
  DatasourceType,
  MockVisualizationType,
  PanelHeight,
  PanelWidth,
  ProviderType,
} from "@/types/dashboard";
import { extractIframeSrc } from "@/lib/urlBuilder";
import { useEscape } from "@/lib/useEscape";
import { X, Wand2 } from "lucide-react";

interface PanelModalProps {
  isOpen: boolean;
  editingPanel: DashboardPanel | null;
  onClose: () => void;
  onSave: (panel: DashboardPanel) => void;
}

const PROVIDER_DATASOURCES: Record<ProviderType, { value: DatasourceType; label: string }[]> = {
  grafana: [
    { value: "elasticsearch-metricbeat", label: "Elasticsearch (Metricbeat)" },
    { value: "victoriametrics", label: "VictoriaMetrics (PromQL / MetricsQL)" },
  ],
  kibana: [
    { value: "elasticsearch-trx", label: "Elasticsearch (Data TRX)" },
  ],
  datadog: [
    { value: "datadog-apm", label: "Datadog APM (Traces & Services)" },
  ],
};

export default function PanelModal({
  isOpen,
  editingPanel,
  onClose,
  onSave,
}: PanelModalProps) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [provider, setProvider] = useState<ProviderType>("grafana");
  const [datasource, setDatasource] = useState<DatasourceType>("elasticsearch-metricbeat");
  const [embedUrl, setEmbedUrl] = useState("");
  const [width, setWidth] = useState<PanelWidth>("1/3");
  const [height, setHeight] = useState<PanelHeight>("md");
  const [queryHint, setQueryHint] = useState("");
  const [tagsInput, setTagsInput] = useState("observability, prod");
  const [mockVisualization, setMockVisualization] =
    useState<MockVisualizationType>("metricbeat-system");

  useEffect(() => {
    if (editingPanel) {
      setTitle(editingPanel.title);
      setSubtitle(editingPanel.subtitle);
      setProvider(editingPanel.provider);
      setDatasource(editingPanel.datasource);
      setEmbedUrl(editingPanel.embedUrl);
      setWidth(editingPanel.width);
      setHeight(editingPanel.height);
      setQueryHint(editingPanel.queryHint || "");
      setTagsInput(editingPanel.tags.join(", "));
      setMockVisualization(editingPanel.mockVisualization);
    } else {
      setTitle("");
      setSubtitle("");
      setProvider("grafana");
      setDatasource("elasticsearch-metricbeat");
      setEmbedUrl("http://localhost:3000/d-solo/metricbeat-01/host-metrics?orgId=1&panelId=2");
      setWidth("1/3");
      setHeight("md");
      setQueryHint('Lucene: metricset.module:"system"');
      setTagsInput("metricbeat, grafana");
      setMockVisualization("metricbeat-system");
    }
  }, [editingPanel, isOpen]);

  useEscape(isOpen, onClose);

  if (!isOpen) return null;

  const handleProviderChange = (newProvider: ProviderType) => {
    setProvider(newProvider);
    if (newProvider === "grafana") {
      setDatasource("elasticsearch-metricbeat");
      setMockVisualization("metricbeat-system");
      if (!editingPanel) {
        setEmbedUrl(
          "http://localhost:3000/d-solo/metricbeat-01/system-overview?orgId=1&panelId=2"
        );
      }
    } else if (newProvider === "kibana") {
      setDatasource("elasticsearch-trx");
      setMockVisualization("kibana-trx-volume");
      if (!editingPanel) {
        setEmbedUrl(
          "http://localhost:5601/app/dashboards#/view/trx-analytics-main?embed=true"
        );
      }
    } else if (newProvider === "datadog") {
      setDatasource("datadog-apm");
      setMockVisualization("datadog-apm-RED");
      if (!editingPanel) {
        setEmbedUrl(
          "https://app.datadoghq.com/graph/embed?token=your_embed_token_here&height=300&width=600"
        );
      }
    }
  };

  const handleDatasourceChange = (newDs: DatasourceType) => {
    setDatasource(newDs);
    if (newDs === "elasticsearch-metricbeat") {
      setMockVisualization("metricbeat-system");
    } else if (newDs === "victoriametrics") {
      setMockVisualization("victoriametrics-cluster");
    } else if (newDs === "elasticsearch-trx") {
      setMockVisualization("kibana-trx-volume");
    } else if (newDs === "datadog-apm") {
      setMockVisualization("datadog-apm-RED");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedUrl = extractIframeSrc(embedUrl);
    const newPanel: DashboardPanel = {
      id: editingPanel ? editingPanel.id : `panel-${Date.now()}`,
      title: title.trim() || "Untitled Telemetry Panel",
      subtitle:
        subtitle.trim() ||
        `${provider.toUpperCase()} • ${datasource}`,
      provider,
      datasource,
      embedUrl: cleanedUrl,
      width,
      height,
      mockVisualization,
      queryHint: queryHint.trim(),
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    onSave(newPanel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="panel-modal-title" className="bg-surface border border-line-strong rounded-lg w-full max-w-2xl shadow-xl shadow-black/40 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
          <div>
            <h2 id="panel-modal-title" className="text-sm font-semibold text-ink">
              {editingPanel ? "Edit panel" : "Add panel"}
            </h2>
            <p className="text-2xs text-subtle">
              Paste an embed URL or iframe snippet from Grafana, Kibana or Datadog.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded text-subtle hover:text-ink hover:bg-raised"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Provider & Datasource */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-muted font-medium mb-1.5 text-xs">
                Platform
              </label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
                className="w-full h-9 bg-canvas border border-line rounded px-3 text-ink focus:outline-none focus:border-accent"
              >
                <option value="grafana">Grafana</option>
                <option value="kibana">Kibana</option>
                <option value="datadog">Datadog</option>
              </select>
            </div>

            <div>
              <label className="block text-muted font-medium mb-1.5 text-xs">
                Data source
              </label>
              <select
                value={datasource}
                onChange={(e) => handleDatasourceChange(e.target.value as DatasourceType)}
                className="w-full h-9 bg-canvas border border-line rounded px-3 text-ink focus:outline-none focus:border-accent"
              >
                {PROVIDER_DATASOURCES[provider].map((ds) => (
                  <option key={ds.value} value={ds.value}>
                    {ds.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-muted font-medium mb-1.5 text-xs">
                Title
              </label>
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Host CPU & Memory (Metricbeat)"
                className="w-full h-9 bg-canvas border border-line rounded px-3 text-ink focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1.5 text-xs">
                Subtitle
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Elasticsearch metricbeat-* index"
                className="w-full h-9 bg-canvas border border-line rounded px-3 text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Embed URL or raw iframe code */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-muted font-medium text-xs">
                Embed URL or <code className="font-mono">&lt;iframe&gt;</code> snippet
              </label>
              <button
                type="button"
                onClick={() => setEmbedUrl(extractIframeSrc(embedUrl))}
                className="text-2xs text-accent hover:underline flex items-center gap-1"
              >
                <Wand2 className="w-3 h-3" /> Extract src from iframe tag
              </button>
            </div>
            <input
              type="text"
              required
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="Paste URL /d-solo/... (Grafana), /app/dashboards#... (Kibana), or /graph/embed?... (Datadog)"
              className="w-full font-mono h-9 bg-canvas border border-line rounded px-3 text-ink text-xs focus:outline-none focus:border-accent"
            />
            <p className="text-2xs text-subtle mt-1.5">
              Time parameters (`from`/`to`, Kibana `_g`, Datadog `timeframe`) are synced automatically.
            </p>
          </div>

          {/* Query Hint & Simulation Template */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-muted font-medium mb-1.5 text-xs">
                Query / index reference (optional)
              </label>
              <input
                type="text"
                value={queryHint}
                onChange={(e) => setQueryHint(e.target.value)}
                placeholder="e.g. KQL: trx.response_code: '00'"
                className="w-full font-mono h-9 bg-canvas border border-line rounded px-3 text-ink text-xs focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-muted font-medium mb-1.5 text-xs">
                Simulated visualization
              </label>
              <select
                value={mockVisualization}
                onChange={(e) =>
                  setMockVisualization(e.target.value as MockVisualizationType)
                }
                className="w-full h-9 bg-canvas border border-line rounded px-3 text-ink focus:outline-none focus:border-accent"
              >
                <option value="metricbeat-system">
                  Grafana: Metricbeat Host CPU/RAM/Load
                </option>
                <option value="victoriametrics-cluster">
                  Grafana: VictoriaMetrics Cluster TSDB
                </option>
                <option value="victoriametrics-network">
                  Grafana: VictoriaMetrics K8s Network I/O
                </option>
                <option value="kibana-trx-volume">
                  Kibana: Data TRX Volume &amp; Channel Status
                </option>
                <option value="kibana-trx-latency">
                  Kibana: Data TRX Latency Percentiles
                </option>
                <option value="kibana-trx-logs">
                  Kibana: Data TRX Anomaly &amp; Error Stream Table
                </option>
                <option value="datadog-apm-RED">
                  Datadog APM: Service RED Metrics (RPS/Err/P99)
                </option>
                <option value="datadog-apm-traces">
                  Datadog APM: Distributed Trace Waterfall
                </option>
                <option value="datadog-apm-servicemap">
                  Datadog APM: Service Dependency Topology
                </option>
              </select>
            </div>
          </div>

          {/* Width, Height, Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-muted font-medium mb-1.5 text-xs">
                Width
              </label>
              <select
                value={width}
                onChange={(e) => setWidth(e.target.value as PanelWidth)}
                className="w-full h-9 bg-canvas border border-line rounded px-3 text-ink focus:outline-none focus:border-accent"
              >
                <option value="1/3">1/3 column</option>
                <option value="1/2">1/2 column</option>
                <option value="2/3">2/3 column</option>
                <option value="full">Full width</option>
              </select>
            </div>
            <div>
              <label className="block text-muted font-medium mb-1.5 text-xs">
                Height
              </label>
              <select
                value={height}
                onChange={(e) => setHeight(e.target.value as PanelHeight)}
                className="w-full h-9 bg-canvas border border-line rounded px-3 text-ink focus:outline-none focus:border-accent"
              >
                <option value="sm">Small (250px)</option>
                <option value="md">Medium (330px)</option>
                <option value="lg">Large (430px)</option>
              </select>
            </div>
            <div>
              <label className="block text-muted font-medium mb-1.5 text-xs">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full h-9 bg-canvas border border-line rounded px-3 text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="-mx-5 -mb-5 mt-2 px-5 py-3 border-t border-line bg-canvas/40 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded border border-line text-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-3 rounded bg-accent hover:bg-accent/90 text-canvas font-medium"
            >
              {editingPanel ? "Save changes" : "Add to dashboard"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
