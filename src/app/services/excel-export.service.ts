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

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(allPersons);

    const wscols = [
      { wch: 25 },
      { wch: 15 },
      { wch: 20 },
      { wch: 10 },
      { wch: 20 },
      { wch: 30 },
      { wch: 40 },
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
    ];
    ws['!cols'] = wscols;

    const header = [
      ['Arbre Généalogique - Famille ' + family.name],
      ['Exporté le ' + new Date().toLocaleDateString('fr-FR')],
      [],
      ['NOM COMPLET', 'PRÉNOM', 'NOM', 'GENRE', 'TÉLÉPHONE', 'EMAIL', 'ADRESSE', 'GÉNÉRATION', 'PARENT', 'ENFANTS']
    ];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    XLSX.utils.sheet_add_aoa(ws, header, { origin: 'A1' });
    range.e.r += header.length;

    const dataStart = header.length + 1;
    const newData = XLSX.utils.sheet_to_json(ws, { header: 1 });
    ws['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: newData.length + dataStart - 1, c: 9 }
    });

    const headerRange = XLSX.utils.decode_range('A4:J4');
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 3, c: C });
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F46E5' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Famille ' + family.name);

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
        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(allPersons);

        const header = [['Famille: ' + family.name], [], ['Nom Complet', 'Prénom', 'Nom', 'Genre', 'Téléphone', 'Email', 'Adresse', 'Génération', 'Parent', 'Enfants']];
        XLSX.utils.sheet_add_aoa(ws, header, { origin: 'A1' });

        XLSX.utils.book_append_sheet(wb, ws, family.name.substring(0, 31));
      }
    });

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    saveAs(data, `arbres-genealogiques-${new Date().getTime()}.xlsx`);
  }

  private flattenTree(persons: Person[], result: any[], level: number, parentName: string = ''): void {
    persons.forEach(person => {
      const fullName = `${person.prenom} ${person.nom}`;
      const parent = parentName || 'Fondateur';
      const childrenCount = person.children ? person.children.length : 0;

      result.push({
        'Nom Complet': fullName,
        'Prénom': person.prenom,
        'Nom': person.nom,
        'Genre': person.genre === 'homme' ? 'Homme' : 'Femme',
        'Téléphone': person.telephone || '',
        'Email': person.email || '',
        'Adresse': person.adresse || '',
        'Génération': `Niveau ${level + 1}`,
        'Parent': parent,
        'Enfants': childrenCount
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
