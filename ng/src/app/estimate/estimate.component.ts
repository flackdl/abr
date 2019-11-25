import { ToastrService } from 'ngx-toastr';
import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from "../api.service";
import {FormArray, FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {forkJoin} from "rxjs";
import {map, tap} from "rxjs/operators";
import {NgSelectComponent} from "@ng-select/ng-select";

@Component({
  selector: 'app-estimator',
  templateUrl: './estimate.component.html',
  styleUrls: ['./estimate.component.scss']
})
export class EstimateComponent implements OnInit {
  public isLoading = false;
  public isItemsLoading = false;
  public form: FormGroup;
  public selectedItems: any[];
  public inventoryResults: any[] = [];

  @ViewChild("inventorySelect", {static: true}) inventorySelect: NgSelectComponent;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private toastr: ToastrService,
  ) {
  }

  ngOnInit() {

    // build form
    this.form = this.fb.group({
      'quantities': new FormArray([]),
    });

    // load existing data from storage
    this.buildFormFromExistingEstimate();

    // watch for changes
    this.form.controls['quantities'].valueChanges.subscribe(
      (values: any[]) => {
        values.forEach((value, i) => {
          const item = this.api.estimateData.items[i];
          if (item) {
            item.quantity = value;
            item.amount = item.price * item.quantity;
          }
        });
        this.api.updateEstimateData();
      }
    )
  }

  public categorySelected(category: any) {

    // reset
    this.isItemsLoading = true;
    this.selectedItems = [];

    // query inventory with matching sku's for this category
    const queries = this.api.serviceCategoryPrefixes.filter((prefix) => {
      return prefix.category === category.id;
    }).map((catPrefix) => {
      return this.api.fetchInventory({sku: catPrefix.prefix});
    });

    forkJoin(queries).pipe(
      map((data: any[]) => {
        this.inventoryResults = [].concat(...data);
        return this.inventoryResults;
      }),
      tap(() => {
        this.isItemsLoading = false;
        this.inventorySelect.open();
      }),
    ).subscribe(
      (data) => {
      }, (error) => {
        this.toastr.error('An unknown error occurred');
      }
    )
  }

  public buildFormFromExistingEstimate() {
    if (this.api.estimateData.items) {
      this.api.estimateData.items.forEach((item) => {
        (this.form.controls['quantities'] as FormArray).push(new FormControl(1));
      });
    }
  }

  public inventoryAdded(item: any) {
    (this.form.controls['quantities'] as FormArray).push(new FormControl(1));
    if (!this.api.estimateData.items) {
      this.api.estimateData.items = [];
    }
    this.api.estimateData.items.push({
      id: item.Id,
      name: item.Name,
      full_name: item.FullyQualifiedName,
      quantity: 1,
      price: item.UnitPrice,
      amount: item.UnitPrice * 1,
      description: item.Description,
    });
    this.api.updateEstimateData();
  }

  public removeItem(i: number) {
    (this.form.get('quantities') as FormArray).removeAt(i);
    this.api.estimateData.items.splice(i, 1);
    this.api.updateEstimateData();
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
