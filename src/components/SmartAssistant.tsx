import React, { useState, useRef, useEffect } from 'react';
import { useGridStore } from '../store/useGridStore';
import { Send, MessageSquare, X, Bot } from 'lucide-react';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

export const SmartAssistant: React.FC = () => {
    const { zonesData } = useGridStore();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Hej! 👋 Jag är din energi-assistent. Fråga mig vad som helst om marknaden!',
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const findCountryName = (id: string) => {
        if (id.startsWith('SE-')) return 'Sverige';
        if (id.startsWith('DK-')) return 'Danmark';
        if (id.startsWith('NO-')) return 'Norge';
        if (id.startsWith('IT-')) return 'Italien';
        if (id.startsWith('FI')) return 'Finland';
        if (id.startsWith('DE')) return 'Tyskland';
        if (id.startsWith('FR')) return 'Frankrike';
        if (id.startsWith('ES')) return 'Spanien';
        return id;
    };

    const analyzeQuestion = (q: string): string => {
        const query = q.toLowerCase();

        if (zonesData.length === 0) {
            return "Jag väntar fortfarande på att all data ska laddas in. Fråga mig igen om en liten stund!";
        }

        // 1. Cheapest
        if (query.includes('billigast') || query.includes('lägst pris') || query.includes('reast')) {
            const cheapest = [...zonesData].sort((a, b) => a.price - b.price)[0];
            return `Just nu är elen billigast i **${findCountryName(cheapest.id)} (${cheapest.id})** med ett pris på **${cheapest.price.toFixed(2)} €/MWh**. 📉`;
        }

        // 2. Most Expensive
        if (query.includes('dyrast') || query.includes('högst pris')) {
            const expensive = [...zonesData].sort((a, b) => b.price - a.price)[0];
            return `Priserna är som högst i **${findCountryName(expensive.id)} (${expensive.id})**, där det kostar **${expensive.price.toFixed(2)} €/MWh** just nu. 📈`;
        }

        // 3. Highest Load
        if (query.includes('mest el') || query.includes('förbrukning') || query.includes('drar mest')) {
            const sortedByLoad = [...zonesData].sort((a, b) => b.load - a.load)[0];
            return `**${findCountryName(sortedByLoad.id)} (${sortedByLoad.id})** har den högsta förbrukningen just nu med ca **${(sortedByLoad.load / 1000).toFixed(1)} GW**.`;
        }

        // 4. Windy/Green
        if (query.includes('vind') || query.includes('grön') || query.includes('miljö')) {
            const sortedByWind = [...zonesData].sort((a, b) => (b.windGeneration || 0) - (a.windGeneration || 0))[0];
            return `Blåsigast är det i **${findCountryName(sortedByWind.id)}**, vilket ger bra vindproduktion! 🌬️`;
        }

        // 5. Help/Default
        return "Jag kan svara på frågor som: \n• 'Var är det billigast?' \n• 'Vilka drar mest el?' \n• 'Var är det dyrast?' \n• 'Hur ser vindkraften ut?'";
    };

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Simulate AI thinking
        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: analyzeQuestion(input),
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
        }, 600);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 h-[450px]">
                    {/* Header */}
                    <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <Bot size={20} />
                            <div>
                                <h3 className="text-sm font-bold">Energi AI</h3>
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                    <span className="text-[10px] opacity-80">Analyserar Live-data</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:opacity-70">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map(m => (
                            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${m.sender === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200 shadow-sm'
                                    }`}>
                                    {m.text.split('\n').map((line, i) => (
                                        <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white/50 border-t border-slate-200">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ställ en fråga..."
                                className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                            />
                            <button
                                onClick={handleSend}
                                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 invisible-scrollbar">
                            {['Billigast?', 'Vindkraft?', 'Högst last?'].map(chip => (
                                <button
                                    key={chip}
                                    onClick={() => setInput(chip)}
                                    className="whitespace-nowrap px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-[10px] text-slate-500 transition-colors border border-slate-200"
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 ${isOpen ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'
                    }`}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                {!isOpen && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                )}
            </button>
        </div>
    );
};
