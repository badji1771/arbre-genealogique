// services/json-database.service.ts
import { Injectable } from '@angular/core';
import { Family, Person } from '../models/person.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class JsonDatabaseService {
  private readonly DB_KEY = 'familyTreeDatabase';
  private readonly BACKUP_PREFIX = 'familyTree_backup_';
  private readonly MAX_BACKUPS = 5;

  private familiesSubject = new BehaviorSubject<Family[]>([]);
  private selectedFamilySubject = new BehaviorSubject<Family | null>(null);

  families$ = this.familiesSubject.asObservable();
  selectedFamily$ = this.selectedFamilySubject.asObservable();

  private families: Family[] = [];

  constructor() {
    this.loadFromLocalStorage();
    this.setupAutoSave();
  }

  // === CRUD Operations ===

  // Create
  addFamily(name: string): Family {
    const newFamily: Family = {
      id: this.generateId(),
      name,
      members: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.families.push(newFamily);
    this.saveAndNotify();
    return newFamily;
  }

  addPerson(personData: Omit<Person, 'id' | 'children'>, familyId: number): Person {
    const family = this.families.find(f => f.id === familyId);
    if (!family) throw new Error('Famille non trouvée');

    const newPerson: Person = {
      id: this.generateId(),
      ...personData,
      children: []
    };

    if (personData.parentId) {
      this.addPersonToParent(newPerson, personData.parentId, family.members);
    } else {
      family.members.push(newPerson);
    }

    family.updatedAt = new Date();
    this.saveAndNotify();
    return newPerson;
  }

  // Read
  getFamilies(): Family[] {
    return [...this.families];
  }

  getFamilyById(id: number): Family | undefined {
    return this.families.find(f => f.id === id);
  }

  getPersonById(personId: number, familyId: number): Person | undefined {
    const family = this.getFamilyById(familyId);
    if (!family) return undefined;

    const findPerson = (persons: Person[]): Person | undefined => {
      for (const person of persons) {
        if (person.id === personId) return person;

        // Vérification de children
        if (person.children && person.children.length > 0) {
          const found = findPerson(person.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    return findPerson(family.members);
  }

  // Update
  updateFamily(familyId: number, updates: Partial<Family>): boolean {
    const familyIndex = this.families.findIndex(f => f.id === familyId);
    if (familyIndex === -1) return false;

    this.families[familyIndex] = {
      ...this.families[familyIndex],
      ...updates,
      updatedAt: new Date(),
      id: familyId // Garantir que l'ID ne change pas
    };

    this.saveAndNotify();
    return true;
  }

  updatePerson(personId: number, updates: Partial<Person>, familyId: number): boolean {
    const family = this.families.find(f => f.id === familyId);
    if (!family) return false;

    const updateInTree = (persons: Person[]): boolean => {
      for (let i = 0; i < persons.length; i++) {
        if (persons[i].id === personId) {
          persons[i] = {
            ...persons[i],
            ...updates,
            id: personId,
            children: persons[i].children || [] // S'assurer que children existe
          };
          return true;
        }

        // Vérification plus stricte
        const children = persons[i].children;
        if (children && Array.isArray(children) && children.length > 0) {
          if (updateInTree(children)) return true;
        }
      }
      return false;
    };

    if (updateInTree(family.members)) {
      family.updatedAt = new Date();
      this.saveAndNotify();
      return true;
    }
    return false;
  }

  // Delete
  deleteFamily(familyId: number): boolean {
    const initialLength = this.families.length;
    this.families = this.families.filter(f => f.id !== familyId);

    if (this.families.length < initialLength) {
      // Si la famille sélectionnée était celle supprimée
      if (this.selectedFamilySubject.value?.id === familyId) {
        this.selectedFamilySubject.next(null);
      }
      this.saveAndNotify();
      return true;
    }
    return false;
  }

  deletePerson(personId: number, familyId: number): boolean {
    const family = this.families.find(f => f.id === familyId);
    if (!family) return false;

    const deleteFromTree = (persons: Person[]): Person[] => {
      return persons.filter(person => {
        if (person.id === personId) return false;

        // Vérification de children
        if (person.children && person.children.length > 0) {
          person.children = deleteFromTree(person.children);
        }
        return true;
      });
    };

    family.members = deleteFromTree(family.members);
    family.updatedAt = new Date();
    this.saveAndNotify();
    return true;
  }

  // === JSON File Operations ===

  exportToJson(): string {
    const data = {
      families: this.families,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      totalFamilies: this.families.length,
      totalPersons: this.getTotalPersons()
    };

    return JSON.stringify(data, null, 2);
  }

  importFromJson(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);

      // Validation basique
      if (!data.families || !Array.isArray(data.families)) {
        throw new Error('Format JSON invalide');
      }

      // Convertir les dates
      this.families = data.families.map((family: any) => ({
        ...family,
        createdAt: new Date(family.createdAt),
        updatedAt: new Date(family.updatedAt),
        members: this.processImportedPersons(family.members || [])
      }));

      this.saveAndNotify();
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      return false;
    }
  }

  // === Backup & Restore ===

  createBackup(): string {
    const backup = {
      data: this.exportToJson(),
      timestamp: new Date().toISOString(),
      name: `Sauvegarde_${new Date().toLocaleDateString()}_${new Date().toLocaleTimeString()}`
    };

    const backups = this.getBackups();
    backups.unshift(backup); // Ajouter au début

    // Garder seulement les X dernières sauvegardes
    if (backups.length > this.MAX_BACKUPS) {
      backups.pop();
    }

    localStorage.setItem(`${this.BACKUP_PREFIX}list`, JSON.stringify(backups));
    localStorage.setItem(`${this.BACKUP_PREFIX}${Date.now()}`, backup.data);

    return backup.name;
  }

  getBackups(): any[] {
    const backupsJson = localStorage.getItem(`${this.BACKUP_PREFIX}list`);
    return backupsJson ? JSON.parse(backupsJson) : [];
  }

  restoreBackup(backupData: string): boolean {
    return this.importFromJson(backupData);
  }

  // === Utilities ===

  private generateId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  private addPersonToParent(newPerson: Person, parentId: number, members: Person[]): boolean {
    for (let member of members) {
      if (member.id === parentId) {
        // S'assurer que children existe
        if (!member.children) member.children = [];
        member.children.push(newPerson);
        return true;
      }

      // Vérification de children
      if (member.children && member.children.length > 0) {
        if (this.addPersonToParent(newPerson, parentId, member.children)) {
          return true;
        }
      }
    }
    return false;
  }

  private processImportedPersons(persons: Person[]): Person[] {
    return persons.map(person => ({
      ...person,
      dateNaissance: person.dateNaissance ? new Date(person.dateNaissance) : undefined,
      dateDeces: person.dateDeces ? new Date(person.dateDeces) : undefined,
      createdAt: person.createdAt ? new Date(person.createdAt) : new Date(),
      updatedAt: person.updatedAt ? new Date(person.updatedAt) : new Date(),
      children: person.children ? this.processImportedPersons(person.children) : [] // Toujours initialiser
    }));
  }

  private getTotalPersons(): number {
    let total = 0;

    const countPersons = (persons: Person[]): void => {
      total += persons.length;
      persons.forEach(person => {
        // Vérification de children
        if (person.children && person.children.length > 0) {
          countPersons(person.children);
        }
      });
    };

    this.families.forEach(family => {
      countPersons(family.members);
    });

    return total;
  }

  // === Storage Management ===

  private saveToLocalStorage(): void {
    try {
      const data = {
        families: this.families,
        lastSaved: new Date().toISOString(),
        version: '1.0.0'
      };

      localStorage.setItem(this.DB_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      // Si le localStorage est plein, nettoyer les vieilles sauvegardes
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.cleanupStorage();
      }
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem(this.DB_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.families = data.families.map((family: any) => ({
          ...family,
          createdAt: new Date(family.createdAt),
          updatedAt: new Date(family.updatedAt),
          members: family.members || []
        }));
        this.familiesSubject.next([...this.families]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      this.families = [];
    }
  }

  private saveAndNotify(): void {
    this.saveToLocalStorage();
    this.familiesSubject.next([...this.families]);
  }

  private setupAutoSave(): void {
    // Auto-save toutes les 30 secondes si des changements
    setInterval(() => {
      if (this.hasUnsavedChanges()) {
        this.saveToLocalStorage();
      }
    }, 30000);
  }

  private hasUnsavedChanges(): boolean {
    // Logique simple de détection de changement
    // Vous pourriez implémenter une logique plus sophistiquée
    return true; // Pour l'exemple, toujours sauvegarder
  }

  private cleanupStorage(): void {
    // Supprimer les vieilles sauvegardes
    const backups = this.getBackups();
    if (backups.length > 2) {
      backups.slice(2).forEach((backup, index) => {
        localStorage.removeItem(`${this.BACKUP_PREFIX}${index}`);
      });
    }

    // Tenter de sauvegarder à nouveau
    setTimeout(() => this.saveToLocalStorage(), 1000);
  }

  // === Statistiques ===

  getStatistics(): any {
    return {
      totalFamilies: this.families.length,
      totalPersons: this.getTotalPersons(),
      storageUsed: this.getStorageSize(),
      lastBackup: this.getLastBackupDate()
    };
  }

  private getStorageSize(): string {
    const data = localStorage.getItem(this.DB_KEY);
    if (!data) return '0 KB';

    const size = new Blob([data]).size;
    return this.formatBytes(size);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getLastBackupDate(): string | null {
    const backups = this.getBackups();
    return backups.length > 0 ? backups[0].timestamp : null;
  }

  // === Sélection ===

  selectFamily(family: Family): void {
    this.selectedFamilySubject.next(family);
  }

  clearSelection(): void {
    this.selectedFamilySubject.next(null);
  }

  // === Reset ===

  clearAllData(): void {
    this.families = [];
    this.selectedFamilySubject.next(null);
    localStorage.removeItem(this.DB_KEY);
    this.familiesSubject.next([]);
  }

  searchPerson(s: string) {
    const term = (s || '').trim().toLowerCase();
    if (!term) return [] as Person[];

    const results: Person[] = [];
    const searchIn = (persons: Person[]) => {
      persons.forEach(p => {
        const nom = (p.nom || '').toLowerCase();
        const prenom = (p.prenom || '').toLowerCase();
        if (nom.includes(term) || prenom.includes(term)) {
          results.push(p);
        }
        if (p.children && p.children.length > 0) {
          searchIn(p.children);
        }
      });
    };

    this.families.forEach(f => searchIn(f.members));
    return results;
  }

  createSampleFamily() {
    const family = this.addFamily('Famille Exemple');

    const founderH: Person = {
      id: this.generateId(),
      nom: 'Fondateur',
      prenom: 'Jean',
      genre: 'homme',
      children: []
    } as Person;

    const founderF: Person = {
      id: this.generateId(),
      nom: 'Fondatrice',
      prenom: 'Marie',
      genre: 'femme',
      children: []
    } as Person;

    const child1: Person = {
      id: this.generateId(),
      nom: 'Dupont',
      prenom: 'Alice',
      genre: 'femme',
      parentId: founderH.id,
      children: []
    } as Person;

    const child2: Person = {
      id: this.generateId(),
      nom: 'Dupont',
      prenom: 'Paul',
      genre: 'homme',
      parentId: founderH.id,
      children: []
    } as Person;

    // Attach children
    founderH.children = [child1, child2];

    family.members.push(founderH, founderF);
    this.saveAndNotify();
    return family;
  }

  updateFamilyName(id: number, s: string) {
    this.updateFamily(id, { name: s });
  }

  duplicateFamily(id: number) {
    const original = this.getFamilyById(id);
    if (!original) return null;

    const clonePerson = (p: Person): Person => {
      const clonedChildren = (p.children || []).map(ch => clonePerson(ch));
      const cloned: Person = {
        ...p,
        id: this.generateId(),
        children: clonedChildren
      };
      // parentId references cannot reliably be remapped without building a map;
      // remove parentId to keep tree consistency based on nesting
      delete (cloned as any).parentId;
      return cloned;
    };

    const duplicated: Family = {
      id: this.generateId(),
      name: `${original.name} (copie)`,
      members: (original.members || []).map(m => clonePerson(m)),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.families.push(duplicated);
    this.saveAndNotify();
    return duplicated;
  }
}
