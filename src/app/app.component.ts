import { Component, OnInit, ElementRef, ViewChild, HostListener,ChangeDetectorRef } from '@angular/core';
import { FamilyTreeService } from './services/family-tree.service';
import { ExcelExportService } from './services/excel-export.service';
import { Family, Person } from './models/person.model';
import { CommonModule, DatePipe } from "@angular/common";
import { PersonCardComponent } from './components/person-card/person-card.component';
import { FamilySidebarComponent } from './components/family-sidebar/family-sidebar.component';
import { PersonModalComponent } from './components/person-modal/person-modal.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {JsonDatabaseService} from "./services/json-database.service";
import {JsonManagerComponent} from "./components/json-manager/json-manager.component";


interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  icon: string;
}

interface QuickOption {
  id: string;
  icon: string;
  title: string;
  description: string;
  action: () => void;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    PersonCardComponent,
    FamilySidebarComponent,
    PersonModalComponent,
    FormsModule,
    ReactiveFormsModule,
    JsonManagerComponent
  ],
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  // Données principales
  families: Family[] = [];
  selectedFamily: Family | null = null;
  selectedPerson: Person | null = null;

  showJsonManager = false;

  // États d'affichage
  showPersonModal = false;
  showAddFamily = false;
  showAllGenerations = true;
  sidebarCollapsed = false; // Renommé pour correspondre au template
  currentView: 'tree' | 'list' | 'timeline' | 'map' = 'tree';

  // Données de formulaire
  editingPerson: Person | null = null;
  parentForNewChild: Person | null = null;
  newFamilyName = '';

  // Gestion des générations
  collapsedLevels: Set<number> = new Set<number>();
  maxLevel = 0;

  // Nouvelles propriétés pour l'interface améliorée
  toasts: Toast[] = [];
  toastId = 0;
  isLoading = false;
  searchQuery = '';

  // Options de démarrage rapide
  quickOptions: QuickOption[] = [
    {
      id: 'simple',
      icon: '🌱',
      title: 'Arbre simple',
      description: 'Démarrez avec une structure basique',
      action: () => this.startWithTemplate('simple')
    },
    {
      id: 'gedcom',
      icon: '📤',
      title: 'Importer GEDCOM',
      description: 'Importez un arbre existant',
      action: () => this.importFromGedcom()
    },
    {
      id: 'tutorial',
      icon: '🎓',
      title: 'Guide pas à pas',
      description: 'Apprenez à créer votre arbre',
      action: () => this.openTutorial()
    }
  ];

  @ViewChild('treeContainer') treeContainer!: ElementRef;


  personFormData = {
    nom: '',
    prenom: '',
    telephone: '',
    adresse: '',
    email: '',
    parentId: null as number | null,
    genre: 'homme' as 'homme' | 'femme',
    photo: '',
    dateNaissance: '',
    profession: '',
    notes: ''
  };

  constructor(
   // private familyTreeService: FamilyTreeService,
   private jsonDb: JsonDatabaseService,
    private excelExportService: ExcelExportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFamilies();

    // Vérifier si c'est la première visite
    const isFirstVisit = !localStorage.getItem('hasVisitedBefore');
    if (isFirstVisit) {
      setTimeout(() => {
        this.showToast('Bienvenue dans Arbre Généalogique !', 'info', '🎉');
        localStorage.setItem('hasVisitedBefore', 'true');
      }, 1000);
    }
  }

  // Chargement initial des familles
  loadFamilies(): void {
    this.jsonDb.families$.subscribe(families => {
      this.families = families;
      this.calculateMaxLevel();

      if (!this.selectedFamily && families.length > 0) {
        this.selectFamily(families[0]);
      }
    });

    this.jsonDb.selectedFamily$.subscribe(family => {
      this.selectedFamily = family;
      this.selectedPerson = null;
      this.calculateMaxLevel();
    });
  }

  // === MÉTHODES POUR LES BOUTONS DU HEADER ===
  triggerImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.ged';
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        if (target.files[0].name.endsWith('.json')) {
          this.importFromJson(event);
        } else {
          this.importFromGedcom();
        }
      }
    };
    input.click();
  }

  showGuide(): void {
    this.openTutorial();
  }

  manageFamily(): void {
    this.showToast('Gestion de famille - Fonctionnalité à venir', 'info', '⚙️');
  }

  // === MÉTHODES POUR LA SIDEBAR ===
  createFirstFamily(): void {
    this.showAddFamily = true;
    setTimeout(() => {
      const input = document.querySelector('.modern-input') as HTMLInputElement;
      if (input) input.focus();
    }, 100);
  }

  quickView(family: Family): void {
    this.selectFamily(family);
    this.showToast(`Vue rapide de ${family.name}`, 'info', '👁️');
  }

  addNewFamily(): void {
    if (this.newFamilyName.trim()) {
      const family = this.jsonDb.addFamily(this.newFamilyName.trim());
      this.jsonDb.selectFamily(family);
      this.newFamilyName = '';
      this.showAddFamily = false;
      this.showToast('Nouvelle famille créée', 'success', '✅');
    }
  }

  // === MÉTHODES POUR LA PAGE D'ACCUEIL ===
  openSample(): void {
    const sampleFamily = this.jsonDb.createSampleFamily();
    this.selectFamily(sampleFamily);
    this.showToast('Exemple chargé avec succès', 'success', '✅');
  }

  startWithTemplate(template: string): void {
    let familyName = '';

    switch(template) {
      case 'simple':
        familyName = 'Arbre Simple';
        break;
      default:
        familyName = 'Nouvelle Famille';
    }

    const family = this.jsonDb.addFamily(familyName);
    this.jsonDb.selectFamily(family);
    this.showToast(`${familyName} créé avec succès`, 'success', '✅');
  }

  importFromGedcom(): void {
    this.showToast('Import GEDCOM - Fonctionnalité à venir', 'info', '📤');
  }

  openTutorial(): void {
    this.showToast('Ouverture du guide', 'info', '📖');
  }

  // === MÉTHODES POUR LE TABLEAU DE BORD FAMILLE ===
  setView(view: 'tree' | 'list' | 'timeline' | 'map'): void {
    this.currentView = view;
    this.showToast(`Vue ${this.getViewLabel(view)} activée`, 'info', this.getViewIcon(view));
  }

  private getViewLabel(view: string): string {
    const labels: {[key: string]: string} = {
      'tree': 'arbre',
      'list': 'liste',
      'timeline': 'chronologie',
      'map': 'carte'
    };
    return labels[view] || view;
  }

  private getViewIcon(view: string): string {
    const icons: {[key: string]: string} = {
      'tree': '🌳',
      'list': '📋',
      'timeline': '📅',
      'map': '🗺️'
    };
    return icons[view] || '👁️';
  }

  expandAll(): void {
    this.expandAllGenerations();
    this.showToast('Toutes les générations développées', 'success', '⬇️');
  }

  collapseAll(): void {
    this.collapseAllGenerations();
    this.showToast('Toutes les générations réduites', 'success', '➡️');
  }

  toggleViewMode(): void {
    this.toggleShowAllGenerations();
    const message = this.showAllGenerations ?
      'Affichage de toutes les générations' :
      'Affichage sélectif des générations';
    this.showToast(message, 'info', '🔄');
  }

  shareFamily(): void {
    if (this.selectedFamily) {
      // Créer un lien de partage
      const shareData = {
        title: `Arbre Généalogique - ${this.selectedFamily.name}`,
        text: `Découvrez l'arbre généalogique de ${this.selectedFamily.name}`,
        url: window.location.href
      };

      if (navigator.share) {
        navigator.share(shareData)
          .then(() => this.showToast('Partage réussi', 'success', '✅'))
          .catch(() => this.showToast('Partage annulé', 'info', 'ℹ️'));
      } else {
        // Fallback pour les navigateurs qui ne supportent pas Web Share API
        navigator.clipboard.writeText(window.location.href)
          .then(() => this.showToast('Lien copié dans le presse-papier', 'success', '📋'))
          .catch(() => this.showToast('Impossible de copier le lien', 'error', '❌'));
      }
    }
  }

  duplicateFamily(): void {
    if (this.selectedFamily) {
      const duplicated = this.jsonDb.duplicateFamily(this.selectedFamily.id);
      if (duplicated) {
        this.selectFamily(duplicated);
        this.showToast('Famille dupliquée avec succès', 'success', '⎘');
      }
    }
  }

  editFamily(): void {
    if (this.selectedFamily) {
      const newName = prompt('Nouveau nom de la famille :', this.selectedFamily.name);
      if (newName && newName.trim() && newName !== this.selectedFamily.name) {
        this.jsonDb.updateFamilyName(this.selectedFamily.id, newName.trim());
        this.showToast('Nom de famille modifié', 'success', '✏️');
      }
    }
  }

  deleteFamily(): void {
    if (this.selectedFamily && confirm(`Supprimer définitivement "${this.selectedFamily.name}" ?`)) {
      this.jsonDb.deleteFamily(this.selectedFamily.id);
      this.selectedFamily = null;
      this.showToast('Famille supprimée', 'warning', '🗑️');
    }
  }

  // === MÉTHODES POUR LA NAVIGATION RAPIDE ===
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    const message = this.sidebarCollapsed ?
      'Sidebar réduite' :
      'Sidebar étendue';
    this.showToast(message, 'info', '↔️');
  }

  addQuickPerson(): void {
    if (this.selectedFamily) {
      this.openAddPersonModal();
    } else {
      this.showToast('Veuillez d\'abord sélectionner une famille', 'warning', '🏠');
    }
  }

  searchPersons(): void {
    if (this.selectedFamily) {
      const searchTerm = prompt('Rechercher une personne (nom ou prénom) :');
      if (searchTerm && searchTerm.trim()) {
        const results = this.jsonDb.searchPerson(searchTerm.trim());
        if (results.length > 0) {
          this.showToast(`${results.length} résultat(s) trouvé(s)`, 'success', '🔍');
        } else {
          this.showToast('Aucun résultat trouvé', 'info', '🔍');
        }
      }
    } else {
      this.showToast('Veuillez d\'abord sélectionner une famille', 'warning', '🏠');
    }
  }

  scrollToTop(): void {
    if (this.treeContainer) {
      this.treeContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  scrollToBottom(): void {
    if (this.treeContainer) {
      this.treeContainer.nativeElement.scrollTo({
        top: this.treeContainer.nativeElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  // === MÉTHODES DE TOAST ===
  showToast(message: string, type: Toast['type'] = 'info', icon?: string): void {
    const toastIcons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };

    const toast: Toast = {
      id: this.toastId++,
      message,
      type,
      icon: icon || toastIcons[type]
    };

    this.toasts.push(toast);

    // Auto-dismiss après 3 secondes
    setTimeout(() => {
      this.dismissToast(toast);
    }, 3000);
  }

  dismissToast(toast: Toast): void {
    this.toasts = this.toasts.filter(t => t.id !== toast.id);
  }

  // === MÉTHODES DE STATISTIQUES ===
  getTotalMembersAllFamilies(): number {
    return this.families.reduce((total, family) => total + this.getTotalMembers(family), 0);
  }

  getTotalGenerations(): number {
    return this.families.reduce((total, family) => {
      const maxDepth = this.getMaxDepth(family.members);
      return total + (maxDepth + 1);
    }, 0);
  }

  getGrowthTrend(): number {
    if (!this.selectedFamily) return 0;
    const memberCount = this.getTotalMembers(this.selectedFamily);
    if (memberCount > 20) return 2;
    if (memberCount > 10) return 1;
    return 0;
  }

  // === MÉTHODES DE GÉNÉRATIONS ===
  calculateMaxLevel(): void {
    if (!this.selectedFamily) {
      this.maxLevel = 0;
      return;
    }
    this.maxLevel = this.getMaxDepth(this.selectedFamily.members);
  }

  private getMaxDepth(persons: Person[]): number {
    let maxDepth = 0;
    persons.forEach(person => {
      const depth = this.getPersonDepth(person);
      if (depth > maxDepth) maxDepth = depth;
    });
    return maxDepth;
  }

  private getPersonDepth(person: Person, currentDepth: number = 0): number {
    let maxDepth = currentDepth;
    if (person.children && person.children.length > 0) {
      person.children.forEach(child => {
        const depth = this.getPersonDepth(child, currentDepth + 1);
        if (depth > maxDepth) maxDepth = depth;
      });
    }
    return maxDepth;
  }

  getGenerationIcon(level: number): string {
    const icons = [
      '👑',    // Génération 0: Fondateurs
      '👨‍👩‍👧‍👦', // Génération 1: Parents
      '👪',    // Génération 2: Famille élargie
      '🌱',    // Génération 3: Jeunes générations
      '🍃',    // Génération 4
      '🌿',    // Génération 5
      '🌳',    // Génération 6
      '🌲',    // Génération 7
      '🎋',    // Génération 8
      '🎄'     // Génération 9+
    ];
    return icons[level] || '⭐';
  }

  getGenerationTitle(level: number): string {
    const titles = [
      'Fondateurs',
      'Parents',
      'Grands-parents',
      'Arrière-grands-parents',
      '4e Génération',
      '5e Génération',
      '6e Génération',
      '7e Génération',
      '8e Génération',
      '9e Génération'
    ];
    return titles[level] || `${level + 1}e Génération`;
  }

  getGenerationLevels(): number[] {
    return Array.from({ length: this.maxLevel + 1 }, (_, i) => i);
  }

  toggleShowAllGenerations(): void {
    this.showAllGenerations = !this.showAllGenerations;
    if (this.showAllGenerations) {
      this.collapsedLevels.clear();
    } else {
      for (let i = 1; i <= this.maxLevel; i++) {
        this.collapsedLevels.add(i);
      }
    }
  }

  toggleLevel(level: number): void {
    if (this.collapsedLevels.has(level)) {
      this.collapsedLevels.delete(level);
      if (this.collapsedLevels.size === 0) {
        this.showAllGenerations = true;
      }
    } else {
      this.collapsedLevels.add(level);
      if (this.showAllGenerations) {
        this.showAllGenerations = false;
      }
    }
  }

  isLevelCollapsed(level: number): boolean {
    return !this.showAllGenerations && this.collapsedLevels.has(level);
  }

  expandAllGenerations(): void {
    this.collapsedLevels.clear();
    this.showAllGenerations = true;
  }

  collapseAllGenerations(): void {
    this.collapsedLevels.clear();
    this.showAllGenerations = false;
    for (let i = 1; i <= this.maxLevel; i++) {
      this.collapsedLevels.add(i);
    }
  }

  getVisibleLevelsCount(): number {
    if (this.showAllGenerations) return this.maxLevel + 1;
    return this.maxLevel + 1 - this.collapsedLevels.size;
  }

  hasMembersInLevel(level: number): boolean {
    return this.getMemberCountByLevel(level) > 0;
  }

  getMemberCountByLevel(level: number): number {
    if (!this.selectedFamily) return 0;
    let count = 0;
    const countByLevel = (persons: Person[], currentLevel: number) => {
      if (currentLevel === level) {
        count += persons.length;
      } else if (currentLevel < level) {
        persons.forEach(person => {
          if (person.children && person.children.length > 0) {
            countByLevel(person.children, currentLevel + 1);
          }
        });
      }
    };
    countByLevel(this.selectedFamily.members, 0);
    return count;
  }

  getNodesByLevel(level: number): any[] {
    if (!this.selectedFamily) return [];
    const result: any[] = [];
    const collectByLevel = (persons: Person[], currentLevel: number, parentId?: number) => {
      if (currentLevel === level) {
        persons.forEach(person => {
          const children = person.children ? this.renderTree(person.children, currentLevel + 1) : [];
          result.push({
            person,
            level: currentLevel,
            isSelected: this.selectedPerson?.id === person.id,
            children,
            parentId
          });
        });
      } else if (currentLevel < level) {
        persons.forEach(person => {
          if (person.children && person.children.length > 0) {
            collectByLevel(person.children, currentLevel + 1, person.id);
          }
        });
      }
    };
    collectByLevel(this.selectedFamily.members, 0);
    return result;
  }

  getLevelInfo(level: number): string {
    const count = this.getMemberCountByLevel(level);
    return `Génération ${level + 1}: ${count} membre(s)`;
  }

  // === MÉTHODES DE GESTION DES FAMILLES ===
  selectFamily(family: Family): void {
    this.jsonDb.selectFamily(family);
    this.showToast(`Famille "${family.name}" sélectionnée`, 'success', '🏠');
  }

  // Ajoutez cette méthode pour ouvrir le gestionnaire JSON
  openJsonManager(): void {
    this.showJsonManager = true;
  }
  closeJsonManager(): void {
    this.showJsonManager = false;
  }


  deletePerson(personId: number): void {
    if (this.selectedFamily && confirm('Êtes-vous sûr de vouloir supprimer cette personne et ses descendants ?')) {
      this.jsonDb.deletePerson(personId, this.selectedFamily.id);
      if (this.selectedPerson?.id === personId) {
        this.selectedPerson = null;
      }
      this.showToast('Personne supprimée', 'warning', '🗑️');
    }
  }

  openAddPersonModal(parent?: Person): void {
    this.editingPerson = null;
    this.parentForNewChild = parent || null;
    this.personFormData = {
      nom: '',
      prenom: '',
      telephone: '',
      adresse: '',
      email: '',
      parentId: parent?.id || null,
      genre: 'homme',
      photo: '',
      dateNaissance: '',
      profession: '',
      notes: ''
    };
    this.showPersonModal = true;
  }

  openEditPersonModal(person: Person): void {
    this.editingPerson = person;
    this.parentForNewChild = null;

    // Préparer les données pour le formulaire
    this.personFormData = {
      nom: person.nom || '',
      prenom: person.prenom || '',
      telephone: person.telephone || '',
      adresse: person.adresse || '',
      email: person.email || '',
      parentId: person.parentId || null,
      genre: person.genre || 'homme',
      photo: person.photo || '',
      dateNaissance: person.dateNaissance
        ? new Date(person.dateNaissance).toISOString().split('T')[0]
        : '',
      profession: person.profession || '',
      notes: person.notes || ''
    };

    this.showPersonModal = true;
  }

  closePersonModal(): void {
    this.showPersonModal = false;
    this.editingPerson = null;
    this.parentForNewChild = null;
  }



  // === MÉTHODES DE STATISTIQUES ===
  getTotalMembers(family: Family): number {
    let count = 0;
    const countPersons = (persons: Person[]) => {
      count += persons.length;
      persons.forEach(person => {
        if (person.children && person.children.length > 0) {
          countPersons(person.children);
        }
      });
    };
    countPersons(family.members);
    return count;
  }

  getGenderCount(gender: 'homme' | 'femme'): number {
    if (!this.selectedFamily) return 0;
    let count = 0;
    const countByGender = (persons: Person[]) => {
      persons.forEach(person => {
        if (person.genre === gender) count++;
        if (person.children && person.children.length > 0) {
          countByGender(person.children);
        }
      });
    };
    countByGender(this.selectedFamily.members);
    return count;
  }

  getPersonGeneration(person: Person): number {
    if (!this.selectedFamily) return 0;
    const findDepth = (persons: Person[], targetId: number, depth: number = 0): number => {
      for (const p of persons) {
        if (p.id === targetId) return depth;
        if (p.children && p.children.length > 0) {
          const found = findDepth(p.children, targetId, depth + 1);
          if (found !== -1) return found;
        }
      }
      return -1;
    };
    const result = findDepth(this.selectedFamily.members, person.id);
    return result !== -1 ? result : 0;
  }

  getParentName(parentId: number): string {
    if (!this.selectedFamily) return '';
    const findParent = (persons: Person[]): string => {
      for (const person of persons) {
        if (person.id === parentId) {
          return `${person.prenom} ${person.nom}`;
        }
        if (person.children && person.children.length > 0) {
          const found = findParent(person.children);
          if (found) return found;
        }
      }
      return '';
    };
    return findParent(this.selectedFamily.members);
  }

  navigateToParent(parentId: number): void {
    if (!this.selectedFamily) return;
    const findParent = (persons: Person[]): Person | null => {
      for (const person of persons) {
        if (person.id === parentId) return person;
        if (person.children && person.children.length > 0) {
          const found = findParent(person.children);
          if (found) return found;
        }
      }
      return null;
    };
    const parent = findParent(this.selectedFamily.members);
    if (parent) {
      this.selectedPerson = parent;
      const gen = this.getPersonGeneration(parent);
      this.scrollToGeneration(gen);
    }
  }

  // === MÉTHODES DE NAVIGATION ===
  scrollToGeneration(level: number): void {
    const element = document.getElementById(`generation-${level}`);
    if (element && this.treeContainer) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // === MÉTHODES D'EXPORT/IMPORT ===
  exportCurrentFamily(): void {
    if (this.selectedFamily) {
      this.excelExportService.exportFamilyToExcel(this.selectedFamily);
      this.showToast(`${this.selectedFamily.name} exportée en Excel`, 'success', '📊');
    }
  }

  exportAllFamilies(): void {
    if (this.families.length > 0) {
      this.excelExportService.exportMultipleFamilies(this.families);
      this.showToast('Toutes les familles exportées', 'success', '📂');
    }
  }

  exportStatistics(): void {
    if (this.families.length > 0) {
      this.excelExportService.exportStatistics(this.families);
      this.showToast('Statistiques exportées', 'success', '📈');
    }
  }


  importFromJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = e.target?.result as string;
          const success = this.jsonDb.importFromJson(jsonData);

          if (success) {
            this.showToast('Données importées avec succès', 'success', '📤');
          } else {
            this.showToast('Format JSON invalide', 'error', '❌');
          }
        } catch (error) {
          this.showToast('Erreur lors de l\'import', 'error', '❌');
          console.error(error);
        }
      };
      reader.readAsText(file);
    }
  }

  clearAllData(): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer TOUTES les données ? Cette action est irréversible.')) {
      this.jsonDb.clearAllData();
      this.showToast('Toutes les données ont été effacées', 'warning', '🗑️');
    }
  }



  exportToJson(): void {
    const dataStr = JSON.stringify(this.families, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `arbres-genealogiques-${new Date().getTime()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Données exportées en JSON', 'success', '💾');
  }


  // === MÉTHODES D'ARBRE ===
  get treeData(): any[] {
    if (!this.selectedFamily) return [];
    return this.renderTree(this.selectedFamily.members, 0);
  }

  private renderTree(persons: Person[], level: number = 0): any[] {
    if (!persons || persons.length === 0) return [];
    return persons.map(person => {
      const children = person.children ? this.renderTree(person.children, level + 1) : [];
      return {
        person,
        level,
        children,
        isSelected: this.selectedPerson?.id === person.id
      };
    });
  }

  // === MÉTHODES UTILITAIRES ===
  getPersonDetails(person: Person): any {
    return {
      initials: `${person.prenom.charAt(0)}${person.nom.charAt(0)}`.toUpperCase(),
      hasPhone: !!person.telephone,
      hasEmail: !!person.email,
      hasAddress: !!person.adresse,
      childrenCount: person.children ? person.children.length : 0
    };
  }

  // Écouteur pour la touche Échap
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showPersonModal) {
      this.closePersonModal();
    }
    if (this.selectedPerson) {
      this.selectedPerson = null;
    }
  }

  getAllMembersFlat(): Person[] {
    if (!this.selectedFamily) return [];

    const allMembers: Person[] = [];

    const collectMembers = (persons: Person[]): void => {
      persons.forEach(person => {
        allMembers.push(person);
        if (person.children && person.children.length > 0) {
          collectMembers(person.children);
        }
      });
    };

    collectMembers(this.selectedFamily.members);
    return allMembers;
  }
  onPersonFormSubmit(formData: any): void {
    console.log('Données reçues du modal:', formData);

    // Préparer les données complètes
    const personData = {
      ...formData,
      parentId: this.parentForNewChild?.id || null,
      // Assurez-vous d'inclure toutes les propriétés optionnelles
      photo: formData.photo || undefined,
      dateNaissance: formData.dateNaissance ? new Date(formData.dateNaissance) : undefined,
      profession: formData.profession || undefined,
      notes: formData.notes || undefined
    };

    if (this.editingPerson && this.selectedFamily) {
      this.updatePerson(personData);
    } else if (this.selectedFamily) {
      this.addPerson(personData);
    }
  }

  addPerson(formData: any): void {
    if (this.selectedFamily) {
      this.jsonDb.addPerson(formData, this.selectedFamily.id);
      this.closePersonModal();
      this.showToast('Personne ajoutée avec succès', 'success', '👤');
    }
  }

  updatePerson(formData: any): void {
    if (this.selectedFamily && this.editingPerson) {
      this.jsonDb.updatePerson(
        this.editingPerson.id,
        formData,
        this.selectedFamily.id
      );
      this.closePersonModal();
      this.showToast('Personne mise à jour', 'success', '✅');
    }
  }

// Ajoutez une méthode pour la galerie
  openPhotoGallery(person: Person): void {
    if (!person.photo) {
      this.showToast(`${person.prenom} n'a pas de photo`, 'info', '📷');
      return;
    }

    // Ouvrir un modal ou une vue agrandie de la photo
    this.showToast(`Photo de ${person.prenom} ${person.nom}`, 'info', '🖼️');

    // Ici, vous pourriez implémenter un modal de photo plein écran
    // this.openFullscreenPhoto(person.photo);
  }

