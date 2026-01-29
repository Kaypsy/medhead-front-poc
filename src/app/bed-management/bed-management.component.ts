import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, catchError, finalize, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '../shared/components/topbar/topbar.component';
import { ApiBed, Bed, BedStatus, BedsService } from './beds.service';
import { SpecialtiesService, Specialty } from '../specialties/specialties.service';

type StatusOption = {
  value: BedStatus;
  label: string;
};

type SidebarLink = {
  label: string;
  href: string;
  active?: boolean;
  accent?: string;
};

@Component({
  selector: 'app-bed-management',
  standalone: true,
  imports: [CommonModule, TopbarComponent, SidebarComponent],
  templateUrl: './bed-management.component.html',
  styleUrl: './bed-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BedManagementComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bedsService = inject(BedsService);
  private readonly specialtiesService = inject(SpecialtiesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly bedsSubject = new BehaviorSubject<Bed[]>([]);
  private readonly totalSubject = new BehaviorSubject<number>(0);
  private readonly updatingIds = new Set<number>();

  readonly beds$ = this.bedsSubject.asObservable();
  readonly total$ = this.totalSubject.asObservable();

  hospitalId: number | null = null;
  loading = true;
  loadError = '';
  statusMessage = '';
  statusType: 'success' | 'error' = 'success';
  syncing = false;
  specialties: Specialty[] = [];
  specialtiesLoading = true;
  specialtiesError = '';

  mainLinks: SidebarLink[] = [
    { label: 'A proximité', href: '/emergency' },
    { label: 'Membres', href: '/members' },
    { label: 'Groupe de spécialités', href: '/specialties-groups' },
    { label: 'Spécialités', href: '/specialties' },
    { label: 'Hopitaux', href: '/hospitals' }
  ];

  readonly statusOptions: StatusOption[] = [
    { value: 'AVAILABLE', label: 'Disponible' },
    { value: 'OCCUPIED', label: 'Occupé' },
    { value: 'RESERVED', label: 'Réservé' },
    { value: 'MAINTENANCE', label: 'Maintenance' }
  ];

  constructor() {
    this.loadSpecialties();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const idParam = params.get('hospitalId');
      const parsed = idParam ? Number(idParam) : NaN;
      if (!idParam || Number.isNaN(parsed)) {
        this.hospitalId = null;
        this.loadError = 'Identifiant de l\'hôpital invalide.';
        this.loading = false;
        this.bedsSubject.next([]);
        this.totalSubject.next(0);
        this.cdr.markForCheck();
        return;
      }
      this.hospitalId = parsed;
      this.mainLinks = [
        { label: 'A proximité', href: '/emergency' },
        { label: 'Membres', href: '/members' },
        { label: 'Groupe de spécialités', href: '/specialties-groups' },
        { label: 'Spécialités', href: '/specialties' },
        { label: 'Hopitaux', href: '/hospitals' },
        {
          label: 'Gestion des lits',
          href: `/hospitals/${parsed}/beds`,
          active: true,
          accent: 'purple'
        }
      ];
      this.loadBeds(parsed);
    });
  }

  onForceSync(): void {
    if (!this.hospitalId || this.syncing) {
      return;
    }
    this.statusMessage = '';
    this.statusType = 'success';
    this.syncing = true;
    this.bedsService
      .syncBeds(this.hospitalId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.syncing = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.statusMessage = 'Lit mis à jour et disponibilités synchronisées.';
          this.statusType = 'success';
          if (this.hospitalId) {
            this.loadBeds(this.hospitalId);
          }
        },
        error: () => {
          this.statusMessage = 'Synchronisation impossible. Réessayez.';
          this.statusType = 'error';
        }
      });
  }

  onStatusChange(bed: Bed, rawStatus: string): void {
    if (!this.hospitalId) {
      return;
    }
    const nextStatus = this.normalizeStatus(rawStatus);
    if (this.isUpdating(bed.id) || bed.status === nextStatus) {
      return;
    }
    const previousStatus = bed.status;
    this.statusMessage = '';
    this.statusType = 'success';
    this.setUpdating(bed.id, true);
    this.updateBedStatusLocal(bed.id, nextStatus);

    this.bedsService
      .updateBedStatus(bed.id, nextStatus)
      .pipe(
        switchMap(() => this.bedsService.syncBeds(this.hospitalId!)),
        catchError(() => {
          this.updateBedStatusLocal(bed.id, previousStatus);
          this.statusMessage = 'Mise à jour impossible. Réessayez.';
          this.statusType = 'error';
          return of(null);
        }),
        finalize(() => {
          this.setUpdating(bed.id, false);
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        if (result !== null) {
          this.statusMessage = 'Lit mis à jour et disponibilités synchronisées.';
          this.statusType = 'success';
          this.loadBeds(this.hospitalId!);
        }
      });
  }

  isUpdating(id: number): boolean {
    return this.updatingIds.has(id);
  }

  statusLabel(status: BedStatus): string {
    return this.statusOptions.find((option) => option.value === status)?.label ?? status;
  }

  bedNumber(bed: Bed): string {
    const value = bed.bedNumber ?? bed.number ?? bed.code ?? bed.id;
    return value === undefined || value === null || value === '' ? '-' : String(value);
  }

  bedSpecialtyName(bed: Bed): string {
    const specialtyId = (bed as { specialtyId?: number }).specialtyId ?? bed.specialty?.id;
    if (specialtyId === undefined || specialtyId === null) {
      return bed.specialty?.name ?? bed.specialtyName ?? '-';
    }
    const match = this.specialties.find((specialty) => specialty.id === specialtyId);
    return match?.name ?? bed.specialtyName ?? `#${specialtyId}`;
  }

  bedHospitalId(bed: Bed): string {
    const value = (bed as { hospitalId?: number }).hospitalId;
    return value === undefined || value === null ? '-' : String(value);
  }

  private loadBeds(hospitalId: number): void {
    this.loading = true;
    this.loadError = '';
    this.bedsService
      .getAvailableBedsByHospital(hospitalId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.loadError = 'Impossible de charger les lits disponibles.';
          this.loading = false;
          this.bedsSubject.next([]);
          this.totalSubject.next(0);
          this.cdr.markForCheck();
          return of([] as ApiBed[]);
        })
      )
      .subscribe((beds) => {
        const normalized = beds.map((bed) => ({
          ...bed,
          status: this.normalizeStatus(bed.status)
        }));
        this.bedsSubject.next(normalized);
        this.totalSubject.next(normalized.length);
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  private loadSpecialties(): void {
    this.specialtiesLoading = true;
    this.specialtiesError = '';
    this.specialtiesService
      .getSpecialties()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.specialtiesError = 'Impossible de charger les spécialités.';
          this.specialtiesLoading = false;
          this.cdr.markForCheck();
          return of({ content: [] as Specialty[] });
        })
      )
      .subscribe((res) => {
        this.specialties = res.content ?? [];
        this.specialtiesLoading = false;
        this.cdr.markForCheck();
      });
  }

  private normalizeStatus(status?: string): BedStatus {
    const upper = (status ?? 'AVAILABLE').toUpperCase();
    if (upper === 'AVAILABLE' || upper === 'OCCUPIED' || upper === 'RESERVED' || upper === 'MAINTENANCE') {
      return upper as BedStatus;
    }
    return 'AVAILABLE';
  }

  private setUpdating(id: number, isUpdating: boolean): void {
    if (isUpdating) {
      this.updatingIds.add(id);
    } else {
      this.updatingIds.delete(id);
    }
  }

  private updateBedStatusLocal(id: number, status: BedStatus): void {
    const current = this.bedsSubject.getValue();
    const updated = current.map((bed) => (bed.id === id ? { ...bed, status } : bed));
    this.bedsSubject.next(updated);
  }
}
