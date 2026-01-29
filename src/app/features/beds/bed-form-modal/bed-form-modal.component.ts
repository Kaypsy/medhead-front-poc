import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Hospital } from '../../../hospitals/hospitals.service';
import { Specialty } from '../../../specialties/specialties.service';
import { BedStatus } from '../../../bed-management/beds.service';

export type BedCreatePayload = {
  hospitalId: number;
  specialtyId: number;
  bedNumber: string;
  roomNumber?: string;
  floor?: number;
  status: BedStatus;
};

@Component({
  selector: 'app-bed-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bed-form-modal.component.html',
  styleUrl: './bed-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BedFormModalComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() hospitals: Hospital[] = [];
  @Input() specialties: Specialty[] = [];
  @Input() hospitalsLoading = false;
  @Input() specialtiesLoading = false;
  @Input() hospitalsError = '';
  @Input() specialtiesError = '';
  @Input() isSubmitting = false;
  @Input() errorMessage = '';
  @Input() initialHospitalId: number | null = null;

  @Output() save = new EventEmitter<BedCreatePayload>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('bedNumberInput') bedNumberInput?: ElementRef<HTMLInputElement>;

  private readonly fb = new FormBuilder();
  private previousBodyOverflow = '';

  readonly form = this.fb.group({
    hospitalId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    specialtyId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    bedNumber: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    roomNumber: this.fb.control('', { nonNullable: true }),
    floor: this.fb.control<number | null>(null),
    status: this.fb.control<BedStatus>('AVAILABLE', { nonNullable: true })
  });

  readonly statusOptions: Array<{ value: BedStatus; label: string }> = [
    { value: 'AVAILABLE', label: 'Disponible' },
    { value: 'OCCUPIED', label: 'Occupé' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'RESERVED', label: 'Réservé' }
  ];

  get hospitalControl() {
    return this.form.controls.hospitalId;
  }

  get specialtyControl() {
    return this.form.controls.specialtyId;
  }

  get bedNumberControl() {
    return this.form.controls.bedNumber;
  }

  ngAfterViewInit(): void {
    this.focusFirstField();
    this.lockBodyScroll();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialHospitalId'] && this.initialHospitalId) {
      const current = this.form.controls.hospitalId.value;
      if (!current) {
        this.form.controls.hospitalId.setValue(this.initialHospitalId);
      }
    }
  }

  ngOnDestroy(): void {
    this.restoreBodyScroll();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    event.preventDefault();
    this.requestClose();
  }

  requestClose(): void {
    if (this.isSubmitting) {
      return;
    }
    this.cancel.emit();
  }

  onBackdropClick(): void {
    this.requestClose();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const hospitalId = this.toNumber(raw.hospitalId);
    const specialtyId = this.toNumber(raw.specialtyId);
    const bedNumber = raw.bedNumber.trim();

    if (!bedNumber) {
      this.bedNumberControl.setErrors({ required: true });
    }
    if (!hospitalId) {
      this.hospitalControl.setErrors({ required: true });
    }
    if (!specialtyId) {
      this.specialtyControl.setErrors({ required: true });
    }

    if (this.form.invalid || !hospitalId || !specialtyId || !bedNumber) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: BedCreatePayload = {
      hospitalId,
      specialtyId,
      bedNumber,
      roomNumber: raw.roomNumber?.trim() || undefined,
      floor: this.toNumber(raw.floor),
      status: raw.status
    };

    this.save.emit(payload);
  }

  private focusFirstField(): void {
    if (!this.bedNumberInput) {
      return;
    }
    setTimeout(() => this.bedNumberInput?.nativeElement?.focus(), 0);
  }

  private lockBodyScroll(): void {
    const body = document?.body;
    if (!body) {
      return;
    }
    this.previousBodyOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
  }

  private restoreBodyScroll(): void {
    const body = document?.body;
    if (!body) {
      return;
    }
    body.style.overflow = this.previousBodyOverflow;
  }

  private toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
