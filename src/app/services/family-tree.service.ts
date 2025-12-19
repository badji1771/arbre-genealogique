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
  private lastGeneratedId = 0;

  families$ = this.familiesSubject.asObservable();
  selectedFamily$ = this.selectedFamilySubject.asObservable();

  constructor() {
    this.loadFromLocalStorage();
    this.initializeLastId();
  }

  // Générer un ID unique
  private generateId(): number {
    // Utiliser timestamp + random pour éviter les conflits
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return timestamp + random;
  }

  private generatePersonId(): number {
    // Pour les personnes, on incrémente à partir du plus grand ID existant
    return ++this.lastGeneratedId;
  }

  private initializeLastId(): void {
    let maxId = 0;

    const findMaxPersonId = (persons: Person[]): void => {
      persons.forEach(person => {
        if (person.id > maxId) maxId = person.id;
        if (person.children && person.children.length > 0) {
          findMaxPersonId(person.children);
        }
      });
    };

    this.families.forEach(family => {
      if (family.id > maxId) maxId = family.id;
      findMaxPersonId(family.members);
    });

    this.lastGeneratedId = maxId;
  }

  // Ajouter une famille
  addFamily(name: string): Family {
    const newFamily: Family = {
      id: this.generateId(),
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

  // Sélectionner une famille
  selectFamily(family: Family): void {
    this.selectedFamilySubject.next(family);
  }

  // Ajouter une personne
  addPerson(personData: Omit<Person, 'id' | 'children'>, familyId: number): void {
    const family = this.families.find(f => f.id === familyId);
    if (!family) return;

    const newPerson: Person = {
      id: this.generatePersonId(),
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

  // Mettre à jour une personne
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

  // Supprimer une personne
  deletePerson(personId: number, familyId: number): boolean {
    const family = this.families.find(f => f.id === familyId);
    if (!family) return false;

    const deleteFromTree = (members: Person[]): boolean => {
      for (let i = 0; i < members.length; i++) {
        if (members[i].id === personId) {
          // Supprimer la personne et TOUS ses descendants
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

  // Obtenir une famille par ID
  getFamilyById(id: number): Family | undefined {
    return this.families.find(f => f.id === id);
  }

  // Dupliquer une famille
  duplicateFamily(familyId: number): Family | null {
    const family = this.families.find(f => f.id === familyId);
    if (!family) return null;

    // Créer une copie profonde avec nouveaux IDs
    const duplicated: Family = {
      ...JSON.parse(JSON.stringify(family)),
      id: this.generateId(),
      name: `${family.name} (Copie)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Réassigner les IDs pour tous les membres
    const idMap = new Map<number, number>();

    const reassignIds = (persons: Person[]): Person[] => {
      return persons.map(person => {
        const oldId = person.id;
        const newId = this.generatePersonId();
        idMap.set(oldId, newId);

        return {
          ...person,
          id: newId,
          parentId: person.parentId ? idMap.get(person.parentId) || null : null,
          children: person.children ? reassignIds(person.children) : []
        };
      });
    };

    duplicated.members = reassignIds(duplicated.members);

    this.families.push(duplicated);
    this.saveToLocalStorage();
    this.familiesSubject.next([...this.families]);

    return duplicated;
  }

  // Créer un exemple de famille
  createSampleFamily(): Family {
    const baseId = this.generateId();

    const sampleFamily: Family = {
      id: baseId,
      name: 'Exemple de Famille',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        {
          id: this.generatePersonId(),
          nom: 'Dupont',
          prenom: 'Jean',
          genre: 'homme',
          email: 'jean.dupont@email.com',
          telephone: '01 23 45 67 89',
          adresse: '123 Rue de Paris, 75001 Paris',
          children: [
            {
              id: this.generatePersonId(),
              nom: 'Dupont',
              prenom: 'Marie',
              genre: 'femme',
              parentId: null, // Sera mis à jour
              email: 'marie.dupont@email.com',
              telephone: '01 23 45 67 90',
              adresse: '123 Rue de Paris, 75001 Paris',
              children: [
                {
                  id: this.generatePersonId(),
                  nom: 'Dupont',
                  prenom: 'Luc',
                  genre: 'homme',
                  parentId: null, // Sera mis à jour
                  email: 'luc.dupont@email.com',
                  telephone: '01 23 45 67 91',
                  adresse: '123 Rue de Paris, 75001 Paris',
                  children: []
                }
              ]
            },
            {
              id: this.generatePersonId(),
              nom: 'Dupont',
              prenom: 'Pierre',
              genre: 'homme',
              parentId: null, // Sera mis à jour
              email: 'pierre.dupont@email.com',
              telephone: '01 23 45 67 92',
              adresse: '456 Avenue des Champs, 75008 Paris',
              children: []
            }
          ]
        },
        {
          id: this.generatePersonId(),
          nom: 'Martin',
          prenom: 'Sophie',
          genre: 'femme',
          email: 'sophie.martin@email.com',
          telephone: '01 23 45 67 93',
          adresse: '789 Boulevard Saint-Germain, 75006 Paris',
          children: [
            {
              id: this.generatePersonId(),
              nom: 'Martin',
              prenom: 'Thomas',
              genre: 'homme',
              parentId: null, // Sera mis à jour
              email: 'thomas.martin@email.com',
              telephone: '01 23 45 67 94',
              adresse: '789 Boulevard Saint-Germain, 75006 Paris',
              children: []
            }
          ]
        }
      ]
    };

    // Assigner les parentId aux enfants
    const assignParentIds = (persons: Person[], parentId?: number): void => {
      persons.forEach(person => {
        if (parentId) {
          person.parentId = parentId;
        }
        if (person.children && person.children.length > 0) {
          assignParentIds(person.children, person.id);
        }
      });
    };

    assignParentIds(sampleFamily.members);

    this.families.push(sampleFamily);
    this.saveToLocalStorage();
    this.familiesSubject.next([...this.families]);

    return sampleFamily;
  }

  // Supprimer une famille
  deleteFamily(familyId: number): boolean {
    const initialLength = this.families.length;
    this.families = this.families.filter(f => f.id !== familyId);

    if (this.families.length < initialLength) {
      this.saveToLocalStorage();
      this.familiesSubject.next([...this.families]);

      // Si la famille supprimée était sélectionnée, désélectionner
      if (this.selectedFamilySubject.value?.id === familyId) {
        this.selectedFamilySubject.next(null);
      }
      return true;
    }

    return false;
  }

  // Importer des données
  importData(data: Family[]): void {
    this.families = data.map(family => ({
      ...family,
      createdAt: new Date(family.createdAt),
      updatedAt: new Date(family.updatedAt)
    }));

    // Réinitialiser le dernier ID après import
    this.initializeLastId();

    this.familiesSubject.next([...this.families]);
    this.saveToLocalStorage();
  }

  // Effacer toutes les données
  clearData(): void {
    this.families = [];
    this.lastGeneratedId = 0;
    this.familiesSubject.next([]);
    this.selectedFamilySubject.next(null);
    this.saveToLocalStorage();
  }

  // Sauvegarder dans le localStorage
  private saveToLocalStorage(): void {
    localStorage.setItem('familyTreeData', JSON.stringify(this.families));
  }

  // Charger depuis le localStorage
  private loadFromLocalStorage(): void {
    const saved = localStorage.getItem('familyTreeData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.families = parsed.map((family: any) => ({
          ...family,
          createdAt: new Date(family.createdAt),
          updatedAt: new Date(family.updatedAt),
          members: family.members || []
        }));
        this.familiesSubject.next(this.families);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        // En cas d'erreur, initialiser avec un tableau vide
        this.families = [];
      }
    }
  }

  // Méthodes utilitaires pour les statistiques
  getTotalPersons(): number {
    let total = 0;

    const countPersons = (persons: Person[]): void => {
      total += persons.length;
      persons.forEach(person => {
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

  // Rechercher une personne par nom
  searchPerson(searchTerm: string): Person[] {
    const results: Person[] = [];
    const term = searchTerm.toLowerCase();

    const searchInTree = (persons: Person[]): void => {
      persons.forEach(person => {
        const fullName = `${person.prenom} ${person.nom}`.toLowerCase();
        if (fullName.includes(term) ||
          person.nom.toLowerCase().includes(term) ||
          person.prenom.toLowerCase().includes(term)) {
          results.push(person);
        }
        if (person.children && person.children.length > 0) {
          searchInTree(person.children);
        }
      });
    };

    this.families.forEach(family => {
      searchInTree(family.members);
    });

    return results;
  }

  // Obtenir tous les membres d'une famille (aplatis)
  getAllMembers(familyId: number): Person[] {
    const family = this.families.find(f => f.id === familyId);
    if (!family) return [];

    const allMembers: Person[] = [];

    const collectMembers = (persons: Person[]): void => {
      persons.forEach(person => {
        allMembers.push(person);
        if (person.children && person.children.length > 0) {
          collectMembers(person.children);
        }
      });
    };

    collectMembers(family.members);
    return allMembers;
  }

  // Vérifier si une personne existe
  personExists(personId: number, familyId: number): boolean {
    const family = this.families.find(f => f.id === familyId);
    if (!family) return false;

    const searchPerson = (persons: Person[]): boolean => {
      for (const person of persons) {
        if (person.id === personId) return true;
        if (person.children && person.children.length > 0) {
          if (searchPerson(person.children)) return true;
        }
      }
      return false;
    };

    return searchPerson(family.members);
  }

  // Obtenir la profondeur maximale d'une famille
  getFamilyMaxDepth(familyId: number): number {
    const family = this.families.find(f => f.id === familyId);
    if (!family) return 0;

    const getDepth = (persons: Person[], currentDepth: number): number => {
      let maxDepth = currentDepth;
      persons.forEach(person => {
        if (person.children && person.children.length > 0) {
          const childDepth = getDepth(person.children, currentDepth + 1);
          if (childDepth > maxDepth) maxDepth = childDepth;
        }
      });
      return maxDepth;
    };

    return getDepth(family.members, 1);
  }

  // Mettre à jour le nom d'une famille
  updateFamilyName(familyId: number, newName: string): boolean {
    const family = this.families.find(f => f.id === familyId);
    if (!family) return false;

    family.name = newName;
    family.updatedAt = new Date();
    this.saveToLocalStorage();
    this.familiesSubject.next([...this.families]);

    // Mettre à jour la famille sélectionnée si c'est celle-ci
    if (this.selectedFamilySubject.value?.id === familyId) {
      this.selectedFamilySubject.next({...family});
    }

    return true;
  }

  private saveToLocalStorage(): void {
    try {
      // Séparer les photos pour éviter de surcharger le localStorage
      const familiesWithoutLargePhotos = this.families.map(family => ({
        ...family,
        members: this.processMembersForStorage(family.members)
      }));

      localStorage.setItem('familyTreeData', JSON.stringify(familiesWithoutLargePhotos));

      // Stocker les photos séparément si elles sont trop grandes
      this.savePhotosToSeparateStorage();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      // Essayer sans les photos si erreur de quota
      this.saveWithoutPhotos();
    }
  }

  private processMembersForStorage(members: Person[]): Person[] {
    return members.map(member => {
      const processedMember = { ...member };

      // Si la photo est trop grande, la stocker séparément
      if (member.photo && member.photo.length > 50000) {
        const photoId = `photo_${member.id}_${Date.now()}`;
        this.photoStorageService.cachePhoto(photoId, member.photo);
        processedMember.photo = photoId; // Stocker seulement l'ID
      }

      if (member.children && member.children.length > 0) {
        processedMember.children = this.processMembersForStorage(member.children);
      }

      return processedMember;
    });
  }
}
