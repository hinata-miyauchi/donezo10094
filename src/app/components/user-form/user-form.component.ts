import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit {
  @Input() user?: User;
  @Output() submitForm = new EventEmitter<Partial<User>>();

  userForm!: FormGroup;

  readonly roleOptions = ['admin', 'user'];
  readonly departmentOptions = ['開発部', '営業部', '管理部', '人事部'];

  constructor(private fb: FormBuilder) {
    this.initForm();
  }

  ngOnInit(): void {
    if (this.user) {
      this.userForm.patchValue(this.user);
    }
  }

  private initForm(): void {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['user', Validators.required],
      department: [''],
      position: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      const { confirmPassword, ...userData } = this.userForm.value;
      this.submitForm.emit(userData);
      this.userForm.reset({
        role: 'user'
      });
    } else {
      this.markFormGroupTouched(this.userForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.userForm.get(controlName);
    if (!control) return '';

    if (control.hasError('required')) {
      return 'この項目は必須です';
    }
    if (control.hasError('email')) {
      return '有効なメールアドレスを入力してください';
    }
    if (control.hasError('maxlength')) {
      return '文字数が制限を超えています';
    }
    if (control.hasError('minlength')) {
      return 'パスワードは8文字以上必要です';
    }
    if (this.userForm.hasError('mismatch') && controlName === 'confirmPassword') {
      return 'パスワードが一致しません';
    }
    return '';
  }
} 