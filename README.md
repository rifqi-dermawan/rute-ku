# RuteKu — Platform Pemesanan Tiket Bus Antarkota

Platform pemesanan tiket bus antarkota modern dengan sistem penahanan kursi bersyarat (*atomic conditional seat hold*), pencegahan *double booking*, integrasi pembayaran QRIS Midtrans Sandbox, serta mekanisme pembatalan dan *refund* otomatis berbasis kebijakan waktu.

---

## Sumber Data

Aplikasi RuteKu mengintegrasikan beberapa sumber data terbuka dengan rincian operasional berikut:
1. **API Wilayah Indonesia**: Digunakan sebagai basis data administratif resmi untuk sinkronisasi nama-nama provinsi, kabupaten, dan kota di wilayah Republik Indonesia.
2. **OSRM (Open Source Routing Machine) & OpenStreetMap**: Digunakan untuk komputasi jarak (*distance in km*) dan waktu tempuh rute darat **antar pusat kota hub (hitungan rute mobil standar OSRM driving profile)**, bukan antar terminal bus fisik. Durasi perjalanan kemudian disesuaikan dengan faktor penyesuaian operasional bus antarkota (`BUS_DURATION_FACTOR = 1.3`).
3. **OpenStreetMap & Leaflet**: Digunakan untuk visualisasi peta rute interaktif antarkota. Perlu dicatat bahwa titik koordinat terminal adalah **PERKIRAAN** (`coords_verified = false`, sementara memakai titik koordinat pusat kota), bukan hasil verifikasi OpenStreetMap langsung di lapangan.

> [!NOTE]
> **Pemberitahuan Data Simulasi:**
> - Seluruh jadwal keberangkatan bus, tarif/harga tiket, operator bus, armada bus, dan ketersediaan kursi di platform ini adalah **data simulasi** yang dibuat untuk keperluan pengujian dan demonstrasi teknis sistem.
> - Durasi perjalanan yang ditampilkan adalah **estimasi** waktu tempuh yang dihitung menggunakan mesin rute OSRM dengan penyesuaian faktor operasional bus antarkota (`BUS_DURATION_FACTOR = 1.3`).

---

## Referensi

Pola arsitektur, diagram alur pemesanan, dan desain interaksi dalam proyek ini terinspirasi dari beberapa referensi sumber terbuka (hanya dipelajari untuk analisis pola desain dan arsitektur, **bukan penyalinan kode**):
- **skybus**: File `LICENSE` menyatakan lisensi **GPL-3.0**, sedangkan badge pada `README` menyebutkan **MIT** (terdapat inkonsistensi/kontradiksi lisensi). Repositori ini dipelajari murni untuk memahami pola penanganan pemesanan tiket tanpa ada baris kode yang disalin.
- **WarTicket**: Tidak memiliki berkas `LICENSE` di repositorinya, meskipun badge `README` mencantumkan **MIT**. Dipelajari hanya sebagai referensi pola alur reservasi tanpa menyalin kode sumber.

---

## Fitur Inti Tahap 6–8

1. **Penahanan Kursi Atomik (Anti-Double-Booking)**:
   - Durasi tahan kursi standar 10 menit (`HOLD_DURATION_MINUTES = 10`).
   - Eksekusi atomik bersyarat dalam satu kueri SQL `UPDATE` mematuhi PostgreSQL `CHECK` constraint pada `schedule_seats`.
   - Mengembalikan respon HTTP `409 Conflict` berserta saran kursi alternatif yang masih tersedia jika kursi telah direbut orang lain.
2. **Model Tamu (Guest Model Tanpa Login Paksa)**:
   - Identifikasi sesi penahanan kursi menggunakan `hold_token` di dalam cookie `httpOnly`.
   - Bukti kepemilikan transaksi dan tiket menggunakan `public_token` (UUID) unik.
3. **Pembayaran QRIS Midtrans Sandbox**:
   - Nominal pembayaran diambil secara ketat dari `grand_total` pada database (bukan dari input mentah pengguna).
   - Masa berlaku tahan kursi diperpanjang secara otomatis mengikuti waktu kedaluwarsa QRIS Midtrans.
   - Proteksi klik ganda (*double-click shield*) mencegah duplikasi pembayaran aktif untuk pesanan yang sama.
4. **Pusat Sinkronisasi Status (`applyPaymentStatus`)**:
   - Satu-satunya gerbang perubahan status pesanan dan pembayaran (idempoten dan aman terhadap race condition via baris `payments` terkunci `FOR UPDATE`).
   - Audit trail lengkap ke tabel `payment_events`.
   - Validasi ketat signature SHA-512 Midtrans dan verifikasi kesesuaian nominal `gross_amount`.
