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
            <div className="glass rounded-3xl overflow-hidden max-h-[60vh] flex flex-col border border-[var(--glass-border)] shadow-2xl">
                <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/50 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--energy-blue)] drop-shadow-sm">Marknadszoner</h3>
                        <p className="text-[9px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">{visibleData.length} Aktiva</p>
                    </div>
                    <div className="flex gap-2">
                        {visibleData.length >= 2 && (
                            <button
                                onClick={() => setIsCompareOpen(true)}
                                className="text-[10px] font-bold text-black bg-[var(--energy-blue)] hover:bg-[var(--energy-blue)]/80 px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,188,212,0.3)] hover:shadow-[0_0_20px_rgba(0,188,212,0.5)]"
                            >
                                <BarChart2 size={12} />
                                JÄMFÖR
                            </button>
                        )}
                        <button
                            onClick={clearTrackedZones}
                            className="p-2 text-[var(--text-secondary)] hover:text-[var(--energy-red)] hover:bg-[var(--energy-red)]/10 rounded-xl transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto custom-scrollbar bg-black/20">
                    <AnimatePresence initial={false}>
                        {visibleData.map((zone) => {
                            const hasData = zone.isSupported && zone.price !== 0; // Better check for zero/mock
                            return (
                                <motion.button
                                    key={zone.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onClick={() => setZone(zone.id)}
                                    className={`w-full flex items-center justify-between p-4 transition-all text-left group border-b border-[var(--glass-border)] last:border-0 hover:bg-[var(--bg-secondary)]/50 ${selectedZone === zone.id ? 'bg-[var(--energy-blue)]/10 border-l-4 border-l-[var(--energy-blue)]' : 'border-l-4 border-l-transparent'
                                        }`}
                                >
                                    <div className="space-y-1">
                                        <div className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2">
                                            {zone.id}
                                            {selectedZone === zone.id && (
                                                <motion.div
                                                    layoutId="active-dot"
                                                    className="w-1.5 h-1.5 rounded-full bg-[var(--energy-blue)] shadow-[0_0_10px_var(--energy-blue)]"
                                                />
                                            )}
                                        </div>
                                        <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-widest">
                                            {idToCountry(zone.id)}
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-center">
                                        <div className="text-right">
                                            {hasData ? (
                                                <>
                                                    <div className="text-base font-mono font-black text-[var(--text-primary)] transition-colors group-hover:text-[var(--energy-blue)]">
                                                        {zone.price.toFixed(1)}
                                                    </div>
                                                    <div className="text-[8px] text-[var(--text-secondary)] uppercase font-bold tracking-tighter">EUR / MWh</div>
                                                    {zone.generationMix?.timestamp && (
                                                        <div className="text-[8px] text-[var(--text-secondary)] opacity-70 mt-0.5 font-mono">
                                                            {zone.generationMix.timestamp}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-bold text-[var(--energy-red)]">SAKNAS</span>
                                                    <span className="text-[8px] text-[var(--text-secondary)]">DATA EJ TILLGÄNGLIG</span>
                                                </div>
                                            )}
                                        </div>
                                        <ChevronRight size={16} className={`transition-all ${selectedZone === zone.id ? 'text-[var(--energy-blue)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`} />
                                    </div>
                                </motion.button>
                            );
                        })}
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
