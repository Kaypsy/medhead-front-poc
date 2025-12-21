import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type SidebarLink = {
  label: string;
  href: string;
  active?: boolean;
  accent?: string;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  @Input() mainLinks: SidebarLink[] = [
    { label: 'Dashboard', href: '/dashboard', active: true, accent: 'purple' },
    { label: 'Membres', href: '/members' },
    { label: 'Groupe de spécialités', href: '/specialties-groups' },
    { label: 'Spécialités', href: '/specialties' },
    { label: 'Hopitaux', href: '/hospitals' }
  ];
  @Input() docLinks: SidebarLink[] = [
    { label: 'FAQ', href: '#' }
  ];
}
