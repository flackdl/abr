import { Subject } from 'rxjs';
import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {catchError, map, tap} from "rxjs/operators";
import * as _ from 'lodash';
import {forkJoin, Observable, of} from "rxjs";
import {FormGroup} from "@angular/forms";
import {LocalStorageService} from 'ngx-webstorage';
import {EstimateData, Item} from "./estimate-data";


@Injectable({
  providedIn: 'root'
})
export class ApiService {

  public API_QBO_CUSTOMER = '/api/customer/';
  public API_QBO_ESTIMATE = '/api/estimate/';
  public API_QBO_INVOICE = '/api/invoice/';
  public API_QBO_INVENTORY = '/api/inventory/';
  public API_QBO_SERVICE = '/api/service/';
  public API_QBO_PREFERENCES = '/api/preferences/';
  public API_SETTINGS = '/api/settings/';
  public API_CATEGORY= '/api/category/';
  public API_CATEGORY_CHILDREN = '/api/category-children/';
  public API_CATEGORY_PREFIX = '/api/category-prefix/';

  public settings: any;
  public estimateData: EstimateData;
  public qboPreferences: any;
  public categories: any[];
  public categoriesChildren: any[];
  public categoryPrefixes: any[];
  public estimateData$ = new Subject();
  public errorState: {
    errored: boolean,
    message: string,
  } = {
    errored: false,
    message: '',
  };
  public needsAuthentication = false;

  constructor(
    private http: HttpClient,
    private storage: LocalStorageService,
  ) {}

  public init(): Observable<any> {
    return forkJoin(
      this.fetchSettings(),
      this.loadEstimateData(),
      this.fetchQBOPreferences(),
      this.fetchCategory(),
      this.fetchCategoryChildren(),
      this.fetchCategoryPrefix(),
    ).pipe(
      catchError((error) => {
        console.error(error);
        this.errorState = {
          errored: true,
          message: 'An unknown error occurred loading initial data',
        };
        return of(error);
      })
    );
  }

  public hasCurrentCustomer(): boolean {
    return Boolean(this.estimateData.first_name && this.estimateData.last_name);
  }

  public hasMainConcern(): boolean {
    return Boolean(this.estimateData.main_concern);
  }

  public hasQuestionnaire(): boolean {
    return Boolean(this.estimateData.assessments && this.estimateData.bike_model);
  }

  public hasEstimate(): boolean {
    return Boolean(this.estimateData.category_items && this.estimateData.category_items.length > 0);
  }

  public hasEstimateWrapUp(): boolean {
    return Boolean(
      this.estimateData.expiration_date &&
      this.estimateData.expiration_time &&
      this.estimateData.employee_initials &&
      this.estimateData.need_parts !== undefined
    );
  }

  public hasReview(): boolean {
    return Boolean(
      this.estimateData.signature &&
      this.estimateData.contact_method &&
      this.estimateData.payment_option &&
      this.estimateData.status
    );
  }

  public getSubTotal(): number {
    let sum = 0;
    this.estimateData.category_items.forEach((catItem) => {
      catItem.items.forEach((item) => {
        sum += item.amount;
      })
    });
    return sum;
  }

  public getSubTotalForItems(items: any[]): number {
    return _.sum(items.map((item) => {
      return item.amount;
    }));
  }

  public getSubTotalForCategory(category: string): number {
    let sum = 0;
    this.estimateData.category_items.forEach((catItem) => {
      if (catItem.name === category) {
        sum = this.getSubTotalForItems(catItem.items);
      }
    });
    return sum;
  }

  public itemHasTax(item: any): boolean {
    return item.type === 'Inventory';
  }

  public getTotal(): number {
    let tax = 0;
    this.estimateData.category_items.forEach((catItem) => {
      tax += _.sum(catItem.items.filter((item) => {
        return this.itemHasTax(item);
      }).map((item) => {
        return this.getItemTax(item);
      }));
    });
    return this.getSubTotal() + tax;
  }

  public getItemTax(item: any) {
    return item.amount * .0775;
  }

  public hasEstimateNotes(): boolean {
    return Boolean(
      this.estimateData.public_notes
    );
  }

  public hasStatementNotes(): boolean {
    return Boolean(
      this.estimateData.private_notes
    );
  }

  public currentCustomer() {
    if (this.hasCurrentCustomer()) {
      return `${this.estimateData.first_name} ${this.estimateData.last_name}`;
    }
  }

  public getEmptyEstimateData(): EstimateData {
    return {
      category_items: [],
    }
  }

  public clearEstimateData() {
    this.estimateData = this.getEmptyEstimateData();
    this.updateEstimateData();
    this.estimateData$.next(null);
  }

  public getPublicNotes(): string {
    return [
      // main concern
      `Main Concern: ${this.estimateData.main_concern}`,
      // additional public notes
      this.estimateData.public_notes,
    ].join('\n');

  }

  public getPrivateNotes(): string {
    let notes = [];
    // include assessments
    notes = notes.concat(Object.keys(this.estimateData.assessments).map((assessment) => {
      return `${assessment}: ${this.estimateData.assessments[assessment]}`;
    }));
    // additional private notes
    notes.push(this.estimateData.private_notes);

    return notes.join('\n');
  }

