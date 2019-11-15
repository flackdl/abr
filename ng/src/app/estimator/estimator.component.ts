import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import SignaturePad from "signature_pad";
import {concat, Observable, of, Subject} from "rxjs";
import {ApiService} from "../api.service";
import {catchError, distinctUntilChanged, switchMap, tap} from "rxjs/operators";

@Component({
  selector: 'app-estimator',
  templateUrl: './estimator.component.html',
  styleUrls: ['./estimator.component.scss']
})
export class EstimatorComponent implements OnInit {
  public signature: any;
  public customer: any;
  public customerLoading = false;
  public customerInput$ = new Subject<string>();
  public customers$: Observable<any[]>;

  @ViewChild("signature", {static: true}) signatureEl: ElementRef;

  constructor(
    private api: ApiService,
  ) {
  }

  ngOnInit() {
    this.signature = new SignaturePad(this.signatureEl.nativeElement);
    this.customers$ = concat(
      of([]), // default items
      this.customerInput$.pipe(
        distinctUntilChanged(),
        tap(() => this.customerLoading = true),
        switchMap((term) => (term ? this.api.fetchCustomers({'last_name': term}) : of([])).pipe(
          catchError(() => of([])), // empty list on error
          tap(() => this.customerLoading = false)
        ))
      )
    );
  }
}
