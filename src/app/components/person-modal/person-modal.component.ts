import { Component, EventEmitter, Input, Output, OnInit, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Person } from '../../models/person.model';
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-person-modal',
  templateUrl: './person-modal.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  styleUrls: ['./person-modal.component.css']
})
export class PersonModalComponent implements OnInit, OnChanges {
  @Input() show = false;
  @Input() editingPerson: Person | null = null;
  @Input() parentName: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  @ViewChild('fileInput') fileInput!: ElementRef;

  personForm: FormGroup;
  photoPreview: string | null = null;
  isProcessing = false;
  maxFileSize = 5 * 1024 * 1024; // 5MB

  constructor(private fb: FormBuilder) {
    this.personForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      genre: ['homme', Validators.required],
      telephone: ['', [Validators.pattern(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)]],
      email: ['', [Validators.email]],
      adresse: [''],
      photo: [''],
      dateNaissance: [''],
      profession: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.resetForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingPerson'] && this.editingPerson) {
      this.loadPersonData();
    }

    if (changes['show'] && this.show && !this.editingPerson) {
      this.resetForm();
    }
  }

  loadPersonData(): void {
    if (!this.editingPerson) return;

    const formData: any = {
      nom: this.editingPerson.nom || '',
      prenom: this.editingPerson.prenom || '',
      genre: this.editingPerson.genre || 'homme',
      telephone: this.editingPerson.telephone || '',
      email: this.editingPerson.email || '',
      adresse: this.editingPerson.adresse || '',
      profession: this.editingPerson.profession || '',
      notes: this.editingPerson.notes || ''
    };

    if (this.editingPerson.photo) {
      formData.photo = this.editingPerson.photo;
      this.photoPreview = this.editingPerson.photo;
    } else {
      this.photoPreview = null;
    }

    if (this.editingPerson.dateNaissance) {
      const date = new Date(this.editingPerson.dateNaissance);
      formData.dateNaissance = date.toISOString().split('T')[0];
    }

    this.personForm.patchValue(formData);
    this.personForm.markAsPristine();
    this.personForm.markAsUntouched();
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (!this.validateFile(file)) {
      return;
    }

    this.isProcessing = true;

    try {
      const compressedImage = await this.compressImage(file);
      this.photoPreview = compressedImage;
      this.personForm.patchValue({ photo: compressedImage });
    } catch (error) {
      console.error('Erreur lors du traitement de la photo:', error);
      alert('Une erreur est survenue lors du traitement de la photo.');
    } finally {
      this.isProcessing = false;
      input.value = '';
    }
  }

  private validateFile(file: File): boolean {
    if (!file.type.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
      alert('Veuillez sélectionner une image valide (JPG, PNG, GIF, WebP).');
      return false;
    }

    if (file.size > this.maxFileSize) {
      alert('L\'image est trop volumineuse. Taille maximale : 5MB.');
      return false;
    }

    return true;
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const maxWidth = 800;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Impossible de créer le contexte canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => reject(new Error('Erreur de chargement de l\'image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.readAsDataURL(file);
    });
  }

  removePhoto(): void {
    this.photoPreview = null;
    this.personForm.patchValue({ photo: '' });
  }

  async onSubmit(): Promise<void> {
    if (this.personForm.invalid) {
      this.markFormGroupTouched(this.personForm);
      return;
    }

    this.isProcessing = true;

    try {
      const formData = { ...this.personForm.value };

      if (formData.dateNaissance) {
        formData.dateNaissance = new Date(formData.dateNaissance);
      }

      this.save.emit(formData);
      this.resetForm();
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      alert('Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      this.isProcessing = false;
    }
  }

  onClose(): void {
    this.close.emit();
    this.resetForm();
  }

  private resetForm(): void {
    this.personForm.reset({
      genre: 'homme',
      nom: '',
      prenom: '',
      telephone: '',
      email: '',
      adresse: '',
      photo: '',
      dateNaissance: '',
      profession: '',
      notes: ''
    });
    this.photoPreview = null;
    this.isProcessing = false;
    this.personForm.markAsPristine();
    this.personForm.markAsUntouched();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // === GETTERS ===

  get title(): string {
    return this.editingPerson ? '✏️ Modifier la personne' : '➕ Nouvelle personne';
  }

  get buttonText(): string {
    return this.editingPerson ? 'Mettre à jour' : 'Ajouter';
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

  get telephoneInvalid(): boolean {
    const control = this.personForm.get('telephone');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
}
