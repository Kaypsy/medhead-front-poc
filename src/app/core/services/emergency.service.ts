import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EmergencyRequest } from '../../models/emergency-request.model';
import { EmergencyNearestHospital } from '../../models/emergency-nearest.model';

@Injectable({ providedIn: 'root' })
export class EmergencyService {
  private readonly http = inject(HttpClient);

  findNearestHospital(request: EmergencyRequest): Observable<EmergencyNearestHospital[]> {
    const params = new HttpParams()
      .set('latitude', request.latitude)
      .set('longitude', request.longitude)
      .set('specialtyCode', request.specialtyCode);

    return this.http.get<EmergencyNearestHospital[]>(
      `${environment.apiUrl}/api/hospitals/search/nearest`,
      { params }
    );
  }
}
