import React from 'react';
import { X, Zap, Leaf, PieChart } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { EnergyData } from '../types/energy';

interface ZoneDetailsProps {
    zone: EnergyData | null;
    onClose: () => void;
}

export const ZoneDetails: React.FC<ZoneDetailsProps> = ({ zone, onClose }) => {
    if (!zone) return null;

    // Strict Data: Check if price/load is missing (0)
    const isDataMissing = !zone.isSupported || (zone.spotPrice === 0 && zone.carbonIntensity === 0);

    // Mock 24h forecast data (Only show if we have valid current data?)
    // User requested "Strict Data". Showing a mock forecast might be misleading if we have NO current data.
    // Let's hide forecast if data is missing.
    const forecast = isDataMissing ? [] : Array.from({ length: 24 }).map((_, i) => ({
        time: `${i}:00`,
        price: zone.spotPrice + (Math.sin(i / 3) * 20) + (Math.random() * 10),
    }));

    return (
        <div className="absolute top-0 right-0 h-full w-[400px] glass rounded-none border-y-0 border-r-0 z-20 p-6 animate-slide-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white">{zone.zoneName}</h2>
                    <p className="text-sm text-white/50">{zone.zoneId} • Bidding Zone</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-6 h-6 text-white/70" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-yellow-400 mb-1">
                        <Zap className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Spot Price</span>
                    </div>
                    <div className="text-xl font-mono text-white">
                        {isDataMissing ? "Ingen data" : `€${zone.spotPrice.toFixed(2)}`}
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-green-400 mb-1">
                        <Leaf className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">CO2 Intensity</span>
                    </div>
                    <div className="text-xl font-mono text-white">
                        {isDataMissing ? "-" : `${zone.carbonIntensity.toFixed(0)} g`}
                    </div>
                </div>
            </div>

            {!isDataMissing && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChart className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-semibold text-white/90">24H Price Forecast (simulated)</h3>
                    </div>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={forecast}>
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" hide />
                                <YAxis hide domain={['auto', 'auto']} />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                                    itemStyle={{ color: '#8884d8' }}
                                />
                                <Area type="monotone" dataKey="price" stroke="#8884d8" fillOpacity={1} fill="url(#colorPrice)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-sm font-semibold text-white/90 mb-4">Production Mix</h3>
                {isDataMissing ? (
                    <p className="text-sm text-white/50 italic">Ingen produktionsdata tillgänglig för denna zon.</p>
                ) : (
                    <div className="space-y-3">
                        {Object.entries(zone.productionMix).map(([key, value]) => (
                            <div key={key}>
                                <div className="flex justify-between text-[11px] text-white/60 mb-1">
                                    <span className="capitalize">{key}</span>
                                    <span>{value.toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-400/60 rounded-full"
                                        style={{ width: `${value}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
