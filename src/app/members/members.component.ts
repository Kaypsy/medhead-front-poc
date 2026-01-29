import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TopbarComponent } from '../shared/components/topbar/topbar.component';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { MembersService, Member, CreateMemberPayload, UpdateMemberPayload } from './members.service';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TopbarComponent, SidebarComponent],
  templateUrl: './members.component.html',
  styleUrl: './members.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MembersComponent {
  private readonly membersService = inject(MembersService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly usersSubject = new BehaviorSubject<Member[]>([]);
  private readonly totalSubject = new BehaviorSubject<number>(0);
  readonly users$ = this.usersSubject.asObservable();
  readonly total$ = this.totalSubject.asObservable();
  loading = true;
  loadError = '';
  statusMessage = '';
  statusType: 'success' | 'error' = 'success';
  showDeleteModal = false;
  confirmInput = '';
  selectedUser: Member | null = null;
  isDeleting = false;
  deleteError = '';
  showCreateModal = false;
  isCreating = false;
  createError = '';
  showEditModal = false;
  isUpdating = false;
  updateError = '';
  editingUser: Member | null = null;

  readonly createForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    roles: ['ROLE_USER' as CreateMemberPayload['roles'], [Validators.required]]
  });

  readonly editForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    roles: ['ROLE_USER' as UpdateMemberPayload['roles'], [Validators.required]],
    isActive: [true, [Validators.required]]
  });

  readonly mainLinks = [
    { label: 'A proximité', href: '/emergency' },
    { label: 'Membres', href: '/members', active: true, accent: 'purple' },
    { label: 'Groupe de spécialités', href: '/specialties-groups' },
    { label: 'Spécialités', href: '/specialties' },
    { label: 'Hopitaux', href: '/hospitals' }
  ];

  constructor() {
    this.membersService
      .getUsers()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.loadError = "Impossible de charger la liste des utilisateurs.";
          this.loading = false;
          this.cdr.markForCheck();
          return of({ content: [], totalElements: 0 });
        })
      )
      .subscribe((res) => {
        this.usersSubject.next(res.content);
        this.totalSubject.next(res.totalElements);
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  get canConfirmDelete(): boolean {
    return Boolean(this.selectedUser && this.confirmInput === this.selectedUser.username && !this.isDeleting);
  }

  get canSubmitCreate(): boolean {
    return this.createForm.valid && !this.isCreating;
  }

  get usernameControl() {
    return this.createForm.controls.username;
  }

  get passwordControl() {
    return this.createForm.controls.password;
  }

  get emailControl() {
    return this.createForm.controls.email;
  }

  get rolesControl() {
    return this.createForm.controls.roles;
  }

  get editUsernameControl() {
    return this.editForm.controls.username;
  }

  get editEmailControl() {
    return this.editForm.controls.email;
  }

  get editRolesControl() {
    return this.editForm.controls.roles;
  }

  get editStatusControl() {
    return this.editForm.controls.isActive;
  }

  onEdit(user: Member): void {
    this.editingUser = user;
    this.editForm.reset({
      username: user.username,
      email: user.email,
      roles: user.roles as UpdateMemberPayload['roles'],
      isActive: user.isActive
    });
    this.updateError = '';
    this.showEditModal = true;
  }

  onOpenCreateModal(): void {
    this.createForm.reset({
      username: '',
      password: '',
      email: '',
      roles: 'ROLE_USER'
    });
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

    const payload: CreateMemberPayload = {
      ...this.createForm.getRawValue(),
      isActive: true
    };

    this.isCreating = true;
    this.createError = '';

    this.membersService
      .createUser(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          const updatedUsers = [created, ...this.usersSubject.getValue()];
          this.usersSubject.next(updatedUsers);
          this.totalSubject.next(this.totalSubject.getValue() + 1);
          this.statusType = 'success';
          this.statusMessage = `Utilisateur ${created.username} créé.`;
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
            this.createError = "Un utilisateur avec ce pseudo ou cet e-mail existe déjà.";
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

  onCloseEditModal(): void {
    if (this.isUpdating) {
      return;
    }
    this.showEditModal = false;
    this.updateError = '';
    this.editingUser = null;
  }

  onSubmitEdit(): void {
    if (!this.editForm.valid || !this.editingUser) {
      this.editForm.markAllAsTouched();
      return;
    }

    const payload: UpdateMemberPayload = this.editForm.getRawValue();
    this.isUpdating = true;
    this.updateError = '';

    this.membersService
      .updateUser(this.editingUser.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          const updatedUsers = this.usersSubject.getValue().map((user) =>
            user.id === updated.id ? updated : user
          );
          this.usersSubject.next(updatedUsers);
          this.statusType = 'success';
          this.statusMessage = `Utilisateur ${updated.username} mis à jour.`;
          this.isUpdating = false;
          this.showEditModal = false;
          this.editingUser = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isUpdating = false;
          if (err?.status === 401) {
            this.updateError = "Vous n'êtes pas authentifié.";
          } else if (err?.status === 403) {
            this.updateError = "Accès refusé. Vous n'avez pas les droits nécessaires.";
          } else if (err?.status === 404) {
            this.updateError = "Cet utilisateur n'existe plus.";
          } else if (err?.status === 400) {
            this.updateError = "Requête invalide. Vérifiez les champs saisis.";
          } else {
            const apiMessage = err?.error?.message || err?.error?.error;
            this.updateError = apiMessage
              ? `Mise à jour impossible: ${apiMessage}`
              : 'Mise à jour impossible. Vérifiez les champs et réessayez.';
          }
          this.cdr.markForCheck();
        }
      });
  }

  onDelete(user: Member): void {
    this.selectedUser = user;
    this.confirmInput = '';
    this.deleteError = '';
    this.showDeleteModal = true;
  }

  onCloseDeleteModal(): void {
    if (this.isDeleting) {
      return;
    }
    this.showDeleteModal = false;
    this.selectedUser = null;
    this.confirmInput = '';
    this.deleteError = '';
  }

  onConfirmDelete(): void {
    if (!this.selectedUser) {
      return;
    }
    this.isDeleting = true;
    this.deleteError = '';

    this.membersService
      .deleteUser(this.selectedUser.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.status === 204) {
            const updatedUsers = this.usersSubject
              .getValue()
              .filter((user) => user.id !== this.selectedUser?.id);
            this.usersSubject.next(updatedUsers);
            this.totalSubject.next(Math.max(0, this.totalSubject.getValue() - 1));
            this.statusType = 'success';
            this.statusMessage = `Utilisateur ${this.selectedUser?.username} supprimé.`;
            this.onCloseDeleteModal();
          } else {
            this.statusType = 'error';
            this.statusMessage = 'Réponse inattendue lors de la suppression.';
          }
          this.isDeleting = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isDeleting = false;
          if (err?.status === 401) {
            this.router.navigate(['/login'], { queryParams: { returnUrl: '/members' } });
            return;
          }
          if (err?.status === 403) {
            this.deleteError = "Accès refusé. Vous n'avez pas les droits nécessaires.";
          } else if (err?.status === 404) {
            this.deleteError = "Cet utilisateur n'existe plus.";
          } else {
            this.deleteError = 'Une erreur est survenue lors de la suppression.';
          }
          this.cdr.markForCheck();
        }
      });
  }

  onToggleStatus(user: Member): void {
    void user;
  }
}
