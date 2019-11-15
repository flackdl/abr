import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  public API_QBO_CUSTOMER = '/api/customer/';
  public API_QBO_ESTIMATE = '/api/estimate/';

  constructor(
    private http: HttpClient,
  ) {}

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
}
