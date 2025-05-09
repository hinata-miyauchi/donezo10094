// src/app/models/issue.model.ts

export interface Issue {
    id: string;
    issueNumber: string;        // 課題番号（自動採番）
    title: string;             // 課題名
    description: string;       // 課題内容
    status: '未着手' | '進行中' | '完了';  // 対応状況
    priority: '高' | '中' | '低';  // 重要度
    dueDate: Date;            // 対応期限
    completionCriteria?: string; // 完了条件
    solution?: string;         // 対応・解決方法
    occurrenceDate?: Date;
    assignee?: {
        uid: string;
        displayName: string;
        photoURL?: string;
    };
    handler?: string;         // 対応者
    progress: number;          // 進捗率（0-100）
    createdAt: Date;          // 作成日時
    updatedAt: Date;          // 更新日時
    createdBy: {
        uid: string;
        displayName: string;
    };
    teamId: string | null;  // チームに関連付けられた課題の場合はチームID、個人の課題の場合はnull
    isPrivate: boolean; // true: 個人課題, false: チーム課題
    watchers?: string[]; // 課題をウォッチしているユーザーのID
    userId: string;
    comments?: IssueComment[];
    is_archived?: boolean;
    archived_at?: string;
}

export interface IssueFilter {
    keyword?: string;
    status?: string[];
    importance?: string[];
    startDate?: Date;
    endDate?: Date;
    assignee?: string[];
    handler?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface IssueSummary {
    totalIssues: number;
    completedIssues: number;
    inProgressIssues: number;
    notStartedIssues: number;
    upcomingDeadlines: Issue[];
}

export interface IssueComment {
    id: string;
    content: string;
    createdAt: Date;
    updatedAt?: Date;
    author: {
        uid: string;
        displayName: string;
    };
}
  