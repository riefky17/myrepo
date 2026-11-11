import { DashboardPanel, DatasourceType, EndpointConfig, ProviderType } from "@/types/dashboard";

export const DEFAULT_ENDPOINT_CONFIG: EndpointConfig = {
  grafanaBaseUrl: "http://localhost:3000",
  kibanaBaseUrl: "http://localhost:5601",
  datadogSite: "https://app.datadoghq.com",
  environment: "prod",
};

export const PROVIDER_META: Record<
  ProviderType,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    accentColor: string;
    description: string;
  }
> = {
  grafana: {
    label: "Grafana",
    badgeBg: "bg-raised",
    badgeText: "text-muted",
    borderColor: "border-line",
    accentColor: "#c98a4b",
    description: "Infrastructure & Time-Series Metrics",
  },
  kibana: {
    label: "Kibana",
    badgeBg: "bg-raised",
    badgeText: "text-muted",
    borderColor: "border-line",
    accentColor: "#4fa3a5",
    description: "Transaction Analytics & Elastic Logs",
  },
  datadog: {
    label: "Datadog",
    badgeBg: "bg-raised",
    badgeText: "text-muted",
    borderColor: "border-line",
    accentColor: "#8f7cc4",
    description: "Distributed Tracing & Application Performance (APM)",
  },
};

export const DATASOURCE_META: Record<
  DatasourceType,
  {
    label: string;
    shortLabel: string;
    provider: ProviderType;
    indexOrQueryType: string;
    badgeClass: string;
  }
> = {
  "elasticsearch-metricbeat": {
    label: "Elasticsearch (Metricbeat)",
    shortLabel: "ES Metricbeat",
    provider: "grafana",
    indexOrQueryType: "Index: metricbeat-* (Host CPU, Memory, Disk, System Load)",
    badgeClass: "border-line text-muted",
  },
  victoriametrics: {
    label: "VictoriaMetrics",
    shortLabel: "VictoriaMetrics",
    provider: "grafana",
    indexOrQueryType: "MetricsQL / PromQL (High-Cardinality Time-Series)",
    badgeClass: "border-line text-muted",
  },
  "elasticsearch-trx": {
    label: "Elasticsearch (Data TRX)",
    shortLabel: "ES Data TRX",
    provider: "kibana",
    indexOrQueryType: "Index: trx-logs-* / trx-events-* (KQL & Lens)",
    badgeClass: "border-line text-muted",
  },
  "datadog-apm": {
    label: "Datadog APM",
    shortLabel: "Datadog APM",
    provider: "datadog",
    indexOrQueryType: "APM Trace Stream & Service RED Metrics",
    badgeClass: "border-line text-muted",
  },
};

