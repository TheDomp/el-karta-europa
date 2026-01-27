import React, { useState } from 'react';
import { useGridStore } from '../store/useGridStore';
import { ChevronRight, PlusCircle, BarChart2, Trash2 } from 'lucide-react';
import { ComparisonModal } from './ComparisonModal';
import { motion, AnimatePresence } from 'framer-motion';

export const ZoneTable: React.FC = () => {
    const { zonesData, trackedZones, setZone, selectedZone, clearTrackedZones } = useGridStore();
    const [isCompareOpen, setIsCompareOpen] = useState(false);

    const visibleData = zonesData.filter(z => trackedZones.includes(z.id));

    if (visibleData.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-3xl p-8 text-center"
            >
                <div className="mx-auto w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4">
                    <PlusCircle className="text-blue-400" size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Välj Zoner</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                    Klicka på kartans 3D-modeller för att börja övervaka specifika marknadsområden.
                </p>
            </motion.div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="glass rounded-3xl overflow-hidden max-h-[60vh] flex flex-col">
                <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Marknadszoner</h3>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">{visibleData.length} Aktiva</p>
                    </div>
                    <div className="flex gap-2">
                        {visibleData.length >= 2 && (
                            <button
                                onClick={() => setIsCompareOpen(true)}
                                className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                                <BarChart2 size={12} />
                                JÄMFÖR
                            </button>
                        )}
                        <button
                            onClick={clearTrackedZones}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto custom-scrollbar">
                    <AnimatePresence initial={false}>
                        {visibleData.map((zone) => (
                            <motion.button
                                key={zone.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onClick={() => setZone(zone.id)}
                                className={`w-full flex items-center justify-between p-4 transition-all text-left group border-b border-white/5 last:border-0 ${selectedZone === zone.id ? 'bg-blue-500/20' : 'hover:bg-white/5'
                                    }`}
                            >
                                <div className="space-y-1">
                                    <div className="text-sm font-black text-white flex items-center gap-2">
                                        {zone.id}
                                        {selectedZone === zone.id && (
                                            <motion.div
                                                layoutId="active-dot"
                                                className="w-1.5 h-1.5 rounded-full bg-blue-400 glow-blue"
                                            />
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                        {idToCountry(zone.id)}
                                    </div>
                                </div>

                                <div className="flex gap-4 items-center">
                                    <div className="text-right">
                                        <div className="text-base font-mono font-black text-white transition-colors group-hover:text-blue-400">
                                            {zone.price.toFixed(1)}
                                        </div>
                                        <div className="text-[8px] text-gray-500 uppercase font-bold tracking-tighter">EUR / MWh</div>
                                    </div>
                                    <ChevronRight size={16} className={`text-gray-600 transition-all ${selectedZone === zone.id ? 'text-blue-400' : 'group-hover:text-gray-400'}`} />
                                </div>
                            </motion.button>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            <ComparisonModal isOpen={isCompareOpen} onClose={() => setIsCompareOpen(false)} />
        </div>
    );
};

const idToCountry = (id: string) => {
    if (id.startsWith('SE')) return 'Sverige';
    if (id.startsWith('DK')) return 'Danmark';
    if (id.startsWith('NO')) return 'Norge';
    if (id.startsWith('FI')) return 'Finland';
    if (id.startsWith('DE')) return 'Tyskland';
    if (id.startsWith('FR')) return 'Frankrike';
    if (id.startsWith('IT')) return 'Italien';
    if (id.startsWith('ES')) return 'Spanien';
    if (id.startsWith('PT')) return 'Portugal';
    if (id.startsWith('GB') || id.startsWith('UK')) return 'UK';
    if (id.startsWith('PL')) return 'Polen';
    if (id.startsWith('NL')) return 'Holland';
    if (id.startsWith('BE')) return 'Belgien';
    if (id.startsWith('AT')) return 'Österrike';
    if (id.startsWith('CH')) return 'Schweiz';
    if (id.startsWith('CZ')) return 'Tjeckien';
    if (id.startsWith('HU')) return 'Ungern';
    return 'Europa';
};
