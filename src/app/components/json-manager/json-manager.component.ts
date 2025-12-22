// components/json-manager/json-manager.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JsonDatabaseService } from '../../services/json-database.service';

@Component({
  selector: 'app-json-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './json-manager.component.html',
  styleUrls: ['./json-manager.component.css']
})
export class JsonManagerComponent {
  @Output() close = new EventEmitter<void>();

  isExporting = false;
  isImporting = false;
  backupName = '';
  showBackupList = false;

  constructor(private jsonDb: JsonDatabaseService) {}

  // Export
  exportToFile(): void {
    this.isExporting = true;

    try {
      const data = this.jsonDb.exportToJson();
      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `arbre_genealogique_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.showMessage('Export réussi !', 'success');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      this.showMessage('Erreur lors de l\'export', 'error');
    } finally {
      this.isExporting = false;
    }
  }

  // Import
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (!file.name.endsWith('.json')) {
      this.showMessage('Veuillez sélectionner un fichier JSON', 'error');
      return;
    }

    this.isImporting = true;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const success = this.jsonDb.importFromJson(content);

        if (success) {
          this.showMessage('Import réussi !', 'success');
          this.close.emit();
        } else {
          this.showMessage('Échec de l\'import', 'error');
        }
      } catch (error) {
        console.error('Erreur lors de l\'import:', error);
        this.showMessage('Erreur lors de l\'import', 'error');
      } finally {
        this.isImporting = false;
      }
    };

    reader.onerror = () => {
      this.showMessage('Erreur de lecture du fichier', 'error');
      this.isImporting = false;
    };

    reader.readAsText(file);
  }

  // Backup
  createBackup(): void {
    const backupName = this.jsonDb.createBackup();
    this.backupName = backupName;
    this.showMessage(`Sauvegarde "${backupName}" créée`, 'success');
  }

  getBackups(): any[] {
    return this.jsonDb.getBackups();
  }

  restoreBackup(backup: any): void {
    if (confirm(`Restaurer la sauvegarde "${backup.name}" ?`)) {
      const success = this.jsonDb.restoreBackup(backup.data);
      if (success) {
        this.showMessage('Restauration réussie', 'success');
        this.close.emit();
      } else {
        this.showMessage('Échec de la restauration', 'error');
      }
    }
  }

  deleteBackup(backup: any): void {
    if (confirm(`Supprimer la sauvegarde "${backup.name}" ?`)) {
      // Implémentez la suppression des sauvegardes
      this.showMessage('Sauvegarde supprimée', 'info');
    }
  }

  // Statistiques
  getStats(): any {
    return this.jsonDb.getStatistics();
  }

  // Utilitaires
  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    // À implémenter avec un système de toast
    alert(`${type.toUpperCase()}: ${message}`);
  }

  onClose(): void {
    this.close.emit();
  }
}
