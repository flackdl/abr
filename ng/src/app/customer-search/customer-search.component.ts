import {ApiService} from "../api.service";
import { Component, OnInit } from '@angular/core';
import {concat, Observable, of, Subject} from "rxjs";
import {catchError, distinctUntilChanged, switchMap, tap} from "rxjs/operators";
import {ToastrService} from "ngx-toastr";
import {WizardStepsService} from "../wizard-steps.service";

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
  public isLoading = false;
  public customerInputValue: string;

  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    public wizardSteps: WizardStepsService,
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

    // update current search value which helps to send along to "create a new customer" page when customer isn't found
    this.customerInput$.subscribe((data) => {
      if (data) {
        this.customerInputValue = data;
      }
    });

    // customer search
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
            observable = this.api.fetchCustomers({'name': term}).pipe(
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
    this.api.estimateData.invoices = null;
  }

  public customerSelected() {
    if (this.customer) {
      this.needsNewCustomer = false;
      this.isLoading = true;
      this.api.updateEstimateData({
        customer_id: this.customer.Id,
        first_name: this.customer.GivenName,
        last_name: this.customer.FamilyName,
        email: this.customer.PrimaryEmailAddr ? this.customer.PrimaryEmailAddr.Address : '',
        phone: this._getFirstPhoneNumberFromQBOCustomer(),
        zip: this.customer.BillAddr ? this.customer.BillAddr.PostalCode : '',
        crm: this.customer.ResaleNum,
      });
      this.api.fetchInvoices({customer_id: this.customer.Id}).subscribe(
        (invoices: any[]) => {
          this.api.estimateData.invoices = invoices.map((invoice) => {
            const bikeModelField = invoice.CustomField.find((field) => {
              return field.Name === 'Bike/Model';
            });
            return {
              id: invoice.DocNumber,
              date: invoice.TxnDate,
              public_notes: invoice.CustomerMemo ? invoice.CustomerMemo.value : '',
              private_notes: invoice.PrivateNote,
              bike_model: bikeModelField ? bikeModelField.StringValue : '',
              items: invoice.Line.filter((item: any) => {
                return item.SalesItemLineDetail;
              }).map((item: any) => {
                return {
                  id: item.Id,
                  name: item.SalesItemLineDetail.ItemRef.name,
                };
              }),
            }
          });
          this.api.updateEstimateData();
          this.isLoading = false;
        },
        (error) => {
          this.toastr.error('An unknown error occurred');
        }
      );
    } else {
      this.api.estimateData.invoices = null;
    }
  }

  protected _getFirstPhoneNumberFromQBOCustomer() {
    if (this.customer.PrimaryPhone) {
      return this.customer.PrimaryPhone.FreeFormNumber;
    } else if (this.customer.Mobile) {
      return this.customer.Mobile.FreeFormNumber;
    } else if (this.customer.AlternatePhone) {
      return this.customer.AlternatePhone.FreeFormNumber;
    }
    return '';
  }
}
