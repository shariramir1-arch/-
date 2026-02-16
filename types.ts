
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

export interface CustomsDeclarationData {
  submissionDate: string;
  agentName: string;
  importerName: string;
  fullDeclarationNumber: string;
  lastFourDigits: string;
  quantity: string;
  weight: string;
  internalTransit: string;
  billOfLadingDate: string;
  cargoDescription: string;
}

export interface CustomsProcessingState {
  step: 'input' | 'upload' | 'processing' | 'results';
  shipmentRequestNumber: string;
  shipmentDescription: string;
  uploadedFile: File | null;
  uploadedImageUrl: string | null;
  extractedData: CustomsDeclarationData | null;
  error: string | null;
}

export enum AppSection {
  HOME = 'home',
  SYLLABUS = 'syllabus',
  AGENT_BUILDER = 'agent-builder',
  ADVANCED_AI = 'advanced-ai',
  CUSTOMS = 'customs',
  CONTACT = 'contact'
}
