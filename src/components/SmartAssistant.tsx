import React, { useState, useRef, useEffect } from 'react';
import { useGridStore } from '../store/useGridStore';
import { Send, MessageSquare, X, Bot, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

    const [isTyping, setIsTyping] = useState(false);

    const getContextData = () => {
        if (!zonesData || zonesData.length === 0) return "Ingen data på kartan just nu.";
        return zonesData
            .filter(z => z.price > 0)
            .map(z => ({
                id: z.id,
                p: z.price.toFixed(1),
                l: (z.load / 1000).toFixed(1) + "GW",
                w: z.windGeneration ? (z.windGeneration / 1000).toFixed(1) + "GW" : undefined
            }));
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const res = await fetch('http://localhost:3001/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.text,
                    context: getContextData()
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: data.reply || "Kunde inte generera ett svar.",
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: "⚠️ Kunde inte nå AI-tjänsten. Kontrollera att servern rullar och API-nyckeln är satt.",
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-10 right-10 z-[10000]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="absolute bottom-20 right-0 w-80 sm:w-96 glass rounded-3xl flex flex-col overflow-hidden shadow-2xl h-[500px]"
                    >
                        {/* Header */}
                        <div className="bg-blue-600 p-5 flex justify-between items-center text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 opacity-10 -rotate-12 translate-x-4 -translate-y-4">
                                <Bot size={120} />
                            </div>
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest">Energi AI</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-[10px] font-bold opacity-70 uppercase tracking-tighter">Live Analysis</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-xl transition-colors relative z-10">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-black/20">
                            {messages.map(m => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={m.id}
                                    className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] p-4 rounded-3xl text-xs leading-relaxed ${m.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-500/20'
                                        : 'glass rounded-tl-none text-gray-200'
                                        }`}>
                                        {m.text.split('\n').map((line, i) => (
                                            <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="glass p-4 rounded-3xl rounded-tl-none">
                                        <div className="flex gap-1.5">
                                            {[0, 0.15, 0.3].map(delay => (
                                                <motion.div
                                                    key={delay}
                                                    animate={{ y: [0, -5, 0] }}
                                                    transition={{ duration: 0.6, repeat: Infinity, delay }}
                                                    className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-5 border-t border-white/5 bg-white/5 backdrop-blur-md">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Fråga om marknadsläget..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                                />
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSend}
                                    className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition-colors shadow-xl shadow-blue-500/20"
                                >
                                    <Send size={18} />
                                </motion.button>
                            </div>
                            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                {['Prisläget?', 'Vindkraft?', 'Analysera?'].map(chip => (
                                    <button
                                        key={chip}
                                        onClick={() => setInput(chip)}
                                        className="whitespace-nowrap px-4 py-2 glass hover:bg-white/10 rounded-xl text-[10px] font-bold text-gray-400 hover:text-white transition-all border border-white/5"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-all ${isOpen ? 'bg-white text-black' : 'bg-blue-600 text-white shadow-blue-500/40'
                    }`}
            >
                {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-[3px] border-[#0a0a0b] flex items-center justify-center"
                    >
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    </motion.div>
                )}
            </motion.button>
        </div>
    );
};
