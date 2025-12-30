// guide.component.ts
import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {GuideSection, GuideStep} from "../../models/guide.model";
import {GuideService} from "../../services/GuideService";


@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guide.component.html',
  styleUrls: ['./guide.component.css']
})
export class GuideComponent implements OnInit, OnDestroy {
  @ViewChild('guideOverlay') guideOverlay!: ElementRef;
  @ViewChild('guideModal') guideModal!: ElementRef;
  @ViewChild('stepContent') stepContent!: ElementRef;

  isVisible = false;
  showOverview = false;
  showQuickStart = false;

  currentStep: GuideStep | null = null;
  currentSection: GuideSection | null = null;

  sections: GuideSection[] = [];
  progressPercentage = 0;
  completedSections = 0;

  private overlayClickListener: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;

  constructor(
    private guideService: GuideService,
    private elementRef: ElementRef
  ) {
    this.sections = this.guideService.sections;
  }

  ngOnInit(): void {
    this.guideService.currentStep$.subscribe(stepId => {
      if (stepId) {
        this.showStep(stepId);
      } else {
        this.currentStep = null;
        this.currentSection = null;
      }
    });

    this.guideService.progress$.subscribe(() => {
      this.updateProgress();
    });
  }

  ngOnDestroy(): void {
    this.removeEventListeners();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  show(): void {
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    this.isVisible = true;
    document.body.style.overflow = 'hidden';
    this.showOverview = true;
    this.updateProgress();

    setTimeout(() => {
      this.addEventListeners();
      this.centerModal();
      this.focusInitialElement();
    }, 10);
  }

  hide(): void {
    this.isVisible = false;
    this.showOverview = false;
    this.showQuickStart = false;
    document.body.style.overflow = '';
    this.removeEventListeners();

    // Restore focus to the previously focused element for accessibility
    if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
      try { this.previouslyFocusedElement.focus(); } catch {}
    }
    this.previouslyFocusedElement = null;
  }

