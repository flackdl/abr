import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import SignaturePad from "signature_pad";
import {concat, forkJoin, Observable, of, Subject} from "rxjs";
import {ApiService} from "../api.service";
import {catchError, distinctUntilChanged, switchMap, tap} from "rxjs/operators";
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import * as moment from 'moment';

@Component({
  selector: 'app-estimator',
  templateUrl: './estimator.component.html',
  styleUrls: ['./estimator.component.scss']
})
export class EstimatorComponent implements OnInit {
  public isLoading = true;
  public signature: any;
  public customer: any;
  public settings: any;
  public qboPreferences: any;
  public customersLoading = false;
  public customerInput$ = new Subject<string>();
  public customers$: Observable<any[]>;
  public form: FormGroup;
  public crmOptions = [
    'Current customer walk-in',
    'New customer from referral',
    'New customer from internet',
    'New customer from yelp',
    'New customer off the street',
    'New customer from performance',
    'Craigslist/offer up',
    'SOCIAL MEDIA',
  ];

  @ViewChild("signature", {static: true}) signatureEl: ElementRef;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
  ) {
  }

  ngOnInit() {

    forkJoin(
      this.api.fetchSettings().pipe(
        tap((data) => {
          this.settings = data;
        }),
        catchError((error) => {
          this.isLoading = false;
          return of(error);
        }),
      ),
      this.api.fetchQBOPreferences().pipe(
        tap((data) => {
          this.qboPreferences = data;
        }),
        catchError((error) => {
          this.isLoading = false;
          return of(error);
        })
      ),
    ).subscribe((data) => {
      this.isLoading = false;
    });

    this.form = this.fb.group({
      status: ['', Validators.required],
      email: ['', Validators.email],
      phone: ['', Validators.pattern(/^\d{10}$/)],
      crm: ['', Validators.required],
      billingAddress: ['', Validators.required],
      estimateDate: [moment().format('YYYY-MM-DD'), Validators.required],
      expirationDate: ['', Validators.required],
      expirationTime: ['', Validators.required],
      bikeModel: ['', Validators.required],
      tagNumber: ['', Validators.required],
    });

    this.signature = new SignaturePad(this.signatureEl.nativeElement);

    // customer search
    this.customers$ = concat(
      of([]), // default items
      this.customerInput$.pipe(
        distinctUntilChanged(),
        tap(() => this.customersLoading = true),
        switchMap((term) => (term ? this.api.fetchCustomers({'last_name': term}) : of([])).pipe(
          catchError(() => of([])), // empty list on error
          tap(() => this.customersLoading = false)
        ))
      )
    );
  }

  public customerSelected() {
    if (this.customer.BillAddr) {
      const billingAddress = [
        this.customer.BillAddr.Line1,
        [this.customer.BillAddr.City, this.customer.BillAddr.CountrySubDivisionCode, this.customer.BillAddr.PostalCode].join(', ')
      ].join("\n");
      this.form.get('billingAddress').setValue(billingAddress);
    }
    if (this.customer.PrimaryEmailAddr) {
      this.form.get('email').setValue(this.customer.PrimaryEmailAddr.Address);
    }
    if (this.customer.PrimaryPhone) {
      this.form.get('phone').setValue(this.customer.PrimaryPhone.FreeFormNumber.replace(/[^0-9]/g, ''))
    }
  }

  public createEstimate() {

    // mark all controls as dirty to force validation
    Object.keys(this.form.controls).forEach(field => {
      this.form.get(field).markAsDirty();
    });

    if (this.form.valid) {
      const data = {
        customer_id: this.customer.Id,
        status: this.form.get('status').value,
        tag_number: this.form.get('tagNumber').value,
        bike_model: this.form.get('bikeModel').value,
        crm: this.form.get('crm').value,
        estimate_date: this.form.get('estimateDate').value,
        expiration_date: this.form.get('expirationDate').value,
        expiration_time: this.form.get('expirationTime').value,
      };
      this.api.createEstimate(data).subscribe((data) => {
        console.log(data);
      });
    }
  }
}