5. **Kebijakan Pembatalan & Refund (`lib/refund-policy.ts`)**:
   - $\ge 24$ jam sebelum keberangkatan: Pengembalian 75% harga tiket.
   - 6 jam s.d. $< 24$ jam sebelum keberangkatan: Pengembalian 50% harga tiket.
   - $< 6$ jam sebelum keberangkatan: Pembatalan ditolak (0% refund).
   - Pembatalan oleh operator / pembayaran ganda: Pengembalian 100% harga tiket.
   - Pengembalian hanya dihitung dari `ticket_total` (biaya layanan tidak dikembalikan) dan dibulatkan ke bawah (*floor*).
6. **Invoice Publik Terproteksi**:
   - Hanya dapat diakses untuk booking dengan status `CONFIRMED`.
   - Nama penumpang disamarkan (*masked*) untuk perlindungan data pribadi.

---

## Fitur Tahap Opsional 9–10

1. **Peta Interaktif Leaflet (`components/RouteMap.tsx`)**:
   - Dijalankan secara *client-only* (`next/dynamic` dengan `ssr: false`) khusus pada halaman detail jadwal (`/schedules/[id]`).
   - Menampilkan dua marker: terminal asal dan terminal tujuan. Jika titik koordinat terminal belum terverifikasi (`coordsVerified = false`), sistem secara otomatis menggunakan titik koordinat kota asal/tujuan.
   - Menghubungkan titik asal dan tujuan dengan garis lurus (*dashed polyline*).
   - Tile diambil dari `NEXT_PUBLIC_MAP_TILE_URL` (bawaan: OpenStreetMap) dengan atribusi resmi `"© OpenStreetMap contributors"`, tanpa prefetch tile berulang, serta perbaikan ikon marker Leaflet untuk Next.js bundler.
2. **Ekspor GTFS Feed (`scripts/export-gtfs.mjs`)**:
   - Menghasilkan arsip `exports/gtfs.zip` yang memuat 6 file standar:
     - `agency.txt` (operator bus simulasi)
     - `stops.txt` (terminal dengan fallback koordinat kota)
     - `routes.txt` (`route_type = 3` / Bus antarkota)
     - `trips.txt` (jadwal perjalanan aktif)
     - `stop_times.txt` (waktu lokal `Asia/Jakarta`)
     - `calendar_dates.txt` (penjadwalan tanggal layanan)
   - Dihasilkan murni dari database internal tanpa tombol di UI dan tanpa menyalin data pihak ketiga. Direktori `exports/` telah diabaikan dalam `.gitignore`.
   - Dapat dijalankan via CLI: `npm run export-gtfs`.

---

## Menjalankan di Lokal

### 1. Salin Konfigurasi Environment

Salin file template `.env.example` ke `.env.local`:

```bash
cp .env.example .env.local
```

### 2. Daftar Variabel Environment

Berikut adalah daftar variabel lingkungan yang dibutuhkan (nama saja) beserta fungsinya:

| Nama Variabel | Penjelasan |
| :--- | :--- |
| `DATABASE_URL` | Connection string **pooled** (pgbouncer / connection pooling) untuk runtime aplikasi. |
| `DATABASE_URL_UNPOOLED` | Connection string **direct** (unpooled, port 5432) khusus untuk eksekusi migrasi DDL Prisma. |
| `MIDTRANS_SERVER_KEY` | Server Key Midtrans Sandbox untuk memproses charge dan verifikasi webhook. |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Client Key Midtrans Sandbox yang dibaca browser untuk integrasi frontend / Snap modal. |
| `OSRM_CONTACT_EMAIL` | Email kontak wajib untuk header User-Agent saat menghitung rute via API OSRM publik. |
| `ORS_API_KEY` | API Key OpenRouteService opsional sebagai fallback jika OSRM mengalami kendala. |
| `NEXT_PUBLIC_MAP_TILE_URL` | URL tile layer peta Leaflet (bawaan: OpenStreetMap). |
| `NEXT_PUBLIC_APP_URL` | URL root aplikasi web (contoh: `http://localhost:3000`). |
| `RESEND_API_KEY` | API Key Resend untuk pengiriman e-tiket ke email penumpang. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID Google OAuth 2.0 untuk login Google. |
| `GOOGLE_CLIENT_SECRET` | Client Secret Google OAuth 2.0. |

### 3. Langkah Instalasi & Seed Data

Jalankan perintah-perintah berikut secara berurutan sesuai konfigurasi script di `package.json`:

