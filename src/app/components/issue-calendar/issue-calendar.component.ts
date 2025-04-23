import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { Router } from '@angular/router';
import { IssueService } from '../../services/issue.service';
import { Issue } from '../../models/issue.model';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';

@Component({
  selector: 'app-issue-calendar',
  template: `
    <div class="calendar-container">
      <div class="legend-container mb-4">
        <div class="legend-section">
          <h4 class="text-sm font-medium text-gray-700 mb-2">重要度</h4>
          <div class="flex gap-4">
            <div class="flex items-center">
              <span class="legend-box importance-高"></span>
              <span class="text-sm ml-2">高</span>
            </div>
            <div class="flex items-center">
              <span class="legend-box importance-中"></span>
              <span class="text-sm ml-2">中</span>
            </div>
            <div class="flex items-center">
              <span class="legend-box importance-低"></span>
              <span class="text-sm ml-2">低</span>
            </div>
          </div>
        </div>
        <div class="legend-section mt-3">
          <h4 class="text-sm font-medium text-gray-700 mb-2">ステータス</h4>
          <div class="flex gap-4">
            <div class="flex items-center">
              <span class="legend-box status-未着手-sample"></span>
              <span class="text-sm ml-2">未着手（点線）</span>
            </div>
            <div class="flex items-center">
              <span class="legend-box status-対応中-sample"></span>
              <span class="text-sm ml-2">対応中（実線）</span>
            </div>
            <div class="flex items-center">
              <span class="legend-box status-完了-sample"></span>
              <span class="text-sm ml-2">完了（グレー）</span>
            </div>
          </div>
        </div>
      </div>
      <full-calendar [options]="calendarOptions"></full-calendar>
    </div>
  `,
  styleUrls: ['./issue-calendar.component.scss'],
  standalone: true,
  imports: [CommonModule, FullCalendarModule]
})
export class IssueCalendarComponent implements OnInit {
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: 'ja',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
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
    displayEventTime: true,
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    timeZone: 'Asia/Tokyo',
    slotEventOverlap: false,
    slotDuration: '00:30:00',
    allDaySlot: false,
    eventMaxStack: 3,
    views: {
      timeGridWeek: {
        dayMaxEvents: false,
        nowIndicator: true,
        slotLabelFormat: {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }
      }
    },
    editable: true,
    eventResizableFromStart: true,
    eventDurationEditable: true,
    snapDuration: '00:15:00'
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
      const events = issues.map(issue => {
        const dueDate = issue.dueDate;
        // タイムゾーンを考慮した日付文字列を生成
        const dueDateStr = dueDate.toLocaleString('sv', { timeZone: 'Asia/Tokyo' }).replace(' ', 'T');
        
        return {
          id: issue.id,
          title: `${issue.title} (${issue.status})`,
          start: dueDateStr,
          duration: '01:00:00',
          allDay: false,
          classNames: [
            `importance-${issue.importance.toLowerCase()}`,
            `status-${issue.status.toLowerCase().replace(/\s+/g, '-')}`
          ],
          extendedProps: {
            ...issue,
            description: `担当: ${issue.assignee}\n進捗: ${issue.progress}%`
          }
        };
      });
      this.calendarOptions.events = events;
    });
  }

  private handleEventClick(clickInfo: EventClickArg) {
    const issueId = clickInfo.event.id;
    this.router.navigate(['/issues', issueId]);
  }
} 