import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchTrackingData } from '../../api/api';

const TECH_PIN_COLORS = ['#1d4ed8', '#059669', '#dc2626', '#7c3aed', '#ea580c', '#0f766e'];

const getNameHash = (value = '') => value.split('').reduce((total, char) => total + char.charCodeAt(0), 0);

const getTechInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'T';

const createTechIcon = (name = '') => {
  const color = TECH_PIN_COLORS[getNameHash(name) % TECH_PIN_COLORS.length];
  const initials = getTechInitials(name);

  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:${color};color:#fff;border:3px solid #fff;box-shadow:0 8px 18px rgba(15,23,42,0.24);font-size:12px;font-weight:700;">
        ${initials}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
};

const ticketIcon = L.divIcon({
  className: '',
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:9999px;background:#111827;border:3px solid #fbbf24;box-shadow:0 6px 14px rgba(15,23,42,0.22);"></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10]
});

export default function AdminTechnicianTracking() {
  const philippinesCenter = [12.8797, 121.774];
  const [trackData, setTrackData] = useState({ techMarkers: [], ticketMarkers: [] });
  const [filterStatus, setFilterStatus] = useState('all');
  const [mapInstance, setMapInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [focusedTarget, setFocusedTarget] = useState(null);

  useEffect(() => {
    const loadTrackingData = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchTrackingData();
        setTrackData(data);
      } catch (loadError) {
        setTrackData({ techMarkers: [], ticketMarkers: [] });
        setError('Live tracking data is unavailable. Please check the backend /tracking endpoint.');
      } finally {
        setLoading(false);
      }
    };

    loadTrackingData();
  }, []);

  const filteredTechs = trackData.techMarkers.filter(
    (tech) => filterStatus === 'all' || tech.status === filterStatus
  );
  const openTickets = trackData.ticketMarkers.filter((ticket) => ticket.status !== 'completed');
  const hasCoords = (target) => Number.isFinite(target?.lat) && Number.isFinite(target?.lng);
  const techsWithCoords = filteredTechs.filter((tech) => Number.isFinite(tech.lat) && Number.isFinite(tech.lng));
  const ticketsWithCoords = openTickets.filter((ticket) => Number.isFinite(ticket.lat) && Number.isFinite(ticket.lng));
  const techsWithoutCoords = filteredTechs.length - techsWithCoords.length;
  const ticketsWithoutCoords = openTickets.length - ticketsWithCoords.length;
  const mapPoints = [
    ...techsWithCoords.map((tech) => [tech.lat, tech.lng]),
    ...ticketsWithCoords.map((ticket) => [ticket.lat, ticket.lng])
  ];

  useEffect(() => {
    if (!mapInstance) return;

    const philippinesBounds = L.latLngBounds([4.5, 116.0], [21.5, 127.5]);

    mapInstance.setMaxBounds(philippinesBounds);
    mapInstance.setMinZoom(5);

    if (focusedTarget) {
      return;
    }

    if (mapPoints.length > 0) {
      const boundedPoints = mapPoints.filter(([lat, lng]) => philippinesBounds.contains([lat, lng]));

      if (boundedPoints.length > 1) {
        mapInstance.fitBounds(L.latLngBounds(boundedPoints), { padding: [32, 32] });
        return;
      }

      if (boundedPoints.length === 1) {
        mapInstance.setView(boundedPoints[0], 12);
        return;
      }
    }

    mapInstance.setView(philippinesCenter, 6);
  }, [mapInstance, mapPoints, focusedTarget]);

  const focusLocation = (target) => {
    if (!target || !Number.isFinite(target.lat) || !Number.isFinite(target.lng) || !mapInstance) {
      return;
    }

    setFocusedTarget(target);
    mapInstance.flyTo([target.lat, target.lng], target.zoom || 16, { duration: 1.2 });
  };

  const clearFocus = () => {
    setFocusedTarget(null);
    if (!mapInstance) return;

    if (mapPoints.length > 1) {
      mapInstance.fitBounds(L.latLngBounds(mapPoints), { padding: [32, 32] });
    } else if (mapPoints.length === 1) {
      mapInstance.setView(mapPoints[0], 12);
    } else {
      mapInstance.setView(philippinesCenter, 6);
    }
  };

  return (
    <Layout>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row">
        <h2 className="flex-1 text-2xl font-semibold text-slate-800">Technician Tracking</h2>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            disabled={loading}
            className="rounded-lg border px-4 py-2"
          >
            <option value="all">All Technicians</option>
            <option value="available">Available</option>
            <option value="on_job">On Job</option>
            <option value="offline">Offline</option>
          </select>
          {focusedTarget && (
            <button
              onClick={clearFocus}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Show all visible markers
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
        <div className="font-medium text-slate-900">How these controls work</div>
        <div className="mt-1">
          `Center map here` only pans and zooms the current map. It does not open a new page. Buttons switch to an
          unavailable state until live latitude and longitude are available from tracking data.
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {techsWithoutCoords > 0 ? `${techsWithoutCoords} technician${techsWithoutCoords === 1 ? '' : 's'} waiting for GPS updates. ` : ''}
          {ticketsWithoutCoords > 0 ? `${ticketsWithoutCoords} ticket${ticketsWithoutCoords === 1 ? '' : 's'} missing map coordinates.` : ''}
          {techsWithoutCoords === 0 && ticketsWithoutCoords === 0 ? 'All visible records currently have usable map coordinates.' : ''}
        </div>
      </div>

      {loading && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Loading live tracking data...
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {focusedTarget && (
        <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          Map centered on {focusedTarget.kind === 'tech' ? 'technician' : 'ticket'}:{' '}
          <strong>{focusedTarget.label}</strong>
        </div>
      )}

      <div className="relative h-[70vh] overflow-hidden rounded-xl shadow-lg">
        <MapContainer
          center={philippinesCenter}
          zoom={6}
          scrollWheelZoom={true}
          className="h-full w-full"
          whenCreated={(instance) => setMapInstance(instance)}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {techsWithCoords.map((tech) => (
            <Marker key={`tech-${tech.id}`} position={[tech.lat, tech.lng]} icon={createTechIcon(tech.name)}>
              <Popup>
                <div className="text-sm">
                  <strong>{tech.name}</strong>
                  <br />
                  Status: {tech.status}
                  <br />
                  Coordinates: {tech.lat.toFixed(6)}, {tech.lng.toFixed(6)}
                </div>
              </Popup>
            </Marker>
          ))}

          {ticketsWithCoords.map((ticket) => (
            <Marker key={`ticket-${ticket.id}`} position={[ticket.lat, ticket.lng]} icon={ticketIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>Ticket #{ticket.id}</strong>
                  <br />
                  {ticket.client} / {ticket.service}
                  <br />
                  {ticket.locationDesc || 'No landmark provided'}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div className="absolute left-4 top-4 rounded-xl border bg-white/90 p-4 shadow-lg backdrop-blur">
          <div className="font-medium text-slate-900">Live tracking</div>
          <div className="text-sm text-slate-600">
            {filteredTechs.length}/{trackData.techMarkers.length} technicians visible
          </div>
          <div className="text-sm text-slate-600">{techsWithCoords.length + ticketsWithCoords.length} map markers loaded</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold">Technicians</h3>
          {filteredTechs.length ? (
            <ul className="space-y-2 text-sm">
              {filteredTechs.map((tech) => {
                const isFocused = focusedTarget?.kind === 'tech' && focusedTarget.id === tech.id;
                const techHasCoords = hasCoords(tech);
                return (
                  <li
                    key={tech.id}
                    className={`rounded border p-3 ${isFocused ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200'}`}
                  >
                    <div className="font-medium">{tech.name}</div>
                    <div>Status: {tech.status}</div>
                    <div>
                      Lat/Lng: {Number.isFinite(tech.lat) ? tech.lat.toFixed(6) : 'N/A'},{' '}
                      {Number.isFinite(tech.lng) ? tech.lng.toFixed(6) : 'N/A'}
                    </div>
                    <div className={`mt-1 text-xs ${techHasCoords ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {techHasCoords ? 'Live coordinates ready for map centering.' : 'Waiting for live GPS coordinates before this can be centered on the map.'}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() =>
                          focusLocation({
                            kind: 'tech',
                            id: tech.id,
                            label: tech.name,
                            lat: tech.lat,
                            lng: tech.lng,
                            zoom: 16
                          })
                        }
                        disabled={!techHasCoords}
                        title={techHasCoords ? `Center the map on ${tech.name}` : `${tech.name} has no live coordinates yet`}
                        className={`rounded px-3 py-1.5 text-white ${
                          isFocused ? 'bg-blue-800' : 'bg-blue-600'
                        } disabled:cursor-not-allowed disabled:bg-slate-300`}
                      >
                        {techHasCoords ? (isFocused ? 'Centered on map' : 'Center map here') : 'Coordinates unavailable'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No technicians found with the selected status.</p>
          )}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold">Open Tickets (with location info)</h3>
          {openTickets.length ? (
            <ul className="space-y-2 text-sm">
              {openTickets.map((ticket) => {
                const isFocused = focusedTarget?.kind === 'ticket' && focusedTarget.id === ticket.id;
                const ticketHasCoords = hasCoords(ticket);
                return (
                  <li
                    key={ticket.id}
                    className={`rounded border p-3 ${isFocused ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300' : 'border-slate-200'}`}
                  >
                    <div className="font-medium">
                      Ticket #{ticket.id}: {ticket.client} / {ticket.service}
                    </div>
                    <div>
                      Lat/Lng: {Number.isFinite(ticket.lat) ? ticket.lat.toFixed(6) : 'N/A'},{' '}
                      {Number.isFinite(ticket.lng) ? ticket.lng.toFixed(6) : 'N/A'}
                    </div>
                    <div>Landmark/Desc: {ticket.locationDesc || 'Not provided'}</div>
                    <div>Status: {ticket.status}</div>
                    <div className={`mt-1 text-xs ${ticketHasCoords ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {ticketHasCoords ? 'Ticket location is ready for map centering.' : 'This ticket is listed, but the map cannot center on it until coordinates are available.'}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() =>
                          focusLocation({
                            kind: 'ticket',
                            id: ticket.id,
                            label: `Ticket #${ticket.id}`,
                            lat: ticket.lat,
                            lng: ticket.lng,
                            zoom: 15
                          })
                        }
                        disabled={!ticketHasCoords}
                        title={ticketHasCoords ? `Center the map on ticket #${ticket.id}` : `Ticket #${ticket.id} has no coordinates yet`}
                        className={`rounded px-3 py-1.5 text-white ${
                          isFocused ? 'bg-indigo-800' : 'bg-indigo-600'
                        } disabled:cursor-not-allowed disabled:bg-slate-300`}
                      >
                        {ticketHasCoords ? (isFocused ? 'Centered on map' : 'Center map here') : 'Coordinates unavailable'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No active tickets to show.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
