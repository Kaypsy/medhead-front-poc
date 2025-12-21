import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type Hospital = {
  id: number;
  name: string;
  city: string;
  availableBeds: number;
  latitude: number;
  longitude: number;
};

export type Specialty = {
  id: number;
  name: string;
};

export type CreateHospitalPayload = {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
  totalBeds: number;
  specialtyIds: number[];
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

export type HospitalsResponse = {
  totalElements: number;
  totalPages: number;
  size: number;
  content: Hospital[];
  number: number;
  sort: SortState;
  numberOfElements: number;
  pageable: Pageable;
  first: boolean;
  last: boolean;
  empty: boolean;
};

@Injectable({ providedIn: 'root' })
export class HospitalsService {
  private readonly http = inject(HttpClient);

  getHospitals(): Observable<HospitalsResponse> {
    return this.http.get<HospitalsResponse>(`${environment.apiUrl}/api/hospitals`);
  }

  createHospital(payload: CreateHospitalPayload): Observable<Hospital> {
    return this.http.post<Hospital>(`${environment.apiUrl}/api/hospitals`, payload);
  }

  getSpecialties(): Observable<Specialty[]> {
    return this.http.get<Specialty[]>(`${environment.apiUrl}/api/specialties`);
  }
}
