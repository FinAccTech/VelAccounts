import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { ReportsService, BalanceSheetReport, ReportLine } from '../../../core/services/api.services';
import { ActiveAccountService } from '../../../core/services/active-account.service';

interface GroupedLines {
  grpName: string;
  lines:   ReportLine[];
  total:   number;
}

@Component({
  selector: 'app-balance-sheet',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatDatepickerModule,
    MatInputModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatDividerModule,
  ],
  templateUrl: './balance-sheet.component.html',
  styleUrl: './balance-sheet.component.scss',
})
export class BalanceSheetComponent implements OnInit {
  private svc     = inject(ReportsService);
  private account = inject(ActiveAccountService);
  private fb      = inject(FormBuilder);

  loading = signal(false);
  report  = signal<BalanceSheetReport | null>(null);

  liabilityGroups = signal<GroupedLines[]>([]);
  assetGroups     = signal<GroupedLines[]>([]);

  form = this.fb.group({
    asOf: [null as Date | null, Validators.required],
  });

  ngOnInit() {
    // Default to FY end date
    // const acc = this.account.currentAccount();
    // if (acc?.To_Date) {
    //   this.form.patchValue({ asOf: new Date(acc.To_Date) });
    // }
  }

  load() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v   = this.form.getRawValue();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    this.loading.set(true);

    this.svc.balanceSheet(fmt(v.asOf!)).subscribe({
      next: res => {
        this.report.set(res);
        this.liabilityGroups.set(this.group(res.liabilities));
        this.assetGroups.set(this.group(res.assets));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private group(lines: ReportLine[]): GroupedLines[] {
    const map = new Map<string, GroupedLines>();
    for (const l of lines) {
      if (!map.has(l.Grp_Name)) {
        map.set(l.Grp_Name, { grpName: l.Grp_Name, lines: [], total: 0 });
      }
      const g = map.get(l.Grp_Name)!;
      g.lines.push(l);
      g.total += l.Amount;
    }
    return Array.from(map.values());
  }

  print() { window.print(); }

  isBalanced(): boolean {
    const s = this.report()?.summary;
    if (!s) return false;
    const diff = Math.abs(s.GrandTotalLiabilities - s.TotalAssets);
    return diff < 0.01;  // allow 1 paisa rounding diff
  }
}
