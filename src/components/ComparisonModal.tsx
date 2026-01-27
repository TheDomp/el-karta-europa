import React, { useState } from 'react';
import { useGridStore } from '../store/useGridStore';
import { X, FileText, Zap, BarChart3 } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface ComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose }) => {
    const { zonesData, trackedZones, loadingZones } = useGridStore();
    const [viewMode, setViewMode] = useState<'consumption' | 'price' | 'mix'>('mix');

    // Filter data for tracked zones
    const compareData = zonesData.filter(z => trackedZones.includes(z.id));

    if (!isOpen) return null;

    // Helper to format chart data
    const chartData = compareData.map(z => ({
        name: z.id,
        price: z.price,
        isLoading: loadingZones.includes(z.id),
        load: z.load,
        nuclear: z.generationMix?.nuclear || 0,
        hydro: z.generationMix?.hydro || 0,
        wind: z.generationMix?.wind || 0,
        solar: z.generationMix?.solar || 0,
        gas: z.generationMix?.gas || 0,
        other: (z.generationMix?.coal || 0) + (z.generationMix?.other || 0)
    }));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Jämför Zoner</h2>
                        <p className="text-sm text-slate-500">
                            Jämför {compareData.length} valda marknadszoner
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-white">
                    <button
                        onClick={() => setViewMode('mix')}
                        className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${viewMode === 'mix' ? 'border-green-500 text-green-700 bg-green-50/30' : 'border-transparent text-slate-500 hover:bg-gray-50'}`}
                    >
                        <Zap size={16} />
                        Produktionsmix
                    </button>
                    <button
                        onClick={() => setViewMode('price')}
                        className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${viewMode === 'price' ? 'border-blue-500 text-blue-700 bg-blue-50/30' : 'border-transparent text-slate-500 hover:bg-gray-50'}`}
                    >
                        <BarChart3 size={16} />
                        Elpris
                    </button>
                    <button
                        onClick={() => setViewMode('consumption')}
                        className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${viewMode === 'consumption' ? 'border-purple-500 text-purple-700 bg-purple-50/30' : 'border-transparent text-slate-500 hover:bg-gray-50'}`}
                    >
                        <FileText size={16} />
                        Förbrukning
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 bg-white overflow-hidden relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={({ x, y, payload }) => {
                                    const item = chartData.find(d => d.name === payload.value);
                                    if (item?.isLoading) {
                                        return (
                                            <g transform={`translate(${x},${y})`}>
                                                <foreignObject x="-10" y="0" width="20" height="20">
                                                    <div className="animate-spin text-blue-500">
                                                        <Zap size={14} className="opacity-50" />
                                                    </div>
                                                </foreignObject>
                                            </g>
                                        );
                                    }
                                    return (
                                        <text x={x} y={y} dy={16} textAnchor="middle" fill="#64748b" fontSize={12}>
                                            {payload.value}
                                        </text>
                                    );
                                }}
                                dy={10}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        if (data.isLoading) {
                                            return (
                                                <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
                                                    <p className="font-bold text-slate-800 mb-1">{label}</p>
                                                    <div className="flex items-center gap-2 text-blue-500 text-sm">
                                                        <div className="animate-spin"><Zap size={12} /></div>
                                                        Hämtar data...
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
                                                <p className="font-bold text-slate-800 mb-2">{label}</p>
                                                {payload.map((entry: any) => {
                                                    // Map display names back to data keys to ensure we get the correct raw value
                                                    // This handles stacked bars correctly where entry.value might be weird.
                                                    const nameToKey: Record<string, string> = {
                                                        'Vattenkraft': 'hydro',
                                                        'Vindkraft': 'wind',
                                                        'Solkraft': 'solar',
                                                        'Kärnkraft': 'nuclear',
                                                        'Gas/Olja': 'gas',
                                                        'Övrigt': 'other',
                                                        'Spotpris (€/MWh)': 'price',
                                                        'Förbrukning (MW)': 'load'
                                                    };

                                                    const key = nameToKey[entry.name] || entry.dataKey;
                                                    const rawValue = entry.payload[key];
                                                    const value = (typeof rawValue === 'number' && !isNaN(rawValue)) ? rawValue : 0;

                                                    // Determine unit based on view mode
                                                    let unit = '';
                                                    if (viewMode === 'mix') unit = '%';
                                                    else if (viewMode === 'price') unit = ' €/MWh';
                                                    else if (viewMode === 'consumption') unit = ' MW';

                                                    // Only show "Data saknas" for price being 0. For mix, 0% is valid.
                                                    const isMissing = viewMode === 'price' && value === 0;

                                                    return (
                                                        <div key={entry.name} className="flex justify-between gap-4 text-xs mb-1">
                                                            <span style={{ color: entry.color }}>{entry.name}:</span>
                                                            <span className="font-mono font-medium whitespace-nowrap text-slate-700">
                                                                {isMissing ? "Data saknas" : `${value.toFixed(1)}${unit}`}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />

                            {viewMode === 'mix' && (
                                <>
                                    <Bar dataKey="hydro" stackId="a" fill="#0ea5e9" name="Vattenkraft" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="wind" stackId="a" fill="#10b981" name="Vindkraft" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="solar" stackId="a" fill="#eab308" name="Solkraft" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="nuclear" stackId="a" fill="#8b5cf6" name="Kärnkraft" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="gas" stackId="a" fill="#f97316" name="Gas/Olja" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="other" stackId="a" fill="#64748b" name="Övrigt" radius={[4, 4, 0, 0]} />
                                </>
                            )}

                            {viewMode === 'price' && (
                                <Bar dataKey="price" fill="#3b82f6" name="Spotpris (€/MWh)" radius={[4, 4, 0, 0]} barSize={60} />
                            )}

                            {viewMode === 'consumption' && (
                                <Bar dataKey="load" fill="#a855f7" name="Förbrukning (MW)" radius={[4, 4, 0, 0]} barSize={60} />
                            )}

                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
