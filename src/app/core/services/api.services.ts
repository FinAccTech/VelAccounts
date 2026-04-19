import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse, Account, LedgerGroup, Ledger, VoucherType, VoucherSeries,
  Voucher, VoucherSaveResult, NextVoucherNo, LedgerStatement, ManagedUser
} from '../models';

const BASE = environment.apiUrl;

// ── Accounts ──────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AccountsService {
  private http = inject(HttpClient);
  private url  = `${BASE}/accounts`;

  list(): Observable<ApiResponse<Account[]>> {
    return this.http.get<ApiResponse<Account[]>>(this.url);
  }
  get(id: number): Observable<ApiResponse<Account>> {
    return this.http.get<ApiResponse<Account>>(`${this.url}/${id}`);
  }
  create(body: Partial<Account>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.url, body);
  }
  update(id: number, body: Partial<Account> & { CurrentRowVer: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.url}/${id}`, body);
  }
  delete(id: number, CurrentRowVer: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.url}/${id}`, { body: { CurrentRowVer } });
  }
}

// ── Ledger Groups ─────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class LedgerGroupsService {
  private http = inject(HttpClient);
  private url  = `${BASE}/ledger-groups`;

  list(): Observable<ApiResponse<LedgerGroup[]>> {
    return this.http.get<ApiResponse<LedgerGroup[]>>(this.url);
  }
  get(id: number): Observable<ApiResponse<LedgerGroup>> {
    return this.http.get<ApiResponse<LedgerGroup>>(`${this.url}/${id}`);
  }
  create(body: Partial<LedgerGroup>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.url, body);
  }
  update(id: number, body: Partial<LedgerGroup> & { CurrentRowVer: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.url}/${id}`, body);
  }
  delete(id: number, CurrentRowVer: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.url}/${id}`, { body: { CurrentRowVer } });
  }
}

// ── Ledgers ───────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class LedgersService {
  private http = inject(HttpClient);
  private url  = `${BASE}/ledgers`;

  list(grpSno?: number): Observable<ApiResponse<Ledger[]>> {
    let params = new HttpParams();
    if (grpSno) params = params.set('grpSno', grpSno);
    return this.http.get<ApiResponse<Ledger[]>>(this.url, { params });
  }
  get(id: number): Observable<ApiResponse<Ledger>> {
    return this.http.get<ApiResponse<Ledger>>(`${this.url}/${id}`);
  }
  create(body: Partial<Ledger>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.url, body);
  }
  update(id: number, body: Partial<Ledger> & { CurrentRowVer: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.url}/${id}`, body);
  }
  delete(id: number, CurrentRowVer: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.url}/${id}`, { body: { CurrentRowVer } });
  }
}

// ── Voucher Types ─────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class VoucherTypesService {
  private http = inject(HttpClient);
  private url  = `${BASE}/voucher-types`;

  list(): Observable<ApiResponse<VoucherType[]>> {
    return this.http.get<ApiResponse<VoucherType[]>>(this.url);
  }
  get(id: number): Observable<ApiResponse<VoucherType>> {
    return this.http.get<ApiResponse<VoucherType>>(`${this.url}/${id}`);
  }
  create(body: Partial<VoucherType>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.url, body);
  }
  update(id: number, body: Partial<VoucherType> & { CurrentRowVer: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.url}/${id}`, body);
  }
  delete(id: number, CurrentRowVer: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.url}/${id}`, { body: { CurrentRowVer } });
  }
}

// ── Voucher Series ────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class VoucherSeriesService {
  private http = inject(HttpClient);
  private url  = `${BASE}/voucher-series`;

  list(): Observable<ApiResponse<VoucherSeries[]>> {
    return this.http.get<ApiResponse<VoucherSeries[]>>(this.url);
  }
  get(id: number): Observable<ApiResponse<VoucherSeries>> {
    return this.http.get<ApiResponse<VoucherSeries>>(`${this.url}/${id}`);
  }
  create(body: Partial<VoucherSeries>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.url, body);
  }
  update(id: number, body: Partial<VoucherSeries> & { CurrentRowVer: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.url}/${id}`, body);
  }
  delete(id: number, CurrentRowVer: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.url}/${id}`, { body: { CurrentRowVer } });
  }
  getNextNumber(seriesSno: number): Observable<ApiResponse<NextVoucherNo>> {
    return this.http.get<ApiResponse<NextVoucherNo>>(
      `${BASE}/vouchers/next-number/${seriesSno}`
    );
  }
}

// ── Vouchers ──────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class VouchersService {
  private http = inject(HttpClient);
  private url  = `${BASE}/vouchers`;

  list(filters?: { seriesSno?: number; ledSno?: number; fromDate?: string; toDate?: string }):
    Observable<ApiResponse<Voucher[]>> {
    let params = new HttpParams();
    if (filters?.seriesSno) params = params.set('seriesSno', filters.seriesSno);
    if (filters?.ledSno)    params = params.set('ledSno',    filters.ledSno);
    if (filters?.fromDate)  params = params.set('fromDate',  filters.fromDate);
    if (filters?.toDate)    params = params.set('toDate',    filters.toDate);
    return this.http.get<ApiResponse<Voucher[]>>(this.url, { params });
  }

  get(id: number): Observable<ApiResponse<Voucher>> {
    return this.http.get<ApiResponse<Voucher>>(`${this.url}/${id}`);
  }

  create(body: {
    SeriesSno: number; Vou_Date: string; LedSno: number;
    Amount: number; Narration?: string; Vou_No?: string;
  }): Observable<ApiResponse<VoucherSaveResult>> {
    return this.http.post<ApiResponse<VoucherSaveResult>>(this.url, body);
  }

  update(id: number, body: {
    Vou_Date?: string; LedSno?: number; Amount?: number;
    Narration?: string; CurrentRowVer: string;
  }): Observable<ApiResponse<VoucherSaveResult>> {
    return this.http.put<ApiResponse<VoucherSaveResult>>(`${this.url}/${id}`, body);
  }

  delete(id: number, CurrentRowVer: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.url}/${id}`, { body: { CurrentRowVer } });
  }

  getLedgerStatement(
    ledSno: number, fromDate: string, toDate: string
  ): Observable<LedgerStatement> {
    const params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate',   toDate);
    return this.http.get<LedgerStatement>(
      `${this.url}/ledger-statement/${ledSno}`, { params }
    );
  }
}

// ── Users (admin) ─────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private url  = `${BASE}/auth/users`;

  list(): Observable<ApiResponse<ManagedUser[]>> {
    return this.http.get<ApiResponse<ManagedUser[]>>(this.url);
  }
  get(id: number): Observable<ApiResponse<ManagedUser>> {
    return this.http.get<ApiResponse<ManagedUser>>(`${this.url}/${id}`);
  }
  create(body: { User_Name: string; Password: string; Email?: string; Role?: string }):
    Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.url, body);
  }
  update(id: number, body: Partial<ManagedUser> & { CurrentRowVer: string }):
    Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.url}/${id}`, body);
  }
  resetPassword(id: number, body: { NewPassword: string; CurrentRowVer: string }):
    Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.url}/${id}/reset-password`, body);
  }
  delete(id: number, CurrentRowVer: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.url}/${id}`, { body: { CurrentRowVer } });
  }
}
