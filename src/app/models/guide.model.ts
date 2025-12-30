// guide.model.ts
export interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  component?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  targetElement?: string;
  action?: () => void;
}

export interface GuideSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  steps: GuideStep[];
}

export interface UserGuideProgress {
  completedSteps: string[];
  completedSections: string[];
  currentStep?: string;
  lastVisited?: Date;
}
