import React, { useState } from 'react';
import { SLIDES_DATA } from '../constants';
import { ChevronRight, ChevronLeft, Maximize2, X, Brain, Database, Server, Zap, Bot, ShieldAlert, Award, Boxes } from 'lucide-react';

const IconMap: Record<string, React.ElementType> = {
  Brain, Database, Server, Zap, Bot, ShieldAlert, Award, Boxes
};

const SyllabusViewer: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const slide = SLIDES_DATA[currentIndex];
  const IconComponent = slide.icon && IconMap[slide.icon] ? IconMap[slide.icon] : Brain;

  const nextSlide = () => {
    if (currentIndex < SLIDES_DATA.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const prevSlide = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const containerClass = isFullScreen 
    ? "fixed inset-0 z-50 bg-[#050505] text-white flex items-center justify-center p-4 md:p-10" 
    : "relative bg-luxury-card/60 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/10 aspect-video flex flex-col";

  return (
    <div className="py-24 bg-[#080c14] border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">מסלול ההכשרה <span className="text-luxury-gold">האקסקלוסיבי</span></h2>
          <p className="text-gray-400 font-light">סילבוס אינטראקטיבי - גלה את התכנים</p>
        </div>

        <div className={containerClass}>
          {/* Controls Overlay */}
          <div className="absolute top-6 left-6 z-20 flex gap-2">
            <button 
              onClick={() => setIsFullScreen(!isFullScreen)} 
              className="p-3 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full text-white backdrop-blur transition"
            >
              {isFullScreen ? <X size={20} /> : <Maximize2 size={20} />}
            </button>
          </div>

          <div className="absolute top-6 right-6 z-20 font-mono text-sm text-luxury-gold/80 tracking-widest bg-black/20 px-3 py-1 rounded-full border border-white/5">
            SLIDE {String(currentIndex + 1).padStart(2, '0')} / {String(SLIDES_DATA.length).padStart(2, '0')}
          </div>

          {/* Slide Content */}
          <div className="flex-1 w-full h-full p-8 md:p-16 flex flex-col relative z-10 transition-colors duration-500">
             {/* Background Gradient */}
             <div className="absolute top-0 right-0 w-96 h-96 bg-luxury-gold/5 rounded-full blur-[100px] -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-900/10 rounded-full blur-[80px] -z-10 transform -translate-x-1/2 translate-y-1/2"></div>

             {/* Header */}
             <div className="flex items-start gap-8 mb-10 border-b pb-8 border-white/5">
                <div className="p-5 bg-gradient-to-br from-luxury-gold/20 to-transparent border border-luxury-gold/20 rounded-2xl text-luxury-gold shrink-0 shadow-lg">
                  <IconComponent size={isFullScreen ? 48 : 32} />
                </div>
                <div>
                  <h3 className={`font-bold leading-tight ${isFullScreen ? 'text-5xl text-white' : 'text-3xl text-white'}`}>
                    {slide.title}
                  </h3>
                  <p className={`text-xl mt-3 font-light ${isFullScreen ? 'text-gray-300' : 'text-gray-400'}`}>
                    {slide.subtitle}
                  </p>
                </div>
             </div>

             {/* Body */}
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                {slide.type === 'table' && slide.tableData ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-gray-300">
                      <thead>
                        <tr className="border-b border-white/10 text-luxury-gold text-sm uppercase tracking-wider">
                          <th className="p-4 font-medium">סוג</th>
                          <th className="p-4 font-medium">ראשי תיבות</th>
                          <th className="p-4 font-medium">תיאור</th>
                          <th className="p-4 font-medium">דוגמאות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slide.tableData.map((row, idx) => (
                          <tr key={idx} className={`border-b border-white/5 hover:bg-white/5 transition-colors`}>
                            <td className="p-4 font-bold text-white">{row.col1}</td>
                            <td className="p-4 opacity-70 font-mono text-sm">{row.col2}</td>
                            <td className="p-4">{row.col3}</td>
                            <td className="p-4 text-sm text-gray-400">{row.col4}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <ul className="space-y-6 pr-2">
                    {slide.content.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-4 text-lg text-gray-300 group">
                        <span className="mt-2 w-1.5 h-1.5 bg-luxury-gold rounded-full shrink-0 shadow-[0_0_10px_rgba(197,160,89,0.8)]" />
                        <span className="group-hover:text-white transition-colors">{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
             </div>
          </div>

          {/* Navigation Bar */}
          <div className="p-6 flex justify-between items-center bg-black/20 backdrop-blur border-t border-white/5">
            <button 
              onClick={prevSlide}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 hover:border-luxury-gold/50 border border-transparent transition-all"
            >
              <ChevronRight size={18} /> <span className="text-sm font-medium">הקודם</span>
            </button>
            <div className="flex gap-2">
              {SLIDES_DATA.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx === currentIndex 
                      ? 'w-10 bg-luxury-gold shadow-[0_0_10px_rgba(197,160,89,0.5)]' 
                      : 'w-2 bg-white/20 cursor-pointer hover:bg-white/40'
                  }`}
                  onClick={() => setCurrentIndex(idx)}
                />
              ))}
            </div>
            <button 
              onClick={nextSlide}
              disabled={currentIndex === SLIDES_DATA.length - 1}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black disabled:opacity-30 hover:bg-luxury-gold hover:text-black font-bold transition-all shadow-lg"
            >
              <span className="text-sm">הבא</span> <ChevronLeft size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyllabusViewer;