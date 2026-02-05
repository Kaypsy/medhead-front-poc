import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, map, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { SpecialtiesService, Specialty } from '../../specialties/specialties.service';
import { EmergencyService } from '../../core/services/emergency.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { EmergencyRequest } from '../../models/emergency-request.model';
import { EmergencyNearestHospital } from '../../models/emergency-nearest.model';

const DEFAULT_LATITUDE = 48.8566;
const DEFAULT_LONGITUDE = 2.3522;

type MarkerPosition = { x: number; y: number };

type MapMarkers = {
  patient: MarkerPosition;
  hospital: MarkerPosition;
};

@Component({
  selector: 'app-emergency-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TopbarComponent, SidebarComponent],
  templateUrl: './emergency-search.component.html',
  styleUrl: './emergency-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmergencySearchComponent implements OnInit {
  private readonly emergencyService = inject(EmergencyService);
  private readonly specialtiesService = inject(SpecialtiesService);
  private readonly geolocationService = inject(GeolocationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  specialties: Specialty[] = [];
  specialtiesLoading = true;
  specialtiesError = '';

  isGeolocating = false;
  geolocationStatus: 'detecting' | 'success' | 'error' | 'denied' = 'detecting';
  geolocationError = '';

  isSearching = false;
  searchError = '';
  responseTimeMs: number | null = null;
  result: EmergencyNearestHospital | null = null;
  mapMarkers: MapMarkers | null = null;

  readonly searchForm = this.fb.group({
    latitude: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    longitude: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    specialtyCode: this.fb.nonNullable.control('', {
      validators: [Validators.required]
    })
  });

  readonly mainLinks = [
    { label: 'A proximité', href: '/emergency', active: true, accent: 'purple' },
    { label: 'Membres', href: '/members' },
    { label: 'Groupe de spécialités', href: '/specialties-groups' },
    { label: 'Spécialités', href: '/specialties' },
    { label: 'Hopitaux', href: '/hospitals' }
  ];

  constructor() {
    this.loadSpecialties();
  }

  ngOnInit(): void {
    this.detectPosition();
  }

  get latitudeControl() {
    return this.searchForm.controls.latitude;
  }

  get longitudeControl() {
    return this.searchForm.controls.longitude;
  }

  get specialtyControl() {
    return this.searchForm.controls.specialtyCode;
  }

  get canSubmitSearch(): boolean {
    return (
      this.searchForm.valid &&
      !this.isSearching &&
      !this.specialtiesLoading &&
      !this.specialtiesError
    );
  }

  detectPosition(): void {
    this.isGeolocating = true;
    this.geolocationStatus = 'detecting';
    this.geolocationError = '';

    this.geolocationService
      .getCurrentPosition()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isGeolocating = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (coords) => {
          this.searchForm.controls.latitude.setValue(coords.latitude);
          this.searchForm.controls.longitude.setValue(coords.longitude);
          this.geolocationStatus = 'success';
          this.cdr.markForCheck();
        },
        error: (err: { code?: number; message?: string }) => {
          this.geolocationStatus = err.code === 1 ? 'denied' : 'error';
          this.geolocationError = err.message ?? 'Erreur de géolocalisation';
          this.cdr.markForCheck();
        }
      });
  }

  useDefaultPosition(): void {
    this.searchForm.controls.latitude.setValue(DEFAULT_LATITUDE);
    this.searchForm.controls.longitude.setValue(DEFAULT_LONGITUDE);
  }

  onSubmit(): void {
    this.searchError = '';
    this.result = null;
    this.mapMarkers = null;
    this.responseTimeMs = null;

    if (!this.searchForm.valid) {
      this.searchForm.markAllAsTouched();
      this.searchError = 'Veuillez renseigner la latitude, la longitude et la spécialité.';
      return;
    }

    const raw = this.searchForm.getRawValue();
    const specialtyCode = raw.specialtyCode.trim();
    if (!specialtyCode) {
      this.specialtyControl.setErrors({ required: true });
      this.searchForm.markAllAsTouched();
      this.searchError = 'Veuillez sélectionner une spécialité médicale.';
      return;
    }

    const payload: EmergencyRequest = {
      latitude: raw.latitude as number,
      longitude: raw.longitude as number,
      specialtyCode
    };

    this.isSearching = true;
    const startedAt = performance.now();

    this.emergencyService
      .findNearestHospital(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isSearching = false;
          this.responseTimeMs = Math.max(0, Math.round(performance.now() - startedAt));
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          const [hospital] = response ?? [];
          if (!hospital) {
            this.result = null;
            this.mapMarkers = null;
            this.searchError = 'Aucun hôpital disponible pour cette spécialité dans votre zone.';
            this.cdr.markForCheck();
            return;
          }
          this.result = hospital;
          this.mapMarkers = this.computeMarkers(
            payload.latitude,
            payload.longitude,
            hospital.latitude,
            hospital.longitude
          );
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.searchError = this.getSearchErrorMessage(err);
          this.cdr.markForCheck();
        }
      });
  }

  getSpecialtyLabel(specialty: Specialty): string {
    const groupName = specialty.specialtyGroup?.name;
    return groupName ? `${specialty.name} (${groupName})` : specialty.name;
  }

  getDirectionsUrl(hospital: EmergencyNearestHospital): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;
  }

  getMarkerStyle(marker: MarkerPosition): Record<string, string> {
    return {
      left: `${marker.x}%`,
      top: `${marker.y}%`
    };
  }

  private loadSpecialties(): void {
    this.specialtiesLoading = true;
    this.specialtiesError = '';

    this.specialtiesService
      .getSpecialties()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((res) => res.content ?? []),
        catchError(() => {
          this.specialtiesError = 'Impossible de charger les spécialités disponibles.';
          this.specialtiesLoading = false;
          this.cdr.markForCheck();
          return of([] as Specialty[]);
        })
      )
      .subscribe((specialties) => {
        this.specialties = specialties;
        this.specialtiesLoading = false;
        this.cdr.markForCheck();
      });
  }

  private computeMarkers(
    patientLat: number,
    patientLng: number,
    hospitalLat: number,
    hospitalLng: number
  ): MapMarkers {
    const minLat = Math.min(patientLat, hospitalLat);
    const maxLat = Math.max(patientLat, hospitalLat);
    const minLng = Math.min(patientLng, hospitalLng);
    const maxLng = Math.max(patientLng, hospitalLng);

    const latSpan = Math.max(maxLat - minLat, 0.01);
    const lngSpan = Math.max(maxLng - minLng, 0.01);

    const paddedMinLat = minLat - latSpan * 0.2;
    const paddedMaxLat = maxLat + latSpan * 0.2;
    const paddedMinLng = minLng - lngSpan * 0.2;
    const paddedMaxLng = maxLng + lngSpan * 0.2;

    const toX = (lng: number) =>
      this.clamp(((lng - paddedMinLng) / (paddedMaxLng - paddedMinLng)) * 100);
    const toY = (lat: number) =>
      this.clamp(((paddedMaxLat - lat) / (paddedMaxLat - paddedMinLat)) * 100);

    return {
      patient: { x: toX(patientLng), y: toY(patientLat) },
      hospital: { x: toX(hospitalLng), y: toY(hospitalLat) }
    };
  }

  private clamp(value: number): number {
    return Math.min(95, Math.max(5, value));
  }

  private getSearchErrorMessage(err: unknown): string {
    const status = (err as { status?: number })?.status;
    if (status === 404) {
      return 'Aucun hôpital disponible pour cette spécialité dans votre zone.';
    }
    if (status === 400) {
      return 'Requête invalide. Vérifiez les champs saisis.';
    }
    if (status === 0) {
      return 'Erreur de connexion au serveur. Veuillez réessayer.';
    }
    return "Erreur serveur. Veuillez réessayer.";
  }
}
