import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopbarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  @Input() brand = 'MedHead';
  @Input() searchPlaceholder = 'rechercher un hopital';
  @Input() notificationCount = 10;
  @Input() avatarSrc = '/assets/avatars/avatar-6.jpg';

  onLogout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