// Ajoutez une méthode pour télécharger la photo
  downloadPersonPhoto(person: Person): void {
    if (!person.photo) {
      this.showToast('Aucune photo à télécharger', 'warning', '📷');
      return;
    }

    const link = document.createElement('a');
    link.href = person.photo;
    link.download = `${person.prenom}_${person.nom}_photo.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('Photo téléchargée', 'success', '⬇️');
  }


  onViewDetails(person: Person): void {
    this.selectedPerson = person;

    // Si vous avez une sidebar de détails, vous pouvez l'ouvrir ici
    this.showToast(`Détails de ${person.prenom} ${person.nom}`, 'info', '👁️');

    // Optionnel : Scroll vers la sidebar si elle est hors écran
    setTimeout(() => {
      const sidebar = document.querySelector('.context-sidebar');
      if (sidebar) {
        sidebar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }

  // Dans app.component.ts, ajoutez cette méthode pour les actions rapides sur une personne
  showPersonActions(person: Person, event: MouseEvent): void {
    event.stopPropagation();

    // Créer un menu contextuel ou utiliser un toast
    this.showToast(
      `${person.prenom} ${person.nom} - Sélectionnez une action`,
      'info',
      '⚙️'
    );

    // Vous pourriez aussi ouvrir un menu contextuel personnalisé
    this.openPersonContextMenu(person, event);
  }

// Optionnel : Menu contextuel avancé
  openPersonContextMenu(person: Person, event: MouseEvent): void {
    // Créer un menu contextuel personnalisé
    const menu = document.createElement('div');
    menu.className = 'person-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.style.background = 'white';
    menu.style.borderRadius = '8px';
    menu.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    menu.style.padding = '0.5rem 0';
    menu.style.zIndex = '9999';

    const actions = [
      { icon: '👁️', label: 'Voir détails', action: () => this.onViewDetails(person) },
      { icon: '✏️', label: 'Modifier', action: () => this.openEditPersonModal(person) },
      { icon: '👶', label: 'Ajouter enfant', action: () => this.openAddPersonModal(person) },
      { icon: '📷', label: 'Voir photo', action: () => this.openPhotoGallery(person) },
      { icon: '⬇️', label: 'Télécharger photo', action: () => this.downloadPersonPhoto(person) },
      { icon: '🗑️', label: 'Supprimer', action: () => this.deletePerson(person.id) },
    ];

    actions.forEach(action => {
      const button = document.createElement('button');
      button.className = 'context-menu-item';
      button.innerHTML = `
      <span class="context-menu-icon">${action.icon}</span>
      <span class="context-menu-label">${action.label}</span>
    `;
      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.gap = '0.75rem';
      button.style.padding = '0.75rem 1.5rem';
      button.style.width = '100%';
      button.style.border = 'none';
      button.style.background = 'none';
      button.style.cursor = 'pointer';
      button.style.fontSize = '0.95rem';
      button.style.color = '#374151';
      button.style.transition = 'all 0.2s ease';

      button.onmouseenter = () => {
        button.style.background = '#f3f4f6';
      };

      button.onmouseleave = () => {
        button.style.background = 'none';
      };

      button.onclick = (e) => {
        e.stopPropagation();
        action.action();
        document.body.removeChild(menu);
      };

      menu.appendChild(button);
    });

    document.body.appendChild(menu);

    // Fermer le menu en cliquant ailleurs
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        document.body.removeChild(menu);
        document.removeEventListener('click', closeMenu);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  }

  // Méthodes utilitaires pour la sidebar
  getAgeFromDate(date?: Date): number | null {
    if (!date) return null;

    const birthDate = new Date(date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Copié dans le presse-papier', 'success', '📋');
    }).catch(() => {
      this.showToast('Erreur lors de la copie', 'error', '❌');
    });
  }

  openMap(address: string): void {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  }

  sharePerson(person: Person): void {
    const shareData = {
      title: `${person.prenom} ${person.nom} - Arbre Généalogique`,
      text: `Découvrez ${person.prenom} ${person.nom} dans l'arbre généalogique`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData)
        .then(() => this.showToast('Partage réussi', 'success', '✅'))
        .catch(() => this.showToast('Partage annulé', 'info', 'ℹ️'));
    } else {
      this.copyToClipboard(window.location.href);
    }
  }

  duplicatePerson(person: Person): void {
    // Logique de duplication
    this.showToast('Duplication (fonctionnalité à venir)', 'info', '⎘');
  }

  exportPersonData(person: Person): void {
    // Logique d'export de fiche personnelle
    const data = JSON.stringify(person, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${person.prenom}_${person.nom}_fiche.json`;
    a.click();
    this.showToast('Fiche exportée', 'success', '📄');
  }
}
