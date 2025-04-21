import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IssueFormComponent } from './components/issue-form/issue-form.component';
import { IssueListComponent } from './components/issue-list/issue-list.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { IssueEditComponent } from './components/issue-edit/issue-edit.component';
import { IssueDetailComponent } from './components/issue-detail/issue-detail.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    IssueFormComponent,
    IssueListComponent,
    UserManagementComponent,
    IssueEditComponent,
    IssueDetailComponent
  ]
})
export class AppComponent {
  title = '課題管理システム';

  constructor() {
    console.log('AppComponent initialized');
  }
}
