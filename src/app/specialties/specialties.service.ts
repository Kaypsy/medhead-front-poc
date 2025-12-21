import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type SpecialtyGroup = {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Specialty = {
  id: number;
  code: string;
  name: string;
  specialtyGroup?: SpecialtyGroup | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateSpecialtyPayload = {
  code: string;
  name: string;
  specialtyGroup: {
    id: number;
    code: string;
    name: string;
  };
  description?: string;
};

export type SortState = {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
};

export type Pageable = {
  offset: number;
  sort: SortState;
  pageNumber: number;
  pageSize: number;
  paged: boolean;
  unpaged: boolean;
};

export type SpecialtiesResponse = {
  totalElements: number;
  totalPages: number;
  size: number;
  content: Specialty[];
  number: number;
  sort: SortState;
  numberOfElements: number;
  pageable: Pageable;
  first: boolean;
  last: boolean;
  empty: boolean;
};

@Injectable({ providedIn: 'root' })
export class SpecialtiesService {
  private readonly http = inject(HttpClient);

  getSpecialties(): Observable<SpecialtiesResponse> {
    return this.http.get<SpecialtiesResponse>(`${environment.apiUrl}/api/specialties`);
  }

  createSpecialty(payload: CreateSpecialtyPayload): Observable<Specialty> {
    return this.http.post<Specialty>(`${environment.apiUrl}/api/specialties`, payload);
  }
}
