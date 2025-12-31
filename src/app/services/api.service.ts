import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';

// DTOs côté backend Spring Boot (aligné avec la proposition précédente)
export interface FamilyDto {
  id?: number;
  name: string;
  createdAt?: string;
}

export interface PersonDto {
  id?: number;
  firstName?: string;
  lastName?: string;
  gender?: 'HOMME' | 'FEMME';
  birthDate?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  job?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  familyId?: number | null;
  fatherId?: number | null;
  motherId?: number | null;
  spouseIds?: number[] | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  // Base URL configurable via localStorage ('apiBaseUrl') sinon défaut localhost:8080
  private get baseUrl(): string {
    const fromStorage = localStorage.getItem('apiBaseUrl');
    const raw = (fromStorage && fromStorage.trim()) || 'http://localhost:8080/api';
    return this.normalizeBaseUrl(raw);
  }

  // Ensure the base URL always contains the '/api' suffix expected by the backend controllers
  private normalizeBaseUrl(url: string): string {
    try {
      let u = url.trim();
      // Remove trailing spaces
      if (!u) return 'http://localhost:8080/api';
      // If user provided something like 'http://host:port', append '/api'
      const endsWithApi = /\/api\/?$/.test(u);
      if (!endsWithApi) {
        if (u.endsWith('/')) {
          u = u + 'api';
        } else {
          u = u + '/api';
        }
        // One-time hint for easier troubleshooting
        console.info('[ApiService] apiBaseUrl adjusted to include /api:', u);
      }
      // Collapse any accidental double slashes before query (except after protocol)
      u = u.replace(/([^:])\/\/+/, '$1/');
      return u;
    } catch {
      return 'http://localhost:8080/api';
    }
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  constructor(private http: HttpClient) {}

  // Santé simple: tente un GET familles
  ping(): Observable<any> {
    return this.http.get(`${this.baseUrl}/families`, { headers: this.headers });
  }

  // Families
  getFamilies(): Observable<FamilyDto[]> {
    return this.http.get<FamilyDto[]>(`${this.baseUrl}/families`, { headers: this.headers });
  }

  createFamily(name: string): Observable<FamilyDto> {
    const body: FamilyDto = { name };
    return this.http.post<FamilyDto>(`${this.baseUrl}/families`, body, { headers: this.headers });
  }

  updateFamily(id: number, patch: Partial<FamilyDto>): Observable<FamilyDto> {
    return this.http.patch<FamilyDto>(`${this.baseUrl}/families/${id}`, patch, { headers: this.headers });
  }

  deleteFamily(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/families/${id}`, { headers: this.headers });
  }

  // Persons
  getPersonsByFamily(familyId: number): Observable<PersonDto[]> {
    return this.http.get<PersonDto[]>(`${this.baseUrl}/persons/by-family/${familyId}`, { headers: this.headers });
  }

  createPerson(dto: PersonDto): Observable<PersonDto> {
    return this.http.post<PersonDto>(`${this.baseUrl}/persons`, dto, { headers: this.headers });
  }

  updatePerson(id: number, dto: PersonDto): Observable<PersonDto> {
    return this.http.patch<PersonDto>(`${this.baseUrl}/persons/${id}`, dto, { headers: this.headers });
  }

  deletePerson(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/persons/${id}`, { headers: this.headers });
  }
}
