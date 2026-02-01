import { ZoneTable } from './ZoneTable';
import { SmartAssistant } from './SmartAssistant';
import { useGridStore } from '../store/useGridStore';
import { motion, AnimatePresence } from 'framer-motion';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { timeMode, currentTime } = useGridStore();

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[var(--energy-blue)] selection:text-black">
            {/* Header - Premium Glass Style */}
            <header className="absolute top-0 left-0 right-0 z-50 p-6 md:p-8 flex justify-between pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} // Custom ease for premium feel
                    className="pointer-events-auto glass px-6 py-4 rounded-2xl flex flex-col gap-1 border border-[var(--glass-border)] shadow-2xl shadow-black/50"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-[var(--energy-blue)] rounded-full shadow-[0_0_15px_var(--energy-blue)]" />
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter uppercase italic flex items-center gap-3 leading-none">
                                Europa <span className="text-[var(--energy-blue)] drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">Energikarta</span>
                            </h1>
                            <p className="text-[10px] text-[var(--text-secondary)] font-bold tracking-[0.3em] uppercase mt-1">
                                Real-time Insight Engine
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 flex gap-3 items-center">
                        <motion.span
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className={`px-3 py-1 rounded-md text-[10px] font-black border uppercase tracking-widest transition-colors duration-500 ${timeMode === 'LIVE'
                                ? 'border-[var(--energy-green)]/30 text-[var(--energy-green)] bg-[var(--energy-green)]/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                : 'border-[var(--energy-blue)]/30 text-[var(--energy-blue)] bg-[var(--energy-blue)]/10 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                }`}
                        >
                            {timeMode}
                        </motion.span>
                        <span className="text-xs font-mono text-[var(--text-secondary)] bg-white/5 px-2 py-1 rounded-md border border-white/5">
                            {currentTime.toLocaleString('sv-SE', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                    </div>
                </motion.div>
            </header>

            {/* Main Content (Map) */}
            <main className="absolute inset-0 z-0 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key="map-container"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5 }}
                        className="w-full h-full"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Overlays - Clean Zone Table */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.4 }}
                className="absolute bottom-10 left-10 z-40 pointer-events-auto w-[340px]"
            >
                <ZoneTable />
            </motion.div>

            <SmartAssistant />
        </div>
    );
};
