import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TopbarComponent } from '../shared/components/topbar/topbar.component';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category?: string;
  expanded?: boolean;
  popular?: boolean;
  feedback?: 'yes' | 'no';
}

interface FaqGroup {
  id: string;
  category: string;
  items: FaqItem[];
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopbarComponent, SidebarComponent],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FaqComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl<string>('', { nonNullable: true });

  searchTerm = '';
  filteredFaqs: FaqItem[] = [];
  groupedFaqs: FaqGroup[] = [];

  readonly mainLinks = [
    { label: 'A proximité', href: '/emergency' },
    { label: 'Membres', href: '/members' },
    { label: 'Groupe de spécialités', href: '/specialties-groups' },
    { label: 'Spécialités', href: '/specialties' },
    { label: 'Hopitaux', href: '/hospitals' }
  ];

  readonly faqItems: FaqItem[] = [
    {
      id: 1,
      question: "Qu'est-ce que le système d'allocation de lits MedHead ?",
      answer:
        "MedHead est une application de coordination des urgences qui aide les équipes à trouver rapidement un hôpital disposant d'un lit compatible avec la spécialité requise. Elle centralise les disponibilités et propose une recommandation en fonction de la situation clinique.",
      category: 'Présentation générale',
      popular: true
    },
    {
      id: 2,
      question: "À qui s'adresse cette application ?",
      answer:
        "Elle est conçue pour les SAMU, services d'urgence, régulateurs hospitaliers et établissements partenaires qui doivent orienter un patient vers le bon établissement en quelques minutes.",
      category: 'Présentation générale'
    },
    {
      id: 3,
      question: "Comment rechercher un hôpital disponible pour une urgence ?",
      answer:
        "Depuis l'écran d'urgence, saisissez ou détectez la position du patient, choisissez la spécialité, puis lancez la recherche. L'application calcule automatiquement l'hôpital le plus pertinent et affiche les informations clés.",
      category: 'Fonctionnalités principales',
      popular: true
    },
    {
      id: 4,
      question: "Comment fonctionne l'allocation de lits en temps réel ?",
      answer:
        "Les établissements mettent à jour les disponibilités de lits via leurs interfaces. MedHead agrège ces données et recalcul en continu les recommandations en tenant compte des dernières informations.",
      category: 'Fonctionnalités principales'
    },
    {
      id: 5,
      question: "Quels critères sont utilisés pour recommander un hôpital ?",
      answer:
        "La recommandation prend en compte la distance, la spécialité requise, la disponibilité des lits, et les contraintes opérationnelles définies par les établissements (capacité, services ouverts, etc.).",
      category: 'Fonctionnalités principales',
      popular: true
    },
    {
      id: 6,
      question: "Comment utiliser la barre de recherche globale ?",
      answer:
        "La barre de recherche située dans la topbar permet de retrouver rapidement un hôpital par son nom. Sélectionnez un résultat pour accéder directement à la fiche et à la gestion des lits associée.",
      category: 'Utilisation'
    },
    {
      id: 7,
      question: "Comment consulter les détails d'un hôpital et ses lits par spécialité ?",
      answer:
        "Ouvrez la page Hôpitaux depuis le menu, sélectionnez l'établissement souhaité, puis cliquez sur " +
        "la gestion des lits. Vous verrez la disponibilité par spécialité et pourrez affiner la prise en charge.",
      category: 'Utilisation'
    },
    {
      id: 8,
      question: "Quelles spécialités médicales sont couvertes ?",
      answer:
        "Les spécialités dépendent des données enregistrées par votre organisation. Les plus courantes incluent " +
        "cardiologie, neurologie, réanimation, traumatologie et pédiatrie. La liste est administrable dans la section Spécialités.",
      category: 'Données et spécialités'
    },
    {
      id: 9,
      question: "Comment les distances sont-elles calculées ?",
      answer:
        "Les distances sont estimées à partir des coordonnées GPS du patient et des hôpitaux. Le calcul s'appuie " +
        "sur une distance géographique (type Haversine) afin de fournir une estimation rapide et fiable.",
      category: 'Données et spécialités'
    },
    {
      id: 10,
      question: "À quelle fréquence les données sont-elles mises à jour et comment la confidentialité est-elle assurée ?",
      answer:
        "Les disponibilités peuvent être mises à jour en continu par les établissements. Les accès sont sécurisés " +
        "via authentification et les données sensibles sont protégées conformément aux politiques internes et aux bonnes pratiques de sécurité.",
      category: 'Informations techniques'
    }
  ];

  constructor() {
    this.updateFilteredFaqs();

    this.searchControl.valueChanges
      .pipe(
        startWith(this.searchControl.value),
        map((value) => value.trim()),
        debounceTime(200),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((term) => {
        this.searchTerm = term;
        this.updateFilteredFaqs();
      });

    this.route.fragment
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((fragment) => {
        if (!fragment) {
          return;
        }
        const idMatch = fragment.match(/question-(\d+)/);
        if (!idMatch) {
          return;
        }
        const id = Number(idMatch[1]);
        this.openItemById(id);
      });
  }

  get popularFaqs(): FaqItem[] {
    return this.faqItems.filter((item) => item.popular);
  }

  get showPopular(): boolean {
    return this.searchTerm.length === 0 && this.popularFaqs.length > 0;
  }

  toggleItem(item: FaqItem): void {
    item.expanded = !item.expanded;
    if (item.expanded) {
      this.updateFragment(item);
      this.scrollToItem(item);
    }
  }

  openItemById(id: number): void {
    const item = this.faqItems.find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    item.expanded = true;
    this.scrollToItem(item);
  }

  expandAll(): void {
    this.faqItems.forEach((item) => {
      item.expanded = true;
    });
  }

  collapseAll(): void {
    this.faqItems.forEach((item) => {
      item.expanded = false;
    });
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  jumpToItem(item: FaqItem): void {
    item.expanded = true;
    this.updateFragment(item);
    this.scrollToItem(item);
  }

  recordFeedback(item: FaqItem, feedback: 'yes' | 'no'): void {
    item.feedback = feedback;
  }

  trackById(_: number, item: FaqItem): number {
    return item.id;
  }

  private updateFilteredFaqs(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredFaqs = this.faqItems.filter((item) => {
      if (!term) {
        return true;
      }
      return (
        item.question.toLowerCase().includes(term) ||
        item.answer.toLowerCase().includes(term) ||
        (item.category ?? '').toLowerCase().includes(term)
      );
    });

    const groups: FaqGroup[] = [];
    const groupIndex = new Map<string, FaqGroup>();
    for (const item of this.filteredFaqs) {
      const category = item.category ?? 'Général';
      if (!groupIndex.has(category)) {
        const newGroup: FaqGroup = { id: this.toSlug(category), category, items: [] };
        groupIndex.set(category, newGroup);
        groups.push(newGroup);
      }
      groupIndex.get(category)?.items.push(item);
    }
    this.groupedFaqs = groups;
  }

  private updateFragment(item: FaqItem): void {
    void this.router.navigate([], { fragment: `question-${item.id}`, replaceUrl: true });
  }

  private scrollToItem(item: FaqItem): void {
    if (typeof window === 'undefined') {
      return;
    }
    const elementId = `question-${item.id}`;
    window.requestAnimationFrame(() => {
      const element = document.getElementById(elementId);
      if (!element) {
        return;
      }
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private toSlug(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
