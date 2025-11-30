import React, { useState, useEffect } from 'react';
import { Menu, X, Brain } from 'lucide-react';
import { AppSection } from '../types';

interface HeaderProps {
  currentSection: AppSection;
  onNavigate: (section: AppSection) => void;
}

const Header: React.FC<HeaderProps> = ({ currentSection, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'ראשי', value: AppSection.HOME },
    { label: 'סילבוס הדרכה', value: AppSection.SYLLABUS },
    { label: 'יישומים מתקדמים', value: AppSection.ADVANCED_AI },
    { label: 'בנה סוכן', value: AppSection.AGENT_BUILDER },
  ];

  const handleNav = (val: AppSection) => {
    onNavigate(val);
    setIsOpen(false);
  };

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-luxury-charcoal/90 backdrop-blur-md shadow-lg border-b border-white/5' 
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => handleNav(AppSection.HOME)}
        >
          <div className="p-2 rounded-lg bg-luxury-gold/10 group-hover:bg-luxury-gold/20 transition-colors">
            <Brain className="w-6 h-6 text-luxury-gold" />
          </div>
          <span className="text-xl font-bold tracking-wider text-white">שריר<span className="text-luxury-gold">אמיר</span></span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-8">
          {navItems.map((item) => (
            <button
              key={item.value}
              onClick={() => handleNav(item.value)}
              className={`text-sm font-medium tracking-wide transition-all duration-300 relative group py-2 ${
                currentSection === item.value 
                  ? 'text-luxury-gold' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {item.label}
              <span className={`absolute bottom-0 right-0 h-[1px] bg-luxury-gold transition-all duration-300 ${
                currentSection === item.value ? 'w-full' : 'w-0 group-hover:w-full'
              }`}></span>
            </button>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden bg-luxury-charcoal/95 backdrop-blur-xl border-t border-white/10 absolute w-full left-0 shadow-2xl">
          <div className="flex flex-col p-6 gap-4">
            {navItems.map((item) => (
              <button
                key={item.value}
                onClick={() => handleNav(item.value)}
                className={`text-right px-4 py-3 rounded-lg border border-transparent transition-all ${
                   currentSection === item.value 
                   ? 'bg-luxury-gold/10 text-luxury-gold border-luxury-gold/20' 
                   : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;