export interface Person {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  adresse?: string;
  email?: string;
  genre: 'homme' | 'femme';
  parentId?: number | null;
  children?: Person[];
  photo?: string; // ← AJOUTEZ CETTE LIGNE
  dateNaissance?: Date;
  dateDeces?: Date;
  profession?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Family {
  id: number;
  name: string;
  members: Person[];
  createdAt: Date;
  updatedAt: Date;
  coverPhoto?: string; // Optionnel : photo de couverture de la famille
  memberCount?: number; // Nombre total de personnes (cache côté backend)
}


