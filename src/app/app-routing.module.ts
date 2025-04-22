import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IssueCalendarComponent } from './components/issue-calendar/issue-calendar.component';
import { IssueListComponent } from './components/issue-list/issue-list.component';
import { IssueFormComponent } from './components/issue-form/issue-form.component';
import { IssueDetailComponent } from './components/issue-detail/issue-detail.component';
import { SettingsComponent } from './components/settings/settings.component';

export const routes: Routes = [
  { path: 'calendar', component: IssueCalendarComponent },
  { path: 'issues', component: IssueListComponent },
  { path: 'issues/new', component: IssueFormComponent },
  { path: 'issues/:id', component: IssueDetailComponent },
  { path: 'issues/:id/edit', component: IssueFormComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '', redirectTo: '/issues', pathMatch: 'full' },
  // ... existing routes ...
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 