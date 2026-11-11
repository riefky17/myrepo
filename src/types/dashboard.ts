export type ProviderType = "grafana" | "kibana" | "datadog";

export type DatasourceType =
  | "elasticsearch-metricbeat"
  | "victoriametrics"
  | "elasticsearch-trx"
  | "datadog-apm";

export type TimeRangePreset = "15m" | "1h" | "6h" | "24h" | "7d";

export type RefreshInterval = "off" | "10s" | "30s" | "1m" | "5m";

export type PanelWidth = "1/3" | "1/2" | "2/3" | "full";
export type PanelHeight = "sm" | "md" | "lg";

export type MockVisualizationType =
  | "metricbeat-system"
  | "victoriametrics-cluster"
  | "victoriametrics-network"
  | "kibana-trx-volume"
  | "kibana-trx-latency"
  | "kibana-trx-logs"
  | "datadog-apm-RED"
  | "datadog-apm-traces"
  | "datadog-apm-servicemap";

export interface DashboardPanel {
  id: string;
  title: string;
  subtitle: string;
  provider: ProviderType;
  datasource: DatasourceType;
  embedUrl: string;
  width: PanelWidth;
  height: PanelHeight;
  mockVisualization: MockVisualizationType;
  forceLiveIframe?: boolean;
  tags: string[];
  queryHint?: string;
}

export interface EndpointConfig {
  grafanaBaseUrl: string;
  kibanaBaseUrl: string;
  datadogSite: string;
  environment: string;
}
