import {ApiService} from "../api.service";
import { Component, OnInit } from '@angular/core';
import {concat, Observable, of, Subject} from "rxjs";
import {catchError, distinctUntilChanged, switchMap, tap} from "rxjs/operators";
import {ToastrService} from "ngx-toastr";

@Component({
  selector: 'app-customer',
  templateUrl: './customer-search.component.html',
  styleUrls: ['./customer-search.component.scss']
})
export class CustomerSearchComponent implements OnInit {
  public customer: any;
  public customersLoading = false;
  public customerInput$ = new Subject<string>();
  public customers$: Observable<any[]>;
  public needsNewCustomer = false;
  public invoices: any[];
  public isLoading = false;

  constructor(
    private api: ApiService,
    private toastr: ToastrService,
  ) { }

  ngOnInit() {

    this.api.estimateData$.subscribe(
      (data) => {
        // data was wiped so reset everything
        if (!data) {
          this.reset();
        }
      }
    );

    // customer-search search
    this.customers$ = concat(
      of([]), // default items
      this.customerInput$.pipe(
        distinctUntilChanged(),
        tap((data) => {
          this.customersLoading = true;
          this.reset();
        }),
        switchMap((term) => {
          let observable: Observable<any[]>;
          if (term) {
            observable = this.api.fetchCustomers({'last_name': term}).pipe(
              tap((data) => {
                // prompt to add a new customer if there aren't any matching results
                if (!data.length) {
                  this.needsNewCustomer = true;
                }
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

  public reset() {
    // reset a few things
    delete this.customer;
    this.invoices = null;
  }

  public customerSelected() {
    if (this.customer) {
      this.needsNewCustomer = false;
      this.isLoading = true;
      this.api.fetchInvoices({customer_id: this.customer.Id}).subscribe(
        (data) => {
          this.invoices = data;
          this.isLoading = false;
          this.api.updateEstimateData({
            customer_id: this.customer.Id,
            first_name: this.customer.GivenName,
            last_name: this.customer.FamilyName,
          });
        },
        (error) => {
          this.toastr.error('An unknown error occurred');
        }
      );
    } else {
      this.invoices = null;
    }
  }
}