  showStep(stepId: string): void {
    const step = this.guideService.getStepById(stepId);
    if (!step) return;

    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    this.currentStep = step;
    this.currentSection = this.findSectionForStep(stepId);
    this.showOverview = false;
    this.showQuickStart = false;
    this.isVisible = true;
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      this.positionStep(step);
      this.addEventListeners();
      this.focusInitialElement();
    }, 10);
  }

  showQuickStartGuide(): void {
    this.showQuickStart = true;
    this.showOverview = false;
    this.currentStep = null;
    this.currentSection = null;
    setTimeout(() => this.focusInitialElement(), 0);
  }

  showOverviewView(): void {
    this.isVisible = true;
    this.showOverview = true;
    this.showQuickStart = false;
    this.currentStep = null;
    this.currentSection = null;
    document.body.style.overflow = 'hidden';
    this.updateProgress();
    setTimeout(() => {
      this.addEventListeners();
      this.centerModal();
      this.focusInitialElement();
    }, 10);
  }

  completeCurrentStep(): void {
    if (this.currentStep) {
      this.guideService.completeStep(this.currentStep.id);

      // Exécuter l'action si définie
      if (this.currentStep.action) {
        this.currentStep.action();
      }
    }

    this.hide();
  }

  skipCurrentStep(): void {
    if (this.currentStep) {
      this.guideService.skipStep(this.currentStep.id);
    }
    this.hide();
  }

  skipSection(sectionId: string): void {
    const section = this.guideService.getSectionById(sectionId);
    if (section) {
      section.steps.forEach(step => {
        if (!this.guideService.isStepCompleted(step.id)) {
          this.guideService.skipStep(step.id);
        }
      });
    }
    this.updateProgress();
  }

  resetGuide(): void {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tout le guide ?')) {
      this.guideService.resetProgress();
      this.updateProgress();
      this.showOverview = true;
    }
  }

  startFromBeginning(): void {
    this.guideService.resetProgress();
    this.guideService.startGuide();
    this.showOverview = false;
  }

  private findSectionForStep(stepId: string): GuideSection | null {
    for (const section of this.sections) {
      if (section.steps.some(step => step.id === stepId)) {
        return section;
      }
    }
    return null;
  }

  private positionStep(step: GuideStep): void {
    if (!step.targetElement) {
      this.centerModal();
      return;
    }

    const target = document.querySelector(step.targetElement);
    if (!target) {
      this.centerModal();
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const modal = this.guideModal?.nativeElement;
    if (!modal) return;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'top':
        top = targetRect.top - modal.offsetHeight - 20;
        left = targetRect.left + (targetRect.width / 2) - (modal.offsetWidth / 2);
        break;
      case 'bottom':
        top = targetRect.bottom + 20;
        left = targetRect.left + (targetRect.width / 2) - (modal.offsetWidth / 2);
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - (modal.offsetHeight / 2);
        left = targetRect.left - modal.offsetWidth - 20;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - (modal.offsetHeight / 2);
        left = targetRect.right + 20;
        break;
      default: // center
        this.centerModal();
        return;
    }

    // Ajuster pour rester dans la fenêtre
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    top = Math.max(20, Math.min(top, viewportHeight - modal.offsetHeight - 20));
    left = Math.max(20, Math.min(left, viewportWidth - modal.offsetWidth - 20));

    modal.style.position = 'fixed';
    modal.style.top = `${top}px`;
    modal.style.left = `${left}px`;
    modal.style.transform = 'none';
  }

  private centerModal(): void {
    const modal = this.guideModal?.nativeElement;
    if (!modal) return;

    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
  }

  private updateProgress(): void {
    this.progressPercentage = Math.round(this.guideService.getProgressPercentage());
    this.completedSections = this.guideService.getCompletedSectionCount();
  }

  private addEventListeners(): void {
    this.removeEventListeners();

    // Cliquer sur l'overlay pour fermer
    this.overlayClickListener = () => this.hide();
    this.guideOverlay?.nativeElement.addEventListener('click', this.overlayClickListener);

    // Empêcher la propagation depuis le modal
    const modal = this.guideModal?.nativeElement;
    if (modal) {
      modal.addEventListener('click', (event: MouseEvent) => {
        event.stopPropagation();
      });
    }

    // Observer les changements de taille de la fenêtre
    this.resizeObserver = new ResizeObserver(() => {
      if (this.currentStep) {
        this.positionStep(this.currentStep);
      } else {
        this.centerModal();
      }
    });

    if (this.guideModal?.nativeElement) {
      this.resizeObserver.observe(this.guideModal.nativeElement);
    }

    // Gestion clavier: Enter pour valider, ArrowRight pour continuer, Escape pour fermer, Tab pour trap focus
    this.keydownHandler = (e: KeyboardEvent) => {
      if (!this.isVisible) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.currentStep) {
          this.completeCurrentStep();
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.continueGuide();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
      } else if (e.key === 'Tab') {
        // Focus trap
        const container: HTMLElement | null = this.guideModal?.nativeElement || null;
        if (!container) return;
        const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
          .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', this.keydownHandler);
  }

  private removeEventListeners(): void {
    if (this.overlayClickListener) {
      this.guideOverlay?.nativeElement.removeEventListener('click', this.overlayClickListener);
      this.overlayClickListener = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  private handleEscapeKey(event: KeyboardEvent): void {
    if (this.isVisible) {
      event.preventDefault();
      this.hide();
    }
  }

  private focusInitialElement(): void {
    // Prefer primary action in current context, else close button, else modal itself
    const modal: HTMLElement | null = this.guideModal?.nativeElement || null;
    if (!modal) return;

    const primarySelectors = [
      '.guide-content .btn.btn-primary',
      '.guide-header .btn-close'
    ];

    for (const sel of primarySelectors) {
      const el = modal.querySelector<HTMLElement>(sel);
      if (el) { try { el.focus(); return; } catch { /* ignore */ } }
    }

    try { modal.focus(); } catch {}
  }

  getSectionProgress(sectionId: string): number {
    return this.guideService.getSectionProgress(sectionId);
  }

  isSectionCompleted(sectionId: string): boolean {
    return this.guideService.isSectionCompleted(sectionId);
  }

  isStepCompleted(stepId: string): boolean {
    return this.guideService.isStepCompleted(stepId);
  }

  getTotalSteps(): number {
    return this.sections.reduce((total, section) => total + section.steps.length, 0);
  }

  getCompletedSteps(): number {
    const progress = this.guideService.progressSubject.value;
    return progress.completedSteps.length;
  }

  startSection(sectionId: string): void {
    const section = this.guideService.getSectionById(sectionId);
    if (!section) return;

    // Trouver la première étape non complétée de cette section
    const firstUncompletedStep = section.steps.find(step =>
      !this.guideService.isStepCompleted(step.id)
    );

    if (firstUncompletedStep) {
      this.showStep(firstUncompletedStep.id);
    } else {
      // Toutes les étapes sont complétées, montrer la première
      this.showStep(section.steps[0].id);
    }
  }

  continueGuide(): void {
    const nextStep = this.guideService.getNextStep();
    if (nextStep) {
      this.showStep(nextStep.id);
    } else {
      this.showOverview = true;
    }
  }
}
