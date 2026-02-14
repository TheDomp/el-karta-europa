import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import zonesGeoJson from '../assets/data/zones.json';
import { useGridStore } from '../store/useGridStore';
import { ZONE_EIC_MAPPINGS } from '../services/EntsoeService';
import { getUnsupportedReason } from '../utils/unsupportedZones';

// ... (Icon fix remains)

// Legend removed — map tooltips provide sufficient context

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
        const isSupported = !!ZONE_EIC_MAPPINGS[zoneId];

        // Color logic
        let fillColor = '#e2e8f0';
        let fillOpacity = isTracked ? 0.7 : 0.4;
        let weight = isTracked ? 3 : 1;
        let color = isTracked ? '#2563eb' : '#94a3b8';

        if (!isSupported) {
            fillColor = '#64748b'; // More "dead" gray
            fillOpacity = 0.15;
            color = '#cbd5e1';
        } else if (zoneData) {
            const price = zoneData.price || 0;
            if (price < 40) fillColor = '#a7f3d0';
            else if (price < 60) fillColor = '#fde047';
            else fillColor = '#fca5a5';
        }

        return {
            fillColor,
            weight,
            opacity: 1,
            color,
            dashArray: isTracked ? '' : (isSupported ? '3' : ''),
            fillOpacity,
            className: isSupported ? 'cursor-pointer' : 'cursor-default'
        };
    };

    const onEachFeature = (feature: any, layer: any) => {
        const zoneId = feature.properties.zoneName || feature.id;
        const isSupported = !!ZONE_EIC_MAPPINGS[zoneId];
        const reason = getUnsupportedReason(zoneId);

        let tooltipContent = feature.properties.zoneName || feature.properties.name;
        if (!isSupported) {
            tooltipContent = `${tooltipContent} (Data saknas${reason ? `: ${reason}` : ''})`;
        }

        layer.bindTooltip(tooltipContent, {
            permanent: false,
            direction: "center",
            className: `bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-bold shadow-lg text-[10px] ${!isSupported ? 'opacity-80' : ''}`
        });

        layer.on({
            click: () => {
                if (isSupported) {
                    toggleTrackedZone(zoneId);
                }
            },
            mouseover: (e: any) => {
                const l = e.target;
                if (isSupported) {
                    l.setStyle({ fillOpacity: 0.8 });
                }
                l.openTooltip();
            },
            mouseout: (e: any) => {
                const l = e.target;
                if (isSupported) {
                    l.setStyle({ fillOpacity: style(feature).fillOpacity });
                }
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
