import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { Person } from '../../models/person.model';
import {CommonModule} from "@angular/common";

@Component({
  selector: 'app-person-modal',
  templateUrl: './person-modal.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  styleUrls: ['./person-modal.component.css']
})
export class PersonModalComponent implements OnInit {
  @Input() show = false;
  @Input() editingPerson: Person | null = null;
  @Input() parentName: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  personForm: FormGroup;
  genres = [
    { value: 'homme', label: '👨 Homme' },
    { value: 'femme', label: '👩 Femme' }
  ];

  constructor(private fb: FormBuilder) {
    this.personForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      genre: ['homme', Validators.required],
      telephone: [''],
      email: ['', [Validators.email]],
      adresse: ['']
    });
  }

  ngOnInit(): void {
    if (this.editingPerson) {
      this.personForm.patchValue({
        nom: this.editingPerson.nom,
        prenom: this.editingPerson.prenom,
        genre: this.editingPerson.genre,
        telephone: this.editingPerson.telephone || '',
        email: this.editingPerson.email || '',
        adresse: this.editingPerson.adresse || ''
      });
    }
  }

  onSubmit(): void {
    if (this.personForm.valid) {
      this.save.emit(this.personForm.value);
      this.personForm.reset({ genre: 'homme' });
    } else {
      this.markFormGroupTouched(this.personForm);
    }
  }

  onClose(): void {
    this.close.emit();
    this.personForm.reset({ genre: 'homme' });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  get title(): string {
    return this.editingPerson ? '✏️ Modifier la personne' : '➕ Nouvelle personne';
  }

  get buttonText(): string {
    return this.editingPerson ? '✓ Mettre à jour' : '+ Ajouter';
  }

  get isParent(): boolean {
    return !!this.parentName;
  }

  get nomInvalid(): boolean {
    const control = this.personForm.get('nom');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get prenomInvalid(): boolean {
    const control = this.personForm.get('prenom');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get emailInvalid(): boolean {
    const control = this.personForm.get('email');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
}
