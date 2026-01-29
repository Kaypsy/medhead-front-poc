import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Input,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, catchError, debounceTime, distinctUntilChanged, finalize, map, of, shareReplay, startWith, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../auth/auth.service';
import { Hospital, HospitalsService } from '../../../hospitals/hospitals.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopbarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly hospitalsService = inject(HospitalsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly elementRef = inject(ElementRef);

  @Input() brand = 'MedHead';
  @Input() searchPlaceholder = 'rechercher un hopital';
  @Input() notificationCount = 10;
  @Input() avatarSrc = '/assets/avatars/avatar-6.jpg';

  readonly hospitalSearchControl = new FormControl<string>('', { nonNullable: true });
  readonly filteredHospitals$: Observable<Hospital[]>;

  hospitalsLoading = false;
  hospitalsError = '';
  searchTerm = '';
  isDropdownOpen = false;
  isInitialLoading = false;
  activeIndex = -1;
  private hasLoadedOnce = false;
  private latestHospitals: Hospital[] = [];

  constructor() {
    this.filteredHospitals$ = this.hospitalSearchControl.valueChanges.pipe(
      startWith(this.hospitalSearchControl.value),
      map((value) => value.trim()),
      tap((term) => {
        this.searchTerm = term;
        if (term.length === 0) {
          this.isDropdownOpen = false;
          this.activeIndex = -1;
          this.hospitalsError = '';
        } else {
          this.isDropdownOpen = true;
        }
      }),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => {
        if (term.length === 0) {
          this.hospitalsLoading = false;
          this.hospitalsError = '';
          this.latestHospitals = [];
          return of([] as Hospital[]);
        }
        this.hospitalsLoading = true;
        this.hospitalsError = '';
        if (!this.hasLoadedOnce) {
          this.isInitialLoading = true;
        }
        return this.hospitalsService.getHospitals().pipe(
          map((res) => this.filterHospitals(res.content ?? [], term)),
          map((results) => results.slice(0, 10)),
          catchError(() => {
            this.hospitalsError = 'Impossible de charger les hôpitaux.';
            return of([] as Hospital[]);
          }),
          finalize(() => {
            this.hospitalsLoading = false;
            if (!this.hasLoadedOnce) {
              this.hasLoadedOnce = true;
              this.isInitialLoading = false;
            }
            this.cdr.markForCheck();
          })
        );
      }),
      tap((hospitals) => {
        this.latestHospitals = hospitals;
        if (this.activeIndex >= hospitals.length) {
          this.activeIndex = hospitals.length > 0 ? 0 : -1;
        }
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.filteredHospitals$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  onLogout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  onHospitalSelected(hospitalId: number): void {
    this.closeDropdown();
    this.hospitalSearchControl.setValue('');
    void this.router.navigate(['/hospitals', hospitalId, 'beds']);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (!this.isDropdownOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      this.isDropdownOpen = true;
    }
    if (!this.isDropdownOpen) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        if (this.latestHospitals.length > 0) {
          this.activeIndex = Math.min(this.activeIndex + 1, this.latestHospitals.length - 1);
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        if (this.latestHospitals.length > 0) {
          this.activeIndex = Math.max(this.activeIndex - 1, 0);
        }
        break;
      }
      case 'Enter': {
        if (this.activeIndex >= 0 && this.activeIndex < this.latestHospitals.length) {
          event.preventDefault();
          const selected = this.latestHospitals[this.activeIndex];
          this.onHospitalSelected(selected.id);
        }
        break;
      }
      case 'Escape': {
        event.preventDefault();
        this.closeDropdown();
        break;
      }
      default:
        break;
    }
  }

  openDropdown(): void {
    if (this.searchTerm.length > 0) {
      this.isDropdownOpen = true;
    }
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
    this.activeIndex = -1;
  }

  setActiveIndex(index: number): void {
    this.activeIndex = index;
  }

  get showDropdown(): boolean {
    return this.isDropdownOpen && (this.searchTerm.length > 0 || this.hospitalsLoading || !!this.hospitalsError);
  }

  get activeDescendantId(): string | null {
    return this.activeIndex >= 0 ? `hospital-option-${this.activeIndex}` : null;
  }

  getHighlightedText(value: string): string {
    if (!this.searchTerm) {
      return this.escapeHtml(value);
    }
    const escapedValue = this.escapeHtml(value);
    const escapedSearch = this.escapeRegExp(this.searchTerm);
    return escapedValue.replace(new RegExp(`(${escapedSearch})`, 'gi'), '<mark>$1</mark>');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  private filterHospitals(hospitals: Hospital[], term: string): Hospital[] {
    const normalized = term.toLowerCase();
    return hospitals.filter((hospital) => {
      const name = hospital.name?.toLowerCase() ?? '';
      const city = hospital.city?.toLowerCase() ?? '';
      return name.includes(normalized) || city.includes(normalized);
    });
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case '\'':
          return '&#39;';
        default:
          return char;
      }
    });
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
