import { Injectable, signal, computed } from '@angular/core';
import { Account } from '../models';

const ACC_KEY = 'vel_acc_sno';

@Injectable({ providedIn: 'root' })
export class ActiveAccountService {

  private readonly _account = signal<Account | null>(this.restore());

  /** The currently selected book of accounts. */
  readonly currentAccount = this._account.asReadonly();

  /** AccSno as a number, or null if none selected. Used by the HTTP interceptor. */
  readonly accSno = computed(() => this._account()?.AccSno ?? null);

  /** Display name for the header / shell. */
  readonly label = computed(() => {
    const a = this._account();
    return a ? `${a.Acc_Code} — ${a.Acc_Name}` : 'No account selected';
  });

  setAccount(account: Account): void {
    this._account.set(account);
    localStorage.setItem(ACC_KEY, JSON.stringify(account));
  }

  clearAccount(): void {
    this._account.set(null);
    localStorage.removeItem(ACC_KEY);
  }

  private restore(): Account | null {
    try {
      const raw = localStorage.getItem(ACC_KEY);
      return raw ? (JSON.parse(raw) as Account) : null;
    } catch {
      return null;
    }
  }
}