export const DEFAULT_PANELS: DashboardPanel[] = [
  {
    id: "graf-metricbeat-1",
    title: "Host CPU, Memory & System Load (Metricbeat)",
    subtitle: "Grafana panel backed by Elasticsearch metricbeat-* index",
    provider: "grafana",
    datasource: "elasticsearch-metricbeat",
    embedUrl:
      "http://localhost:3000/d-solo/metricbeat-host-01/system-overview?orgId=1&panelId=2",
    width: "1/3",
    height: "md",
    mockVisualization: "metricbeat-system",
    tags: ["system", "metricbeat", "nodes"],
    queryHint:
      'Lucene: event.module:"system" AND metricset.name:("cpu" OR "memory" OR "load")',
  },
  {
    id: "graf-vm-1",
    title: "Cluster Throughput & Ingestion Rate (VictoriaMetrics)",
    subtitle: "Grafana time-series via VictoriaMetrics Prometheus datasource",
    provider: "grafana",
    datasource: "victoriametrics",
    embedUrl:
      "http://localhost:3000/d-solo/vm-cluster-01/victoriametrics-overview?orgId=1&panelId=4",
    width: "1/3",
    height: "md",
    mockVisualization: "victoriametrics-cluster",
    tags: ["victoriametrics", "promql", "tsdb"],
    queryHint:
      'MetricsQL: sum(rate(http_requests_total{env="$env"}[5m])) by (cluster)',
  },
  {
    id: "dd-apm-1",
    title: "Payment & Checkout Service RED Metrics (Datadog APM)",
    subtitle: "Requests/sec, Error Rate, and P95/P99 Latency from Datadog APM",
    provider: "datadog",
    datasource: "datadog-apm",
    embedUrl:
      "https://app.datadoghq.com/graph/embed?token=dd_apm_red_sample_token_01&height=300&width=600",
    width: "1/3",
    height: "md",
    mockVisualization: "datadog-apm-RED",
    tags: ["apm", "latency", "p99", "errors"],
    queryHint:
      "trace.servlet.request.hits{service:payment-api,env:prod}.as_rate()",
  },
  {
    id: "kibana-trx-1",
    title: "Real-Time Transaction Volume & Status Breakdown (Data TRX)",
    subtitle: "Kibana Lens visualization on Elasticsearch trx-* index pattern",
    provider: "kibana",
    datasource: "elasticsearch-trx",
    embedUrl:
      "http://localhost:5601/app/dashboards#/view/trx-analytics-main?embed=true",
    width: "1/2",
    height: "md",
    mockVisualization: "kibana-trx-volume",
    tags: ["trx", "payment", "status-code", "kibana-lens"],
    queryHint:
      'KQL: trx.channel : ("QRIS" or "VA" or "BI-FAST" or "CC") and trx.status : *',
  },
  {
    id: "kibana-trx-2",
    title: "TRX Response Time Percentile & Bank Gateway SLA",
    subtitle: "Kibana TSVB / Lens latency distribution from Elasticsearch TRX",
    provider: "kibana",
    datasource: "elasticsearch-trx",
    embedUrl:
      "http://localhost:5601/app/lens#/edit/trx-gateway-sla-latency?embed=true",
    width: "1/2",
    height: "md",
    mockVisualization: "kibana-trx-latency",
    tags: ["trx", "sla", "gateway", "latency"],
    queryHint:
      "KQL: trx.duration_ms > 0 | Metrics: percentile(trx.duration_ms, 95, 99)",
  },
  {
    id: "dd-apm-2",
    title: "Distributed Trace Flamegraph & Bottleneck Spans",
    subtitle: "Datadog APM live trace waterfall across API Gateway -> TRX Engine -> DB",
    provider: "datadog",
    datasource: "datadog-apm",
    embedUrl:
      "https://app.datadoghq.com/graph/embed?token=dd_apm_trace_waterfall_02&height=340&width=800",
    width: "1/2",
    height: "md",
    mockVisualization: "datadog-apm-traces",
    tags: ["apm", "traces", "spans", "waterfall"],
    queryHint:
      "service:(api-gateway OR trx-core-engine OR postgres-trx) @duration:>250ms",
  },
  {
    id: "dd-apm-3",
    title: "APM Microservices Dependency & Health Map",
    subtitle: "Datadog APM Service Map linking TRX services, Kafka & Elastic",
    provider: "datadog",
    datasource: "datadog-apm",
    embedUrl:
      "https://app.datadoghq.com/graph/embed?token=dd_apm_service_map_03&height=340&width=800",
    width: "1/2",
    height: "md",
    mockVisualization: "datadog-apm-servicemap",
    tags: ["apm", "service-map", "topology"],
    queryHint: "env:prod primary_tag:region-id-jkt",
  },
  {
    id: "graf-vm-2",
    title: "Network I/O & Kubernetes Pod Saturation (VictoriaMetrics + Metricbeat)",
    subtitle: "Grafana mixed datasource query: VictoriaMetrics + ES Metricbeat",
    provider: "grafana",
    datasource: "victoriametrics",
    embedUrl:
      "http://localhost:3000/d-solo/vm-net-02/k8s-network-saturation?orgId=1&panelId=8",
    width: "1/3",
    height: "md",
    mockVisualization: "victoriametrics-network",
    tags: ["network", "k8s", "victoriametrics"],
    queryHint:
      "MetricsQL: rate(container_network_receive_bytes_total[1m]) / 1024 / 1024",
  },
  {
    id: "kibana-trx-3",
    title: "Live TRX Anomaly & Failed Transaction Stream (Elasticsearch TRX)",
    subtitle: "Kibana Discover saved search table for RC != 00 transactions",
    provider: "kibana",
    datasource: "elasticsearch-trx",
    embedUrl:
      "http://localhost:5601/app/discover#/view/trx-failed-stream?embed=true",
    width: "2/3",
    height: "md",
    mockVisualization: "kibana-trx-logs",
    tags: ["trx", "rc-error", "discover", "logs"],
    queryHint:
      'KQL: not trx.response_code : "00" and trx.amount >= 100000',
  },
];
