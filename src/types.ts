export interface Skill {
  name: string;
  level: number;
}

export interface ProfileConfig {
  user: string;
  name: string;
  status: string;
  bio: string;
  location?: string;
  org?: string;
  email?: string;
  footer?: string;
  typing: string[];
  skills: Skill[];
  pinned: string[] | "auto";
  pinnedCount: number;
}

export interface DayCell {
  date: string;
  count: number;
  dow: number;
  week: number;
}

export interface MonthLabel {
  label: string;
  week: number;
}

export interface Calendar {
  total: number;
  max: number;
  longest: number;
  current: number;
  days: DayCell[];
  months: MonthLabel[];
}

export interface RepoInfo {
  fullName: string;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  fork: boolean;
  archived: boolean;
}

export interface ProfileData {
  calendar: Calendar;
  repos: RepoInfo[];
  pinnedRepos: RepoInfo[];
  accountCreated: string;
  years: number;
  starsEarned: number;
  publicRepos: number;
}