  public loadEstimateData(): Observable<any> {
    return of(this.storage.retrieve('estimate')).pipe(
      map((data) => {
        if (data && Object.keys(data).length > 0) {
          this.estimateData = data;
        } else {
          this.estimateData = this.getEmptyEstimateData();
        }
      })
    );
  }

  public updateEstimateData(updatedEstimateData?: EstimateData) {
    if (updatedEstimateData) {
      _.assign(this.estimateData, updatedEstimateData);
    }
    this.storage.store('estimate', this.estimateData);
    this.estimateData$.next(this.estimateData);
  }

  public createCustomer(data: any): Observable<any> {
    return this._responseProxy(this.http.post(this.API_QBO_CUSTOMER, data));
  }

  public fetchSettings(): Observable<any> {
    return this._responseProxy(this.http.get(this.API_SETTINGS).pipe(
      map((data: any) => {
        this.settings = data;
        return this.settings;
      }),
    ));
  }

  public fetchQBOPreferences(): Observable<any> {
    return this._responseProxy(this.http.get(this.API_QBO_PREFERENCES, ).pipe(
      map((data: any) => {
        this.qboPreferences = data;
        return this.qboPreferences;
      }),
    ));
  }

  public fetchCustomers(params?: any): Observable<any> {
    const httpParams = new HttpParams({fromObject: params});
    return this._responseProxy(this.http.get(this.API_QBO_CUSTOMER, {params: httpParams}));
  }

  public fetchInvoices(params?: any): Observable<any> {
    const httpParams = new HttpParams({fromObject: params});
    return this._responseProxy(this.http.get(this.API_QBO_INVOICE, {params: httpParams}).pipe(
      map((data: any) => {
        // sort by most recent transaction date
        return _.sortBy(data, (d) => d.TxnDate).reverse();
      }),
    ));
  }

  public fetchEstimates(params?: any): Observable<any> {
    const httpParams = new HttpParams({fromObject: params});
    return this._responseProxy(this.http.get(this.API_QBO_ESTIMATE, {params: httpParams}));
  }

  public fetchInventory(params?: any): Observable<Item[]> {
    return this._fetchItems('Inventory', params);
  }

  public fetchService(params?: any): Observable<any> {
    return this._fetchItems('Service', params);
  }

  protected _fetchItems(type: string, params?: any): Observable<any> {
    const httpParams = new HttpParams({fromObject: params});
    const url = type === 'Service' ? this.API_QBO_SERVICE : this.API_QBO_INVENTORY;
    return this._responseProxy(
      this.http.get(url, {params: httpParams}).pipe(
        map((items: any[]) => {
          return items.map((item) => {
            return {
              id: item.Id,
              name: item.Name,
              full_name: item.FullyQualifiedName,
              price: item.UnitPrice,
              type: item.Type, // Inventory|Service
              description: item.Description,
            }
          })
        })
      ));
  }

  public fetchCategory(params?: any): Observable<any> {
    const httpParams = new HttpParams({fromObject: params});
    return this._responseProxy(this.http.get(this.API_CATEGORY, {params: httpParams}).pipe(
      map((data: any[]) => {
        this.categories = data;
        return this.categories;
      })
    ));
  }

  public fetchCategoryChildren(params?: any): Observable<any> {
    const httpParams = new HttpParams({fromObject: params});
    return this._responseProxy(this.http.get(this.API_CATEGORY_CHILDREN, {params: httpParams}).pipe(
      map((data: any[]) => {
        this.categoriesChildren = data;
        return this.categoriesChildren;
      })
    ));
  }

  public fetchCategoryPrefix(params?: any): Observable<any> {
    const httpParams = new HttpParams({fromObject: params});
    return this._responseProxy(this.http.get(this.API_CATEGORY_PREFIX, {params: httpParams}).pipe(
      map((data: any[]) => {
        this.categoryPrefixes = data;
        return this.categoryPrefixes;
      })
    ));
  }

  public createEstimate(data: EstimateData): Observable<any> {
    // flatten category items into just the items themselves
    const postData = Object.assign({}, data);
    let items = [];
    data.category_items.forEach((catItem) => {
      items = items.concat(catItem.items);
    });
    postData['items'] = items;

    return this._responseProxy(this.http.post(this.API_QBO_ESTIMATE, postData)).pipe(
      tap((data) => {
        // clear local storage
        this.storage.clear('estimate');
      })
    );
  }

  public markFormDirty(form: FormGroup) {
    // mark all controls as dirty to force validation
    Object.keys(form.controls).forEach(field => {
      form.get(field).markAsDirty();
    });
  }

  protected _responseProxy(response: Observable<any>): Observable<any> {
    return response.pipe(
      map((data) => {
        // handle authentication errors
        if (data.success === false) {
          console.error(data);
          if (data.reason === 'authentication') {
            this.needsAuthentication = true;
          }
        }
        return data;
      }),
    );
  }
}
