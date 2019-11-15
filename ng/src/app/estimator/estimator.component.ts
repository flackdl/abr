import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import SignaturePad from "signature_pad";
import {concat, Observable, of, Subject} from "rxjs";
import {ApiService} from "../api.service";
import {catchError, distinctUntilChanged, map, switchMap, tap} from "rxjs/operators";
import {FormBuilder, FormGroup, Validators} from '@angular/forms';

@Component({
  selector: 'app-estimator',
  templateUrl: './estimator.component.html',
  styleUrls: ['./estimator.component.scss']
})
export class EstimatorComponent implements OnInit {
  public signature: any;
  public customer: any;
  public customersLoading = false;
  public customerInput$ = new Subject<string>();
  public customers$: Observable<any[]>;
  public form: FormGroup;

  @ViewChild("signature", {static: true}) signatureEl: ElementRef;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
  ) {
  }

  ngOnInit() {

    this.form = this.fb.group({
      status: ['', Validators.required],
      email: ['', Validators.email],
      phone: ['', Validators.pattern(/^\d{10}$/)],
      crm: ['', Validators.required],
      billing_address: ['', Validators.required],
      estimate_number: ['', Validators.required],
      estimate_date: ['', Validators.required],
      expiration_date: ['', Validators.required],
      expiration_time: ['', Validators.required],
      bike_model: ['', Validators.required],
      tag_number: ['', Validators.required],
    });

    console.log(this.form);

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
    console.log(this.customer);
  }
}
