import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { Router } from '@angular/router';
import { IssueService } from '../../services/issue.service';
import { Issue } from '../../models/issue.model';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

@Component({
  selector: 'app-issue-calendar',
  template: `
    <div class="calendar-container">
      <full-calendar [options]="calendarOptions"></full-calendar>
    </div>
  `,
  styleUrls: ['./issue-calendar.component.scss'],
  standalone: true,
  imports: [CommonModule, FullCalendarModule]
})
export class IssueCalendarComponent implements OnInit {
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: 'ja',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth'
    },
    eventClick: this.handleEventClick.bind(this),
    events: [],
    height: 'auto',
    contentHeight: 'auto',
    fixedWeekCount: false,
    handleWindowResize: true,
    expandRows: true,
    themeSystem: 'standard',
    dayMaxEvents: true,
    eventTimeFormat: {
      hour: 'numeric',
      minute: '2-digit',
      meridiem: false
    }
  };

  constructor(
    private issueService: IssueService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadIssues();
  }

  private loadIssues() {
    this.issueService.getIssues().subscribe(issues => {
      const events = issues.map(issue => ({
        id: issue.id,
        title: issue.title,
        start: issue.dueDate,
        classNames: [
          `importance-${issue.importance.toLowerCase()}`,
          `status-${issue.status.toLowerCase().replace(/\s+/g, '-')}`
        ],
        extendedProps: issue
      }));
      this.calendarOptions.events = events;
    });
  }

  private handleEventClick(clickInfo: EventClickArg) {
    const issueId = clickInfo.event.id;
    this.router.navigate(['/issues', issueId]);
  }
} 