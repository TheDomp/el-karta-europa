import React, { useMemo } from 'react';
import { useGridStore } from '../store/useGridStore';
import { Clock, RotateCcw } from 'lucide-react';
import { format, addHours, differenceInHours } from 'date-fns';

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
        <div className="bg-white/90 p-4 rounded-xl flex items-center gap-4 backdrop-blur-md border border-gray-200 shadow-lg">
            <button
                onClick={() => setTime(new Date())}
                className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all border border-gray-200 group text-slate-500 hover:text-slate-800"
                title="Återställ till Realtid"
            >
                <RotateCcw size={18} />
            </button>

            <div className="flex-1 flex flex-col gap-2">
                <div className="flex justify-between px-1 text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Igår</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest leading-none ${timeMode === 'LIVE' ? 'text-green-600 mr-4' : 'text-slate-400'}`}>Live</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Imorgon</span>
                </div>

                <input
                    type="range"
                    min="-24"
                    max="24"
                    step="1"
                    value={currentOffset}
                    onChange={handleSliderChange}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600 hover:accent-green-500 z-10 transition-all"
                />
            </div>

            <div className="text-right min-w-[100px] border-l border-gray-100 pl-4 ml-2">
                <div className="flex items-center justify-end gap-1.5 mb-0.5">
                    <Clock size={14} className="text-green-600" />
                    <span className="text-xl font-mono font-bold text-slate-800 tabular-nums">
                        {format(currentTime, 'HH:mm')}
                    </span>
                </div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                    {format(currentTime, 'EEE dd MMM')}
                </p>
            </div>
        </div>
    );
};
