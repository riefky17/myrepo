# Unified Observability Dashboard (Single Pane of Glass)

Aplikasi **Single Dashboard** berbasis **Next.js + React + Tailwind CSS** untuk menampilkan dan menyinkronkan panel/dashboard dari **Grafana**, **Kibana**, dan **Datadog** dalam satu tampilan terpadu (*Single Pane of Glass*).

## Cakupan Platform & Datasource

1. **Grafana**
   - **Elasticsearch (Metricbeat)**: Monitoring *host system metrics* (`metricbeat-*` — CPU, Memory, System Load, Disk IOPS).
   - **VictoriaMetrics**: *High-cardinality time-series metrics* via PromQL / MetricsQL (`vmstorage`, `vminsert`, Kubernetes Pod Network I/O).
2. **Kibana**
   - **Elasticsearch (Data TRX)**: Visualisasi *transaction analytics* (`trx-*` — volume transaksi QRIS/BI-FAST/VA/CC, *Success Rate* RC `00`, distribusi *latency* P50/P95/P99, dan *live stream* transaksi gagal/suspect RC `68`/`91`).
3. **Datadog**
   - **Datadog APM**: *Distributed Tracing*, *Service RED Metrics* (Requests/s, Error Rate, P99 Latency), *Trace Flamegraph/Waterfall*, dan *Service Dependency Map*.

## Fitur Utama

- **Sinkronisasi Parameter Waktu Otomatis (`urlBuilder.ts`)**:
  Saat Anda mengubah rentang waktu global (`15m`, `1h`, `6h`, `24h`, `7d`), *auto-refresh* (`10s`, `30s`, `1m`, `5m`), atau environment (`prod`, `staging`, `dr`), aplikasi secara otomatis memformat ulang URL *iframe* sesuai standar masing-masing platform:
  - **Grafana**: Menyisipkan `?from=now-1h&to=now&theme=dark&refresh=30s&var-env=prod`
  - **Kibana**: Menyisipkan RISON `embed=true&_g=(refreshInterval:(pause:!f,value:30000),time:(from:now-1h,to:now))`
  - **Datadog**: Menyisipkan `timeframe=1_hour&legend=true&theme=dark&live=true&tpl_var_env=prod`
- **Dual Mode (Live Iframe Embed & Mode Simulasi Interaktif)**:
  - **Mode Simulasi Interaktif**: Menampilkan simulasi visualisasi telemetri *real-time* untuk Metricbeat, VictoriaMetrics, Kibana TRX, dan Datadog APM tanpa perlu terkoneksi ke VPN/server produksi.
  - **Mode Live Iframe**: Memuat `<iframe src="...">` langsung dari instance Grafana, Kibana, dan Datadog Anda (bisa diubah secara global atau per-panel).
- **Manajemen Panel Fleksibel**:
  - Tambah, edit, hapus, ubah ukuran kolom (`1/3`, `1/2`, `2/3`, `Full Width`), geser urutan panel, dan *Fullscreen Maximize*.
  - Ekstraktor otomatis `src` jika Anda menempelkan kode HTML `<iframe src="..."></iframe>` mentah dari Grafana/Kibana/Datadog.
  - **Export / Import JSON** dan penyimpanan otomatis di `localStorage`.

## Cara Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` (atau port yang tersedia jika port `3000` dipakai oleh Grafana).
Jika port `3000` sudah digunakan oleh Grafana lokal Anda, jalankan pada port lain, misalnya `3001`:

```bash
npx next dev -p 3001
```
