import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  icon?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$: Observable<Toast[]> = this.toastsSubject.asObservable();
  private toastId = 0;

  private toastIcons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  show(message: string, type: Toast['type'] = 'info', icon?: string, duration: number = 3000): void {
    const id = this.toastId++;
    const toast: Toast = {
      id,
      message,
      type,
      icon: icon || this.toastIcons[type],
      duration
    };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  success(message: string, icon?: string, duration?: number): void {
    this.show(message, 'success', icon, duration);
  }

  error(message: string, icon?: string, duration?: number): void {
    this.show(message, 'error', icon, duration);
  }

  info(message: string, icon?: string, duration?: number): void {
    this.show(message, 'info', icon, duration);
  }

  warning(message: string, icon?: string, duration?: number): void {
    this.show(message, 'warning', icon, duration);
  }

  dismiss(id: number): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(t => t.id !== id));
  }
}
