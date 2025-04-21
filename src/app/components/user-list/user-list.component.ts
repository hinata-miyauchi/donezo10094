import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { User, UserFilter } from '../../models/user.model';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class UserListComponent implements OnInit {
  users$: Observable<User[]>;
  filteredUsers$: Observable<User[]>;
  filterForm: FormGroup;
  showForm = false;

  private filterSubject = new BehaviorSubject<UserFilter>({});

  readonly roleOptions = ['admin', 'user'];
  readonly departmentOptions = ['開発部', '営業部', '管理部', '人事部'];

  constructor(
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.users$ = this.userService.getUsers();
    this.filterForm = this.initFilterForm();
    this.filteredUsers$ = this.setupFilteredUsers();
  }

  ngOnInit(): void {}

  private initFilterForm(): FormGroup {
    const form = this.fb.group({
      keyword: [''],
      role: [[]],
      department: [[]],
      isActive: [null]
    });

    form.valueChanges.subscribe(filters => {
      this.filterSubject.next(filters);
    });

    return form;
  }

  private setupFilteredUsers(): Observable<User[]> {
    return combineLatest([
      this.users$,
      this.filterSubject
    ]).pipe(
      map(([users, filters]) => {
        return this.filterUsers(users, filters);
      })
    );
  }

  private filterUsers(users: User[], filters: UserFilter): User[] {
    return users
      .filter(user => {
        if (filters.keyword) {
          const keyword = filters.keyword.toLowerCase();
          return user.name.toLowerCase().includes(keyword) ||
                 user.email.toLowerCase().includes(keyword) ||
                 (user.department?.toLowerCase().includes(keyword) || false);
        }
        return true;
      })
      .filter(user => {
        if (filters.role?.length) {
          return filters.role.includes(user.role);
        }
        return true;
      })
      .filter(user => {
        if (filters.department?.length) {
          return filters.department.includes(user.department || '');
        }
        return true;
      })
      .filter(user => {
        if (filters.isActive !== null) {
          return user.isActive === filters.isActive;
        }
        return true;
      });
  }

  clearFilters(): void {
    this.filterForm.reset({
      keyword: '',
      role: [],
      department: [],
      isActive: null
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }
} 