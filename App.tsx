import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import SyllabusViewer from './components/SyllabusViewer';
import AdvancedShowcase from './components/AdvancedShowcase';
import AgentBuilder from './components/AgentBuilder';
import LeadForm from './components/LeadForm';
import Footer from './components/Footer';
import { AppSection } from './types';

const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.HOME);

  // Smooth scroll logic when section changes
  useEffect(() => {
    if (currentSection === AppSection.HOME) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.getElementById(currentSection);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [currentSection]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentSection={currentSection} onNavigate={setCurrentSection} />
      
      <main className="flex-grow">
        <div id={AppSection.HOME}>
          <Hero 
            onStart={() => setCurrentSection(AppSection.AGENT_BUILDER)} 
            onContact={() => setCurrentSection(AppSection.CONTACT)}
          />
        </div>

        <div id={AppSection.ADVANCED_AI}>
          <AdvancedShowcase />
        </div>

        <div id={AppSection.SYLLABUS}>
          <SyllabusViewer />
        </div>

        <div id={AppSection.AGENT_BUILDER}>
          <AgentBuilder />
        </div>

        <div id={AppSection.CONTACT}>
          <LeadForm />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default App;