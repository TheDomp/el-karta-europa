import { ZoneTable } from './ZoneTable';
import { SmartAssistant } from './SmartAssistant';
import { useGridStore } from '../store/useGridStore';
import { motion, AnimatePresence } from 'framer-motion';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { timeMode, currentTime } = useGridStore();

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-[#050505] text-white font-sans">
            {/* Header - Premium Glass Style */}
            <header className="absolute top-0 left-0 right-0 z-50 p-8 flex justify-between pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="pointer-events-auto glass p-5 rounded-2xl flex flex-col gap-1"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-blue-500 rounded-full glow-blue" />
                        <div>
                            <h1 className="text-2xl font-black tracking-tight uppercase italic flex items-center gap-3">
                                Europa <span className="text-blue-500">Energikarta</span>
                            </h1>
                            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">
                                Real-time Insight Engine
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 flex gap-3 items-center">
                        <motion.span
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${timeMode === 'LIVE'
                                    ? 'border-green-500/50 text-green-400 bg-green-500/10'
                                    : 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                                }`}
                        >
                            {timeMode}
                        </motion.span>
                        <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded-lg">
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
