import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import zonesGeoJson from '../assets/data/zones.json';
import { useGridStore } from '../store/useGridStore';
import L from 'leaflet';

// Leaflet Icon Fix
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapEvents = () => {
    useMap();
    return null;
};

export const EllevioMap: React.FC = () => {
    const { zonesData, trackedZones, toggleTrackedZone } = useGridStore();
    const [geoData, setGeoData] = useState<any>(null);

    useEffect(() => {
        setGeoData(zonesGeoJson);
    }, []);

    const style = (feature: any) => {
        // The new GeoJSON uses 'zoneName' (e.g. SE-SE1, IT-NORD)
        // We map this to our store IDs (SE1, IT-N, etc.)
        const rawName = feature.properties.zoneName || feature.id; // Fallback

        // Remove Country Code prefix if present (SE-SE1 -> SE1)
        // But be careful: IT-NORD is not IT-N in our store maybe?
        // Let's assume store logic needs to adapt or we normalize here.

        let zoneId = rawName;
        if (rawName.startsWith('SE-')) zoneId = rawName.replace('SE-', '');
        if (rawName.startsWith('NO-')) zoneId = rawName.replace('NO-', '');
        if (rawName.startsWith('DK-')) zoneId = rawName.replace('DK-', '');

        // IT mapping (GeoJSON: IT-NORD, IT-CNOR, IT-CSUD, IT-SUD, IT-SICI, IT-SARD)
        // Store: IT-N, IT-CN, IT-CS, IT-S, IT-SIC, IT-SAR
        if (rawName === 'IT-NORD') zoneId = 'IT-N';
        if (rawName === 'IT-CNOR') zoneId = 'IT-CN';
        if (rawName === 'IT-CSUD') zoneId = 'IT-CS';
        if (rawName === 'IT-SUD') zoneId = 'IT-S';
        if (rawName === 'IT-SICI') zoneId = 'IT-SIC';
        if (rawName === 'IT-SARD') zoneId = 'IT-SAR';

        const zoneData = zonesData.find(z => z.id === zoneId);
        // Also check if tracked using the normalized ID
        const isTracked = trackedZones.includes(zoneId);

        const price = zoneData?.price || 0;

        // Color logic
        let fillColor = '#e2e8f0';
        if (zoneData) {
            if (price < 40) fillColor = '#a7f3d0';
            else if (price < 60) fillColor = '#fde047';
            else fillColor = '#fca5a5';
        }

        return {
            fillColor: fillColor,
            weight: isTracked ? 3 : 1,
            opacity: 1,
            color: isTracked ? '#2563eb' : '#94a3b8',
            dashArray: isTracked ? '' : '3',
            fillOpacity: isTracked ? 0.7 : 0.4
        };
    };

    const onEachFeature = (feature: any, layer: any) => {
        const rawName = feature.properties.zoneName || feature.id;

        // Apply same mapping for click handler
        let zoneId = rawName;
        if (rawName.startsWith('SE-')) zoneId = rawName.replace('SE-', '');
        if (rawName.startsWith('NO-')) zoneId = rawName.replace('NO-', '');
        if (rawName.startsWith('DK-')) zoneId = rawName.replace('DK-', '');
        if (rawName === 'IT-NORD') zoneId = 'IT-N';
        if (rawName === 'IT-CNOR') zoneId = 'IT-CN';
        if (rawName === 'IT-CSUD') zoneId = 'IT-CS';
        if (rawName === 'IT-SUD') zoneId = 'IT-S';
        if (rawName === 'IT-SICI') zoneId = 'IT-SIC';
        if (rawName === 'IT-SARD') zoneId = 'IT-SAR';

        layer.bindTooltip(feature.properties.zoneName || feature.properties.name, {
            permanent: false,
            direction: "center",
            className: "bg-transparent border-0 text-slate-800 font-bold shadow-none text-[10px]"
        });

        layer.on({
            click: () => {
                toggleTrackedZone(zoneId);
            },
            mouseover: (e: any) => {
                const l = e.target;
                l.setStyle({ fillOpacity: 0.8 });
                l.openTooltip();
            },
            mouseout: (e: any) => {
                const l = e.target;
                l.closeTooltip();
            }
        });
    };

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer
                center={[52.0, 10.0]} // Centered on Central Europe
                zoom={4}
                scrollWheelZoom={true}
                zoomControl={false}
                className="w-full h-full bg-[#f8f9fa]"
            >
                <TileLayer
                    attribution='&copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                {geoData && (
                    <GeoJSON
                        key={trackedZones.join(',')} // Key valid to force re-render style on selection change
                        data={geoData}
                        style={style}
                        onEachFeature={onEachFeature}
                    />
                )}
                <MapEvents />
            </MapContainer>
        </div>
    );
};
