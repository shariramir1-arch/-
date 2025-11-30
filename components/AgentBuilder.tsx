import React, { useState, useRef, useEffect } from 'react';
import { generateAgentResponse } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Send, Bot, User, RefreshCw, Loader2, Sparkles, Terminal } from 'lucide-react';

const AgentBuilder: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'שלום. אני הארכיטקט. אפיין בפני את הסוכן העתידי שלך.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const responseText = await generateAgentResponse(userMsg.text, messages.map(m => ({ role: m.role, text: m.text })));
    
    const botMsg: ChatMessage = { role: 'model', text: responseText, timestamp: new Date() };
    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-[#050505] py-24 text-white relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Info Side */}
          <div className="lg:w-1/3 pt-10">
            <div className="flex items-center gap-2 text-luxury-gold mb-4 animate-pulse-slow">
              <Terminal size={20} />
              <span className="text-sm font-mono tracking-widest">SYSTEM_INIT</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-white leading-tight">
              מעבדת <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-gold to-yellow-200">הסוכנים</span>
            </h2>
            <p className="text-gray-400 text-lg mb-10 font-light leading-relaxed">
              התנסה באפיון סוכן חכם בזמן אמת. תאר את הצורך העסקי, והארכיטקט הווירטואלי יבנה עבורך מפרט טכני יוקרתי ומדויק.
            </p>
            
            <div className="bg-luxury-card/50 p-8 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-luxury-gold"></div>
              <h4 className="font-bold text-xl mb-6 flex items-center gap-3 text-white">
                <Sparkles className="text-luxury-gold" size={20} />
                יכולות הליבה
              </h4>
              <ul className="space-y-4 text-sm text-gray-300">
                {[
                  "אפיון תהליכים עסקיים מורכבים",
                  "ארכיטקטורת מערכת (Python, Gemini)",
                  "אסטרטגיות משחוק (Gamification)",
                  "אינטגרציות Enterprise (SAP, Salesforce)"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-luxury-gold rounded-full shadow-[0_0_8px_rgba(197,160,89,0.8)]"/>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:w-2/3 bg-luxury-charcoal/80 backdrop-blur-xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col h-[700px] overflow-hidden">
            {/* Chat Header */}
            <div className="bg-black/40 p-5 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-3 h-3 bg-luxury-gold rounded-full"></div>
                  <div className="absolute inset-0 bg-luxury-gold rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="font-mono text-xs text-luxury-gold tracking-widest">ARCHITECT_AI // ONLINE</span>
              </div>
              <button 
                onClick={() => setMessages([messages[0]])}
                className="text-gray-500 hover:text-white transition p-2 hover:bg-white/5 rounded-full" 
                title="אפס שיחה"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in-up`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-white/10 shadow-lg ${
                    msg.role === 'user' ? 'bg-luxury-gold text-black' : 'bg-black text-luxury-gold'
                  }`}>
                    {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                  </div>
                  <div className={`max-w-[80%] p-6 rounded-2xl shadow-lg relative ${
                    msg.role === 'user' 
                      ? 'bg-luxury-gold/10 text-white rounded-tr-none border border-luxury-gold/20' 
                      : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/5'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{msg.text}</p>
                    <span className="text-[10px] opacity-40 block mt-3 text-left font-mono">
                      {msg.timestamp.toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-5">
                  <div className="w-10 h-10 rounded-full bg-black border border-white/10 text-luxury-gold flex items-center justify-center">
                    <Loader2 className="animate-spin" size={18} />
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5 flex items-center">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-luxury-gold/50 rounded-full animate-bounce delay-75"></div>
                      <div className="w-1.5 h-1.5 bg-luxury-gold/50 rounded-full animate-bounce delay-150"></div>
                      <div className="w-1.5 h-1.5 bg-luxury-gold/50 rounded-full animate-bounce delay-300"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-black/40 border-t border-white/5">
              <div className="relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="הקלד פקודה או תיאור..."
                  className="w-full bg-luxury-charcoal/50 text-white p-5 pr-14 rounded-2xl border border-white/10 focus:border-luxury-gold/50 focus:ring-1 focus:ring-luxury-gold/50 outline-none transition-all placeholder-gray-600 shadow-inner"
                  disabled={isLoading}
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-luxury-gold text-black rounded-xl hover:bg-white hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] disabled:opacity-0 disabled:scale-75 transition-all duration-300"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentBuilder;