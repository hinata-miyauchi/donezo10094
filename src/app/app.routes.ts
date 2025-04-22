import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { IssueListComponent } from './components/issue-list/issue-list.component';
import { IssueFormComponent } from './components/issue-form/issue-form.component';
import { IssueDetailComponent } from './components/issue-detail/issue-detail.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { IssueEditComponent } from './components/issue-edit/issue-edit.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'issues', component: IssueListComponent },
  { path: 'issues/new', component: IssueFormComponent },
  { path: 'issues/:id', component: IssueDetailComponent },
  { path: 'settings', component: UserManagementComponent },
  {
    path: 'edit-issue/:id',
    component: IssueEditComponent,
    title: '課題編集'
  },
  { path: '**', redirectTo: '' }
];
