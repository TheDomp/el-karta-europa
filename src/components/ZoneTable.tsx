import React, { useState } from 'react';
import { useGridStore } from '../store/useGridStore';
import { ChevronRight, PlusCircle, BarChart2 } from 'lucide-react';
import { ComparisonModal } from './ComparisonModal';

export const ZoneTable: React.FC = () => {
    const { zonesData, trackedZones, setZone, selectedZone } = useGridStore();
    const [isCompareOpen, setIsCompareOpen] = useState(false);

    // Only show zones that are in the tracked list
    const visibleData = zonesData.filter(z => trackedZones.includes(z.id));

    if (visibleData.length === 0) {
        return (
            <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl p-6 shadow-sm text-center">
                <div className="mx-auto w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                    <PlusCircle className="text-blue-500" size={20} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Välj Zoner</h3>
                <p className="text-xs text-slate-500">Klicka på kartan för att övervaka områden.</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-xl overflow-hidden shadow-sm max-h-[60vh] overflow-y-auto">
                <div className="p-3 border-b border-gray-100 bg-gray-50/50 sticky top-0 backdrop-blur-md z-10 flex justify-between items-center">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Valda Marknadszoner</h3>
                    {visibleData.length >= 2 && (
                        <button
                            onClick={() => setIsCompareOpen(true)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                        >
                            <BarChart2 size={12} />
                            JÄMFÖR
                        </button>
                    )}
                </div>
                <div className="divide-y divide-gray-50">
                    {visibleData.map((zone) => (
                        <button
                            key={zone.id}
                            onClick={() => setZone(zone.id)}
                            className={`w-full flex items-center justify-between p-3 transition-colors text-left group hover:bg-gray-50 ${selectedZone === zone.id ? 'bg-blue-50/50' : ''
                                }`}
                        >
                            <div className="space-y-0.5">
                                <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    {zone.id}
                                    {selectedZone === zone.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                </div>
                                {/* Simple mapping for display names */}
                                <div className="text-[9px] text-slate-400 uppercase font-medium tracking-tight truncate max-w-[100px]">
                                    {zone.id.includes('SE') ? 'Sverige' :
                                        zone.id.includes('DK') ? 'Danmark' :
                                            zone.id.includes('NO') ? 'Norge' :
                                                zone.id.includes('IT') ? 'Italien' :
                                                    zone.id.includes('FI') ? 'Finland' :
                                                        zone.id.includes('DE') ? 'Tyskland' :
                                                            zone.id.includes('FR') ? 'Frankrike' :
                                                                zone.id.includes('ES') ? 'Spanien' :
                                                                    zone.id.includes('PT') ? 'Portugal' :
                                                                        zone.id.includes('GB') ? 'Storbritannien' : 'Europa'}
                                </div>
                            </div>

                            <div className="flex gap-4 items-center">
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1 text-slate-600">
                                        <span className="text-xs font-mono font-bold group-hover:text-slate-900 transition-colors">{zone.price.toFixed(2)}</span>
                                    </div>
                                    <div className="text-[8px] text-slate-400 uppercase">€/MWh</div>
                                </div>
                                <ChevronRight size={14} className={`text-slate-300 transition-all ${selectedZone === zone.id ? 'text-blue-500' : 'group-hover:text-slate-400'}`} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <ComparisonModal isOpen={isCompareOpen} onClose={() => setIsCompareOpen(false)} />
        </>
    );
};
