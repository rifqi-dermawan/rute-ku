'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapCoordinate {
  name: string
  terminalName?: string
  cityName: string
  lat: number
  lng: number
  isVerified: boolean
}

export interface RouteMapProps {
  origin: MapCoordinate
  destination: MapCoordinate
  distanceKm?: number
  durationFormatted?: string
}

export default function RouteMap({
  origin,
  destination,
  distanceKm,
  durationFormatted,
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    try {
      // 1. Perbaiki ikon marker bawaan Leaflet (mencegah broken icon di Next.js bundler)
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Bersihkan peta lama jika sudah ada (prevent double initialization)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      // Validasi koordinat numerik
      const originLat = Number(origin.lat)
      const originLng = Number(origin.lng)
      const destLat = Number(destination.lat)
      const destLng = Number(destination.lng)

      if (
        isNaN(originLat) ||
        isNaN(originLng) ||
        isNaN(destLat) ||
        isNaN(destLng)
      ) {
        throw new Error('Koordinat titik rute tidak valid.')
      }

      // 2. Inisialisasi Peta Leaflet
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
      })
      mapInstanceRef.current = map

      // 3. Tile Layer dari NEXT_PUBLIC_MAP_TILE_URL (bawaan OpenStreetMap)
      const tileUrl =
        process.env.NEXT_PUBLIC_MAP_TILE_URL ||
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

      L.tileLayer(tileUrl, {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        noWrap: true, // Tanpa prefetch tile berulang di luar batas dunia
      }).addTo(map)

      // 4. Buat Ikon Kustom untuk Terminal Asal dan Tujuan
      const originIcon = L.divIcon({
        className: 'custom-origin-marker',
        html: `
          <div style="
            background-color: #0B6E78;
            color: #ffffff;
            border-radius: 9999px;
            padding: 4px 10px;
            font-weight: 800;
            font-size: 11px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25);
            border: 2px solid #ffffff;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
            transform: translate(-50%, -100%);
          ">
            <span>🟢 Asal</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      const destIcon = L.divIcon({
        className: 'custom-dest-marker',
        html: `
          <div style="
            background-color: #E04F16;
            color: #ffffff;
            border-radius: 9999px;
            padding: 4px 10px;
            font-weight: 800;
            font-size: 11px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25);
            border: 2px solid #ffffff;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
            transform: translate(-50%, -100%);
          ">
            <span>🏁 Tujuan</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      // 5. Tambahkan Dua Marker (Asal & Tujuan)
      const originMarker = L.marker([originLat, originLng], { icon: originIcon }).addTo(map)
      originMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <strong style="color: #0B6E78; font-size: 13px;">Titik Keberangkatan</strong><br/>
          <b>${origin.terminalName || origin.name}</b><br/>
          <span style="color: #64748b;">${origin.cityName}</span><br/>
          <span style="display: inline-block; margin-top: 4px; font-size: 10px; color: ${
            origin.isVerified ? '#047857' : '#b45309'
          }; font-weight: 600;">
            ${origin.isVerified ? '✓ Koordinat Terminal Terverifikasi' : 'ℹ Memakai Koordinat Kota'}
          </span>
        </div>
      `)

      const destMarker = L.marker([destLat, destLng], { icon: destIcon }).addTo(map)
      destMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <strong style="color: #E04F16; font-size: 13px;">Titik Kedatangan</strong><br/>
          <b>${destination.terminalName || destination.name}</b><br/>
          <span style="color: #64748b;">${destination.cityName}</span><br/>
          <span style="display: inline-block; margin-top: 4px; font-size: 10px; color: ${
            destination.isVerified ? '#047857' : '#b45309'
          }; font-weight: 600;">
            ${destination.isVerified ? '✓ Koordinat Terminal Terverifikasi' : 'ℹ Memakai Koordinat Kota'}
          </span>
        </div>
      `)

      // 6. Garis Lurus (Polyline) antara Asal dan Tujuan
      const latlngs: [number, number][] = [
        [originLat, originLng],
        [destLat, destLng],
      ]
      const polyline = L.polyline(latlngs, {
        color: '#0B6E78',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '8, 8', // Garis putus-putus elegan
      }).addTo(map)

      // Fit bounds agar kedua titik dan garis terlihat utuh di layar
      map.fitBounds(polyline.getBounds(), {
        padding: [40, 40],
        maxZoom: 12,
      })
    } catch (err: any) {
      setLoadError(err?.message || 'Gagal memuat peta interaktif.')
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [origin, destination])

  if (loadError) {
    return (
      <div className="w-full p-8 rounded-2xl bg-surface border border-borderCol text-center">
        <p className="text-sm font-bold text-ink">Peta rute tidak dapat ditampilkan</p>
        <p className="text-xs text-muted mt-1">{loadError}</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      <div
        ref={mapContainerRef}
        className="w-full h-[280px] sm:h-[380px] rounded-2xl border border-borderCol overflow-hidden shadow-2xs z-0"
      />
      <div className="flex items-center justify-between text-[11px] text-muted px-1 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-ink">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0B6E78] inline-block" />
            {origin.terminalName || origin.name} ({origin.isVerified ? 'Terverifikasi' : 'Kota'})
          </span>
          <span>→</span>
          <span className="flex items-center gap-1 font-semibold text-ink">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E04F16] inline-block" />
            {destination.terminalName || destination.name} ({destination.isVerified ? 'Terverifikasi' : 'Kota'})
          </span>
        </div>
        {distanceKm && (
          <span className="font-mono font-medium">
            Jarak: {distanceKm} km {durationFormatted ? `· ${durationFormatted}` : ''}
          </span>
        )}
      </div>
    </div>
  )
}

