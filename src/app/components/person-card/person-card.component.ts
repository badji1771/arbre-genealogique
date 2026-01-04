import { Component, Input, Output, EventEmitter, Pipe, PipeTransform } from '@angular/core';
import { Person } from '../../models/person.model';
import { CommonModule } from "@angular/common";
import { DateUtils } from '../../utils/date-utils';

@Pipe({
  name: 'truncate',
  standalone: true
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit: number = 25, trail: string = '...'): string {
    if (!value) return '';
    return value.length > limit ? value.substring(0, limit) + trail : value;
  }
}

@Component({
  selector: 'app-person-card',
  templateUrl: './person-card.component.html',
  standalone: true,
  imports: [CommonModule, TruncatePipe],
  styleUrls: ['./person-card.component.css']
})
export class PersonCardComponent {
  @Input() person!: Person;
  @Input() isSelected: boolean = false;
  @Input() generation: number = 0;

  @Output() select = new EventEmitter<Person>();
  @Output() addChild = new EventEmitter<Person>();
  @Output() edit = new EventEmitter<Person>();
  @Output() delete = new EventEmitter<number>();
  @Output() viewDetails = new EventEmitter<Person>();
  @Output() showDescendants = new EventEmitter<Person>();

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

    // Classe pour les photos
    if (this.person.photo) {
      classes.push('has-photo');
    }

    return classes.join(' ');
  }

  getGradient(): string {
    const colors = {
      homme: [
        ['#3498db', '#2980b9'], // Bleu
        ['#2ecc71', '#27ae60'], // Vert
        ['#9b59b6', '#8e44ad'], // Violet
        ['#34495e', '#2c3e50']  // Gris bleu
      ],
      femme: [
        ['#e74c3c', '#c0392b'], // Rouge
        ['#e67e22', '#d35400'], // Orange
        ['#f1c40f', '#f39c12'], // Jaune
        ['#1abc9c', '#16a085']  // Turquoise
      ]
    };

    const genderColors = this.person.genre === 'homme' ? colors.homme : colors.femme;
    const colorPair = genderColors[this.generation % genderColors.length];

    return `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`;
  }

  getInitials(): string {
    return `${this.person.prenom.charAt(0)}${this.person.nom.charAt(0)}`.toUpperCase();
  }

  getAge(): number {
    return DateUtils.calculateAge(this.person.dateNaissance);
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
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${this.person.prenom} ${this.person.nom} et tous ses descendants ?`)) {
      this.delete.emit(this.person.id);
    }
  }

  onViewDetails(event: Event): void {
    event.stopPropagation();
    this.viewDetails.emit(this.person);
  }

  onShowDescendants(event: Event): void {
    event.stopPropagation();
    this.showDescendants.emit(this.person);
  }

  onPhotoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    // L'avatar s'affichera automatiquement
  }
}
