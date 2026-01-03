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

  @Output() selectFamily = new EventEmitter<Family>();
  @Output() toggleAddFamily = new EventEmitter<void>();
  @Output() addNewFamily = new EventEmitter<string>();
  @Output() quickView = new EventEmitter<Family>();
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() getTotalMembersAllFamilies = new EventEmitter<void>(); // Or just pass as Input

  // These could be Inputs instead of calling methods from parent
  @Input() totalMembersAllFamilies = 0;
  @Input() totalGenerations = 0;

  onSelectFamily(family: Family): void {
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

  getFamilyMemberCount(family: Family): number {
    if (!family || !family.members) return 0;
    return family.members.length;
  }
}
