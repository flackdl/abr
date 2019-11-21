import { Subject } from 'rxjs';
import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {map} from "rxjs/operators";
import * as _ from 'lodash';
import {forkJoin, Observable, of} from "rxjs";
import {FormGroup} from "@angular/forms";
import {LocalStorageService} from 'ngx-webstorage';


type EstimateData = {
  crm?: string,
  customer_id?: number,
  first_name?: string,
  last_name?: string,
  email?: string,
  phone?: number,
  address_line1?: string,
  address_line2?: string,
  city?: string,
  state?: string,
  zip?: string,
  main_concern?: string,
};

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  public API_QBO_CUSTOMER = '/api/customer/';
  public API_QBO_ESTIMATE = '/api/estimate/';
  public API_QBO_INVOICE = '/api/invoice/';
  public API_QBO_PREFERENCES = '/api/preferences/';
  public API_QBO_SETTINGS = '/api/settings/';

  public settings: any;
  public estimateData: EstimateData;
  public qboPreferences: any;

  public estimateData$ = new Subject();

  constructor(
    private http: HttpClient,
    private storage: LocalStorageService,
  ) {}

  public init(): Observable<any> {
    return forkJoin(
      this.loadEstimateData(),
      this.fetchSettings(),
      this.fetchQBOPreferences(),
    );
  }

  public hasCurrentCustomer(): boolean {
    return Boolean(this.estimateData && this.estimateData.first_name && this.estimateData.last_name);
  }

  public currentCustomer() {
    if (this.hasCurrentCustomer()) {
      return `${this.estimateData.first_name} ${this.estimateData.last_name}`;
    }
  }

  public clearEstimateData() {
    this.storage.clear('estimate');
    this.estimateData = null;
    this.estimateData$.next(null);
  }

  public loadEstimateData(): Observable<any> {
    return of([this.storage.retrieve('estimate')]).pipe(
      map((data) => {
        if (data.length) {
          this.estimateData = data[0];
        }
      })
    );
  }

  public updateEstimateData(updatedEstimateData: EstimateData) {
    _.assign(this.estimateData, updatedEstimateData);
    this.storage.store('estimate', this.estimateData);
    this.estimateData$.next(this.estimateData);
  }

  public createCustomer(data: any): Observable<any> {
    return this.http.post(this.API_QBO_CUSTOMER, data);
  }

  public fetchSettings(): Observable<any> {
    return this.http.get(this.API_QBO_SETTINGS, ).pipe(
      map((data: any) => {
        this.settings = data;
        return this.settings;
      }),
    );
  }

  public fetchQBOPreferences(): Observable<any> {
    return this.http.get(this.API_QBO_PREFERENCES, ).pipe(
      map((data: any) => {
        if (data.length > 0) {
          this.qboPreferences = data[0];
        }
        return this.qboPreferences;
      }),
    );
  }

  public fetchCustomers(params?: any): Observable<any> {
    const httpParams = new HttpParams({fromObject: params});
    return this.http.get(this.API_QBO_CUSTOMER, {params: httpParams});
  }

  public fetchInvoices(params?: any): Observable<any> {
    const httpParams = new HttpParams({fromObject: params});
    return this.http.get(this.API_QBO_INVOICE, {params: httpParams}).pipe(
      map((data: any) => {
        // sort by most recent transaction date
        return _.sortBy(data, (d) => d.TxnDate).reverse();
      }),
    );
  }

  public fetchEstimates(params?: any): Observable<any> {
    const httpParams = new HttpParams({fromObject: params});
    return this.http.get(this.API_QBO_ESTIMATE, {params: httpParams});
  }

  public createEstimate(data: any): Observable<any> {
    return this.http.post(this.API_QBO_ESTIMATE, data);
  }

  public markFormDirty(form: FormGroup) {
    // mark all controls as dirty to force validation
    Object.keys(form.controls).forEach(field => {
      form.get(field).markAsDirty();
    });
  }
}
