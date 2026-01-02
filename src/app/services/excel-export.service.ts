import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Family, Person } from '../models/person.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  exportFamilyToExcel(family: Family): void {
    const allPersons: any[] = [];
    this.flattenTree(family.members, allPersons, 0);

    // 1. Créer une feuille de calcul vide
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([]);

    // 2. Définir les en-têtes
    const header = [
      ['Arbre Généalogique - Famille ' + family.name],
      ['Exporté le ' + new Date().toLocaleDateString('fr-FR')],
      [],
      ['NOM COMPLET', 'PRÉNOM', 'NOM', 'GENRE', 'TÉLÉPHONE', 'EMAIL', 'ADRESSE', 'GÉNÉRATION', 'PARENT', 'ENFANTS']
    ];

    // 3. Ajouter les en-têtes à partir de A1
    XLSX.utils.sheet_add_aoa(ws, header, { origin: 'A1' });

    // 4. Ajouter les données à partir de la ligne 5 (A5), en ignorant les en-têtes automatiques de json
    XLSX.utils.sheet_add_json(ws, allPersons, { origin: 'A5', skipHeader: true });

    // 5. Configurer la largeur des colonnes
    const wscols = [
      { wch: 25 }, // Nom Complet
      { wch: 15 }, // Prénom
      { wch: 20 }, // Nom
      { wch: 10 }, // Genre
      { wch: 20 }, // Téléphone
      { wch: 30 }, // Email
      { wch: 40 }, // Adresse
      { wch: 15 }, // Génération
      { wch: 30 }, // Parent
      { wch: 10 }, // Enfants
    ];
    ws['!cols'] = wscols;

    // 6. Style pour les en-têtes (Note: XLSX community edition ne supporte pas les styles dans .xlsx,
    // mais on garde la logique si une version pro ou un plugin est utilisé, ou pour la structure)
    // Nous définissons au moins le ref correctement
    const lastRow = 4 + allPersons.length;
    ws['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: lastRow - 1, c: 9 }
    });

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Famille ' + family.name.substring(0, 20));

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    saveAs(data, `arbre-genealogique-${family.name.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
  }

  exportMultipleFamilies(families: Family[]): void {
    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    families.forEach(family => {
      const allPersons: any[] = [];
      this.flattenTree(family.members, allPersons, 0);

      if (allPersons.length > 0) {
        const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([]);
        const header = [
          ['Famille: ' + family.name],
          [],
          ['NOM COMPLET', 'PRÉNOM', 'NOM', 'GENRE', 'TÉLÉPHONE', 'EMAIL', 'ADRESSE', 'GÉNÉRATION', 'PARENT', 'ENFANTS']
        ];
        XLSX.utils.sheet_add_aoa(ws, header, { origin: 'A1' });
        XLSX.utils.sheet_add_json(ws, allPersons, { origin: 'A4', skipHeader: true });

        // Ajuster colonnes
        ws['!cols'] = [
          { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
          { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 30 }, { wch: 10 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, family.name.substring(0, 31));
      }
    });

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    saveAs(data, `arbres-genealogiques-${new Date().getTime()}.xlsx`);
  }

  exportPersonToExcel(person: Person, family: Family): void {
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([]);

    let parentName = 'Fondateur';
    if (person.parentId) {
      const parent = this.findPersonInTree(family.members, person.parentId);
      if (parent) {
        parentName = `${parent.prenom} ${parent.nom}`;
      } else {
        parentName = 'Inconnu (ID: ' + person.parentId + ')';
      }
    }

    const childrenNames = person.children && person.children.length > 0
      ? person.children.map(c => `${c.prenom} ${c.nom}`).join(', ')
      : 'Aucun';

    const data = [
      ['FICHE INDIVIDUELLE'],
      ['Famille: ' + family.name],
      ['Date d\'export: ' + new Date().toLocaleDateString('fr-FR')],
      [],
      ['INFORMATIONS PERSONNELLES'],
      ['Nom Complet', `${person.prenom} ${person.nom}`],
      ['Prénom', person.prenom],
      ['Nom', person.nom],
      ['Genre', person.genre === 'homme' ? 'Homme' : 'Femme'],
      ['Date de naissance', person.dateNaissance ? new Date(person.dateNaissance).toLocaleDateString('fr-FR') : 'Non renseignée'],
      ['Profession', person.profession || 'Non renseignée'],
      [],
      ['COORDONNÉES'],
      ['Téléphone', person.telephone || 'Non renseigné'],
      ['Email', person.email || 'Non renseigné'],
      ['Adresse', person.adresse || 'Non renseignée'],
      [],
      ['RELATIONS FAMILIALES'],
      ['Parent direct', parentName],
      ['Enfants', childrenNames],
      [],
      ['NOTES'],
      [person.notes || 'Aucune note particulière.']
    ];

    XLSX.utils.sheet_add_aoa(ws, data, { origin: 'A1' });

    // Ajuster la largeur des colonnes
    ws['!cols'] = [
      { wch: 25 }, // Colonne A (Labels)
      { wch: 50 }  // Colonne B (Valeurs)
    ];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${person.prenom} ${person.nom}`.substring(0, 31));

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    saveAs(blob, `fiche-${person.prenom.toLowerCase()}-${person.nom.toLowerCase()}.xlsx`);
  }

  private findPersonInTree(persons: Person[], id: number): Person | undefined {
    for (const p of persons) {
      if (p.id === id) return p;
      if (p.children && p.children.length > 0) {
        const found = this.findPersonInTree(p.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  private flattenTree(persons: Person[], result: any[], level: number, parentName: string = ''): void {
    persons.forEach(person => {
      const fullName = `${person.prenom} ${person.nom}`;
      const parent = parentName || 'Fondateur';
      const childrenCount = person.children ? person.children.length : 0;

      result.push({
        'NOM COMPLET': fullName,
        'PRÉNOM': person.prenom,
        'NOM': person.nom,
        'GENRE': person.genre === 'homme' ? 'Homme' : 'Femme',
        'TÉLÉPHONE': person.telephone || '',
        'EMAIL': person.email || '',
        'ADRESSE': person.adresse || '',
        'GÉNÉRATION': `Niveau ${level + 1}`,
        'PARENT': parent,
        'ENFANTS': childrenCount
      });

      if (person.children && person.children.length > 0) {
        this.flattenTree(person.children, result, level + 1, fullName);
      }
    });
  }

  exportStatistics(families: Family[]): void {
    const stats = this.calculateStatistics(families);
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(stats);

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Statistiques');

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    saveAs(data, `statistiques-arbres-genealogiques-${new Date().getTime()}.xlsx`);
  }

  private calculateStatistics(families: Family[]): any[] {
    return families.map(family => {
      const allPersons: Person[] = [];
      this.getAllPersons(family.members, allPersons);

      const men = allPersons.filter(p => p.genre === 'homme').length;
      const women = allPersons.filter(p => p.genre === 'femme').length;
      const withPhone = allPersons.filter(p => p.telephone).length;
      const withEmail = allPersons.filter(p => p.email).length;
      const withAddress = allPersons.filter(p => p.adresse).length;
      const maxDepth = this.getMaxDepth(family.members);

      return {
        'Famille': family.name,
        'Membres totaux': allPersons.length,
        'Hommes': men,
        'Femmes': women,
        'Avec téléphone': withPhone,
        'Avec email': withEmail,
        'Avec adresse': withAddress,
        'Profondeur max': maxDepth,
        'Date création': new Date(family.createdAt).toLocaleDateString('fr-FR'),
        'Dernière modification': new Date(family.updatedAt).toLocaleDateString('fr-FR')
      };
    });
  }

  private getAllPersons(persons: Person[], result: Person[]): void {
    persons.forEach(person => {
      result.push(person);
      if (person.children && person.children.length > 0) {
        this.getAllPersons(person.children, result);
      }
    });
  }

  private getMaxDepth(persons: Person[]): number {
    if (!persons || persons.length === 0) return 0;

    let maxDepth = 0;
    persons.forEach(person => {
      const depth = 1 + this.getMaxDepth(person.children || []);
      if (depth > maxDepth) maxDepth = depth;
    });

    return maxDepth;
  }
}
