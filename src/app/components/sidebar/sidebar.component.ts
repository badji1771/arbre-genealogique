import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Family } from '../../models/person.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() families: Family[] = [];
  @Input() selectedFamily: Family | null = null;
  @Input() showAddFamily = false;
  @Input() newFamilyName = '';
  @Input() collapsed = false;
  @Input() totalMembersAllFamilies = 0;
  @Input() totalGenerations = 0;

  @Output() selectFamily = new EventEmitter<Family>();
  @Output() toggleAddFamily = new EventEmitter<void>();
  @Output() addNewFamily = new EventEmitter<string>();
  @Output() quickView = new EventEmitter<Family>();
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() renameFamily = new EventEmitter<{id: number, newName: string}>();
  @Output() deleteFamily = new EventEmitter<number>();

  editingFamilyId: number | null = null;
  editedFamilyName: string = '';
  Math = Math;

  onSelectFamily(family: Family): void {
    if (this.editingFamilyId === family.id) return;
    this.selectFamily.emit(family);
  }

  onToggleAddFamily(): void {
    this.toggleAddFamily.emit();
  }

  onAddNewFamily(): void {
    if (this.newFamilyName.trim()) {
      this.addNewFamily.emit(this.newFamilyName);
      this.newFamilyName = '';
    }
  }

  onQuickView(family: Family): void {
    this.quickView.emit(family);
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  startRename(family: Family, event: Event): void {
    event.stopPropagation();
    this.editingFamilyId = family.id;
    this.editedFamilyName = family.name;
  }

  cancelRename(event: Event): void {
    event.stopPropagation();
    this.editingFamilyId = null;
    this.editedFamilyName = '';
  }

  saveRename(family: Family, event: Event): void {
    event.stopPropagation();
    if (this.editedFamilyName.trim() && this.editedFamilyName !== family.name) {
      this.renameFamily.emit({id: family.id, newName: this.editedFamilyName.trim()});
    }
    this.editingFamilyId = null;
  }

  onDeleteFamily(family: Family, event: Event): void {
    event.stopPropagation();
    if (confirm(`Êtes-vous sûr de vouloir supprimer la famille "${family.name}" ?`)) {
      this.deleteFamily.emit(family.id);
    }
  }

  getFamilyMemberCount(family: Family): number {
    if (!family || !family.members) return 0;
    // Compte récursif des membres
    const countMembers = (persons: any[]): number => {
      let count = persons.length;
      persons.forEach(p => {
        if (p.children && p.children.length > 0) {
          count += countMembers(p.children);
        }
      });
      return count;
    };
    return countMembers(family.members);
  }
}
