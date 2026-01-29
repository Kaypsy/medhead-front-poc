import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Hospital, HospitalsService } from '../../../hospitals/hospitals.service';

type SidebarLink = {
  label: string;
  href: string;
  active?: boolean;
  accent?: string;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  private readonly storageKey = 'medhead.selectedHospitalId';
  private readonly hospitalsService = inject(HospitalsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() mainLinks: SidebarLink[] = [
    { label: 'Trouver un hopital', href: '/emergency', active: true, accent: 'purple' },
    { label: 'Membres', href: '/members' },
    { label: 'Groupe de spécialités', href: '/specialties-groups' },
    { label: 'Spécialités', href: '/specialties' },
    { label: 'Hopitaux', href: '/hospitals' }
  ];
  @Input() docLinks: SidebarLink[] = [
    { label: 'FAQ', href: '#' }
  ];

  hospitals: Hospital[] = [];
  hospitalsLoading = true;
  hospitalsError = '';
  selectedHospitalId: number | null = null;

  constructor() {
    this.selectedHospitalId = this.readStoredHospitalId();
    this.loadHospitals();
  }

  onHospitalSelect(rawValue: string): void {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      this.selectedHospitalId = null;
      this.persistHospitalSelection(null);
      return;
    }
    this.selectedHospitalId = parsed;
    this.persistHospitalSelection(parsed);
    void this.router.navigate(['/hospitals', parsed, 'beds']);
  }

  private loadHospitals(): void {
    this.hospitalsLoading = true;
    this.hospitalsError = '';
    this.hospitalsService
      .getHospitals()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.hospitalsError = 'Impossible de charger les hôpitaux.';
          this.hospitalsLoading = false;
          this.cdr.markForCheck();
          return of({ content: [] as Hospital[] });
        })
      )
      .subscribe((res) => {
        this.hospitals = res.content ?? [];
        this.hospitalsLoading = false;
        if (this.selectedHospitalId) {
          const exists = this.hospitals.some((hospital) => hospital.id === this.selectedHospitalId);
          if (!exists) {
            this.selectedHospitalId = null;
            this.persistHospitalSelection(null);
          }
        }
        this.cdr.markForCheck();
      });
  }

  private readStoredHospitalId(): number | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const value = window.localStorage.getItem(this.storageKey);
      if (!value) {
        return null;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private persistHospitalSelection(id: number | null): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      if (id === null) {
        window.localStorage.removeItem(this.storageKey);
      } else {
        window.localStorage.setItem(this.storageKey, String(id));
      }
    } catch {
      // Ignore storage failures (privacy mode, quota, etc.).
    }
  }
}
