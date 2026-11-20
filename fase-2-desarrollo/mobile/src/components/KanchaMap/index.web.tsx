import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import maplibregl, { type Map as MlMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { MAP_STYLE_URL } from '@/theme/geo';
import { iconSvg } from '@/components/icons/paths';
import { COMUNA } from '@/lib/places';
import type { KanchaMapProps, MapMatch, MapVenue } from './types';

export * from './types';

/**
 * Mapa web con MapLibre GL y teselas oscuras sin API key (DESIGN.md §4.1).
 * Los pines son HTML: círculo naranja con el ícono del deporte y, colgando,
 * cuántos jugadores faltan ("−1"). El seleccionado crece.
 */

const STYLE_ID = 'kancha-map-css';
const CSS = `
.kancha-pin{position:relative;width:38px;height:38px;border-radius:50%;padding:0;cursor:pointer;
  background:${colors.accent};border:2px solid ${colors.background};display:flex;align-items:center;justify-content:center;
  transition:transform .16s ease-out}
.kancha-pin:focus-visible{outline:2px solid ${colors.text};outline-offset:3px}
.kancha-pin[data-selected="true"]{transform:scale(1.3)}
.kancha-pin__gap{position:absolute;top:-8px;right:-10px;min-width:24px;height:20px;padding:0 5px;border-radius:10px;
  background:${colors.background};border:1px solid ${colors.accent};color:${colors.text};
  font-family:${fonts.bold},sans-serif;font-size:12px;line-height:18px;text-align:center;box-sizing:border-box}
.kancha-venue{position:relative;width:32px;height:32px;border-radius:50%;padding:0;cursor:pointer;
  background:${colors.surface};border:2px solid ${colors.accent};display:flex;align-items:center;justify-content:center;
  transition:transform .16s ease-out}
.kancha-venue[data-selected="true"]{background:${colors.accent};transform:scale(1.3)}
.kancha-venue:focus-visible{outline:2px solid ${colors.text};outline-offset:3px}
.kancha-venue__fee{position:absolute;top:-7px;right:-8px;width:18px;height:18px;border-radius:9px;box-sizing:border-box;
  background:${colors.accent};border:1.5px solid ${colors.background};color:${colors.onAccent};
  font-family:${fonts.bold},sans-serif;font-size:11px;line-height:15px;text-align:center}
.kancha-me{width:14px;height:14px;border-radius:50%;background:${colors.text};border:3px solid ${colors.background};
  box-shadow:0 0 0 7px ${colors.hairline}}
.kancha-pick{width:44px;height:44px;display:flex;align-items:flex-start;justify-content:center}
.kancha-map .maplibregl-ctrl-attrib{background:${colors.scrim};color:${colors.textMuted}}
.kancha-map .maplibregl-ctrl-attrib a{color:${colors.textMuted}}
.kancha-map .maplibregl-ctrl-attrib-button{filter:invert(1)}
@media (prefers-reduced-motion: reduce){.kancha-pin,.kancha-venue{transition:none}}
`;

function ensureCss() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * MapLibre posiciona el elemento raíz del marcador con transform y position
 * absolute; por eso el pin visible va en un hijo, que es el que crece al
 * seleccionarse sin pisar la posición del marcador.
 */
function pinElement(m: MapMatch): HTMLDivElement {
  const root = document.createElement('div');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'kancha-pin';
  btn.innerHTML = `${iconSvg(m.sport, colors.onAccent, 20, 2)}<span class="kancha-pin__gap"></span>`;
  root.appendChild(btn);
  updatePin(root, m, false);
  return root;
}

function updatePin(root: HTMLElement, m: MapMatch, selected: boolean) {
  const btn = root.firstElementChild as HTMLElement | null;
  if (!btn) return;
  btn.dataset['selected'] = String(selected);
  root.style.zIndex = selected ? '3' : '1';
  btn.setAttribute('aria-label', `Partido con ${m.slotsLeft} ${m.slotsLeft === 1 ? 'cupo libre' : 'cupos libres'}`);
  btn.setAttribute('aria-pressed', String(selected));
  const gap = btn.querySelector('.kancha-pin__gap');
  if (gap) gap.textContent = `\u2212${m.slotsLeft}`;
}

/** Pin de cancha (Publicar): ícono del deporte y "$" si se arrienda. Elegida, se rellena de amarillo. */
function venueElement(): HTMLDivElement {
  const root = document.createElement('div');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'kancha-venue';
  root.appendChild(btn);
  return root;
}

function updateVenue(root: HTMLElement, v: MapVenue, selected: boolean) {
  const btn = root.firstElementChild as HTMLElement | null;
  if (!btn) return;
  btn.dataset['selected'] = String(selected);
  root.style.zIndex = selected ? '3' : '1';
  btn.innerHTML =
    iconSvg(v.sport ?? 'pin', selected ? colors.onAccent : colors.accent, 16, 2) +
    (v.paid ? '<span class="kancha-venue__fee" aria-hidden="true">$</span>' : '');
  btn.setAttribute('aria-label', `${v.name}, ${v.paid ? 'se arrienda' : 'abierta al público'}`);
  btn.setAttribute('aria-pressed', String(selected));
}

export default function KanchaMap({
  center,
  zoom = 12.5,
  matches = [],
  venues = [],
  selectedId = null,
  onSelect,
  userLocation = null,
  picked = null,
  onPick,
  style,
  bottomInset = 0,
}: KanchaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLElement; data: MapMatch }>());
  const venueMarkers = useRef(new Map<string, { marker: Marker; el: HTMLElement; data: MapVenue }>());
  const meMarker = useRef<Marker | null>(null);
  const pickMarker = useRef<Marker | null>(null);
  const handlers = useRef({ onSelect, onPick });
  handlers.current = { onSelect, onPick };

  // Crear el mapa una sola vez.
  useEffect(() => {
    ensureCss();
    const container = containerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE_URL,
      center: [center.lng, center.lat],
      zoom,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    map.on('click', (e) => {
      if (handlers.current.onPick) handlers.current.onPick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      else handlers.current.onSelect?.(null);
    });

    map.on('load', () => {
      // El piloto es La Florida: se dibuja su límite real, no un círculo.
      map.addSource('comuna', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [COMUNA] } },
      });
      map.addLayer({ id: 'comuna-fill', type: 'fill', source: 'comuna', paint: { 'fill-color': colors.radiusFill } });
      map.addLayer({
        id: 'comuna-line',
        type: 'line',
        source: 'comuna',
        paint: { 'line-color': colors.accent, 'line-opacity': 0.85, 'line-width': 2 },
      });
    });

    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container);

    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      markers.current.clear();
      venueMarkers.current.clear();
    };
  }, []);

  // Mover la cámara cuando cambia el centro o el zoom.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const opts = { center: [center.lng, center.lat] as [number, number], zoom, padding: { top: 0, bottom: bottomInset, left: 0, right: 0 } };
    if (reducedMotion()) map.jumpTo(opts);
    else map.easeTo({ ...opts, duration: 600 });
    // bottomInset no está en las dependencias: abrir o cerrar el panel no debe devolver la cámara al origen.
  }, [center.lat, center.lng, zoom]);

  // Sincronizar pines con los partidos.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const current = markers.current;
    const ids = new Set(matches.map((m) => m.id));

    for (const [id, entry] of current) {
      if (!ids.has(id)) {
        entry.marker.remove();
        current.delete(id);
      }
    }
    for (const m of matches) {
      const existing = current.get(m.id);
      if (existing) {
        existing.data = m;
        updatePin(existing.el, m, m.id === selectedId);
        existing.marker.setLngLat([m.lng, m.lat]);
        continue;
      }
      const el = pinElement(m);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.current.onSelect?.(m.id);
      });
      const marker = new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
      current.set(m.id, { marker, el, data: m });
      updatePin(el, m, m.id === selectedId);
    }
  }, [matches, selectedId]);

  // Pines de canchas (Publicar): se rehacen cuando cambia la lista, por ejemplo al elegir otro deporte.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const entry of venueMarkers.current.values()) entry.marker.remove();
    venueMarkers.current.clear();
    for (const v of venues) {
      const el = venueElement();
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.current.onSelect?.(v.id);
      });
      const marker = new maplibregl.Marker({ element: el }).setLngLat([v.lng, v.lat]).addTo(map);
      venueMarkers.current.set(v.id, { marker, el, data: v });
    }
  }, [venues]);

  useEffect(() => {
    for (const [id, entry] of venueMarkers.current) updateVenue(entry.el, entry.data, id === selectedId);
  }, [venues, selectedId]);

  // Si el partido elegido quedó fuera de la vista, se lleva al centro.
  useEffect(() => {
    const map = mapRef.current;
    const entry = selectedId ? markers.current.get(selectedId) : undefined;
    if (!map || !entry) return;
    const { lng, lat } = entry.data;
    const point = map.project([lng, lat]);
    const { clientWidth: w, clientHeight: h } = map.getContainer();
    const visible = point.x > 40 && point.x < w - 40 && point.y > 80 && point.y < h - bottomInset - 40;
    if (!visible) map.easeTo({ center: [lng, lat], padding: { top: 0, bottom: bottomInset, left: 0, right: 0 }, duration: reducedMotion() ? 0 : 500 });
  }, [selectedId, bottomInset]);

  // Ubicación del usuario.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      meMarker.current?.remove();
      meMarker.current = null;
      return;
    }
    if (!meMarker.current) {
      const el = document.createElement('div');
      el.className = 'kancha-me';
      el.setAttribute('aria-label', 'Tu ubicación');
      meMarker.current = new maplibregl.Marker({ element: el });
    }
    meMarker.current.setLngLat([userLocation.lng, userLocation.lat]).addTo(map);
  }, [userLocation?.lat, userLocation?.lng]);

  // Punto elegido al publicar.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!picked) {
      pickMarker.current?.remove();
      pickMarker.current = null;
      return;
    }
    if (!pickMarker.current) {
      const el = document.createElement('div');
      el.className = 'kancha-pick';
      el.innerHTML = iconSvg('pin', colors.accent, 44, 2);
      pickMarker.current = new maplibregl.Marker({ element: el, anchor: 'bottom' });
    }
    pickMarker.current.setLngLat([picked.lng, picked.lat]).addTo(map);
  }, [picked?.lat, picked?.lng]);

  return (
    <View style={[s.wrap, style]}>
      <div ref={containerRef} className="kancha-map" style={{ position: 'absolute', inset: 0 }} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
});
