import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Person } from '../../models/person.model';

@Component({
  selector: 'app-person-card',
  templateUrl: './person-card.component.html',
  styleUrls: ['./person-card.component.css']
})
export class PersonCardComponent {
  @Input() person!: Person;
  @Input() isSelected: boolean = false;
  @Output() select = new EventEmitter<Person>();
  @Output() addChild = new EventEmitter<Person>();
  @Output() edit = new EventEmitter<Person>();
  @Output() delete = new EventEmitter<number>();

  getCardClass(): string {
    const baseClass = 'person-card';
    const genderClass = this.person.genre === 'homme' ? 'person-card-man' : 'person-card-woman';
    const selectedClass = this.isSelected ? 'person-card-selected' : '';
    return `${baseClass} ${genderClass} ${selectedClass}`;
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
}
