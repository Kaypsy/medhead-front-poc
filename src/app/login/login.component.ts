import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [false]
  });

  errorMessage = '';
  loading = false;
  showPassword = false;

  ngOnInit(): void {
    const notice = this.auth.consumeAuthNotice();
    if (notice) {
      this.errorMessage = notice;
    }

    if (this.auth.isAuthenticated) {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      const targetUrl = this.auth.resolveRedirectUrl(returnUrl);
      this.router.navigateByUrl(targetUrl);
    }
  }

  get passwordFieldType(): 'password' | 'text' {
    return this.showPassword ? 'text' : 'password';
  }

  get passwordToggleLabel(): string {
    return this.showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    const { username, password, remember } = this.loginForm.getRawValue();

    this.auth.login({ username, password }, remember).subscribe({
      next: async () => {
        this.loading = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        await this.router.navigateByUrl(this.auth.resolveRedirectUrl(returnUrl));
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 400) {
          this.errorMessage = 'Invalid request. Please check your input.';
        } else if (err.status === 401) {
          this.errorMessage = 'Invalid credentials. Please try again.';
        } else {
          this.errorMessage = 'Unexpected error. Please try again later.';
        }
      }
    });
  }
}
