import { HttpClient, HttpClientModule, HttpHandler } from '@angular/common/http';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/services/api.service';
import { BrowserModule } from '@angular/platform-browser';
import { DndModule } from 'ngx-drag-drop';
import { AppToolbarComponent } from "./pages/app-toolbar/app-toolbar.component";
@Component({
  standalone:true,
  selector: 'app-root',
  imports: [RouterOutlet, DndModule, AppToolbarComponent],
  providers: [HttpClient, ApiService, BrowserModule, HttpClientModule ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
 files: File[] = [];

  constructor(private api: ApiService) {}

  onFilesSelected(event: any) {
    this.files = Array.from(event.target.files);
  }

  merge() {
    const formData = new FormData();
    this.files.forEach(f => formData.append('pdfs', f));
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
