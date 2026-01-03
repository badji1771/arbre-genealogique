import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Family } from '../../models/person.model';
import { GuideService } from '../../services/GuideService';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Input() selectedFamily: Family | null = null;
  @Input() sidebarCollapsed = false;
  @Input() maxLevel = 0;

  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() triggerImport = new EventEmitter<void>();
  @Output() showGuide = new EventEmitter<void>();
  @Output() openJsonManager = new EventEmitter<void>();

  guideService = inject(GuideService);

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  onTriggerImport(): void {
    this.triggerImport.emit();
  }

  onShowGuide(): void {
    this.showGuide.emit();
  }

  onOpenJsonManager(): void {
    this.openJsonManager.emit();
  }

  getTotalMembers(family: Family): number {
    if (!family || !family.members) return 0;
    return family.members.length;
  }
}
