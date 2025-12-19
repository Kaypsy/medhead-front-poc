import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type SpecialtyGroup = {
  id: number;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateSpecialtyGroupPayload = {
  id?: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable({ providedIn: 'root' })
export class SpecialtiesGroupsService {
  private readonly http = inject(HttpClient);

  getGroups(): Observable<SpecialtyGroup[]> {
    return this.http.get<SpecialtyGroup[]>(`${environment.apiUrl}/api/specialty-groups`);
  }

  createGroup(payload: CreateSpecialtyGroupPayload): Observable<SpecialtyGroup> {
    return this.http.post<SpecialtyGroup>(`${environment.apiUrl}/api/specialty-groups`, payload);
  }

  deleteGroup(id: number): Observable<HttpResponse<void>> {
    return this.http.delete<void>(`${environment.apiUrl}/api/specialty-groups/${id}`, { observe: 'response' });
  }
}
