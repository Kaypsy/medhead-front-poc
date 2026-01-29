import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';

export type ApiBed = {
  id: number;
  status?: string;
  bedNumber?: string | number;
  number?: string | number;
  code?: string;
  room?: string;
  roomNumber?: string | number;
  specialtyId?: number;
  hospitalId?: number;
  specialty?: { id?: number; name?: string; code?: string } | null;
  specialtyName?: string;
};

export type Bed = Omit<ApiBed, 'status'> & { status: BedStatus };

@Injectable({ providedIn: 'root' })
export class BedsService {
  private readonly http = inject(HttpClient);

  getBedsByHospital(hospitalId: number): Observable<ApiBed[]> {
    return this.http.get<ApiBed[]>(`${environment.apiUrl}/api/beds/hospital/${hospitalId}`);
  }

  getAvailableBedsByHospital(hospitalId: number): Observable<ApiBed[]> {
    return this.http.get<ApiBed[]>(`${environment.apiUrl}/api/beds/hospital/${hospitalId}/available`);
  }

  createBed(payload: {
    hospitalId: number;
    specialtyId: number;
    bedNumber: string;
    roomNumber?: string;
    floor?: number;
    status: BedStatus;
  }): Observable<ApiBed> {
    return this.http.post<ApiBed>(`${environment.apiUrl}/api/beds`, payload);
  }

  updateBedStatus(id: number, status: BedStatus): Observable<ApiBed> {
    return this.http.patch<ApiBed>(`${environment.apiUrl}/api/beds/${id}/status`, { status });
  }

  syncBeds(hospitalId: number): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/hospitals/${hospitalId}/sync-beds`, null);
  }
}
