export type SfxCategory = 'WIND' | 'RAIN' | 'WATER' | 'NATURE' | 'PEACEFUL' | 'NONE';

export interface PoemScene {
  id: string;
  originalText: string;
  visualPrompt: string;
  sfxDescription: string; 
  sfxCategory: SfxCategory; // New field for procedural audio mapping
  audioBase64?: string;
  imageBase64?: string;
  sfxBase64?: string; // Kept for future compatibility
  duration?: number;
}

export interface PoemAnalysis {
  title: string;
  author: string;
  dynasty: string;
  eraDescription: string;
  scenes: {
    text: string;
    visualDescription: string;
    sfxDescription: string;
    sfxCategory: SfxCategory;
  }[];
}

export enum AppState {
  IDLE,
  ANALYZING,
  GENERATING_MEDIA,
  READY,
  PLAYING,
  ERROR
}

export interface GenerationProgress {
  step: string;
  completed: number;
  total: number;
}