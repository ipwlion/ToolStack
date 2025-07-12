import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [RouterModule, MatToolbarModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary">
      <span style="font-weight: bold; margin-right: 20px;">ToolStack</span>
<button mat-button routerLink="/pdf-merge" routerLinkActive="active-link">PDF Merge</button>
<button mat-button routerLink="/pdf-editor" routerLinkActive="active-link">PDF Editor</button>

    </mat-toolbar>
  `,
  styles: [`
    mat-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
    }
  `]
})
export class AppToolbarComponent { }
