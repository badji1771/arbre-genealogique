import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { PersonCardComponent } from './components/person-card/person-card.component';
import { FamilySidebarComponent } from './components/family-sidebar/family-sidebar.component';
import { PersonModalComponent } from './components/person-modal/person-modal.component';

@NgModule({
  declarations: [
    PersonCardComponent,
    FamilySidebarComponent,
    PersonModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [],
  exports: [
    PersonModalComponent,
    PersonCardComponent,
    FamilySidebarComponent
  ],
  bootstrap: []
})
export class AppModule { }
