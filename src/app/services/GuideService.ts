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
      description: 'Les bases pour commencer votre arbre généalogique',
      icon: '🚀',
      steps: [
        {
          id: 'welcome',
          title: 'Bienvenue',
          description: 'Bienvenue dans l\'application Arbre Généalogique ! Cette guide vous accompagnera dans la découverte des fonctionnalités.',
          icon: '👋',
          position: 'center'
        },
        {
          id: 'create-first-family',
          title: 'Créer votre première famille',
          description: 'Commencez par créer une famille pour organiser votre arbre généalogique.',
          icon: '🏠',
          targetElement: '.btn-add-circle',
          position: 'bottom'
        },
        {
          id: 'add-first-person',
          title: 'Ajouter le premier membre',
          description: 'Ajoutez le fondateur de votre famille en cliquant sur "Ajouter un membre".',
          icon: '👤',
          targetElement: '.btn-add-member',
          position: 'bottom'
        }
      ]
    },
    {
      id: 'family-management',
      title: 'Gestion des familles',
      description: 'Comment organiser et gérer vos familles',
      icon: '📚',
      steps: [
        {
          id: 'switch-families',
          title: 'Changer de famille',
          description: 'Cliquez sur une famille dans la barre latérale pour la sélectionner.',
          icon: '🔄',
          targetElement: '.family-card',
          position: 'right'
        },
        {
          id: 'family-actions',
          title: 'Actions rapides',
          description: 'Utilisez le menu Actions pour exporter, dupliquer ou partager votre famille.',
          icon: '⚡',
          targetElement: '.btn-actions',
          position: 'bottom'
        },
        {
          id: 'import-export',
          title: 'Import/Export',
          description: 'Importez des données existantes ou exportez votre arbre au format Excel, JSON.',
          icon: '📤',
          targetElement: '.btn-import',
          position: 'bottom'
        }
      ]
    },
    {
      id: 'person-management',
      title: 'Gestion des personnes',
      description: 'Ajouter et modifier les membres de votre famille',
      icon: '👥',
      steps: [
        {
          id: 'add-children',
          title: 'Ajouter des enfants',
          description: 'Cliquez sur le bouton "Ajouter enfant" sur une carte personne pour ajouter des descendants.',
          icon: '👶',
          targetElement: '.member-node',
          position: 'bottom'
        },
        {
          id: 'edit-person',
          title: 'Modifier une personne',
          description: 'Cliquez sur l\'icône ✏️ pour modifier les informations d\'une personne.',
          icon: '✏️',
          targetElement: '.btn-action',
          position: 'left'
        },
        {
          id: 'person-details',
          title: 'Voir les détails',
          description: 'Cliquez sur une personne pour afficher ses détails dans la barre latérale.',
          icon: '📋',
          targetElement: '.person-card',
          position: 'right'
        }
      ]
    },
    {
      id: 'views-navigation',
      title: 'Vues et navigation',
      description: 'Explorer votre arbre de différentes manières',
      icon: '🌳',
      steps: [
        {
          id: 'switch-views',
          title: 'Changer de vue',
          description: 'Utilisez les boutons en haut pour basculer entre les vues Arbre, Liste, Chronologie et Carte.',
          icon: '👁️',
          targetElement: '.view-picker-btn',
          position: 'bottom'
        },
        {
          id: 'expand-collapse',
          title: 'Développer/Réduire',
          description: 'Utilisez les boutons "Ouvrir tout" et "Fermer tout" pour contrôler l\'affichage des générations.',
          icon: '↕️',
          targetElement: '.expansion-controls',
          position: 'bottom'
        },
        {
          id: 'generation-navigation',
          title: 'Navigation par génération',
          description: 'Cliquez sur les marqueurs de génération à gauche pour naviguer rapidement.',
          icon: '⬅️',
          targetElement: '.generation-marker',
          position: 'right'
        }
      ]
    },
    {
      id: 'advanced-features',
      title: 'Fonctionnalités avancées',
      description: 'Découvrez les fonctionnalités puissantes de l\'application',
      icon: '✨',
      steps: [
        {
          id: 'quick-search',
          title: 'Recherche rapide',
          description: 'Utilisez la loupe dans la navigation rapide pour rechercher des personnes.',
          icon: '🔍',
          targetElement: '.nav-btn:nth-child(8)',
          position: 'left'
        },
        {
          id: 'statistics',
          title: 'Statistiques',
          description: 'Consultez les statistiques globales dans la barre latérale pour une vue d\'ensemble.',
          icon: '📊',
          targetElement: '.stats-section',
          position: 'left'
        },
        {
          id: 'json-manager',
          title: 'Gestion JSON avancée',
          description: 'Utilisez le gestionnaire JSON pour des opérations avancées sur vos données.',
          icon: '💾',
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
    this.progressSubject.next(progress);
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
