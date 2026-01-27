import React, { useMemo } from 'react';
import { useGridStore } from '../store/useGridStore';
import { Clock, RotateCcw } from 'lucide-react';
import { format, addHours, differenceInHours } from 'date-fns';
import { motion } from 'framer-motion';

export const TimeSlider: React.FC = () => {
    const { currentTime, timeMode, setTime } = useGridStore();

    const simulationBase = useMemo(() => {
        const d = new Date();
        d.setMinutes(0, 0, 0);
        return d;
    }, []);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const offset = parseInt(e.target.value);
        const newTime = addHours(simulationBase, offset);
        setTime(newTime);
    };

    const currentOffset = differenceInHours(currentTime, simulationBase);

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="glass p-5 rounded-3xl flex items-center gap-6 shadow-2xl"
        >
            <motion.button
                whileHover={{ scale: 1.1, rotate: -90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setTime(new Date())}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group text-gray-400 hover:text-white"
                title="Återställ till Realtid"
            >
                <RotateCcw size={20} />
            </motion.button>

            <div className="flex-1 flex flex-col gap-3">
                <div className="flex justify-between px-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Förflutet</span>
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${timeMode === 'LIVE' ? 'text-green-500 glow-green' : 'text-gray-600'}`}>Live Now</span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Prognos</span>
                </div>

                <div className="relative flex items-center">
                    <input
                        type="range"
                        min="-24"
                        max="24"
                        step="1"
                        value={currentOffset}
                        onChange={handleSliderChange}
                        className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 z-10 transition-all outline-none"
                    />
                    <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-3 bg-white/10 pointer-events-none" />
                </div>
            </div>

            <div className="text-right min-w-[120px] border-l border-white/5 pl-6">
                <div className="flex items-center justify-end gap-2 mb-1">
                    <Clock size={16} className="text-blue-500" />
                    <span className="text-2xl font-mono font-black text-white tabular-nums tracking-tighter">
                        {format(currentTime, 'HH:mm')}
                    </span>
                </div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">
                    {format(currentTime, 'EEE dd MMM')}
                </p>
            </div>
        </motion.div>
    );
};
