import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, of, BehaviorSubject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { TopbarComponent } from '../shared/components/topbar/topbar.component';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { CreateSpecialtyGroupPayload, SpecialtiesGroupsService, SpecialtyGroup } from './specialties-groups.service';

@Component({
  selector: 'app-specialties-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TopbarComponent, SidebarComponent],
  templateUrl: './specialties-groups.component.html',
  styleUrl: './specialties-groups.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecialtiesGroupsComponent {
  private readonly service = inject(SpecialtiesGroupsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly groupsSubject = new BehaviorSubject<SpecialtyGroup[]>([]);

  readonly groups$ = this.groupsSubject.asObservable();
  loading = true;
  loadError = '';
  statusMessage = '';
  statusType: 'success' | 'error' = 'success';
  showCreateModal = false;
  isCreating = false;
  createError = '';
  showDeleteModal = false;
  isDeleting = false;
  deleteError = '';
  confirmInput = '';
  selectedGroup: SpecialtyGroup | null = null;

  readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    code: ['', [Validators.required]],
    description: ['']
  });

  readonly mainLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Membres', href: '/members' },
    { label: 'Groupe de spécialités', href: '/specialties-groups', active: true, accent: 'purple' },
    { label: 'Pages', href: '#' },
    { label: 'Components', href: '#' },
    { label: 'Charts', href: '#' },
    { label: 'Forms', href: '#' },
    { label: 'Tables', href: '#' }
  ];

  constructor() {
    this.service
      .getGroups()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.loadError = "Impossible de charger la liste des groupes de spécialités.";
          this.loading = false;
          this.cdr.markForCheck();
          return of([]);
        })
      )
      .subscribe((groups) => {
        this.groupsSubject.next(groups);
        this.loading = false;
        this.cdr.markForCheck();
      });

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

  get descriptionControl() {
    return this.createForm.controls.description;
  }

  get canSubmitCreate(): boolean {
    return this.createForm.valid && !this.isCreating;
  }

  get canConfirmDelete(): boolean {
    return Boolean(
      this.selectedGroup &&
        this.confirmInput === this.selectedGroup.name &&
        !this.isDeleting
    );
  }

  onOpenCreateModal(): void {
    this.createForm.reset({ name: '', code: '', description: '' });
    this.createError = '';
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

    const now = new Date().toISOString();
    const payload: CreateSpecialtyGroupPayload = {
      ...this.createForm.getRawValue(),
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    this.isCreating = true;
    this.createError = '';

    this.service
      .createGroup(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          const updated = [created, ...this.groupsSubject.getValue()];
          this.groupsSubject.next(updated);
          this.statusType = 'success';
          this.statusMessage = `Groupe ${created.name} créé.`;
          this.isCreating = false;
          this.showCreateModal = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isCreating = false;
          if (err?.status === 401) {
            this.createError = "Vous n'êtes pas authentifié.";
          } else if (err?.status === 403) {
            this.createError = "Accès refusé. Vous n'avez pas les droits nécessaires.";
          } else if (err?.status === 409) {
            this.createError = "Un groupe avec ce code existe déjà.";
          } else if (err?.status === 400) {
            this.createError = "Requête invalide. Vérifiez les champs saisis.";
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

  onEdit(group: SpecialtyGroup): void {
    void group;
  }

  onDelete(group: SpecialtyGroup): void {
    this.selectedGroup = group;
    this.confirmInput = '';
    this.deleteError = '';
    this.showDeleteModal = true;
  }

  onCloseDeleteModal(): void {
    if (this.isDeleting) {
      return;
    }
    this.showDeleteModal = false;
    this.selectedGroup = null;
    this.confirmInput = '';
    this.deleteError = '';
  }

  onToggleStatus(group: SpecialtyGroup): void {
    void group;
  }

  onConfirmDelete(): void {
    if (!this.selectedGroup) {
      return;
    }
    this.isDeleting = true;
    this.deleteError = '';

    this.service
      .deleteGroup(this.selectedGroup.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.status === 204) {
            const updated = this.groupsSubject
              .getValue()
              .filter((group) => group.id !== this.selectedGroup?.id);
            this.groupsSubject.next(updated);
            this.statusType = 'success';
            this.statusMessage = `Groupe ${this.selectedGroup?.name} supprimé.`;
            this.onCloseDeleteModal();
          } else {
            this.deleteError = 'Réponse inattendue lors de la suppression.';
          }
          this.isDeleting = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isDeleting = false;
          if (err?.status === 404) {
            this.deleteError = "Ce groupe n'existe plus.";
          } else {
            this.deleteError = 'Une erreur est survenue lors de la suppression.';
          }
          this.cdr.markForCheck();
        }
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
