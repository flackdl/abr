import { Subject } from 'rxjs';
import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from "@angular/common/http";
import {catchError, map, tap} from "rxjs/operators";
import * as _ from 'lodash';
import {forkJoin, Observable, of} from "rxjs";
import {FormGroup} from "@angular/forms";
import {LocalStorageService} from 'ngx-webstorage';
import {EstimateData, EstimateItem, Item} from "./estimate-data";

import * as moment from 'moment';


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

  public OPTION_PAYMENT_NOT_PAID = 'Not Paid';
  public OPTION_PAYMENT_PAID = 'Paid';
  public OPTION_PAYMENT_HALF_NOW = 'Half Now';
  public OPTION_PAYMENT_DEPOSIT = 'Deposit';

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
    return Boolean(
      this.estimateData.customer_id &&
      this.estimateData.first_name &&
      this.estimateData.last_name &&
      this.estimateData.email &&
      this.estimateData.phone &&
      this.estimateData.zip
    );
  }

  public hasMainConcern(): boolean {
    return Boolean(this.estimateData.main_concern);
  }

  public hasEstimate(): boolean {
    return Boolean(this.estimateData.category_items && this.estimateData.category_items.length > 0);
  }

  public hasEstimateWrapUp(): boolean {
    return Boolean(
      this.estimateData.expiration_date &&
      this.estimateData.expiration_time &&
      this.estimateData.employee_initials &&
      this.estimateData.signature &&
      this.estimateData.contact_method &&
      this.estimateData.payment_option &&
      this.estimateData.status &&
      this.estimateData.waiting_on_approval !== undefined &&
      this.estimateData.need_parts !== undefined
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

  public itemHasTax(item: EstimateItem): boolean {
    return item.type === 'inventory';
  }

  public getTotal(): number {
    let tax = this.getTax();
    let serviceSubTotal = this.getServiceSubTotal();
    let inventorySubTotal = this.getInventorySubTotal();

    if (this.estimateData.discount_percent) {
      inventorySubTotal = inventorySubTotal - inventorySubTotal * this.estimateData.discount_percent / 100;
      if (this.estimateData.discount_applied_to_all) {
        serviceSubTotal = serviceSubTotal - serviceSubTotal * this.estimateData.discount_percent / 100;
      }
    }

    return serviceSubTotal + inventorySubTotal + tax;
  }

  public getServiceSubTotal() {
    return this.getSubTotalForItems(this.getServiceItems());
  }

  public getInventorySubTotal() {
    return this.getSubTotalForItems(this.getInventoryItems());
  }

  public getTax(): number {
    return _.sum(this.getInventoryItems().map((item) => {
      return this.getItemTax(item);
    }));
  }

  public getItemTax(item: any) {
    return item.amount * .0775;
  }

  public getInventoryItems() {
    return this.getItems().filter((item) => {
      return item.type === 'inventory';
    })
  }

  public getServiceItems() {
    return this.getItems().filter((item) => {
      return item.type === 'service';
    })
  }

  public getItems() {
    // returns a flattened item list (no categories)
    const items = [];
    this.estimateData.category_items.forEach((catItem) => {
      catItem.items.forEach((item) => {
        items.push(item);
      });
    });
    return items;
  }

  public hasEstimateNotes(): boolean {
    return true;
  }

  public hasStatementNotes(): boolean {
    return true;
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
    let notes = [
      // main concern
      `Main Concern: ${this.estimateData.main_concern}`,
    ];
    // additional notes
    if (this.estimateData.public_notes) {
      notes.push(`Extra Notes: ${this.estimateData.public_notes}`);
    }
    return notes.join('\n');

  }

  public getPrivateNotes(): string {
    let notes = [];

    // payment
    if (this.estimateData.payment_option === this.OPTION_PAYMENT_PAID) {
      notes.push('$');
    } else if (this.estimateData.payment_option === this.OPTION_PAYMENT_NOT_PAID) {
      notes.push('* NOT PAID *');
    } else if (this.estimateData.payment_option === this.OPTION_PAYMENT_HALF_NOW) {
      notes.push('* PAID HALF *');
    } else if (this.estimateData.payment_option === this.OPTION_PAYMENT_DEPOSIT) {
      notes.push('* DEPOSIT *');
    }

    // waiting on customer approval
    if (this.estimateData.waiting_on_approval) {
      notes.push('Waiting for customer approval');
    }

    // waiting on customer to bring parts
    if (this.estimateData.waiting_on_customer_bring_parts) {
      notes.push('We are waiting for the customer to bring in parts');
    }

    // need to order parts
    if (this.estimateData.need_parts) {
      notes.push('Need to order parts');
      // need to add to inventory
      if (!this.estimateData.parts_in_inventory) {
        notes.push('Parts not in inventory')
      }
    }

    // contact method
    notes.push(`Contact Method: ${this.estimateData.contact_method}`);

    // initials
    notes.push(this.estimateData.employee_initials);

    // timestamp
    notes.push(moment().format('YYYY-MM-DD HH:mm'));

    // additional private notes
    if (this.estimateData.private_notes) {
      notes.push(`Extra Notes: ${this.estimateData.private_notes}`);
    }

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

  public fetchInventory(params?: any): Observable<Item[]> {
    return this._fetchItems('Inventory', params);
  }

  public fetchService(params?: any): Observable<Item[]> {
    return this._fetchItems('Service', params);
  }

  protected _fetchItems(type: string, params?: any): Observable<Item[]> {
    const httpParams = new HttpParams({fromObject: params});
    const url = type === 'Service' ? this.API_QBO_SERVICE : this.API_QBO_INVENTORY;
    return this._responseProxy(
      this.http.get(url, {params: httpParams, headers: this._getHttpHeaders()})
    ).pipe(
        map((items: any[]) => {
          if (items.length) {
            return items.map((item) => {
              return {
                id: item.Id,
                name: item.Name,
                full_name: item.FullyQualifiedName,
                price: item.UnitPrice,
                type: item.Type.toLowerCase(), // inventory|service
                description: item.Description,
                sku: item.Sku,
                quantity_on_hand: item.QtyOnHand,
              }
            });
          } else {
            return [];
          }
        })
      );
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

  public createCustomer(data: any): Observable<any> {
    return this._responseProxy(this.http.post(this.API_QBO_CUSTOMER, data));
  }

  public createEstimate(data: EstimateData, keepEstimateDataOnSuccess?: boolean): Observable<any> {
    // generate estimate & statement notes (public, private)
    let postData = Object.assign({}, data);  // make a copy so we don't overwrite
    postData['public_notes'] = this.getPublicNotes();
    postData['private_notes'] = this.getPrivateNotes();

    return this._responseProxy(this.http.post(this.API_QBO_ESTIMATE, postData)).pipe(
      tap((data) => {
        if (!keepEstimateDataOnSuccess) {
          // clear estimate from local storage
          this.clearEstimateData();
        }
      })
    );
  }

  public updateCustomer(id: number, data: any) : Observable<any> {
    return this._responseProxy(this.http.put(`${this.API_QBO_CUSTOMER}${id}/`, data));
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

  protected _getHttpHeaders() {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain',
    })
  }
}
