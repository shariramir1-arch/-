
import React from 'react';
import { ArrowLeft, Brain, CircuitBoard, Sparkles } from 'lucide-react';

interface HeroProps {
  onStart: () => void;
  onContact: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStart, onContact }) => {
  return (
    <div className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#050505]">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-luxury-gold/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
      
      <div className="container mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
        
        {/* Text Content */}
        <div className="md:w-1/2 text-center md:text-right">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8 animate-fade-in-up">
            <Sparkles className="w-4 h-4 text-luxury-gold" />
            <span className="text-sm font-medium text-luxury-gold tracking-wide">חדשנות טכנולוגית לעסקים</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[1.1] tracking-tight text-white">
            שריר <span className="text-gradient-gold">אמיר</span><br/>
            <span className="text-3xl md:text-5xl font-thin text-gray-300">מטמיע מערכות מידע ובינה מלאכותית AI</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-lg mx-auto md:mx-0 font-light leading-relaxed">
            הפוך את הארגון שלך למוביל שוק באמצעות הטמעת סוכנים חכמים, מערכות לומדות וחוויות משתמש פורצות דרך.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center md:justify-start">
            <button 
              onClick={onStart}
              className="group relative px-8 py-4 bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-bold rounded-full shadow-[0_0_20px_rgba(197,160,89,0.3)] hover:shadow-[0_0_30px_rgba(197,160,89,0.5)] transition-all transform hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 skew-x-12 -translate-x-full"></div>
              <span className="relative flex items-center justify-center gap-2">
                התחל לבנות סוכן
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </span>
            </button>
            
            <button 
              onClick={onContact}
              className="px-8 py-4 bg-transparent border border-white/20 text-white font-medium rounded-full hover:bg-white/5 hover:border-luxury-gold/50 transition-all backdrop-blur-sm"
            >
              צור קשר
            </button>
          </div>
        </div>
        
        {/* Visual Content */}
        <div className="md:w-1/2 flex justify-center relative mt-12 md:mt-0">
           {/* Glow behind the image */}
           <div className="absolute inset-0 bg-gradient-to-tr from-luxury-gold/10 to-blue-500/10 blur-[80px] rounded-full animate-pulse-slow"></div>
           
           <div className="relative w-80 h-80 md:w-[500px] md:h-[500px] animate-float">
              
              {/* Outer Ring - Dashed White */}
              <div className="absolute inset-[-20px] border-2 border-white/20 border-dashed rounded-full animate-spin-slow"></div>
              
              {/* Middle Ring - Solid Gold Accent */}
              <div className="absolute inset-[-10px] border border-luxury-gold/30 rounded-full animate-[spin_20s_linear_infinite_reverse]"></div>

              {/* Inner Tech Ring - Partial Borders */}
              <div className="absolute inset-4 border-2 border-transparent border-t-luxury-gold/60 border-l-luxury-gold/60 rounded-full animate-[spin_10s_linear_infinite] shadow-[0_0_15px_rgba(197,160,89,0.2)]"></div>
              
              {/* Inner Decorative Ring */}
              <div className="absolute inset-12 border border-white/10 rounded-full"></div>

              {/* Central Image Container */}
              <div className="absolute inset-8 rounded-full overflow-hidden border-2 border-luxury-gold/30 shadow-[0_0_30px_rgba(197,160,89,0.2)] bg-luxury-card z-10">
                 <img 
                   src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&auto=format&fit=crop" 
                   alt="AI Innovation" 
                   className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                 />
                 {/* Reduced overlay to keep it bright, just subtle shadow at bottom */}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>
              </div>

              {/* Orbiting Satellite Elements */}
              <div className="absolute w-full h-full animate-[spin_12s_linear_infinite]">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 w-4 h-4 bg-luxury-gold rounded-full shadow-[0_0_15px_rgba(197,160,89,0.8)]"></div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -left-8 top-1/4 p-4 bg-luxury-charcoal/90 backdrop-blur-xl border border-luxury-gold/30 rounded-2xl shadow-2xl animate-bounce delay-700 z-20">
                 <Brain className="w-6 h-6 text-luxury-gold mb-2" />
                 <div className="h-1 w-12 bg-white/20 rounded mb-1"></div>
                 <div className="h-1 w-8 bg-white/10 rounded"></div>
              </div>

              <div className="absolute -right-8 bottom-1/4 p-4 bg-luxury-charcoal/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl animate-bounce delay-150 z-20">
                 <CircuitBoard className="w-6 h-6 text-blue-400 mb-2" />
                 <div className="h-1 w-12 bg-white/20 rounded mb-1"></div>
                 <div className="h-1 w-8 bg-white/10 rounded"></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
