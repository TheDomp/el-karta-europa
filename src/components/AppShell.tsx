import { ZoneTable } from './ZoneTable';
import { useGridStore } from '../store/useGridStore';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { timeMode, currentTime } = useGridStore();

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-white text-[#1a1a1a] font-sans">
            {/* Header - Clean Ellevio Style */}
            <header className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between pointer-events-none">
                <div className="pointer-events-auto bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-sm border border-gray-100">
                    <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a] mb-1">
                        Svenska Elnätet
                    </h1>
                    <p className="text-sm text-gray-500">Realtidsövervakning & Prognos</p>

                    <div className="mt-3 flex gap-2 items-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-widest ${timeMode === 'LIVE' ? 'border-green-600 text-green-700 bg-green-50' : 'border-blue-400 text-blue-600 bg-blue-50'
                            }`}>
                            {timeMode}
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                            {currentTime.toLocaleString('sv-SE', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content (Map) */}
            <main className="absolute inset-0 z-0 bg-[#f5f5f5]">
                {children}
            </main>

            {/* Overlays - Clean Zone Table */}
            <div className="absolute bottom-8 left-8 z-40 pointer-events-auto w-[320px]">
                <ZoneTable />
            </div>
        </div>
    );
};
