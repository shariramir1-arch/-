
import React from 'react';
import { X, Target, Zap, TrendingUp, Layers } from 'lucide-react';
import { AdvancedUseCase } from '../types';

interface UseCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  useCase: AdvancedUseCase | null;
}

const UseCaseModal: React.FC<UseCaseModalProps> = ({ isOpen, onClose, useCase }) => {
  if (!isOpen || !useCase) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      ></div>

      {/* Main Container */}
      <div className="relative bg-[#0F172A] w-full max-w-4xl rounded-3xl border border-luxury-gold/20 shadow-[0_0_60px_rgba(197,160,89,0.15)] overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
        
        {/* Top Decorative Bar */}
        <div className="h-2 bg-gradient-to-r from-luxury-gold via-[#E5C585] to-luxury-gold w-full"></div>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors z-20"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
            
            {/* Sidebar / Header (Mobile) */}
            <div className="bg-luxury-black/50 p-8 md:w-1/3 border-b md:border-b-0 md:border-l border-white/5 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-luxury-gold/5 rounded-full blur-[80px] pointer-events-none"></div>
                
                <span className="text-luxury-gold text-xs font-bold tracking-[0.2em] uppercase mb-4 block">Case Study</span>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">{useCase.title}</h2>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-luxury-gold/10 border border-luxury-gold/20 rounded-full w-fit mb-6">
                    <span className="w-2 h-2 bg-luxury-gold rounded-full animate-pulse"></span>
                    <span className="text-luxury-gold text-sm font-medium">{useCase.system}</span>
                </div>
                <p className="text-gray-400 font-light leading-relaxed">{useCase.description}</p>
                
                <div className="mt-8 pt-8 border-t border-white/5">
                    <h4 className="flex items-center gap-2 text-white font-bold mb-4 text-sm uppercase tracking-wide">
                        <Layers size={16} className="text-luxury-gold" /> Tech Stack
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {useCase.techStack.map((tech, i) => (
                            <span key={i} className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded border border-white/10 transition-colors">
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-8 md:p-12 md:w-2/3 overflow-y-auto custom-scrollbar bg-luxury-card/30">
                
                {/* Challenge Section */}
                <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                            <Target size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">האתגר העסקי</h3>
                    </div>
                    <p className="text-gray-300 leading-relaxed pl-4 border-r-2 border-red-500/20">
                        {useCase.challenge}
                    </p>
                </div>

                {/* Solution Section */}
                <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Zap size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">הפתרון הטכנולוגי</h3>
                    </div>
                    <p className="text-gray-300 leading-relaxed pl-4 border-r-2 border-blue-500/20">
                        {useCase.solution}
                    </p>
                </div>

                {/* Impact Section */}
                <div className="bg-luxury-gold/5 border border-luxury-gold/10 rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-luxury-gold/10 rounded-lg text-luxury-gold">
                            <TrendingUp size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">תוצאות עסקיות (ROI)</h3>
                    </div>
                    <p className="text-lg text-white font-medium leading-relaxed">
                        {useCase.impact}
                    </p>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};

export default UseCaseModal;
