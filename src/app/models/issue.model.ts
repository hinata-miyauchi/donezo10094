// src/app/models/issue.model.ts

export interface Issue {
    id: string;
    issueNumber: string;        // 課題番号（自動採番）
    title: string;             // 課題名
    description: string;       // 課題内容
    status: '未着手' | '対応中' | '完了';  // 対応状況
    importance: '低' | '中' | '高';  // 重要度
    dueDate: Date;            // 対応期限
    completionCriteria: string; // 完了条件
    solution: string;         // 対応・解決方法
    occurrenceDate: Date;
    assignee: string;          // 課題担当者
    progress: number;          // 進捗率（0-100）
    createdAt: Date;          // 作成日時
    updatedAt: Date;          // 更新日時
    createdBy?: string;        // 作成者（オプショナル）
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
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    overdue: number;
    averageProgress: number;
}
  