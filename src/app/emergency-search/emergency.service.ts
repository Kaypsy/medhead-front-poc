import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EmergencyRequest } from '../models/emergency-request.model';
import { EmergencyResponse } from '../models/emergency-response.model';

@Injectable({ providedIn: 'root' })
export class EmergencyService {
  private readonly http = inject(HttpClient);

  findHospital(request: EmergencyRequest): Observable<EmergencyResponse> {
    return this.http.post<EmergencyResponse>(`${environment.apiUrl}/api/emergency/allocate`, request);
  }
}
