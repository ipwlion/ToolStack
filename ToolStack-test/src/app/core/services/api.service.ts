
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor() {}
private http: HttpClient = inject(HttpClient)
  mergePdfs(formData: FormData) {
    return this.http.post('http://localhost:3000/api/pdf/merge', formData, {
      responseType: 'blob'
    });
  }
}
