import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Family, Person } from '../models/person.model';

@Injectable({
  providedIn: 'root'
})
export class FamilyTreeService {
  private families: Family[] = [];
  private familiesSubject = new BehaviorSubject<Family[]>([]);
  private selectedFamilySubject = new BehaviorSubject<Family | null>(null);

  families$ = this.familiesSubject.asObservable();
  selectedFamily$ = this.selectedFamilySubject.asObservable();

  constructor() {
    this.loadFromLocalStorage();
  }

  addFamily(name: string): Family {
    const newFamily: Family = {
      id: Date.now(),
      name,
      members: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.families.push(newFamily);
    this.familiesSubject.next([...this.families]);
    this.saveToLocalStorage();

    return newFamily;
  }

  selectFamily(family: Family): void {
    this.selectedFamilySubject.next(family);
  }

  addPerson(personData: Omit<Person, 'id' | 'children'>, familyId: number): void {
    const family = this.families.find(f => f.id === familyId);
    if (!family) return;

    const newPerson: Person = {
      id: Date.now(),
      ...personData,
      children: []
    };

    if (personData.parentId) {
      this.addPersonToParent(newPerson, personData.parentId, family.members);
    } else {
      family.members.push(newPerson);
    }

    family.updatedAt = new Date();
    this.familiesSubject.next([...this.families]);
    this.selectedFamilySubject.next({...family});
    this.saveToLocalStorage();
  }

  private addPersonToParent(newPerson: Person, parentId: number, members: Person[]): boolean {
    for (let member of members) {
      if (member.id === parentId) {
        if (!member.children) member.children = [];
        member.children.push(newPerson);
        return true;
      }
      if (member.children && member.children.length > 0) {
        if (this.addPersonToParent(newPerson, parentId, member.children)) {
          return true;
        }
      }
    }
    return false;
  }

  updatePerson(personId: number, updates: Partial<Person>, familyId: number): void {
    const family = this.families.find(f => f.id === familyId);
    if (!family) return;

    const updateInTree = (members: Person[]): boolean => {
      for (let i = 0; i < members.length; i++) {
        if (members[i].id === personId) {
          members[i] = { ...members[i], ...updates };
          return true;
        }
        const children = members[i].children;
        if (children && children.length > 0) {
          if (updateInTree(children)) return true;
        }
      }
      return false;
    };

    if (updateInTree(family.members)) {
      family.updatedAt = new Date();
      this.familiesSubject.next([...this.families]);
      this.selectedFamilySubject.next({...family});
      this.saveToLocalStorage();
    }
  }

  deletePerson(personId: number, familyId: number): boolean {
    const family = this.families.find(f => f.id === familyId);
    if (!family) return false;

    const deleteFromTree = (members: Person[]): boolean => {
      for (let i = 0; i < members.length; i++) {
        if (members[i].id === personId) {
          members.splice(i, 1);
          return true;
        }
        const children = members[i].children;
        if (children && children.length > 0) {
          if (deleteFromTree(children)) return true;
        }
      }
      return false;
    };

    if (deleteFromTree(family.members)) {
      family.updatedAt = new Date();
      this.familiesSubject.next([...this.families]);
      this.selectedFamilySubject.next({...family});
      this.saveToLocalStorage();
      return true;
    }

    return false;
  }

  getFamilyById(id: number): Family | undefined {
    return this.families.find(f => f.id === id);
  }

  private saveToLocalStorage(): void {
    localStorage.setItem('familyTreeData', JSON.stringify(this.families));
  }

  private loadFromLocalStorage(): void {
    const saved = localStorage.getItem('familyTreeData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.families = parsed.map((family: any) => ({
          ...family,
          createdAt: new Date(family.createdAt),
          updatedAt: new Date(family.updatedAt)
        }));
        this.familiesSubject.next(this.families);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      }
    }
  }

  importData(data: Family[]): void {
    this.families = data.map(family => ({
      ...family,
      createdAt: new Date(family.createdAt),
      updatedAt: new Date(family.updatedAt)
    }));
    this.familiesSubject.next([...this.families]);
    this.saveToLocalStorage();
  }

  clearData(): void {
    this.families = [];
    this.familiesSubject.next([]);
    this.selectedFamilySubject.next(null);
    localStorage.removeItem('familyTreeData');
  }
}
