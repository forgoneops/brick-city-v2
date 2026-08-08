import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { trpc } from '../lib/trpc.js';
import { EmptyState } from '../components/EmptyState.js';
import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';
import { useAuth } from '../lib/session.js';

// Fix for default Leaflet marker icon in Vite (ESM) — never use require() in browser code.
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
// @ts-expect-error — Leaflet merges onto L.Icon.Default.prototype
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

interface Pin {
  id: string;
  name: string;
  city: string;
  type: string;
  membersOnly: boolean;
  lat: number | null;
  lng: number | null;
  createdAt: string;
}

export function Map() {
  const { t } = useT();
  const { user } = useAuth();
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trpc.map.list.query().then((data) => {
      setPins(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const member = user?.role === 'admin' || user?.role === 'moderator' ||
    (user?.trialEndsAt && new Date(user.trialEndsAt) > new Date()) ||
    (user?.walletBalanceCents && user.walletBalanceCents > 0);

  return (
    <ModulePage
      title={t('nav_map')}
      icon="pin-folded"
      tag={`MAP / ${pins.length} PINS`}
    >
      {loading ? (
        <p className="label-mono text-smoke">LOADING...</p>
      ) : pins.length === 0 ? (
        <EmptyState note={t('map_no_pins')} />
      ) : (
        <div className="h-[60vh] w-full border border-fog bg-asphalt">
          <MapContainer
            center={[52.2297, 21.0122]}
            zoom={13}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {pins.map((pin) => {
              const isBlurred = pin.membersOnly && !member;
              return (
                <Marker
                  key={pin.id}
                  position={
                    isBlurred
                      ? [52.2297, 21.0122]
                      : [pin.lat ?? 52.2297, pin.lng ?? 21.0122]
                  }
                  opacity={isBlurred ? 0.4 : 1}
                >
                  <Popup>
                    {isBlurred ? (
                      <span className="label-mono text-signal">
                        MEMBERS ONLY
                      </span>
                    ) : (
                      <>
                        <strong className="font-display text-bone">
                          {pin.name}
                        </strong>
                        <br />
                        <span className="label-mono text-smoke">
                          {pin.city} / {pin.type}
                        </span>
                      </>
                    )}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      )}
    </ModulePage>
  );
}
