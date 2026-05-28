/**
 * Marketplace card hero for mobile-only practitioners.
 * Shows a real map with the practitioner's base and service radius circle
 * so clients can see at a glance whether they're likely in the service area.
 */
import { useEffect, useRef, useState } from 'react';
import { Car, MapPin } from 'lucide-react';

let L: any = null;

const loadLeaflet = async (): Promise<any> => {
  if (typeof window === 'undefined' || L) return L;
  try {
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const leaflet = await import('leaflet');
    L = leaflet.default;
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  } catch (e) {
    console.error('Leaflet load failed:', e);
  }
  return L;
};

interface MobileServiceAreaBlockProps {
  radiusKm: number;
  baseLatitude?: number | null;
  baseLongitude?: number | null;
  areaLabel?: string | null;
  className?: string;
}

export function MobileServiceAreaBlock({
  radiusKm,
  baseLatitude,
  baseLongitude,
  areaLabel,
  className = '',
}: MobileServiceAreaBlockProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const hasCoords = baseLatitude != null && baseLongitude != null;

  useEffect(() => {
    if (!hasCoords || !mapRef.current) {
      setMapReady(false);
      return;
    }

    let cancelled = false;
    setMapError(false);

    loadLeaflet().then((leaflet) => {
      if (!leaflet || !mapRef.current || cancelled) return;

      const lat = baseLatitude!;
      const lon = baseLongitude!;
      const radiusMeters = radiusKm * 1000;

      // Clear previous map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      mapRef.current.innerHTML = '';

      const container = mapRef.current;
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.minHeight = '160px';

      const map = new leaflet.Map(container, {
        center: [lat, lon],
        zoom: 10,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        dragging: true,
        tap: false,
      });

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OSM',
        maxZoom: 19,
      }).addTo(map);

      // Service area circle (client-friendly: "this is where they'll travel")
      leaflet.circle([lat, lon], {
        radius: radiusMeters,
        color: '#d97706',
        fillColor: '#f59e0b',
        fillOpacity: 0.25,
        weight: 2,
      }).addTo(map);

      // Practitioner base marker
      const baseMarker = leaflet.marker([lat, lon], {
        icon: leaflet.divIcon({
          className: 'mobile-service-base-marker',
          html: `<div style="
            width: 24px; height: 24px;
            background: #d97706;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(map);
      baseMarker.bindTooltip('Travels from here', { permanent: false, direction: 'top' });

      // Fit bounds so the circle is visible with a little padding
      const circle = leaflet.circle([lat, lon], { radius: radiusMeters });
      const bounds = circle.getBounds();
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 11 });

      mapInstanceRef.current = map;
      if (!cancelled) setMapReady(true);
    }).catch(() => {
      if (!cancelled) setMapError(true);
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [hasCoords, baseLatitude, baseLongitude, radiusKm]);

  // With coords: show map (or error fallback)
  if (hasCoords) {
    return (
      <div
        className={`relative w-full h-40 overflow-hidden rounded-t-xl bg-gray-100 ${className}`}
        aria-label={`Service area: travels to you within ${radiusKm} km${areaLabel ? ` of ${areaLabel}` : ''}`}
      >
        <div ref={mapRef} className="absolute inset-0 w-full h-full rounded-t-xl" />
        {mapError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-amber-50/95 p-3 text-center">
            <MapPin className="h-8 w-8 text-amber-600" aria-hidden />
            <span className="text-xs font-medium text-amber-900">Service area map unavailable</span>
            <span className="text-xs text-amber-800">Serves within {radiusKm} km</span>
          </div>
        )}
        {/* Caption overlay at bottom for clarity */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex flex-wrap items-center justify-center gap-1.5 text-white text-xs">
          <Car className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Travels to you</span>
          <span className="opacity-80">•</span>
          <span>Serves within {radiusKm} km</span>
          {areaLabel && <span className="opacity-90">({areaLabel})</span>}
        </div>
      </div>
    );
  }

  // No coords: friendly fallback (no fake map)
  return (
    <div
      className={`relative w-full h-40 overflow-hidden rounded-t-xl bg-gradient-to-br from-amber-50 to-orange-50 border-b border-amber-100/80 flex flex-col items-center justify-center gap-2 p-4 text-center ${className}`}
      aria-label={`Travels to you. Serves within ${radiusKm} km${areaLabel ? ` of ${areaLabel}` : ''}.`}
    >
      <MapPin className="h-10 w-10 text-amber-600" aria-hidden />
      <div className="flex flex-wrap items-center justify-center gap-1.5 text-sm font-medium text-amber-900">
        <Car className="h-4 w-4 shrink-0" aria-hidden />
        <span>Travels to you</span>
        <span className="text-amber-700">•</span>
        <span>Serves within {radiusKm} km</span>
      </div>
      {areaLabel && <p className="text-xs text-amber-800/90">{areaLabel}</p>}
      <p className="text-xs text-amber-700/80 max-w-[90%]">
        Enter your address when booking to check if you&apos;re in range
      </p>
    </div>
  );
}
