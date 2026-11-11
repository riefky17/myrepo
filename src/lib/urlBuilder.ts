import { ProviderType, RefreshInterval, TimeRangePreset } from "@/types/dashboard";

const GRAFANA_FROM_MAP: Record<TimeRangePreset, string> = {
  "15m": "now-15m",
  "1h": "now-1h",
  "6h": "now-6h",
  "24h": "now-24h",
  "7d": "now-7d",
};

const KIBANA_FROM_MAP: Record<TimeRangePreset, string> = {
  "15m": "now-15m",
  "1h": "now-1h",
  "6h": "now-6h",
  "24h": "now-24h",
  "7d": "now-7d",
};

const DATADOG_TIMEFRAME_MAP: Record<TimeRangePreset, string> = {
  "15m": "15_minutes",
  "1h": "1_hour",
  "6h": "4_hours",
  "24h": "1_day",
  "7d": "1_week",
};

const KIBANA_REFRESH_MS: Record<RefreshInterval, number> = {
  off: 0,
  "10s": 10000,
  "30s": 30000,
  "1m": 60000,
  "5m": 300000,
};

/**
 * Extracts raw src URL if user pasted a full <iframe src="..."> snippet
 */
export function extractIframeSrc(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/src=["']([^"']+)["']/i);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Builds a synchronized embed URL with time range, refresh interval, and environment parameters
 * tailored to Grafana, Kibana, or Datadog URL conventions.
 */
export function buildSynchronizedEmbedUrl(
  rawUrl: string,
  provider: ProviderType,
  timeRange: TimeRangePreset,
  refresh: RefreshInterval,
  environment: string,
  refreshNonce: number
): string {
  const cleanUrl = extractIframeSrc(rawUrl);
  if (!cleanUrl) return "";

  try {
    if (provider === "grafana") {
      const url = new URL(cleanUrl);
      url.searchParams.set("from", GRAFANA_FROM_MAP[timeRange]);
      url.searchParams.set("to", "now");
      url.searchParams.set("theme", "dark");
      if (refresh !== "off") {
        url.searchParams.set("refresh", refresh);
      } else {
        url.searchParams.delete("refresh");
      }
      if (environment && environment !== "all") {
        url.searchParams.set("var-env", environment);
      }
      if (refreshNonce > 0) {
        url.searchParams.set("_t", String(refreshNonce));
      }
      return url.toString();
    }

    if (provider === "kibana") {
      // Kibana often uses hash routing e.g. /app/dashboards#/view/id?embed=true&_g=(...)
      const fromVal = KIBANA_FROM_MAP[timeRange];
      const refreshMs = KIBANA_REFRESH_MS[refresh];
      const pauseFlag = refresh === "off" ? "!t" : "!f";
      const risonGlobal = `(refreshInterval:(pause:${pauseFlag},value:${refreshMs}),time:(from:${fromVal},to:now))`;

      if (cleanUrl.includes("#")) {
        const [basePart, hashPart] = cleanUrl.split("#");
        const [hashPath, hashQuery = ""] = hashPart.split("?");
        const params = new URLSearchParams(hashQuery);
        params.set("embed", "true");
        params.set("_g", risonGlobal);
        if (refreshNonce > 0) {
          params.set("_t", String(refreshNonce));
        }
        return `${basePart}#${hashPath}?${params.toString()}`;
      } else {
        const url = new URL(cleanUrl);
        url.searchParams.set("embed", "true");
        url.searchParams.set("_g", risonGlobal);
        if (refreshNonce > 0) {
          url.searchParams.set("_t", String(refreshNonce));
        }
        return url.toString();
      }
    }

    if (provider === "datadog") {
      const url = new URL(cleanUrl);
      url.searchParams.set("timeframe", DATADOG_TIMEFRAME_MAP[timeRange]);
      url.searchParams.set("legend", "true");
      url.searchParams.set("theme", "dark");
      url.searchParams.set("live", "true");
      if (environment && environment !== "all") {
        url.searchParams.set("tpl_var_env", environment);
      }
      if (refreshNonce > 0) {
        url.searchParams.set("_t", String(refreshNonce));
      }
      return url.toString();
    }

    return cleanUrl;
  } catch {
    // Fallback if URL is relative or unparseable
    return cleanUrl;
  }
}
