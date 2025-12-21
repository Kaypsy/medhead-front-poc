import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TopbarComponent } from '../shared/components/topbar/topbar.component';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { CreateSpecialtyPayload, SpecialtiesService, Specialty, SpecialtyGroup } from './specialties.service';
import { SpecialtiesGroupsService } from '../specialties-groups/specialties-groups.service';

@Component({
  selector: 'app-specialties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopbarComponent, SidebarComponent],
  templateUrl: './specialties.component.html',
  styleUrl: './specialties.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecialtiesComponent {
  private readonly specialtiesService = inject(SpecialtiesService);
  private readonly groupsService = inject(SpecialtiesGroupsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly specialtiesSubject = new BehaviorSubject<Specialty[]>([]);
  private readonly totalSubject = new BehaviorSubject<number>(0);
  private readonly groupsSubject = new BehaviorSubject<SpecialtyGroup[]>([]);

  readonly specialties$ = this.specialtiesSubject.asObservable();
  readonly total$ = this.totalSubject.asObservable();
  readonly groups$ = this.groupsSubject.asObservable();

  loading = true;
  loadError = '';
  groupsLoading = true;
  groupsLoadError = '';
  statusMessage = '';
  statusType: 'success' | 'error' = 'success';
  showCreateModal = false;
  isCreating = false;
  createError = '';

  readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    code: ['', [Validators.required]],
    specialtyGroupId: ['', [Validators.required]],
    description: ['']
  });

  readonly mainLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Membres', href: '/members' },
    { label: 'Groupe de spécialités', href: '/specialties-groups' },
    { label: 'Spécialités', href: '/specialties', active: true, accent: 'purple' },
    { label: 'Hopitaux', href: 'hospitals' }
  ];

  constructor() {
    this.loadSpecialties();
    this.loadGroups();

    this.createForm.controls.name.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((name) => {
        const generated = this.generateCode(name);
        this.createForm.controls.code.setValue(generated, { emitEvent: false });
      });
  }

  get nameControl() {
    return this.createForm.controls.name;
  }

  get codeControl() {
    return this.createForm.controls.code;
  }

  get specialtyGroupControl() {
    return this.createForm.controls.specialtyGroupId;
  }

  get descriptionControl() {
    return this.createForm.controls.description;
  }

  get canSubmitCreate(): boolean {
    return this.createForm.valid && !this.isCreating && !this.groupsLoading && !this.groupsLoadError;
  }

  onEdit(specialty: Specialty): void {
    void specialty;
  }

  onDelete(specialty: Specialty): void {
    void specialty;
  }

  onOpenCreateModal(): void {
    this.createForm.reset({ name: '', code: '', specialtyGroupId: '', description: '' });
    this.createError = '';
    this.statusMessage = '';
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

    const groupId = Number(this.createForm.controls.specialtyGroupId.value);
    const group = this.groupsSubject.getValue().find((item) => item.id === groupId);
    if (!group) {
      this.createError = 'Veuillez sélectionner un groupe de spécialité valide.';
      return;
    }

    const payload: CreateSpecialtyPayload = {
      code: this.createForm.controls.code.value,
      name: this.createForm.controls.name.value,
      specialtyGroup: {
        id: group.id,
        code: group.code,
        name: group.name
      },
      description: this.createForm.controls.description.value || undefined
    };

    this.isCreating = true;
    this.createError = '';

    this.specialtiesService
      .createSpecialty(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.statusType = 'success';
          this.statusMessage = `Spécialité ${created.name} créée.`;
          this.isCreating = false;
          this.showCreateModal = false;
          this.loadSpecialties();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isCreating = false;
          if (err?.status === 401) {
            this.createError = "Vous n'êtes pas authentifié.";
          } else if (err?.status === 403) {
            this.createError = "Accès refusé. Vous n'avez pas les droits nécessaires.";
          } else if (err?.status === 409) {
            this.createError = "Une spécialité avec ce code existe déjà.";
          } else if (err?.status === 400) {
            this.createError = 'Requête invalide. Vérifiez les champs saisis.';
          } else {
            const apiMessage = err?.error?.message || err?.error?.error;
            this.createError = apiMessage
              ? `Création impossible: ${apiMessage}`
              : 'Création impossible. Vérifiez les champs et réessayez.';
          }
          this.cdr.markForCheck();
        }
      });
  }

  private loadSpecialties(): void {
    this.loading = true;
    this.loadError = '';
    this.specialtiesService
      .getSpecialties()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.loadError = "Impossible de charger la liste des spécialités.";
          this.loading = false;
          this.cdr.markForCheck();
          return of({ content: [], totalElements: 0 });
        })
      )
      .subscribe((res) => {
        this.specialtiesSubject.next(res.content);
        this.totalSubject.next(res.totalElements);
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  private loadGroups(): void {
    this.groupsLoading = true;
    this.groupsLoadError = '';
    this.groupsService
      .getGroups()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.groupsLoadError = "Impossible de charger les groupes de spécialités.";
          this.groupsLoading = false;
          this.cdr.markForCheck();
          return of([]);
        })
      )
      .subscribe((groups) => {
        this.groupsSubject.next(groups);
        this.groupsLoading = false;
        this.cdr.markForCheck();
      });
  }

  private generateCode(input: string): string {
    if (!input) {
      return '';
    }
    const normalized = input
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return normalized
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .toUpperCase();
  }
}
