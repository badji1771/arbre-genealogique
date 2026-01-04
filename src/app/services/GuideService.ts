// guide.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {GuideSection, GuideStep, UserGuideProgress} from "../models/guide.model";


@Injectable({
  providedIn: 'root'
})
export class GuideService {
  private readonly STORAGE_KEY = 'family-tree-guide-progress';
  private readonly CURRENT_STEP_KEY = 'family-tree-current-step';

  progressSubject = new BehaviorSubject<UserGuideProgress>(this.loadProgress());
  private currentStepSubject = new BehaviorSubject<string | null>(this.getCurrentStep());

  progress$ = this.progressSubject.asObservable();
  currentStep$ = this.currentStepSubject.asObservable();

  // Définition des sections du guide
  readonly sections: GuideSection[] = [
    {
      id: 'getting-started',
      title: 'Démarrage rapide',
      description: 'Les bases pour commencer votre arbre généalogique en quelques clics',
      icon: 'fas fa-rocket',
      steps: [
        {
          id: 'welcome',
          title: 'Bienvenue sur Arbre Généalogique',
          description: 'Découvrez une manière moderne de préserver votre héritage familial. Ce guide interactif vous montrera comment tirer le meilleur parti de l\'application.',
          icon: 'fas fa-hand-holding-heart',
          position: 'center'
        },
        {
          id: 'create-first-family',
          title: 'Créez votre première lignée',
          description: 'Une famille regroupe tous les membres d\'un même arbre. Cliquez sur le bouton "+" dans la barre latérale pour commencer une nouvelle histoire.',
          icon: 'fas fa-users-rays',
          targetElement: '.btn-add-circle',
          position: 'right'
        },
        {
          id: 'add-first-person',
          title: 'Posez la première pierre',
          description: 'Chaque arbre commence par un fondateur. Utilisez le bouton "Ajouter un membre" pour créer le point de départ de votre généalogie.',
          icon: 'fas fa-user-plus',
          targetElement: '.btn-add-member',
          position: 'bottom'
        }
      ]
    },
    {
      id: 'family-management',
      title: 'Organisation & Partage',
      description: 'Gérez plusieurs familles et collaborez avec vos proches',
      icon: 'fas fa-sitemap',
      steps: [
        {
          id: 'switch-families',
          title: 'Navigation fluide',
          description: 'Basculez entre vos différents arbres en un clic depuis la barre latérale gauche. Vous pouvez aussi renommer ou supprimer une famille en la survolant.',
          icon: 'fas fa-exchange-alt',
          targetElement: '.family-card',
          position: 'right'
        },
        {
          id: 'family-actions',
          title: 'Actions puissantes',
          description: 'Le menu "Actions" regroupe les outils d\'export, de duplication et de gestion avancée pour votre arbre actuel.',
          icon: 'fas fa-wand-magic-sparkles',
          targetElement: '.btn-actions',
          position: 'bottom'
        },
        {
          id: 'import-export',
          title: 'Données sans frontières',
          description: 'Importez des fichiers GEDCOM ou JSON, et exportez vos recherches vers Excel pour les partager facilement.',
          icon: 'fas fa-file-export',
          targetElement: '.btn-import',
          position: 'bottom'
        }
      ]
    },
    {
      id: 'person-management',
      title: 'Membres & Descendance',
      description: 'Donnez vie à vos ancêtres et suivez leur lignée',
      icon: 'fas fa-user-gear',
      steps: [
        {
          id: 'add-children',
          title: 'Étendez la lignée',
          description: 'Ajoutez des enfants directement depuis la carte d\'un parent pour construire automatiquement les niveaux de l\'arbre.',
          icon: 'fas fa-baby-carriage',
          targetElement: '.btn-add',
          position: 'bottom'
        },
        {
          id: 'edit-person',
          title: 'Précision historique',
          description: 'Modifiez les détails, ajoutez des photos, des professions ou des notes pour chaque membre.',
          icon: 'fas fa-user-pen',
          targetElement: '.btn-edit',
          position: 'left'
        },
        {
          id: 'person-details',
          title: 'Fiche détaillée',
          description: 'Cliquez sur n\'importe quelle carte pour voir toutes les informations et les statistiques d\'un membre dans le panneau de droite.',
          icon: 'fas fa-address-card',
          targetElement: '.person-card',
          position: 'right'
        }
      ]
    },
    {
      id: 'views-navigation',
      title: 'Vues & Exploration',
      description: 'Découvrez votre arbre sous différents angles',
      icon: 'fas fa-mountain-sun',
      steps: [
        {
          id: 'switch-views',
          title: 'Perspectives multiples',
          description: 'Visualisez vos données en mode Arbre classique, Liste détaillée ou Chronologie historique.',
          icon: 'fas fa-layer-group',
          targetElement: '.view-picker-buttons',
          position: 'bottom'
        },
        {
          id: 'expand-collapse',
          title: 'Gestion de l\'espace',
          description: 'Développez ou réduisez toutes les générations simultanément pour naviguer dans les grands arbres.',
          icon: 'fas fa-up-down-left-right',
          targetElement: '.expansion-group',
          position: 'bottom'
        },
        {
          id: 'generation-navigation',
          title: 'Voyage dans le temps',
          description: 'Utilisez les marqueurs à gauche pour sauter instantanément d\'une génération à l\'autre.',
          icon: 'fas fa-list-ol',
          targetElement: '.generation-sidebar',
          position: 'right'
        }
      ]
    },
    {
      id: 'advanced-features',
      title: 'Outils Experts',
      description: 'Allez plus loin dans l\'analyse de vos données',
      icon: 'fas fa-microscope',
      steps: [
        {
          id: 'quick-search',
          title: 'Retrouvez n\'importe qui',
          description: 'La recherche rapide vous permet de localiser instantanément un membre parmi des centaines.',
          icon: 'fas fa-magnifying-glass',
          targetElement: '.nav-btn:nth-child(7)',
          position: 'left'
        },
        {
          id: 'statistics',
          title: 'Analyse démographique',
          description: 'Consultez la répartition par genre, l\'évolution de la famille et d\'autres indicateurs clés.',
          icon: 'fas fa-chart-pie',
          targetElement: '.family-stats',
          position: 'bottom'
        },
        {
          id: 'json-manager',
          title: 'Contrôle total',
          description: 'Accédez directement à la base de données JSON pour des modifications de masse ou des sauvegardes manuelles.',
          icon: 'fas fa-database',
          targetElement: '.btn-action-primary',
          position: 'bottom'
        }
      ]
    }
  ];

