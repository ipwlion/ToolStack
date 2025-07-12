import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.js';

@Component({
  standalone: true,
  selector: 'app-pdf-preview-dialog',
  template: `
    <h2 mat-dialog-title>
  Seleziona Pagine da Includere
  <button mat-button color="warn" [disabled]="loading" (click)="deselezionaTutte()" style="float: right;">
    Deseleziona tutte
  </button>
</h2>
  <div *ngIf="loading" class="spinner-container">
  <mat-spinner diameter="50" strokeWidth="4"></mat-spinner>
  <p>Caricamento anteprima...</p>
</div>

  <div *ngIf="!loading" >

    <mat-dialog-content>
      <div *ngIf="pageImages.length > 0" class="pages">
        <div *ngFor="let img of pageImages; let i = index" class="page">
          <img [src]="img" />
          <label>
            <input type="checkbox" [(ngModel)]="includedPages[i]" />
            Pagina {{ i + 1 }}
          </label>
        </div>
      </div>
      <div *ngIf="loading">Caricamento anteprima...</div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annulla</button>
      <button mat-button color="primary" (click)="conferma()">Conferma</button>
    </mat-dialog-actions>
</div>

  `,
  styles: [`
    .pages {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
    }
    .page {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 150px;
    }
    img {
      width: 100%;
      border: 1px solid #ccc;
    }
    .spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 2rem;
  color: #555;
}

  `],
  imports: [MatDialogModule, FormsModule, NgIf, NgFor, MatProgressSpinnerModule]
})
export class PdfPreviewDialogComponent implements OnInit {
  pageImages: string[] = [];
  includedPages: boolean[] = [];
  loading = true;

  constructor(
    public dialogRef: MatDialogRef<PdfPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { file: string, preselected?: number[] }

  ) { }

  async ngOnInit() {
    const pdf = await getDocument({ data: this.base64ToUint8Array(this.data.file) }).promise;
    const pageCount = pdf.numPages;
    this.includedPages = Array(pageCount).fill(true);

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.4 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;
      this.pageImages.push(canvas.toDataURL());
    }

    this.loading = false;

    this.includedPages = Array(pageCount).fill(true);

    if (this.data.preselected) {
      this.includedPages = this.includedPages.map((_, i) => this.data.preselected!.includes(i));
    }

  }
  deselezionaTutte() {
    this.includedPages = this.includedPages.map(() => false);
  }

  base64ToUint8Array(base64: string): Uint8Array {
    const raw = atob(base64.split(',')[1]);
    const uint8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      uint8Array[i] = raw.charCodeAt(i);
    }
    return uint8Array;
  }

  conferma() {
    const included = this.includedPages
      .map((v, i) => v ? i : -1)
      .filter(i => i !== -1);
    this.dialogRef.close(included);
  }
}
