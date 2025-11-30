import React from 'react';
import { Mail, Phone, Linkedin, Github } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black border-t border-white/10 py-16">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          
          <div className="text-center md:text-right">
            <h3 className="text-3xl font-black text-white mb-2 tracking-tight">שריר <span className="text-luxury-gold">אמיר</span></h3>
            <p className="text-gray-500 font-light tracking-wide text-sm">ARCHITECTING INTELLIGENCE</p>
          </div>
          
          <div className="flex gap-8">
            <a href="#" className="p-3 rounded-full bg-white/5 text-gray-400 hover:text-luxury-gold hover:bg-white/10 transition-all border border-transparent hover:border-luxury-gold/20"><Linkedin size={20} /></a>
            <a href="#" className="p-3 rounded-full bg-white/5 text-gray-400 hover:text-luxury-gold hover:bg-white/10 transition-all border border-transparent hover:border-luxury-gold/20"><Github size={20} /></a>
          </div>

          <div className="text-gray-400 text-center md:text-left space-y-3 font-light">
            <div className="flex items-center gap-3 justify-center md:justify-end group cursor-pointer hover:text-white transition-colors">
              <span dir="ltr" className="tracking-wide">amir.sharir@ai-architect.co.il</span>
              <Mail size={16} className="text-luxury-gold group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-center gap-3 justify-center md:justify-end group cursor-pointer hover:text-white transition-colors">
              <span dir="ltr" className="tracking-wide">053-6576136</span>
              <Phone size={16} className="text-luxury-gold group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </div>
        
        <div className="mt-16 text-center border-t border-white/5 pt-8">
          <p className="text-xs text-gray-600 uppercase tracking-[0.2em]">
            © 2025 Amir Sharir | Premium AI Implementation
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;