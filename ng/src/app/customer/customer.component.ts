import {ApiService} from "../api.service";
import { Component, OnInit } from '@angular/core';
import {concat, Observable, of, Subject} from "rxjs";
import {catchError, distinctUntilChanged, switchMap, tap} from "rxjs/operators";

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.scss']
})
export class CustomerComponent implements OnInit {
  public customer: any;
  public customersLoading = false;
  public customerInput$ = new Subject<string>();
  public customers$: Observable<any[]>;
  public needsNewCustomer = false;
  public invoices: any[];
  public isLoading = false;

  constructor(
    private api: ApiService,
  ) { }

  ngOnInit() {

    // customer search
    this.customers$ = concat(
      of([]), // default items
      this.customerInput$.pipe(
        distinctUntilChanged(),
        tap(() => {
          this.invoices = null;
          this.customersLoading = true;
          this.needsNewCustomer = false;
        }),
        switchMap((term) => {
          let observable: Observable<any[]>;
          if (term) {
            observable = this.api.fetchCustomers({'last_name': term}).pipe(
              tap((data) => {
                this.needsNewCustomer = data.length === 0;
              })
            );
          } else {
            observable = of([]);
          }
          return observable.pipe(
            catchError(() => of([])), // empty list on error
            tap((data) => {
              this.customersLoading = false;
            })
          )}),
      )
    );
  }

  public customerSelected() {
    if (this.customer) {
      this.isLoading = true;
      this.api.fetchInvoices({customer_id: this.customer.Id}).subscribe(
        (data) => {
          this.invoices = data;
          this.isLoading = false;
        },
        (error) => {
          // TODO
        }
      );
    } else {
      this.invoices = null;
    }
  }
}
