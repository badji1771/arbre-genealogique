import {ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from '@angular/core';
import { Person } from '../../models/person.model';
import {CommonModule} from "@angular/common";

@Component({
  selector: 'app-person-card',
  templateUrl: './person-card.component.html',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./person-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PersonCardComponent {
  @Input() person!: Person;
  @Input() isSelected: boolean = false;
  @Output() select = new EventEmitter<Person>();
  @Output() addChild = new EventEmitter<Person>();
  @Output() edit = new EventEmitter<Person>();
  @Output() delete = new EventEmitter<number>();
  @Input() generation: number = 0;

  getCardClass(): string {
    const classes = ['person-card'];

    // Classe de genre
    classes.push(this.person.genre === 'homme' ? 'person-card-man' : 'person-card-woman');

    // Classe de sélection
    if (this.isSelected) {
      classes.push('person-card-selected');
    }

    // Classe de génération
    classes.push(`generation-${this.generation}`);

    return classes.join(' ');
  }
  getGenerationColor(): string {
    const colors = [
      '#4F46E5', // Indigo - Fondateurs
      '#7C3AED', // Violet - Génération 1
      '#10B981', // Émeraude - Génération 2
      '#F59E0B', // Ambre - Génération 3
      '#EF4444', // Rouge - Génération 4
      '#EC4899', // Rose - Génération 5
      '#6366F1', // Indigo light
      '#8B5CF6', // Violet light
      '#059669', // Émeraude light
    ];

    return colors[this.generation % colors.length];
  }

  onSelect(): void {
    this.select.emit(this.person);
  }

  onAddChild(event: Event): void {
    event.stopPropagation();
    this.addChild.emit(this.person);
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit(this.person);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    if (confirm('Êtes-vous sûr de vouloir supprimer cette personne et ses descendants ?')) {
      this.delete.emit(this.person.id);
    }
  }
  getInitials(): string {
    return `${this.person.prenom.charAt(0)}${this.person.nom.charAt(0)}`.toUpperCase();
  }
}
