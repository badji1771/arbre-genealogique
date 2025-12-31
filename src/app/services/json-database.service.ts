// services/json-database.service.ts
import { Injectable } from '@angular/core';
import { Family, Person } from '../models/person.model';
import { BehaviorSubject } from 'rxjs';
import { ApiService, FamilyDto, PersonDto } from './api.service';

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
  private memberCounts = new Map<number, number>(); // cache des nombres de membres par famille

  constructor(private api: ApiService) {
    if (this.isBackendMode()) {
      this.loadFromBackend();
    } else {
      this.loadFromLocalStorage();
      this.setupAutoSave();
    }
  }

  // === Backend toggle and loaders ===
  private isBackendMode(): boolean {
    // Backend enabled by default. Set localStorage 'useBackend' to 'false' to force local mode.
    const flag = localStorage.getItem('useBackend');
    return flag !== 'false';
  }

  private loadFromBackend(): void {
    this.api.getFamilies().subscribe({
      next: (dtos: FamilyDto[]) => {
        this.families = (dtos || []).map(d => ({
          id: d.id!,
          name: d.name,
          members: [],
          createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
          updatedAt: d.createdAt ? new Date(d.createdAt) : new Date(),
          memberCount: this.memberCounts.get(d.id!) || 0
        }));
        this.familiesSubject.next([...this.families]);
        // Auto-sélectionner la première famille pour déclencher le chargement des membres
        if (!this.selectedFamilySubject.value && this.families.length > 0) {
          this.selectFamily(this.families[0]);
        }
      },
      error: (e) => {
        console.error('Backend non disponible, retour au mode local', e);
        // fallback: charger le local
        this.loadFromLocalStorage();
        this.setupAutoSave();
      }
    });
  }

  private dtoToPerson(dto: PersonDto): Person {
    const p: Person = {
      id: dto.id!,
      nom: dto.lastName || '',
      prenom: dto.firstName || '',
      genre: (dto.gender === 'HOMME' ? 'homme' : dto.gender === 'FEMME' ? 'femme' : 'homme'),
      parentId: dto.fatherId || dto.motherId || null,
      email: dto.email || undefined,
      telephone: dto.phone || undefined,
      adresse: dto.address || undefined,
      profession: dto.job || undefined,
      notes: dto.notes || undefined,
      photo: dto.photoUrl || undefined,
      dateNaissance: dto.birthDate ? new Date(dto.birthDate) : undefined,
      children: []
    } as Person;
    return p;
  }

  private personToDto(p: Person, familyId: number): PersonDto {
    const dto: PersonDto = {
      id: p.id,
      firstName: p.prenom,
      lastName: p.nom,
      gender: p.genre === 'homme' ? 'HOMME' : 'FEMME',
      birthDate: p.dateNaissance ? new Date(p.dateNaissance).toISOString().substring(0,10) : null,
      email: p.email || null,
      phone: p.telephone || null,
      address: p.adresse || null,
      job: p.profession || null,
      notes: p.notes || null,
      photoUrl: p.photo || null,
      familyId: familyId,
      fatherId: null,
      motherId: null,
      spouseIds: null
    };
    // Utilise parentId comme père par défaut si genre 'homme', sinon mère (simplification)
    if (p.parentId) {
      if (p.genre === 'homme') dto.fatherId = p.parentId; else dto.motherId = p.parentId;
    }
    return dto;
  }

  private buildTreeFromFlat(list: Person[]): Person[] {
    const map = new Map<number, Person>();
    list.forEach(p => { p.children = []; map.set(p.id, p); });
    const roots: Person[] = [];
    list.forEach(p => {
      if (p.parentId && map.has(p.parentId)) {
        map.get(p.parentId)!.children!.push(p);
      } else {
        roots.push(p);
      }
    });
    return roots;
  }

  // === CRUD Operations ===

  // Create
  addFamily(name: string): Family {
    // Backend mode: create remotely and sync, optimistic return
    if (this.isBackendMode()) {
      const tempFamily: Family = {
        id: this.generateId(),
        name,
        members: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.families.push(tempFamily);
      this.familiesSubject.next([...this.families]);
      this.api.createFamily(name).subscribe({
        next: (dto: FamilyDto) => {
          // Replace temp with real
          const idx = this.families.findIndex(f => f.id === tempFamily.id);
          if (idx !== -1) {
            const real: Family = {
              id: dto.id!,
              name: dto.name,
              members: [],
              createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
              updatedAt: dto.createdAt ? new Date(dto.createdAt) : new Date()
            };
            this.families[idx] = real;
            this.familiesSubject.next([...this.families]);
          }
        },
        error: () => {
          // rollback
          this.families = this.families.filter(f => f.id !== tempFamily.id);
          this.familiesSubject.next([...this.families]);
        }
      });
      return tempFamily;
    }

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
    if (this.isBackendMode()) {
      const temp: Person = { id: this.generateId(), ...personData, children: [] } as Person;
      // optimistic local update on selected family only
      const fam = this.families.find(f => f.id === familyId);
      if (fam) {
        if (temp.parentId) {
          this.addPersonToParent(temp, temp.parentId, fam.members);
        } else {
          fam.members.push(temp);
        }
        this.familiesSubject.next([...this.families]);
        const current = this.selectedFamilySubject.value;
        if (current && current.id === fam.id) this.selectedFamilySubject.next({ ...fam });
      }
      // send to backend
      let dto = this.personToDto(temp, familyId);
      // Corriger l'assignation du parent du côté backend: utiliser le genre du parent, pas celui de l'enfant
      if (temp.parentId) {
        const parent = this.getPersonById(temp.parentId, familyId);
        if (parent) {
          // Réinitialiser toute valeur précédente et définir correctement selon le parent
          dto.fatherId = null;
          dto.motherId = null;
          if (parent.genre === 'homme') {
            dto.fatherId = parent.id;
          } else if (parent.genre === 'femme') {
            dto.motherId = parent.id;
          }
        }
      }
      this.api.createPerson(dto).subscribe({
        next: () => this.refreshFamilyMembersFromBackend(familyId),
        error: () => this.refreshFamilyMembersFromBackend(familyId)
      });
      return temp;
    }

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

    if (this.isBackendMode()) {
      const previous = { ...this.families[familyIndex] } as Family;
      // Optimistic local update
      this.families[familyIndex] = {
        ...this.families[familyIndex],
        ...updates,
        updatedAt: new Date(),
        id: familyId
      };
      this.familiesSubject.next([...this.families]);
      const current = this.selectedFamilySubject.value;
      if (current && current.id === familyId) this.selectedFamilySubject.next({ ...this.families[familyIndex] });

      // Send patch to backend (only supported fields)
      const patch: Partial<FamilyDto> = {};
      if (typeof updates.name === 'string') patch.name = updates.name;
      this.api.updateFamily(familyId, patch).subscribe({
        next: () => {},
        error: () => {
          // rollback on error
          this.families[familyIndex] = previous;
          this.familiesSubject.next([...this.families]);
          const curr = this.selectedFamilySubject.value;
          if (curr && curr.id === familyId) this.selectedFamilySubject.next({ ...this.families[familyIndex] });
        }
      });
      return true;
    }

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
    if (this.isBackendMode()) {
      const fam = this.families.find(f => f.id === familyId);
      if (!fam) return false;
      // optimistic local change
      const changed = this.applyUpdateInTree(fam.members, personId, updates);
      if (changed) {
        this.familiesSubject.next([...this.families]);
        const current = this.selectedFamilySubject.value;
        if (current && current.id === fam.id) this.selectedFamilySubject.next({ ...fam });
      }
      // send to backend
      const existing = this.getPersonById(personId, familyId);
      if (existing) {
        let dto = this.personToDto({ ...existing, ...updates } as Person, familyId);
        // Corriger également lors des mises à jour: définir le lien parent selon le genre du parent
        const parentId = (updates.parentId !== undefined ? updates.parentId : (existing.parentId ?? null));
        if (parentId) {
          const parent = this.getPersonById(parentId, familyId);
          if (parent) {
            dto.fatherId = null;
            dto.motherId = null;
            if (parent.genre === 'homme') dto.fatherId = parent.id; else if (parent.genre === 'femme') dto.motherId = parent.id;
          }
        }
        this.api.updatePerson(personId, dto).subscribe({
          next: () => this.refreshFamilyMembersFromBackend(familyId),
          error: () => this.refreshFamilyMembersFromBackend(familyId)
        });
      }
      return changed;
    }

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
    if (this.isBackendMode()) {
      const previous = [...this.families];
      this.families = this.families.filter(f => f.id !== familyId);
      if (this.selectedFamilySubject.value?.id === familyId) {
        this.selectedFamilySubject.next(null);
      }
      this.familiesSubject.next([...this.families]);
      this.api.deleteFamily(familyId).subscribe({
        next: () => {},
        error: () => {
          // rollback
          this.families = previous;
          this.familiesSubject.next([...this.families]);
        }
      });
      return true;
    }

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
    if (this.isBackendMode()) {
      const fam = this.families.find(f => f.id === familyId);
      if (!fam) return false;
      // optimistic remove
      const previousMembers = JSON.parse(JSON.stringify(fam.members)) as Person[];
      const deleteFromTree = (persons: Person[]): Person[] => {
        return persons.filter(person => {
          if (person.id === personId) return false;
          if (person.children && person.children.length > 0) {
            person.children = deleteFromTree(person.children);
          }
          return true;
        });
      };
      fam.members = deleteFromTree(fam.members);
      this.familiesSubject.next([...this.families]);
      const current = this.selectedFamilySubject.value;
      if (current && current.id === fam.id) this.selectedFamilySubject.next({ ...fam });

      this.api.deletePerson(personId).subscribe({
        next: () => this.refreshFamilyMembersFromBackend(familyId),
        error: () => {
          // rollback
          fam.members = previousMembers;
          this.familiesSubject.next([...this.families]);
          if (current && current.id === fam.id) this.selectedFamilySubject.next({ ...fam });
        }
      });
      return true;
    }

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

  private refreshFamilyMembersFromBackend(familyId: number): void {
    this.api.getPersonsByFamily(familyId).subscribe({
      next: (list: PersonDto[]) => {
        const flat = (list || []).map(dto => this.dtoToPerson(dto));
        const tree = this.buildTreeFromFlat(flat);
        // cache count
        this.memberCounts.set(familyId, flat.length);
        // update family in cache
        const idx = this.families.findIndex(f => f.id === familyId);
        if (idx !== -1) {
          const updated = { ...this.families[idx], members: tree, updatedAt: new Date(), memberCount: flat.length } as Family;
          this.families[idx] = updated;
          this.familiesSubject.next([...this.families]);
          const current = this.selectedFamilySubject.value;
          if (current && current.id === familyId) {
            this.selectedFamilySubject.next({ ...updated });
          }
        }
      },
      error: (e) => console.error('Erreur chargement personnes backend', e)
    });
  }

  private applyUpdateInTree(persons: Person[], personId: number, updates: Partial<Person>): boolean {
    for (let i = 0; i < persons.length; i++) {
      if (persons[i].id === personId) {
        persons[i] = {
          ...persons[i],
          ...updates,
          id: personId,
          children: persons[i].children || []
        };
        return true;
      }
      const children = persons[i].children;
      if (children && Array.isArray(children) && children.length > 0) {
        if (this.applyUpdateInTree(children, personId, updates)) return true;
      }
    }
    return false;
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
    if (this.isBackendMode()) {
      // Ensure the family exists in local cache
      const idx = this.families.findIndex(f => f.id === family.id);
      if (idx === -1) {
        this.families.push({ ...family, members: [] });
      }
      this.selectedFamilySubject.next({ ...family, members: [] });
      this.refreshFamilyMembersFromBackend(family.id);
      return;
    }
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
