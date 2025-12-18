import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type Member = {
  id: number;
  username: string;
  email: string;
  roles: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MembersResponse = {
  content: Member[];
  totalElements: number;
};

export type CreateMemberPayload = {
  username: string;
  password: string;
  email: string;
  roles: 'ROLE_USER' | 'ROLE_ADMIN';
  isActive: boolean;
};

export type UpdateMemberPayload = {
  username: string;
  email: string;
  roles: 'ROLE_USER' | 'ROLE_ADMIN';
  isActive: boolean;
};

@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly http = inject(HttpClient);

  getUsers(): Observable<MembersResponse> {
    return this.http.get<MembersResponse>(`${environment.apiUrl}/api/users`);
  }

  createUser(payload: CreateMemberPayload): Observable<Member> {
    return this.http.post<Member>(`${environment.apiUrl}/api/users`, payload);
  }

  updateUser(id: number, payload: UpdateMemberPayload): Observable<Member> {
    return this.http.put<Member>(`${environment.apiUrl}/api/users/${id}`, payload);
  }

  deleteUser(id: number): Observable<HttpResponse<void>> {
    return this.http.delete<void>(`${environment.apiUrl}/api/users/${id}`, { observe: 'response' });
  }
}
