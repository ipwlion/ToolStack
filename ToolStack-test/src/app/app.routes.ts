import { Routes } from '@angular/router';
import { PdfToolsComponent } from './pages/pdf-tools/pdf-tools.component';
import { PdfEditorComponent } from './pages/pdf-editor/pdf-editor.component';

export const routes: Routes = [
    { path: 'pdf-merge', component: PdfToolsComponent },
    { path: 'pdf-editor', component: PdfEditorComponent },
    { path: '', redirectTo: 'pdf-merge', pathMatch: 'full' },
    { path: '**', redirectTo: 'pdf-merge' }
  ];
  
  
