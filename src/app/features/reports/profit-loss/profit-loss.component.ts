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
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReportsService, ProfitLossReport, ReportLine } from '../../../core/services/api.services';
import { ActiveAccountService } from '../../../core/services/active-account.service';

interface GroupedLines {
  grpName: string;
  lines:   ReportLine[];
  total:   number;
}

@Component({
  selector: 'app-profit-loss',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatDatepickerModule,
    MatInputModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './profit-loss.component.html',
  styleUrl: './profit-loss.component.scss',
})
export class ProfitLossComponent implements OnInit {
  private svc     = inject(ReportsService);
  private account = inject(ActiveAccountService);
  private fb      = inject(FormBuilder);

  loading = signal(false);
  report  = signal<ProfitLossReport | null>(null);

  incomeGroups  = signal<GroupedLines[]>([]);
  expenseGroups = signal<GroupedLines[]>([]);

  form = this.fb.group({
    fromDate: [null as Date | null, Validators.required],
    toDate:   [null as Date | null, Validators.required],
  });

  ngOnInit() {
    // Auto-fill FY dates
    const acc = this.account.currentAccount();
    // if (acc?.From_Date && acc?.To_Date) {
    //   this.form.patchValue({
    //     fromDate: new Date(acc.From_Date),
    //     toDate:   new Date(acc.To_Date),
    //   });
    // }
  }

  load() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v   = this.form.getRawValue();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    this.loading.set(true);

    this.svc.profitLoss(fmt(v.fromDate!), fmt(v.toDate!)).subscribe({
      next: res => {
        this.report.set(res);
        this.incomeGroups.set(this.group(res.incomes));
        this.expenseGroups.set(this.group(res.expenses));
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
}
