
import React from 'react';
import { X, CheckCircle, ArrowLeft, Mic, Code, Lightbulb } from 'lucide-react';
import { ServiceDetail } from '../types';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceDetail | null;
  onSelect: (serviceId: string) => void;
}

const IconMap: Record<string, React.ElementType> = {
  Mic, Code, Lightbulb
};

const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, service, onSelect }) => {
  if (!isOpen || !service) return null;

  const IconComponent = IconMap[service.iconKey] || Lightbulb;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-luxury-charcoal w-full max-w-2xl rounded-3xl border border-luxury-gold/30 shadow-[0_0_50px_rgba(197,160,89,0.2)] overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
        
        {/* Decorative Header Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-luxury-gold/10 to-transparent pointer-events-none"></div>
        <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-luxury-gold/20 rounded-full blur-[60px] pointer-events-none"></div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-black/40 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-20 border border-white/5"
        >
          <X size={20} />
        </button>

        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar relative z-10">
          
          {/* Header Section */}
          <div className="flex items-start gap-6 mb-8">
            <div className="p-5 bg-black border border-luxury-gold/40 rounded-2xl shadow-lg shrink-0">
              <IconComponent className="w-8 h-8 text-luxury-gold" />
            </div>
            <div>
              <h4 className="text-luxury-gold font-bold tracking-widest text-xs uppercase mb-2">Premium Service</h4>
              <h2 className="text-3xl font-black text-white leading-tight mb-2">{service.title}</h2>
              <p className="text-lg text-gray-400 font-light">{service.subtitle}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <p className="text-gray-300 leading-relaxed text-lg border-l-2 border-luxury-gold/30 pl-4">
              {service.description}
            </p>
          </div>

          {/* Features List */}
          <div className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/5 mb-8">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-luxury-gold rounded-full"></span>
              מה כולל השירות?
            </h3>
            <ul className="space-y-4">
              {service.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 group">
                  <CheckCircle className="w-5 h-5 text-luxury-gold shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-gray-300 text-sm md:text-base group-hover:text-white transition-colors">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Button */}
          <button 
            onClick={() => onSelect(service.id)}
            className="w-full py-4 bg-luxury-gold hover:bg-[#b8860b] text-black font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(197,160,89,0.3)] transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 group"
          >
            <span>{service.ctaText}</span>
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>

        </div>
      </div>
    </div>
  );
};

export default ServiceModal;
