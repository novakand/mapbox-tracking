import { Subject } from 'rxjs';

export class LoadProgressService {
  constructor() {
    this._loaderSubject = new Subject();
    this._priority = 0;
  }

  get inProgress() {
    return this._loaderSubject.asObservable();
  }

  show(priority = 0) {
    this._priority = priority > this._priority ? priority : this._priority;
    this._loaderSubject.next(true);
  }

  hide(priority = 0) {
    if (priority >= this._priority) {
      this._priority = 0;
      this._loaderSubject.next(false);
    }
  }
}
export const loadProgressService = new LoadProgressService();
