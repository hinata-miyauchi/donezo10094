import { Routes } from '@angular/router';
import { IssueFormComponent } from './components/issue-form/issue-form.component';
import { IssueListComponent } from './components/issue-list/issue-list.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { IssueEditComponent } from './components/issue-edit/issue-edit.component';
import { IssueDetailComponent } from './components/issue-detail/issue-detail.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'issues',
    pathMatch: 'full'
  },
  {
    path: 'issues',
    component: IssueListComponent,
    title: '課題一覧'
  },
  {
    path: 'new-issue',
    component: IssueFormComponent,
    title: '課題登録'
  },
  {
    path: 'users',
    component: UserManagementComponent,
    title: 'ユーザー管理'
  },
  {
    path: 'edit-issue/:id',
    component: IssueEditComponent,
    title: '課題編集'
  },
  {
    path: 'issues/:id',
    component: IssueDetailComponent,
    title: '課題詳細'
  },
  {
    path: '**',
    redirectTo: 'issues'
  }
];
