import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { Router } from '@angular/router';
import { IssueService } from '../../services/issue.service';
import { TeamService } from '../../services/team.service';
import { Issue } from '../../models/issue.model';
import { Team } from '../../models/team.model';
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
  private teams: Team[] = [];
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
    private teamService: TeamService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTeamsAndIssues();
  }

  private async loadTeamsAndIssues(): Promise<void> {
    try {
      // まずチームを読み込む
      this.teams = await this.teamService.getUserTeams();
      
      // 個人の課題とすべてのチームの課題を取得
      const allIssuesPromises = [
        this.issueService.getIssues(), // 個人の課題
        ...this.teams.map(team => this.issueService.getIssues(team.id)) // 各チームの課題
      ];

      const results = await Promise.all(allIssuesPromises);
      
      // 結果を結合して重複を除去
      const allIssues = results.flat();
      const uniqueIssues = Array.from(new Map(allIssues.map(issue => [issue.id, issue])).values());
      
      this.updateCalendarEvents(uniqueIssues);
    } catch (error) {
      console.error('課題の読み込みに失敗しました:', error);
    }
  }

  private updateCalendarEvents(issues: Issue[]): void {
    this.calendarOptions.events = issues.map(issue => {
      const team = issue.teamId ? this.teams.find(t => t.id === issue.teamId) : null;
      const teamName = team ? team.name : '';
      
      return {
        id: issue.id,
        title: `${issue.title}${team ? ` (${teamName})` : ''}`,
        start: new Date(issue.dueDate),
        end: new Date(issue.dueDate),
        backgroundColor: this.getImportanceColor(issue.priority),
        borderColor: this.getStatusBorderColor(issue.status),
        textColor: issue.status === '完了' ? 'rgb(75, 85, 99)' : this.getTextColor(issue.priority),
        borderWidth: issue.status !== '完了' ? '3px' : '2px',
        borderStyle: issue.status === '未着手' ? 'dotted' : 'solid',
        className: `importance-${issue.priority} status-${issue.status}`,
        extendedProps: {
          status: issue.status,
          priority: issue.priority,
          description: issue.description,
          isTeamIssue: !!issue.teamId,
          teamName: teamName
        }
      };
    });
  }

  private getImportanceColor(priority: string): string {
    switch (priority) {
      case '高':
        return 'rgba(239, 68, 68, 0.4)'; // red-500 with opacity
      case '中':
        return 'rgba(245, 158, 11, 0.4)'; // yellow-500 with opacity
      case '低':
        return 'rgba(59, 130, 246, 0.4)'; // blue-500 with opacity
      default:
        return 'rgba(107, 114, 128, 0.4)'; // gray-500 with opacity
    }
  }

  private getStatusBorderColor(status: string): string {
    switch (status) {
      case '完了':
        return 'rgb(107, 114, 128)'; // gray-600
      case '対応中':
        return 'rgb(59, 130, 246)'; // blue-500
      case '未着手':
        return 'rgb(59, 130, 246)'; // blue-500
      default:
        return 'rgb(107, 114, 128)'; // gray-500
    }
  }

  private getTextColor(priority: string): string {
    switch (priority) {
      case '高':
        return 'rgb(127, 29, 29)'; // red-900
      case '中':
        return 'rgb(120, 53, 15)'; // yellow-900
      case '低':
        return 'rgb(30, 58, 138)'; // blue-900
      default:
        return 'rgb(75, 85, 99)'; // gray-600
    }
  }

  private handleEventClick(clickInfo: EventClickArg) {
    const issueId = clickInfo.event.id;
    this.router.navigate(['/issues', issueId]);
  }
} 