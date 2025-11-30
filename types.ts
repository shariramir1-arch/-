
export interface Slide {
  id: number;
  title: string;
  subtitle: string;
  content: string[];
  icon?: string;
  type: 'standard' | 'table' | 'diagram' | 'quote' | 'final';
  tableData?: Array<{ col1: string; col2: string; col3: string; col4: string }>;
}

export interface AdvancedUseCase {
  id: number;
  title: string;
  system: string;
  description: string;
  benefit: string;
  icon: string;
  // Extended fields for deep dive
  challenge: string;
  solution: string;
  impact: string;
  techStack: string[];
}

export interface ServiceDetail {
  id: string; // matches form interest value (lectures, development, consulting)
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  iconKey: string;
  ctaText: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum AppSection {
  HOME = 'home',
  SYLLABUS = 'syllabus',
  AGENT_BUILDER = 'agent-builder',
  ADVANCED_AI = 'advanced-ai',
  CONTACT = 'contact'
}
