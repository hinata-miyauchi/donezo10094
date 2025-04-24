import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { IssueListComponent } from './components/issue-list/issue-list.component';
import { IssueFormComponent } from './components/issue-form/issue-form.component';
import { IssueCalendarComponent } from './components/issue-calendar/issue-calendar.component';
import { TeamManagementComponent } from './components/team/team-management/team-management.component';
import { UserProfileComponent } from './components/user/user-profile/user-profile.component';
import { UserSettingsComponent } from './components/user/user-settings/user-settings.component';
import { IssueDetailComponent } from './components/issue-detail/issue-detail.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { 
    path: 'issues', 
    component: IssueListComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'issues/new', 
    component: IssueFormComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'issues/:id', 
    component: IssueDetailComponent,
    canActivate: [AuthGuard],
    data: { scrollPositionRestoration: 'top' }
  },
  { 
    path: 'calendar', 
    component: IssueCalendarComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'teams', 
    component: TeamManagementComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'profile', 
    component: UserProfileComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'settings', 
    component: UserSettingsComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '' }
];
