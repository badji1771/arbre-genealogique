export interface Person {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  adresse?: string;
  email?: string;
  parentId?: number | null;
  genre: 'homme' | 'femme';
  children?: Person[];
}

export interface Family {
  id: number;
  name: string;
  members: Person[];
  createdAt: Date;
  updatedAt: Date;
}
