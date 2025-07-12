import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import * as fabric from 'fabric';
import { PDFDocument } from 'pdf-lib';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.js';

@Component({
  selector: 'app-pdf-editor',
  standalone: true,
  templateUrl: './pdf-editor.component.html',
  styleUrls: ['./pdf-editor.component.scss'],
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    CommonModule,
    MatIconModule,
  ]
})
export class PdfEditorComponent {
  @ViewChild('canvasContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  fabricCanvases: fabric.Canvas[] = [];
  files: File[] = [];
  activePageIndex: number = 0;
  fonts: string[] = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia'];
  selectedFont: string = 'Arial';
  fontSize: number = 20;
  activeTextbox: fabric.Textbox | null = null;
  addingText = false;
  addingImage: string | null = null;
  pdfLoaded: boolean = false;
  hasChanges: boolean = false;
  undoStack: string[] = [];
  redoStack: string[] = [];

  async onFilesSelected(event: any) {
    const file = event.target.files[0];
    const arrayBuffer = await file.arrayBuffer();
    this.files.push(file);

    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;

    this.containerRef.nativeElement.innerHTML = '';
    this.fabricCanvases = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvasEl = document.createElement('canvas');
      const ctx = canvasEl.getContext('2d')!;
      canvasEl.width = viewport.width;
      canvasEl.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const wrapper = document.createElement('div');
      const fabricCanvasEl = document.createElement('canvas');
      fabricCanvasEl.width = canvasEl.width;
      fabricCanvasEl.height = canvasEl.height;
      fabricCanvasEl.id = `fabricCanvas${i}`;
      wrapper.appendChild(fabricCanvasEl);
      this.containerRef.nativeElement.appendChild(wrapper);
      wrapper.style.marginBottom = '20px';
      wrapper.style.border = '2px solid transparent';
      wrapper.onclick = () => {
        this.activePageIndex = i - 1;
        this.updateActiveHighlight();
      };

      const fCanvas = new fabric.Canvas(fabricCanvasEl, {
        width: canvasEl.width,
        height: canvasEl.height
      });

      const bgImg = await fabric.Image.fromURL(canvasEl.toDataURL());
      fCanvas.backgroundImage = bgImg;
      fCanvas.renderAll();
      this.fabricCanvases.push(fCanvas);

      // Listen for textbox selection
      fCanvas.on('selection:created', (e) => this.onObjectSelected(e));
      fCanvas.on('selection:updated', (e) => this.onObjectSelected(e));

      fCanvas.on('mouse:down', async (opt) => {
        const pointer = fCanvas.getPointer(opt.e);
        if (this.addingText) {
          const text = new fabric.Textbox('Scrivi qui', {
            left: pointer.x,
            top: pointer.y,
            fontSize: this.fontSize,
            fontFamily: this.selectedFont,
            fill: '#000'
          });
          fCanvas.add(text);
          fCanvas.setActiveObject(text);
          fCanvas.renderAll();
          this.saveState();

          this.activeTextbox = text;
          this.addingText = false;
        } else if (this.addingImage) {
          const img = await fabric.Image.fromURL(this.addingImage);
          img.set({ left: pointer.x, top: pointer.y, scaleX: 0.5, scaleY: 0.5 });
          fCanvas.add(img);
          fCanvas.renderAll();
          this.saveState();

          this.addingImage = null;
        }
      });

    }
    this.pdfLoaded = true;
  }

  saveState() {
    const canvas = this.fabricCanvases[this.activePageIndex];
    const json = JSON.stringify(canvas.toJSON()); // usa toJSON() esplicitamente
    this.undoStack.push(json);
    this.redoStack = [];
  }

  undo() {
    const canvas = this.fabricCanvases[this.activePageIndex];
    if (this.undoStack.length > 0) {
      this.redoStack.push(JSON.stringify(canvas.toJSON()));
      const prev = this.undoStack.pop();
      canvas.clear(); // 🔴 Importante per evitare accumulo
      canvas.loadFromJSON(prev!, () => canvas.renderAll());
    }
  }

  redo() {
    const canvas = this.fabricCanvases[this.activePageIndex];
    if (this.redoStack.length > 0) {
      this.undoStack.push(JSON.stringify(canvas.toJSON()));
      const next = this.redoStack.pop();
      canvas.clear(); // 🔴 Importante anche qui
      canvas.loadFromJSON(next!, () => canvas.renderAll());
    }
  }


  updateActiveHighlight() {
    const wrappers = this.containerRef.nativeElement.querySelectorAll('div');
    wrappers.forEach((div, index) => {
      (div as HTMLElement).style.border = index === this.activePageIndex ? '2px solid blue' : '2px solid transparent';
    });
  }

  addText() {
    this.addingText = true;
    this.hasChanges = true;
  }

  onObjectSelected(event: any) {
    const obj = event.selected?.[0];
    if (obj && obj.type === 'textbox') {
      this.activeTextbox = obj as fabric.Textbox;
    } else {
      this.activeTextbox = null;
    }
  }

  // Called when font or size changes
  onFontChange() {
    if (this.activeTextbox) {
      this.activeTextbox.set({
        fontFamily: this.selectedFont,
        fontSize: this.fontSize
      });
      this.fabricCanvases[this.activePageIndex].renderAll();
    }
    this.saveState();
  }

  async addImage(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      this.addingImage = reader.result as string;
    };
    reader.readAsDataURL(file);
    this.hasChanges = true;
  }


  enableDraw() {
    const canvas = this.fabricCanvases[this.activePageIndex];
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = '#000';
    canvas.freeDrawingBrush.width = 2;
    this.hasChanges = true;
    this.saveState();

  }

  disableDraw() {
    this.fabricCanvases[this.activePageIndex].isDrawingMode = false;
  }

  deleteSelectedObject() {
    const canvas = this.fabricCanvases[this.activePageIndex];
    const active = canvas.getActiveObject();
    if (active) {
      canvas.remove(active);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
    this.saveState();

  }


  async exportPDF() {
    const file = this.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const originalPdfBytes = new Uint8Array(arrayBuffer);
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();

    for (let i = 0; i < this.fabricCanvases.length; i++) {
      const canvasData = this.fabricCanvases[i].toDataURL({
        format: 'png',
        multiplier: 1
      });

      const base64 = canvasData.split(',')[1];
      const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const img = await pdfDoc.embedPng(imgBytes);
      const { width, height } = pages[i].getSize();
      pages[i].drawImage(img, { x: 0, y: 0, width, height });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modificato.pdf';
    link.click();
  }
}
