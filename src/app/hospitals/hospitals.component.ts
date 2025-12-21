import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TopbarComponent } from '../shared/components/topbar/topbar.component';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import {
  CreateHospitalPayload,
  Hospital,
  HospitalsResponse,
  HospitalsService,
  Specialty
} from './hospitals.service';

const emptyHospitalsResponse: HospitalsResponse = {
  totalElements: 0,
  totalPages: 0,
  size: 0,
  content: [],
  number: 0,
  sort: { empty: true, sorted: false, unsorted: true },
  numberOfElements: 0,
  pageable: {
    offset: 0,
    sort: { empty: true, sorted: false, unsorted: true },
    pageNumber: 0,
    pageSize: 0,
    paged: true,
    unpaged: true
  },
  first: true,
  last: true,
  empty: true
};

@Component({
  selector: 'app-hospitals',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopbarComponent, SidebarComponent],
  templateUrl: './hospitals.component.html',
  styleUrl: './hospitals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HospitalsComponent {
  private readonly service = inject(HospitalsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly hospitalsSubject = new BehaviorSubject<Hospital[]>([]);
  private readonly totalSubject = new BehaviorSubject<number>(0);

  readonly hospitals$ = this.hospitalsSubject.asObservable();
  readonly total$ = this.totalSubject.asObservable();
  loading = true;
  loadError = '';
  statusMessage = '';
  statusType: 'success' | 'error' = 'success';
  specialties: Specialty[] = [];
  specialtiesLoading = true;
  specialtiesError = '';
  showCreateModal = false;
  isCreating = false;
  createError = '';

  readonly createForm = this.fb.group({
    name: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    address: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    city: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    postalCode: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    latitude: this.fb.control<number | null>(null),
    longitude: this.fb.control<number | null>(null),
    phoneNumber: this.fb.control('', { nonNullable: true }),
    totalBeds: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    specialtyIds: this.fb.nonNullable.control<number[]>([], { validators: [Validators.required] })
  });

  readonly mainLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Membres', href: '/members' },
    { label: 'Groupe de spécialités', href: '/specialties-groups' },
    { label: 'Spécialités', href: '/specialties' },
    { label: 'Hopitaux', href: 'hospitals', active: true, accent: 'purple' }
  ];

  constructor() {
    this.loadHospitals();
    this.loadSpecialties();
  }

  get nameControl() {
    return this.createForm.controls.name;
  }

  get addressControl() {
    return this.createForm.controls.address;
  }

  get cityControl() {
    return this.createForm.controls.city;
  }

  get postalCodeControl() {
    return this.createForm.controls.postalCode;
  }

  get totalBedsControl() {
    return this.createForm.controls.totalBeds;
  }

  get specialtyIdsControl() {
    return this.createForm.controls.specialtyIds;
  }

  get canSubmitCreate(): boolean {
    return this.createForm.valid && !this.isCreating && !this.specialtiesLoading && !this.specialtiesError;
  }

  onOpenCreateModal(): void {
    this.createForm.reset({
      name: '',
      address: '',
      city: '',
      postalCode: '',
      latitude: null,
      longitude: null,
      phoneNumber: '',
      totalBeds: null,
      specialtyIds: []
    });
    this.createError = '';
    if (this.specialtiesError) {
      this.loadSpecialties();
    }
    this.showCreateModal = true;
  }

  onCloseCreateModal(): void {
    if (this.isCreating) {
      return;
    }
    this.showCreateModal = false;
    this.createError = '';
  }

  onSubmitCreate(): void {
    if (!this.createForm.valid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const raw = this.createForm.getRawValue();
    const totalBedsValue = this.toNumber(raw.totalBeds);
    if (totalBedsValue === undefined) {
      this.totalBedsControl.setErrors({ required: true });
      this.createForm.markAllAsTouched();
      return;
    }

    const payload: CreateHospitalPayload = {
      name: raw.name.trim(),
      address: raw.address.trim(),
      city: raw.city.trim(),
      postalCode: raw.postalCode.trim(),
      totalBeds: totalBedsValue,
      specialtyIds: raw.specialtyIds,
      latitude: this.toNumber(raw.latitude),
      longitude: this.toNumber(raw.longitude),
      phoneNumber: raw.phoneNumber.trim() ? raw.phoneNumber.trim() : undefined
    };

    this.isCreating = true;
    this.createError = '';

    this.service
      .createHospital(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.statusType = 'success';
          this.statusMessage = `Hôpital ${created.name} ajouté.`;
          this.isCreating = false;
          this.showCreateModal = false;
          this.loadHospitals();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isCreating = false;
          if (err?.status === 401) {
            this.createError = "Vous n'êtes pas authentifié.";
          } else if (err?.status === 403) {
            this.createError = "Accès refusé. Vous n'avez pas les droits nécessaires.";
          } else if (err?.status === 400) {
            this.createError = "Requête invalide. Vérifiez les champs saisis.";
          } else {
            const apiMessage = err?.error?.message || err?.error?.error;
            this.createError = apiMessage
              ? `Création impossible: ${apiMessage}`
              : "Création impossible. Vérifiez les champs et réessayez.";
          }
          this.cdr.markForCheck();
        }
      });
  }

  onEdit(hospital: Hospital): void {
    void hospital;
  }

  onDelete(hospital: Hospital): void {
    void hospital;
  }

  private loadHospitals(): void {
    this.loading = true;
    this.loadError = '';

    this.service
      .getHospitals()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.loadError = 'Impossible de charger la liste des hopitaux.';
          this.loading = false;
          this.cdr.markForCheck();
          return of(emptyHospitalsResponse);
        })
      )
      .subscribe((res) => {
        this.hospitalsSubject.next(res.content);
        this.totalSubject.next(res.totalElements);
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  private loadSpecialties(): void {
    this.specialtiesLoading = true;
    this.specialtiesError = '';

    this.service
      .getSpecialties()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
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
}