```bash
# 1. Instal seluruh dependensi proyek
npm install

# 2. Terapkan seluruh migrasi skema Prisma ke database branch dev
npx prisma migrate deploy

# 3. Generate Prisma Client (dengan driver adapter Neon)
npx prisma generate

# 4. (Opsional) Unduh data master wilayah kabupaten/kota jika ingin memperbarui snapshot
node scripts/fetch-wilayah.mjs

# 5. Hitung jarak & durasi OSRM untuk menghasilkan data/routes.json (butuh OSRM_CONTACT_EMAIL)
# Catatan: Wajib dijalankan sebelum seed jika data/routes.json belum tersedia di lokal.
# Karena snapshot sudah ada di repo, langkah ini opsional untuk setup cepat.
node --env-file=.env.local scripts/compute-routes.mjs

# 6. Jalankan seeding database (membaca snapshot lokal: data/wilayah, data/terminals.json, data/routes.json)
npx prisma db seed

# 7. Ekspor data feed GTFS (sesuai script package.json)
npm run export-gtfs

# 8. Jalankan server pengembangan Next.js
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) pada peramban Anda.

---

## Pembayaran Sandbox

Aplikasi ini terintegrasi dengan **QRIS Midtrans Sandbox** untuk memfasilitasi transaksi non-tunai secara aman selama tahap pengujian:

1. **Cara Pembayaran**: Lakukan simulasi pembayaran **HANYA** melalui [Midtrans QRIS Simulator v2](https://simulator.sandbox.midtrans.com/v2/qris/index) (untuk akun Sandbox Midtrans versi lama, gunakan [/qris/index](https://simulator.sandbox.midtrans.com/qris/index)).
   - **Yang Dimasukkan ke Simulator**: Masukkan **URL gambar QR** (bukan kode booking ataupun nomor transaksi). URL gambar QR dapat disalin dengan klik kanan pada gambar QR Code di halaman pembayaran $\rightarrow$ *Copy Image Address* / *Salin Alamat Gambar*, lalu tempel (*paste*) ke kolom input simulator dan klik **Pay**.
2. **Peringatan Pemindaian E-Wallet**: **JANGAN** memindai QR Code sandbox menggunakan aplikasi e-wallet asli (seperti GoPay, OVO, DANA, ShopeePay) ataupun aplikasi mobile banking nyata (BCA Mobile, Livin', dll.). QR Code di lingkungan sandbox Midtrans ini merupakan payload simulasi uji coba dan tidak terdaftar di switching pembayaran nasional (*National Merchant Repository* / NMID riil), sehingga memindainya dengan aplikasi finansial riil akan menghasilkan pesan galat (*QR code tidak valid / merchant tidak ditemukan*) atau transaksi gagal. Simulasi pembayaran sukses hanya dapat dilakukan melalui tautan web simulator Midtrans di atas.
3. **Kebutuhan Webhook**: Notifikasi webhook HTTP POST dari server Midtrans membutuhkan URL publik yang dapat diakses dari internet.
   - Untuk pengujian di lokal, gunakan tunneling seperti **ngrok** (`ngrok http 3000`) atau gunakan URL deployment Vercel.
   - Daftarkan URL `https://<domain-publik>/api/payment/midtrans/webhook` pada menu *Payment Notification URL* di Dashboard Sandbox Midtrans.
4. **Pusat Sinkronisasi Status**: Seluruh perubahan status transaksi dikunci dan dijaga secara ketat di fungsi `applyPaymentStatus` (dengan transaksi row-level lock `SELECT ... FOR UPDATE` dan pencatatan audit log ke `payment_events`) untuk mencegah kondisi balapan (*race condition*) antara webhook dan polling client.

---

## Deploy ke Production

1. **Arsitektur Database Neon PostgreSQL**:
   - Gunakan branch `dev` untuk pengembangan lokal, seeding, dan pengujian.
   - Gunakan branch `production` khusus untuk database live yang terhubung dengan Vercel.
2. **Environment Variables di Vercel**:
   - Daftarkan seluruh variabel lingkungan dari `.env.example` ke dashboard Vercel (**Project Settings** $\rightarrow$ **Environment Variables**).
   - Pastikan variabel `DATABASE_URL` di Vercel mengarah ke connection string **pooled** dari branch `production` Neon.
3. **Migrasi Skema ke Production**:
   - Untuk menjaga stabilitas sistem dan menghindari eksekusi DDL yang tidak terkontrol dari proses build otomatis Vercel, eksekusi migrasi ke branch production dijalankan secara **manual dari mesin lokal** menggunakan connection string unpooled:
     - **Bash / Linux / macOS**:
       ```bash
       DATABASE_URL_UNPOOLED="<CONNECTION_STRING_PRODUCTION_UNPOOLED>" npx prisma migrate deploy
       ```
     - **PowerShell (Windows)**:
       ```powershell
       $env:DATABASE_URL_UNPOOLED="<CONNECTION_STRING_PRODUCTION_UNPOOLED>"; npx prisma migrate deploy
       ```
4. **Seeding Database Production (Murni dari Snapshot Repo)**:
   - Seeding ke branch production membaca file snapshot statis yang sudah ada di repositori (`data/wilayah/kabupaten_kota.json`, `data/terminals.json`, `data/routes.json`), tanpa melakukan HTTP request ke API wilayah luar atau OSRM:
     - **Bash / Linux / macOS**:
       ```bash
       DATABASE_URL_UNPOOLED="<CONNECTION_STRING_PRODUCTION_UNPOOLED>" npx prisma db seed
       ```
     - **PowerShell (Windows)**:
       ```powershell
       $env:DATABASE_URL_UNPOOLED="<CONNECTION_STRING_PRODUCTION_UNPOOLED>"; npx prisma db seed
       ```
