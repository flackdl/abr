import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  public API_QBO_CUSTOMER = '/api/customer/';
  public API_QBO_ESTIMATE = '/api/estimate/';
  public API_QBO_PREFERENCES = '/api/preferences/';
  public API_QBO_SETTINGS = '/api/settings/';

  constructor(
    private http: HttpClient,
  ) {}

  public fetchSettings() {
    return this.http.get(this.API_QBO_SETTINGS, ).pipe(
      map((data: any) => {
        return data;
      }),
    );
  }

  public fetchQBOPreferences() {
    return this.http.get(this.API_QBO_PREFERENCES, ).pipe(
      map((data: any) => {
        if (data.length > 0) {
          return data[0];
        }
        return data;
      }),
    );
  }

  public fetchCustomers(params?: any) {
    const httpParams = new HttpParams({fromObject: params});
    return this.http.get(this.API_QBO_CUSTOMER, {params: httpParams}).pipe(
      map((data: any) => {
        return data;
      }),
    );
  }

  public fetchEstimates(params?: any) {
    const httpParams = new HttpParams({fromObject: params});
    return this.http.get(this.API_QBO_ESTIMATE, {params: httpParams}).pipe(
      map((data: any) => {
        return data;
      }),
    );
  }

  public createEstimate(data: any) {
    return this.http.post(this.API_QBO_ESTIMATE, data).pipe(
      map((data: any) => {
        return data;
      }),
    );
  }
}
