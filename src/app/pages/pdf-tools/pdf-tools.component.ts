import { Component, Inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { CommonModule } from '@angular/common';
import { DndModule } from 'ngx-drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
import { PdfViewerModule } from 'ng2-pdf-viewer';
GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.js';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PdfPreviewDialogComponent } from '../pdf-preview-dialog/pdf-preview-dialog.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    DndModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressBarModule,
  ],
  selector: 'app-pdf-tools',
  templateUrl: './pdf-tools.component.html',
  styleUrls: ['./pdf-tools.component.scss']
})
export class PdfToolsComponent {
  files: File[] = [];
  previews: string[] = [];
  constructor(private api: ApiService, private dialog: MatDialog) {
    this.restoreFromLocalStorage();
  }
  pageSelections: Record<number, number[]> = {}; // index del file -> pagine selezionate

  async onFilesSelected(event: any) {
    const newFiles = Array.from(event.target.files) as File[];
    for (const file of newFiles) {
      this.files.push(file);
      const preview = await this.generatePdfPreview(file);
      this.previews.push(preview);
    }
    this.saveToLocalStorage();
  }

  removeFile(index: number) {
    this.files.splice(index, 1);
    this.previews.splice(index, 1);
    this.saveToLocalStorage();
  }

  async generatePdfPreview(file: File): Promise<string> {
    GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.js';
    const buffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: buffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.5 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL();
  }

openPreviewAndSelectPages(file: File, index: number) {
  const reader = new FileReader();
  reader.onload = () => {
    this.dialog.open(PdfPreviewDialogComponent, {
      width: '80vw',
      height: '90vh',
      data: {
        file: reader.result,
        preselected: this.pageSelections[index] ?? null
      }
    }).afterClosed().subscribe((includedPages: number[]) => {
      if (!includedPages) return;
      this.pageSelections[index] = includedPages;
    });
  };
  reader.readAsDataURL(file);
}



  onDrop(event: any, toIndex: number) {
    const fromIndex = event.data?.index;

    if (fromIndex === undefined || fromIndex === toIndex) return;

    const movedFile = this.files.splice(fromIndex, 1)[0];
    const movedPreview = this.previews.splice(fromIndex, 1)[0];

    this.files.splice(toIndex, 0, movedFile);
    this.previews.splice(toIndex, 0, movedPreview);

    this.saveToLocalStorage();
  }



  saveToLocalStorage() {
    const fileNames = this.files.map(f => f.name);
    localStorage.setItem('pdfFileOrder', JSON.stringify(fileNames));
  }

  restoreFromLocalStorage() {
    const storedNames = JSON.parse(localStorage.getItem('pdfFileOrder') || '[]');
    // optional: match file names after re-upload to reorder
  }

merge() {
  const formData = new FormData();
  this.files.forEach((file, i) => {
    formData.append('pdfs', file);
    formData.append(`pages-${i}`, JSON.stringify(this.pageSelections[i] ?? []));
  });

  this.api.mergePdfs(formData).subscribe(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
  });
}

}
