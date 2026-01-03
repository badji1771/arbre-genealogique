import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService, ConfirmationOptions } from '../../services/confirmation.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.css']
})
export class ConfirmationModalComponent implements OnInit, OnDestroy {
  show = false;
  options: ConfirmationOptions | null = null;
  private resolve: ((value: boolean) => void) | null = null;
  private subscription: Subscription | null = null;

  constructor(private confirmationService: ConfirmationService) {}

  ngOnInit(): void {
    this.subscription = this.confirmationService.confirmation$.subscribe(data => {
      this.options = data.options;
      this.resolve = data.resolve;
      this.show = true;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  confirm(): void {
    this.show = false;
    if (this.resolve) {
      this.resolve(true);
    }
  }

  cancel(): void {
    this.show = false;
    if (this.resolve) {
      this.resolve(false);
    }
  }

  getIconClass(): string {
    switch (this.options?.type) {
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'info':
      default: return 'fas fa-info-circle';
    }
  }
}
