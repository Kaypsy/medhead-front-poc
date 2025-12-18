import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopbarComponent {
  @Input() brand = 'MedHead';
  @Input() searchPlaceholder = 'Rechercher ...';
  @Input() notificationCount = 10;
  @Input() avatarSrc = '/assets/avatars/avatar-6.jpg';
}
