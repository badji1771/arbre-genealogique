import { Component, OnInit } from '@angular/core';
import { FamilyTreeService } from './services/family-tree.service';
import { ExcelExportService } from './services/excel-export.service';
import { Family, Person } from './models/person.model';
import {CommonModule, DatePipe} from "@angular/common";
import { AppModule } from './app.module';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [
    AppModule,
    CommonModule,
    DatePipe
  ],
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  families: Family[] = [];
  selectedFamily: Family | null = null;
  selectedPerson: Person | null = null;
  showPersonModal = false;
  editingPerson: Person | null = null;
  parentForNewChild: Person | null = null;
  showAllGenerations = true;

  personFormData = {
    nom: '',
    prenom: '',
    telephone: '',
    adresse: '',
    email: '',
    parentId: null as number | null,
    genre: 'homme' as 'homme' | 'femme'
  };

  constructor(
    private familyTreeService: FamilyTreeService,
    private excelExportService: ExcelExportService
  ) {}

  ngOnInit(): void {
    this.familyTreeService.families$.subscribe(families => {
      this.families = families;
    });

    this.familyTreeService.selectedFamily$.subscribe(family => {
      this.selectedFamily = family;
      this.selectedPerson = null;
    });
  }

  toggleShowAllGenerations(): void {
    this.showAllGenerations = !this.showAllGenerations;
  }

  addPerson(): void {
    if (this.selectedFamily) {
      this.familyTreeService.addPerson({
        ...this.personFormData,
        parentId: this.parentForNewChild?.id || null
      }, this.selectedFamily.id);

      this.closePersonModal();
    }
  }

  updatePerson(): void {
    if (this.selectedFamily && this.editingPerson) {
      this.familyTreeService.updatePerson(
        this.editingPerson.id,
        this.personFormData,
        this.selectedFamily.id
      );
      this.closePersonModal();
    }
  }

  deletePerson(personId: number): void {
    if (this.selectedFamily && confirm('Êtes-vous sûr de vouloir supprimer cette personne et ses descendants ?')) {
      this.familyTreeService.deletePerson(personId, this.selectedFamily.id);
      if (this.selectedPerson?.id === personId) {
        this.selectedPerson = null;
      }
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
      genre: 'homme'
    };
    this.showPersonModal = true;
  }

  openEditPersonModal(person: Person): void {
    this.editingPerson = person;
    this.parentForNewChild = null;
    this.personFormData = {
      nom: person.nom,
      prenom: person.prenom,
      telephone: person.telephone || '',
      adresse: person.adresse || '',
      email: person.email || '',
      parentId: person.parentId || null,
      genre: person.genre
    };
    this.showPersonModal = true;
  }

  closePersonModal(): void {
    this.showPersonModal = false;
    this.editingPerson = null;
    this.parentForNewChild = null;
  }

  onPersonFormSubmit(formData: any): void {
    this.personFormData = { ...formData, parentId: this.parentForNewChild?.id || null };

    if (this.editingPerson) {
      this.updatePerson();
    } else {
      this.addPerson();
    }
  }

  exportCurrentFamily(): void {
    if (this.selectedFamily) {
      this.excelExportService.exportFamilyToExcel(this.selectedFamily);
    }
  }

  exportAllFamilies(): void {
    if (this.families.length > 0) {
      this.excelExportService.exportMultipleFamilies(this.families);
    }
  }

  exportStatistics(): void {
    if (this.families.length > 0) {
      this.excelExportService.exportStatistics(this.families);
    }
  }

  importFromJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          this.familyTreeService.importData(data);
          alert('Données importées avec succès !');
        } catch (error) {
          alert('Erreur lors de l\'import du fichier JSON');
          console.error(error);
        }
      };

      reader.readAsText(file);
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
  }

  clearAllData(): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer TOUTES les données ? Cette action est irréversible.')) {
      this.familyTreeService.clearData();
    }
  }

  get treeData(): any[] {
    if (!this.selectedFamily) return [];
    return this.renderTree(this.selectedFamily.members, 0, this.showAllGenerations);
  }

  private renderTree(persons: Person[], level: number = 0, showAll: boolean): any[] {
    if (!persons || persons.length === 0) return [];

    return persons.map(person => {
      let children = [];
      if (showAll && person.children) {
        children = this.renderTree(person.children, level + 1, showAll);
      }

      return {
        person,
        level,
        children,
        isSelected: this.selectedPerson?.id === person.id
      };
    });
  }
}
