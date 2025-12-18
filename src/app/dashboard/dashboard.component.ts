import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../shared/components/topbar/topbar.component';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';

type KpiCard = {
  title: string;
  value: string;
  color: 'indigo' | 'green' | 'blue' | 'red';
  icon: 'server' | 'clipboard' | 'truck' | 'receipt';
};

type DonutStat = {
  title: string;
  value: string;
  subtitle: string;
  color: string;
  percent: number;
};

type Transaction = {
  title: string;
  description: string;
  amount: string;
  color: string;
  icon: string;
};

type Message = {
  date: string;
  name: string;
  role: string;
  text: string;
  avatar: string;
  tag: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TopbarComponent, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  readonly kpiCards: KpiCard[] = [
    { title: 'Data consumed', value: '145,14 GB', color: 'indigo', icon: 'server' },
    { title: 'Open cases', value: '32', color: 'green', icon: 'clipboard' },
    { title: 'Work orders', value: '400', color: 'blue', icon: 'truck' },
    { title: 'New invoices', value: '123', color: 'red', icon: 'receipt' }
  ];

  readonly donutStats: DonutStat[] = [
    { title: 'Work hours', value: '86.4', subtitle: 'Hours worked this month', color: '#23a455', percent: 72 },
    { title: 'Tasks completed', value: '325', subtitle: 'Tasks completed this month', color: '#5a36ff', percent: 64 },
    { title: 'Monthly usage', value: '86%', subtitle: 'Monthly allowed usage', color: '#e44e80', percent: 86 },
    { title: 'All income', value: '$126,41', subtitle: 'Lorem ipsum dolor sit', color: '#22c55e', percent: 48 }
  ];

  readonly transactions: Transaction[] = [
    { title: 'Dropbox Inc.', description: 'Account renewal', amount: '-$20', color: '#6366f1', icon: 'dropbox' },
    { title: 'App Store', description: 'Software cost', amount: '-$20', color: '#10b981', icon: 'apple' },
    { title: 'Supermarket', description: 'Shopping', amount: '-$20', color: '#3b82f6', icon: 'basket' },
    { title: 'Play Store', description: 'Software cost', amount: '-$20', color: '#ef4444', icon: 'android' }
  ];

  readonly quickStats = [
    { title: 'Completed cases', subtitle: '127 new cases', color: '#6366f1', icon: 'check' },
    { title: 'New quotes', subtitle: '214 new quotes', color: '#10b981', icon: 'dollar' },
    { title: 'New clients', subtitle: '25 new clients', color: '#3b82f6', icon: 'users' }
  ];

  readonly messages: Message[] = [
    {
      date: '24 Apr',
      name: 'Jason Maxwell',
      role: 'User testing',
      text: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor.',
      avatar: '/assets/avatars/avatar-1.jpg',
      tag: 'User testing'
    },
    {
      date: '24 Nov',
      name: 'Sam Andy',
      role: 'Web Developer',
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      avatar: '/assets/avatars/avatar-2.jpg',
      tag: 'Web Developer'
    },
    {
      date: '17 Aug',
      name: 'Margret Peter',
      role: 'Analysis Agent',
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      avatar: '/assets/avatars/avatar-3.jpg',
      tag: 'Analysis Agent'
    },
    {
      date: '15 Sep',
      name: 'Jason Doe',
      role: 'User testing',
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      avatar: '/assets/avatars/avatar-4.jpg',
      tag: 'User testing'
    }
  ];

  readonly referralTrendPath = 'M10 80 C 50 30, 90 120, 130 70 S 190 30, 230 90';
  readonly balanceTrendPath = 'M0 60 C 60 20, 90 100, 140 60 S 220 10, 280 80';
}
