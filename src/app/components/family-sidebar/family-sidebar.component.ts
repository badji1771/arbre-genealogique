import { Component, OnInit } from '@angular/core';
import { FamilyTreeService } from '../../services/family-tree.service';
import { Family } from '../../models/person.model';
import {FormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";

@Component({
  selector: 'app-family-sidebar',
  templateUrl: './family-sidebar.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrls: ['./family-sidebar.component.css']
})
export class FamilySidebarComponent implements OnInit {
  families: Family[] = [];
  selectedFamily: Family | null = null;
  showAddFamily = false;
  newFamilyName = '';

  constructor(private familyTreeService: FamilyTreeService) {}

  ngOnInit(): void {
    this.familyTreeService.families$.subscribe(families => {
      this.families = families;
    });

    this.familyTreeService.selectedFamily$.subscribe(family => {
      this.selectedFamily = family;
    });
  }

  addFamily(): void {
    if (this.newFamilyName.trim()) {
      const family = this.familyTreeService.addFamily(this.newFamilyName.trim());
      this.familyTreeService.selectFamily(family);
      this.newFamilyName = '';
      this.showAddFamily = false;
    }
  }

  selectFamily(family: Family): void {
    this.familyTreeService.selectFamily(family);
  }

  cancelAddFamily(): void {
    this.showAddFamily = false;
    this.newFamilyName = '';
  }
}
