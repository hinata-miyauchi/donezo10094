import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeamService } from '../../../services/team.service';
import { AuthService } from '../../../services/auth.service';
import { Team } from '../../../models/team.model';

@Component({
  selector: 'app-team-form',
  templateUrl: './team-form.component.html',
  styleUrls: ['./team-form.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class TeamFormComponent implements OnInit {
  teamForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private router: Router,
    private authService: AuthService
  ) {
    this.teamForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }

  async onSubmit(): Promise<void> {
    if (this.teamForm.invalid || this.isSubmitting) {
      return;
    }

    try {
      this.isSubmitting = true;
      const formValue = this.teamForm.value;
      const user = this.authService.currentUser;
      if (!user) throw new Error('認証が必要です');
      
      const teamData: Partial<Team> = {
        name: formValue.name,
        description: formValue.description,
        adminId: user.uid,
        members: []
      };

      await this.teamService.createTeam(user.uid, JSON.stringify(teamData));

      console.log('チームが正常に作成されました');
      this.router.navigate(['/teams']);
    } catch (error) {
      console.error('チームの作成に失敗しました:', error);
      alert('チームの作成に失敗しました。もう一度お試しください。');
    } finally {
      this.isSubmitting = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/teams']);
  }

  getErrorMessage(controlName: string): string {
    const control = this.teamForm.get(controlName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'この項目は必須です';
    if (errors['minlength']) return `最低${errors['minlength'].requiredLength}文字必要です`;
    
    return '入力値が不正です';
  }
} 