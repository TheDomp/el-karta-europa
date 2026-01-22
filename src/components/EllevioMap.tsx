import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import zonesGeoJson from '../assets/data/zones.json';
import { useGridStore } from '../store/useGridStore';
import { ZONE_EIC_MAPPINGS } from '../services/EntsoeService';
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
        const zoneId = feature.properties.zoneName || feature.id;

        const zoneData = zonesData.find(z => z.id === zoneId);
        const isTracked = trackedZones.includes(zoneId);
        const isSupported = zoneData?.isSupported !== false;

        const price = zoneData?.price || 0;

        // Color logic
        let fillColor = '#e2e8f0';
        let fillOpacity = isTracked ? 0.7 : 0.4;

        if (zoneData) {
            if (!isSupported) {
                fillColor = '#94a3b8'; // Darker gray for unavailable
                fillOpacity = 0.2;
            } else {
                if (price < 40) fillColor = '#a7f3d0';
                else if (price < 60) fillColor = '#fde047';
                else fillColor = '#fca5a5';
            }
        }

        return {
            fillColor: fillColor,
            weight: isTracked ? 3 : 1,
            opacity: 1,
            color: isTracked ? '#2563eb' : '#94a3b8',
            dashArray: isTracked ? '' : '3',
            fillOpacity: fillOpacity
        };
    };

    const onEachFeature = (feature: any, layer: any) => {
        const zoneId = feature.properties.zoneName || feature.id;
        // Check static mapping for immediate interaction feedback/logic
        const isSupported = !!ZONE_EIC_MAPPINGS[zoneId];

        layer.bindTooltip(feature.properties.zoneName || feature.properties.name, {
            permanent: false,
            direction: "center",
            className: "bg-transparent border-0 text-slate-800 font-bold shadow-none text-[10px]"
        });

        layer.on({
            click: () => {
                if (isSupported) {
                    toggleTrackedZone(zoneId);
                }
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
                        key={trackedZones.join(',')} // Force re-render on selection
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
