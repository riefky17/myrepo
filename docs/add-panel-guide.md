# Panduan Menambah Panel / Dashboard

Panduan ini menjelaskan cara mengambil link embed dari **Grafana**, **Kibana**, dan **Datadog**, lalu menambahkannya ke dashboard ini lewat tombol **Add panel**.

Isi:

1. [Alur umum di aplikasi](#1-alur-umum-di-aplikasi)
2. [Grafana](#2-grafana)
3. [Kibana](#3-kibana)
4. [Datadog](#4-datadog)
5. [Setelah panel ditambahkan](#5-setelah-panel-ditambahkan)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Alur umum di aplikasi

Berlaku untuk ketiga platform. Yang berbeda hanya cara mendapatkan URL embed.

1. Ambil URL embed (atau seluruh snippet `<iframe ...>`) dari platform sumber. Langkahnya ada di bagian 2–4.
2. Di dashboard, klik **Add panel** di topbar.
3. Pilih **Platform** (Grafana / Kibana / Datadog), lalu **Data source**.
4. Isi **Title** dan **Subtitle** (opsional, tapi membantu saat banyak panel).
5. Tempel ke **Embed URL or `<iframe>` snippet**. Boleh URL saja atau snippet utuh. Klik **Extract src from iframe tag** jika ingin melihat URL hasil ekstraksi sebelum disimpan.
6. Isi **Query / index reference** (opsional). Teks ini ditampilkan di menu **⋯ → Show embed URL** sebagai catatan query asal panel.
7. Pilih **Simulated visualization**. Ini hanya dipakai di mode Simulated, supaya panel tetap punya tampilan saat server asli tidak terjangkau.
8. Atur **Width** (1/3, 1/2, 2/3, full), **Height** (250 / 330 / 430 px), dan **Tags** (pisahkan dengan koma). Tags ikut dicari oleh kotak search.
9. Klik **Add to dashboard**.
10. Di topbar, ubah **Simulated** menjadi **Live** untuk memuat iframe asli. Bisa juga per panel lewat tombol **Sim/Live** di header kartu.

Dashboard otomatis menambahkan parameter waktu, refresh, dan environment ke URL. Jadi tidak perlu mengunci time range di sumbernya.

| Platform | Parameter yang ditambahkan otomatis |
|----------|--------------------------------------|
| Grafana  | `from`, `to=now`, `theme=dark`, `refresh`, `var-env` |
| Kibana   | `embed=true`, `_g=(refreshInterval:…,time:(from:…,to:now))` |
| Datadog  | `timeframe`, `legend=true`, `theme=dark`, `live=true`, `tpl_var_env` |

---

## 2. Grafana

### 2.1 Siapkan Grafana (sekali saja, oleh admin)

Tanpa ini panel akan kosong karena diblokir `X-Frame-Options`.

```ini
# grafana.ini
[security]
allow_embedding = true
cookie_samesite = none
cookie_secure = true

# Opsional: tanpa login untuk jaringan internal / TV wall
[auth.anonymous]
enabled = true
org_role = Viewer
```

Restart Grafana setelah mengubah `grafana.ini`. `cookie_samesite = none` mewajibkan Grafana diakses lewat HTTPS.

### 2.2 Menambah satu panel (`/d-solo/...`)

1. Buka dashboard Grafana, arahkan kursor ke panel yang diinginkan.
2. Klik menu panel (⋮) → **Share** → tab **Embed**.
3. Matikan **Lock time range** supaya waktu bisa disinkronkan oleh dashboard ini. Pilih tema **Dark**.
4. Salin snippet `<iframe src="http://…/d-solo/<uid>/<slug>?orgId=1&panelId=2 …">`.
5. Di dashboard ini: **Add panel** → Platform **Grafana** → Data source **Elasticsearch (Metricbeat)** atau **VictoriaMetrics** → tempel snippet → **Add to dashboard**.

### 2.3 Menambah satu dashboard penuh (`/d/...`)

1. Buka dashboard Grafana yang diinginkan.
2. Salin URL dari address bar, bentuknya `http://…/d/<uid>/<slug>?orgId=1`.
3. Tambahkan `&kiosk` di akhir URL untuk menyembunyikan menu dan navigasi Grafana.
4. Tempel ke **Add panel**, atur **Width** ke **Full width** dan **Height** ke **Large**.

### 2.4 Variabel `env`

Dashboard ini mengirim `var-env=<environment>`. Agar berfungsi, dashboard Grafana harus punya variabel bernama `env`. Kalau tidak ada, parameter diabaikan tanpa error.

---

## 3. Kibana

### 3.1 Siapkan Kibana (sekali saja, oleh admin)

```yaml
# kibana.yml
csp.rules:
  - "frame-ancestors 'self' http://localhost:3001 https://dashboard.internal.company.com"

# Jika memakai reverse proxy untuk viewer:
xpack.security.sameSiteCookies: "None"
```

Ganti domain di `frame-ancestors` dengan alamat tempat dashboard ini dijalankan, lalu restart Kibana. `SameSite=None` juga mewajibkan HTTPS.

### 3.2 Menambah dashboard Kibana

1. Buka dashboard di Kibana (**Dashboards** → pilih dashboard).
2. Klik **Share** → **Embed code**.
3. Pilih **Saved object** (bukan **Snapshot**). Saved object selalu menampilkan data terbaru, sedangkan snapshot menyimpan state lama.
4. Aktifkan **Short URL** jika tersedia, agar URL tidak sangat panjang. Salin kode iframe.
5. Di dashboard ini: **Add panel** → Platform **Kibana** → Data source **Elasticsearch (Data TRX)** → tempel → **Add to dashboard**.

### 3.3 Menambah satu visualisasi (Lens) atau Discover

1. Buka visualisasi Lens atau saved search di Discover, lalu simpan.
2. Gunakan **Share** → **Embed code** dengan cara yang sama seperti 3.2.
3. Untuk tabel transaksi gagal, pilih **Simulated visualization** bertipe **Kibana: Data TRX Anomaly & Error Stream Table**, atur **Width** ke 2/3 atau Full.

Dashboard ini menimpa `embed=true` dan `_g` (waktu + refresh) pada URL. Filter yang sudah tersimpan di dashboard tetap dipakai.

---

## 4. Datadog

### 4.1 Siapkan Datadog (sekali saja, oleh admin)

1. Buka **Organization Settings** → **Public Sharing**.
2. Aktifkan **Embeddable Graphs** (untuk satu grafik) dan **Public Dashboards** (untuk dashboard penuh).

Tanpa ini tombol generate di bawah tidak muncul. Pembuatan link biasanya butuh role admin.

### 4.2 Menambah satu grafik APM (`/graph/embed?token=...`)

1. Buka widget APM atau dashboard di Datadog.
2. Klik ikon **Share** pada widget → **Generate public URL**.
3. Pilih ukuran, timeframe, dan **Show legend**. Timeframe nanti ditimpa oleh dashboard ini.
4. Salin kode iframe. URL-nya berbentuk `https://app.datadoghq.com/graph/embed?token=<EMBED_TOKEN>&height=300&width=600`.
5. Di dashboard ini: **Add panel** → Platform **Datadog** → Data source **Datadog APM** → tempel → **Add to dashboard**.
6. Di **Simulated visualization**, pilih tipe yang sesuai: **Service RED Metrics**, **Distributed Trace Waterfall**, atau **Service Dependency Topology**.

### 4.3 Menambah dashboard Datadog penuh

1. Buka dashboard di Datadog → **Share** → **Generate public URL**.
2. Salin URL-nya (bentuknya `https://p.datadoghq.com/sb/<id>`).
3. Tempel ke **Add panel**, atur **Width** ke Full dan **Height** ke Large.

Catatan: parameter sinkronisasi (`timeframe`, `tpl_var_env`) dirancang untuk URL `/graph/embed`. Pada link public dashboard, time range mengikuti pengaturan di Datadog dan mungkin tidak berubah saat Anda mengganti time range di dashboard ini.

### 4.4 Datadog site selain US1

Jika akun Anda di site lain (misalnya `datadoghq.eu`), buka **Endpoints & config** di sidebar, isi **Datadog site** dengan host yang sesuai, lalu klik **Apply hosts to all panels**.

---

## 5. Setelah panel ditambahkan

- **Edit**: menu **⋯** di kartu → **Edit panel**.
- **Lihat URL akhir**: menu **⋯** → **Show embed URL**. Ini URL yang benar-benar dimuat iframe, lengkap dengan parameter sinkronisasi. Klik **Open** untuk mengujinya di tab baru.
- **Ubah ukuran / urutan**: menu **⋯** → **Width**, **Move left**, **Move right**.
- **Pindah server** (mis. dari staging ke prod): **Endpoints & config** → isi base URL → **Apply hosts to all panels**.
- **Backup / pindah browser**: **Endpoints & config** → **Export JSON** / **Import JSON**. Panel disimpan di `localStorage` browser, jadi tidak ikut berpindah antar browser tanpa export.

---

## 6. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|--------|---------------|--------|
| Panel kosong / "refused to connect" | `X-Frame-Options` atau CSP memblokir iframe | Lakukan setup admin di bagian 2.1 / 3.1 / 4.1. Cek juga tab Console browser. |
| Halaman login muncul di dalam panel | Cookie pihak ketiga diblokir, atau belum login | Login dulu di tab terpisah. Untuk TV wall gunakan akses anonymous Viewer. Pastikan `SameSite=None` + HTTPS. |
| Panel kosong padahal dashboard dibuka lewat HTTPS | Mixed content: iframe `http://` dimuat dari halaman `https://` | Pakai URL `https://` untuk Grafana dan Kibana. |
| Time range tidak berubah | Link Grafana memakai **Lock time range**, atau Datadog memakai public dashboard | Buat ulang link tanpa lock (2.2). Untuk Datadog gunakan `/graph/embed` (4.2). |
| Panel Grafana tidak mengikuti environment | Dashboard tidak punya variabel `env` | Tambahkan variabel `env` di Grafana (2.4). |
| Panel Datadog menampilkan "invalid token" | Token embed dicabut atau salah salin | Generate ulang URL di Datadog (4.2). |
| Panel hilang setelah ganti browser | Data tersimpan di `localStorage` | Gunakan **Export JSON** lalu **Import JSON**. |

Tip: gunakan mode **Simulated** untuk menyiapkan layout dan ukuran panel tanpa akses VPN, lalu pindah ke **Live** setelah URL siap.
