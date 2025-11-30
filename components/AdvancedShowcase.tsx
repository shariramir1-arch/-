
import React, { useState } from 'react';
import { ADVANCED_CASES } from '../constants';
import { 
  MessageSquare, Eye, Workflow, Activity, ShoppingCart, Boxes, ArrowUpRight, Star 
} from 'lucide-react';
import { AdvancedUseCase } from '../types';
import UseCaseModal from './UseCaseModal';

const IconMap: Record<string, React.ElementType> = {
  MessageSquare, Eye, Workflow, Activity, ShoppingCart, Boxes
};

const AdvancedShowcase: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<AdvancedUseCase | null>(null);

  return (
    <div className="py-24 bg-luxury-black relative overflow-hidden">
      <UseCaseModal 
        isOpen={!!selectedCase} 
        onClose={() => setSelectedCase(null)} 
        useCase={selectedCase} 
      />

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-luxury-gold/30 to-transparent"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-block p-2 rounded-full bg-luxury-gold/5 mb-4 animate-float">
             <Star className="w-6 h-6 text-luxury-gold fill-luxury-gold/20" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            יישומים <span className="text-gradient-gold">פורצי דרך</span>
          </h2>
          <p className="text-xl text-gray-400 font-light">
            הטכנולוגיה של המחר, מיושמת היום במערכות הליבה של הארגון.
            <br/> <span className="text-sm opacity-60">(לחץ על כרטיס לפירוט טכני מלא)</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ADVANCED_CASES.map((useCase) => {
            const Icon = IconMap[useCase.icon] || Boxes;
            return (
              <div 
                key={useCase.id}
                onClick={() => setSelectedCase(useCase)}
                className="group relative bg-luxury-card/50 backdrop-blur-sm border border-white/5 rounded-2xl p-8 hover:border-luxury-gold/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(197,160,89,0.15)] overflow-hidden cursor-pointer transform hover:-translate-y-2"
              >
                {/* Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-luxury-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 group-hover:border-luxury-gold/50 group-hover:bg-luxury-gold/10 transition-colors shadow-lg">
                        <Icon className="w-6 h-6 text-gray-300 group-hover:text-luxury-gold transition-colors" />
                    </div>
                    <span className="text-[10px] font-bold px-3 py-1 bg-black/50 border border-white/10 text-luxury-gold rounded-full uppercase tracking-widest shadow-sm">
                        {useCase.system}
                    </span>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-luxury-gold transition-colors">
                    {useCase.title}
                    </h3>
                    
                    <p className="text-gray-400 mb-8 leading-relaxed font-light text-sm h-10 overflow-hidden text-ellipsis line-clamp-2">
                    {useCase.description}
                    </p>

                    <div className="border-t border-white/5 pt-6 mt-auto">
                    <div className="flex items-center justify-between text-gray-300 font-medium text-sm group-hover:text-white transition-colors">
                        <div className="flex items-center gap-2">
                            <ArrowUpRight className="w-4 h-4 text-luxury-gold" />
                            <span className="text-xs tracking-wide uppercase">ROI Impact</span>
                        </div>
                        <span className="text-luxury-gold font-bold">{useCase.benefit}</span>
                    </div>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdvancedShowcase;
