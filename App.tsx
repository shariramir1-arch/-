import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Hero from './components/hero/Hero';
import SyllabusViewer from './components/syllabus/SyllabusViewer';
import AdvancedShowcase from './components/showcase/AdvancedShowcase';
import AgentBuilder from './components/agent/AgentBuilder';
import LeadForm from './components/contact/LeadForm';
import Footer from './components/layout/Footer';
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