  constructor() {
    this.initializeFirstVisit();
  }

  private loadProgress(): UserGuideProgress {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      completedSteps: [],
      completedSections: [],
      lastVisited: new Date()
    };
  }

  private saveProgress(progress: UserGuideProgress): void {
    progress.lastVisited = new Date();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
    this.progressSubject.next({...progress});
  }

  private getCurrentStep(): string | null {
    return localStorage.getItem(this.CURRENT_STEP_KEY);
  }

  private setCurrentStep(stepId: string | null): void {
    if (stepId) {
      localStorage.setItem(this.CURRENT_STEP_KEY, stepId);
    } else {
      localStorage.removeItem(this.CURRENT_STEP_KEY);
    }
    this.currentStepSubject.next(stepId);
  }

  private initializeFirstVisit(): void {
    const progress = this.loadProgress();
    if (progress.completedSteps.length === 0) {
      // Marquer l'introduction comme complétée par défaut
      this.completeStep('welcome');
    }
  }

  // Méthodes publiques
  startGuide(): void {
    const current = this.getCurrentStep();
    if (!current) {
      // Trouver la première étape non complétée
      const firstStep = this.getNextStep();
      if (firstStep) {
        this.setCurrentStep(firstStep.id);
      }
    }
  }

  getNextStep(): GuideStep | null {
    const progress = this.loadProgress();

    for (const section of this.sections) {
      for (const step of section.steps) {
        if (!progress.completedSteps.includes(step.id)) {
          return step;
        }
      }
    }
    return null;
  }

  completeStep(stepId: string): void {
    const progress = this.loadProgress();

    if (!progress.completedSteps.includes(stepId)) {
      progress.completedSteps.push(stepId);

      // Vérifier si toutes les étapes d'une section sont complétées
      for (const section of this.sections) {
        const allStepsCompleted = section.steps.every(step =>
          progress.completedSteps.includes(step.id)
        );

        if (allStepsCompleted && !progress.completedSections.includes(section.id)) {
          progress.completedSections.push(section.id);
        }
      }

      this.saveProgress(progress);

      // Passer à l'étape suivante
      const nextStep = this.getNextStep();
      this.setCurrentStep(nextStep?.id || null);
    }
  }

  skipStep(stepId: string): void {
    this.completeStep(stepId);
  }

  resetProgress(): void {
    const progress: UserGuideProgress = {
      completedSteps: ['welcome'], // Garder l'introduction
      completedSections: [],
      lastVisited: new Date()
    };
    this.saveProgress(progress);
    this.setCurrentStep(null);
  }

  getProgressPercentage(): number {
    const progress = this.loadProgress();
    const totalSteps = this.sections.reduce((total, section) => total + section.steps.length, 0);
    return totalSteps > 0 ? (progress.completedSteps.length / totalSteps) * 100 : 0;
  }

  getCompletedSectionCount(): number {
    const progress = this.loadProgress();
    return progress.completedSections.length;
  }

  getSectionProgress(sectionId: string): number {
    const section = this.sections.find(s => s.id === sectionId);
    if (!section) return 0;

    const progress = this.loadProgress();
    const completedSteps = section.steps.filter(step =>
      progress.completedSteps.includes(step.id)
    ).length;

    return (completedSteps / section.steps.length) * 100;
  }

  isStepCompleted(stepId: string): boolean {
    const progress = this.loadProgress();
    return progress.completedSteps.includes(stepId);
  }

  isSectionCompleted(sectionId: string): boolean {
    const progress = this.loadProgress();
    return progress.completedSections.includes(sectionId);
  }

  getStepById(stepId: string): GuideStep | undefined {
    for (const section of this.sections) {
      const step = section.steps.find(s => s.id === stepId);
      if (step) return step;
    }
    return undefined;
  }

  getSectionById(sectionId: string): GuideSection | undefined {
    return this.sections.find(s => s.id === sectionId);
  }
}
