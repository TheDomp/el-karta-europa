/// <reference types="google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { useGridStore } from '../store/useGridStore';
import { createEnergyOverlayClass } from '../services/EnergyOverlay';
import zonesGeoJson from '../assets/data/zones.json';
import { Activity } from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export const Map3D: React.FC = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [error, setError] = useState<string | null>(null);
    const overlayRef = useRef<any>(null);

    const { zonesData } = useGridStore();

    // Init Map using dynamic script loading
    useEffect(() => {
        const initMap = async () => {
            if (!API_KEY || API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
                setError('Google Maps API key is missing');
                return;
            }

            try {
                if (typeof google !== 'undefined' && google.maps) {
                    createMap();
                    return;
                }

                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=maps&v=weekly`;
                script.async = true;
                script.defer = true;
                script.onload = () => createMap();
                script.onerror = () => setError('Failed to load Google Maps');
                document.head.appendChild(script);
            } catch (err) {
                console.error('Map init failed:', err);
                setError('Map initialization failed');
            }
        };

        const createMap = () => {
            if (!mapRef.current) return;

            const mapInstance = new google.maps.Map(mapRef.current, {
                center: { lat: 62.0, lng: 16.0 },
                zoom: 5,
                mapId: 'DEMO_MAP_ID',
                disableDefaultUI: true,
                backgroundColor: '#1a202c',
            });

            setMap(mapInstance);

            const EnergyOverlayClass = createEnergyOverlayClass(google.maps);
            const overlay = new EnergyOverlayClass(zonesGeoJson, []);
            overlay.setMap(mapInstance);
            overlayRef.current = overlay;
        };

        if (!map && !error) initMap();
    }, [map, error]);

    // Update Overlay Data based on Store
    useEffect(() => {
        if (!overlayRef.current || zonesData.length === 0) return;
        overlayRef.current.updateData(zonesData);
    }, [zonesData]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapRef} className="w-full h-full" />

            {!map && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-50">
                    <Activity className="w-10 h-10 text-ellevio-green animate-spin" />
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0b] z-50">
                    <div className="text-center p-8 max-w-md w-full glass rounded-3xl border border-white/10 shadow-2xl">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Activity className="w-8 h-8 text-white/20" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">3D Geospatial Engine</h2>
                        <p className="text-white/40 text-sm mb-8 leading-relaxed">
                            Web GL rendering is ready but requires a Google Maps Platform API key to visualize energy zones.
                        </p>
                        <div className="bg-black/40 p-4 rounded-xl text-left font-mono text-xs text-ellevio-green border border-white/5 mb-6">
                            VITE_GOOGLE_MAPS_API_KEY=...
                        </div>
                        <p className="text-white/20 text-[10px] uppercase font-bold tracking-widest">
                            {error}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
