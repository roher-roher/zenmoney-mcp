export interface Instrument {
  id: number;
  changed: number;
  title: string;
  shortTitle: string;
  symbol: string;
  rate: number;
}

export interface Company {
  id: number;
  changed: number;
  title: string;
  fullTitle: string;
  www: string;
  country: string;
}

export interface User {
  id: number;
  changed: number;
  login: string | null;
  currency: number;
  parent: number | null;
}

export type AccountType = 'cash' | 'ccard' | 'checking' | 'loan' | 'deposit' | 'emoney' | 'debt';

export interface Account {
  id: string;
  changed: number;
  user: number;
  role: number | null;
  instrument: number | null;
  company: number | null;
  type: AccountType;
  title: string;
  syncID: string[] | null;
  balance: number | null;
  startBalance: number | null;
  creditLimit: number | null;
  inBalance: boolean;
  savings: boolean | null;
  enableCorrection: boolean;
  enableSMS: boolean;
  archive: boolean;
  capitalization: boolean;
  percent: number;
  startDate: string | null;
  endDateOffset: number | null;
  endDateOffsetInterval: 'day' | 'week' | 'month' | 'year' | null;
  payoffStep: number | null;
  payoffInterval: 'month' | 'year' | null;
}

export interface Tag {
  id: string;
  changed: number;
  user: number;
  title: string;
  parent: string | null;
  icon: string | null;
  picture: string | null;
  color: number | null;
  showIncome: boolean;
  showOutcome: boolean;
  budgetIncome: boolean;
  budgetOutcome: boolean;
  required: boolean | null;
}

export interface Merchant {
  id: string;
  changed: number;
  user: number;
  title: string;
}

export interface Reminder {
  id: string;
  changed: number;
  user: number;
  incomeInstrument: number;
  incomeAccount: string;
  income: number;
  outcomeInstrument: number;
  outcomeAccount: string;
  outcome: number;
  tag: string[] | null;
  merchant: string | null;
  payee: string | null;
  comment: string | null;
  interval: 'day' | 'week' | 'month' | 'year' | null;
  step: number | null;
  points: number[] | null;
  startDate: string;
  endDate: string | null;
  notify: boolean;
}

export interface ReminderMarker {
  id: string;
  changed: number;
  user: number;
  incomeInstrument: number;
  incomeAccount: string;
  income: number;
  outcomeInstrument: number;
  outcomeAccount: string;
  outcome: number;
  tag: string[] | null;
  merchant: string | null;
  payee: string | null;
  comment: string | null;
  date: string;
  reminder: string;
  state: 'planned' | 'processed' | 'deleted';
  notify: boolean;
}

export interface Transaction {
  id: string;
  changed: number;
  created: number;
  user: number;
  deleted: boolean;
  hold: boolean | null;
  incomeInstrument: number;
  incomeAccount: string;
  income: number;
  outcomeInstrument: number;
  outcomeAccount: string;
  outcome: number;
  tag: string[] | null;
  merchant: string | null;
  payee: string | null;
  originalPayee: string | null;
  comment: string | null;
  date: string;
  mcc: number | null;
  reminderMarker: string | null;
  opIncome: number | null;
  opIncomeInstrument: number | null;
  opOutcome: number | null;
  opOutcomeInstrument: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Budget {
  changed: number;
  user: number;
  tag: string | null;
  date: string;
  income: number;
  incomeLock: boolean;
  outcome: number;
  outcomeLock: boolean;
}

export interface Deletion {
  id: string;
  object: string;
  stamp: number;
  user: number;
}

export interface DiffRequest {
  currentClientTimestamp: number;
  serverTimestamp: number;
  forceFetch?: string[];
}

export interface DiffResponse {
  serverTimestamp: number;
  instrument?: Instrument[];
  company?: Company[];
  user?: User[];
  account?: Account[];
  tag?: Tag[];
  merchant?: Merchant[];
  budget?: Budget[];
  reminder?: Reminder[];
  reminderMarker?: ReminderMarker[];
  transaction?: Transaction[];
  deletion?: Deletion[];
}
