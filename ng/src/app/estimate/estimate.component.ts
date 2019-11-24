import { ToastrService } from 'ngx-toastr';
import {Component, OnInit} from '@angular/core';
import {ApiService} from "../api.service";
import {FormBuilder, FormGroup} from '@angular/forms';
import {forkJoin, Observable} from "rxjs";
import {map} from "rxjs/operators";

@Component({
  selector: 'app-estimator',
  templateUrl: './estimate.component.html',
  styleUrls: ['./estimate.component.scss']
})
export class EstimateComponent implements OnInit {
  public isLoading = false;
  public form: FormGroup;
  public chosenInventory: any[];
  public inventory$: Observable<any[]>;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private toastr: ToastrService,
  ) {
  }

  ngOnInit() {
    this.form = this.fb.group({
    });
  }

  public categorySelected(category: any) {
    const queries = this.api.serviceCategoryPrefixes.filter((prefix) => {
      return prefix.category === category.id;
    }).map((catPrefix) => {
      return this.api.fetchInventory({sku: catPrefix.prefix});
    });

    // TODO - remove duplicates

    this.inventory$ = forkJoin(queries).pipe(
      map((data: any[]) => [].concat(...data))
    );
  }

  public createEstimate() {
    // mark all controls as dirty to force validation
    this.api.markFormDirty(this.form);

    /*
    if (this.form.valid) {
      this.api.createEstimate(this.form.value).subscribe((data) => {
        // TODO
        console.log(data);
      }, (error) => {
        this.toastr.error('An unknown error occurred');
      });
    } else {
      this.toastr.error('Invalid form');
    }
     */
  }
}
