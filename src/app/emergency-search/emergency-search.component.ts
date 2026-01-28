import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, map, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TopbarComponent } from '../shared/components/topbar/topbar.component';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { SpecialtiesService, Specialty } from '../specialties/specialties.service';
import { EmergencyService } from './emergency.service';
import { EmergencyRequest } from '../models/emergency-request.model';
import { EmergencyHospital, EmergencyResponse } from '../models/emergency-response.model';

@Component({
  selector: 'app-emergency-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopbarComponent, SidebarComponent],
  templateUrl: './emergency-search.component.html',
  styleUrl: './emergency-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmergencySearchComponent {
  private readonly emergencyService = inject(EmergencyService);
  private readonly specialtiesService = inject(SpecialtiesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  specialties: Specialty[] = [];
  specialtiesLoading = true;
  specialtiesError = '';
  isSearching = false;
  isLocating = false;
  geoError = '';
  statusMessage = '';
  statusType: 'success' | 'error' = 'success';
  result: EmergencyResponse | null = null;

  readonly searchForm = this.fb.group({
    latitude: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    longitude: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    specialtyCode: this.fb.control('', { validators: [Validators.required], nonNullable: true })
  });

  readonly mainLinks = [
     { label: 'Trouver un hopital', href: '/emergency' },
    { label: 'Membres', href: '/members' },
    { label: 'Groupe de spécialités', href: '/specialties-groups' },
    { label: 'Spécialités', href: '/specialties' },
    { label: 'Hopitaux', href: '/hospitals' },
  ];

  constructor() {
    this.loadSpecialties();
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
    return this.searchForm.valid && !this.isSearching && !this.specialtiesLoading && !this.specialtiesError;
  }

  onUseCurrentLocation(): void {
    this.geoError = '';
    if (!navigator.geolocation) {
      this.geoError = "La géolocalisation n'est pas disponible dans ce navigateur.";
      this.cdr.markForCheck();
      return;
    }

    this.isLocating = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.searchForm.controls.latitude.setValue(position.coords.latitude);
        this.searchForm.controls.longitude.setValue(position.coords.longitude);
        this.isLocating = false;
        this.cdr.markForCheck();
      },
      (error) => {
        this.isLocating = false;
        this.geoError = this.getGeoErrorMessage(error);
        this.cdr.markForCheck();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }

  onSubmit(): void {
    this.statusMessage = '';
    this.result = null;

    if (!this.searchForm.valid) {
      this.searchForm.markAllAsTouched();
      this.statusType = 'error';
      this.statusMessage = 'Veuillez renseigner la latitude, la longitude et la spécialité.';
      return;
    }

    const raw = this.searchForm.getRawValue();
    const latitude = this.toNumber(raw.latitude);
    const longitude = this.toNumber(raw.longitude);
    const specialtyCode = raw.specialtyCode.trim();

    if (!specialtyCode) {
      this.specialtyControl.setErrors({ required: true });
    }
    if (latitude === undefined) {
      this.latitudeControl.setErrors({ required: true });
    }
    if (longitude === undefined) {
      this.longitudeControl.setErrors({ required: true });
    }
    if (!this.searchForm.valid || latitude === undefined || longitude === undefined || !specialtyCode) {
      this.searchForm.markAllAsTouched();
      this.statusType = 'error';
      this.statusMessage = 'Veuillez sélectionner une spécialité médicale et renseigner la localisation.';
      return;
    }

    const payload: EmergencyRequest = {
      latitude,
      longitude,
      specialtyCode
    };

    this.isSearching = true;
    this.statusType = 'success';
    this.statusMessage = "Recherche de l'hôpital le plus proche...";

    this.emergencyService
      .findHospital(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.result = response;
          this.isSearching = false;
          this.statusType = 'success';
          this.statusMessage =
            "Hôpital trouvé ! L'ambulance peut se diriger vers l'établissement recommandé.";
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isSearching = false;
          this.statusType = 'error';
          this.statusMessage = this.getSearchErrorMessage(err);
          this.cdr.markForCheck();
        }
      });
  }

  getSpecialtyLabel(specialty: Specialty): string {
    const groupName = specialty.specialtyGroup?.name;
    return groupName ? `${specialty.name} (${groupName})` : specialty.name;
  }

  getDirectionsUrl(hospital: EmergencyHospital): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;
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

  private toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private getGeoErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Erreur de géolocalisation : veuillez autoriser l’accès à votre position.';
      case error.POSITION_UNAVAILABLE:
        return 'Erreur de géolocalisation : position indisponible.';
      case error.TIMEOUT:
        return 'Erreur de géolocalisation : délai dépassé.';
      default:
        return 'Erreur de géolocalisation : impossible de récupérer la position.';
    }
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
