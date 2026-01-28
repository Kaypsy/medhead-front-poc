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
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Hospital, HospitalUpdateRequest } from '../../../hospitals/hospitals.service';
import { Specialty } from '../../../specialties/specialties.service';

const POSTAL_CODE_REGEX = /^\d{5}$/;
const PHONE_REGEX = /^\d{10}$/;

@Component({
  selector: 'app-hospital-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './hospital-edit-modal.component.html',
  styleUrl: './hospital-edit-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HospitalEditModalComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() hospital: Hospital | null = null;
  @Input() specialties: Specialty[] = [];
  @Input() specialtiesLoading = false;
  @Input() specialtiesError = '';
  @Input() isSubmitting = false;
  @Input() errorMessage = '';

  @Output() save = new EventEmitter<HospitalUpdateRequest>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('nameInput') nameInput?: ElementRef<HTMLInputElement>;

  private readonly fb = new FormBuilder();
  private previousBodyOverflow = '';

  readonly form = this.fb.group({
    name: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    address: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    city: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    postalCode: this.fb.control('', { validators: [this.optionalPatternValidator(POSTAL_CODE_REGEX)], nonNullable: true }),
    latitude: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(-90), Validators.max(90)]
    }),
    longitude: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(-180), Validators.max(180)]
    }),
    phoneNumber: this.fb.control('', { validators: [this.optionalPatternValidator(PHONE_REGEX)], nonNullable: true }),
    totalBeds: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
    isActive: this.fb.control(true, { nonNullable: true }),
    specialtyIds: this.fb.nonNullable.control<number[]>([])
  });

  get nameControl() {
    return this.form.controls.name;
  }

  get addressControl() {
    return this.form.controls.address;
  }

  get cityControl() {
    return this.form.controls.city;
  }

  get postalCodeControl() {
    return this.form.controls.postalCode;
  }

  get latitudeControl() {
    return this.form.controls.latitude;
  }

  get longitudeControl() {
    return this.form.controls.longitude;
  }

  get phoneNumberControl() {
    return this.form.controls.phoneNumber;
  }

  get totalBedsControl() {
    return this.form.controls.totalBeds;
  }

  get specialtyIdsControl() {
    return this.form.controls.specialtyIds;
  }

  ngAfterViewInit(): void {
    this.focusFirstField();
    this.lockBodyScroll();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['hospital']) {
      this.patchForm();
      this.focusFirstField();
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
    const payload: HospitalUpdateRequest = {
      name: raw.name.trim(),
      address: raw.address.trim(),
      city: raw.city.trim(),
      postalCode: raw.postalCode.trim() || undefined,
      latitude: this.toNumber(raw.latitude) ?? 0,
      longitude: this.toNumber(raw.longitude) ?? 0,
      phoneNumber: raw.phoneNumber.trim() || undefined,
      totalBeds: this.toNumber(raw.totalBeds),
      isActive: raw.isActive,
      specialtyIds: raw.specialtyIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    };

    if (!payload.name) {
      this.nameControl.setErrors({ required: true });
    }
    if (!payload.address) {
      this.addressControl.setErrors({ required: true });
    }
    if (!payload.city) {
      this.cityControl.setErrors({ required: true });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit(payload);
  }

  private patchForm(): void {
    if (!this.hospital) {
      return;
    }

    const specialtyIds = this.resolveSpecialtyIds(this.hospital);

    this.form.reset({
      name: this.hospital.name ?? '',
      address: this.hospital.address ?? '',
      city: this.hospital.city ?? '',
      postalCode: this.hospital.postalCode ?? '',
      latitude: this.hospital.latitude ?? null,
      longitude: this.hospital.longitude ?? null,
      phoneNumber: this.hospital.phoneNumber ?? '',
      totalBeds: this.hospital.totalBeds ?? null,
      isActive: this.hospital.isActive ?? true,
      specialtyIds
    });
  }

  private focusFirstField(): void {
    if (!this.nameInput) {
      return;
    }
    setTimeout(() => this.nameInput?.nativeElement?.focus(), 0);
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

  private resolveSpecialtyIds(hospital: Hospital): number[] {
    if (Array.isArray(hospital.specialtyIds)) {
      return hospital.specialtyIds;
    }
    if (Array.isArray(hospital.specialties)) {
      return hospital.specialties
        .map((specialty) => specialty?.id)
        .filter((id): id is number => typeof id === 'number');
    }
    return [];
  }

  private optionalPatternValidator(pattern: RegExp) {
    return (control: AbstractControl<string>): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      return pattern.test(control.value) ? null : { pattern: true };
    };
  }
}
