import { ToastrService } from 'ngx-toastr';
import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from "../api.service";
import {FormArray, FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {forkJoin, merge} from "rxjs";
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
  public selectedInventoryItems: any[];
  public selectedServiceItems: any[];
  public inventoryResults: any[] = [];
  public serviceResults: any[] = [];
  public selectedCategory: string;

  @ViewChild("inventorySelect", {static: true}) inventorySelect: NgSelectComponent;
  @ViewChild("serviceSelect", {static: true}) serviceSelect: NgSelectComponent;

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
          if (this.api.estimateData.items && this.api.estimateData.items[i]) {
            const item = this.api.estimateData.items[i];
            if (item) {
              item.quantity = value;
              item.amount = item.price * item.quantity;
            }
          }
        });
        this.api.updateEstimateData();
      }
    )
  }

  public categorySelected(category: any) {
    this.selectedCategory = category.name;

    // reset
    this.isItemsLoading = true;
    this.selectedInventoryItems = [];
    this.selectedServiceItems = [];

    const inventoryQueries = [];
    const serviceQueries = [];

    // query inventory and services with matching prefixes for this category
    this.api.categoryPrefixes.filter((prefix) => {
      return prefix.category === category.id;
    }).forEach((catPrefix) => {
      inventoryQueries.push(this.api.fetchInventory({name: catPrefix.prefix}));
      serviceQueries.push(this.api.fetchService({name: catPrefix.prefix}));
    });

    if (inventoryQueries.concat(serviceQueries).length > 1) {
      merge(
        forkJoin(inventoryQueries).pipe(
          map((data: any[]) => {
            this.inventoryResults = [].concat(...data);  // flatten
            return this.inventoryResults;
          }),
        ),
        forkJoin(serviceQueries).pipe(
          map((data: any[]) => {
            this.serviceResults = [].concat(...data);  // flatten
            return this.serviceResults;
          }),
        )
      ).pipe(
        tap(() => {
          this.isItemsLoading = false;
          this.inventorySelect.open();
          this.serviceSelect.open();
        }),
      ).subscribe(
        (data) => {
        }, (error) => {
          this.toastr.error('An unknown error occurred');
        }
      );
    } else {
      this.isItemsLoading = false;
    }
  }

  public buildFormFromExistingEstimate() {
    if (this.api.estimateData.items) {
      this.api.estimateData.items.forEach(() => {
        (this.form.controls['quantities'] as FormArray).push(new FormControl(1));
      });
    }
  }

  public itemAdded(item: any) {
    // add form control
    (this.form.controls['quantities'] as FormArray).push(new FormControl(1));
    // define items if it doesn't already exist
    if (!this.api.estimateData.items) {
      this.api.estimateData.items = [];
    }
    this.api.estimateData.items.push({
      id: item.Id,
      name: item.Name,
      full_name: item.FullyQualifiedName,
      quantity: 1,
      price: item.UnitPrice,
      type: item.Type, // Inventory|Service
      amount: item.UnitPrice * 1,
      description: item.Description,
    });
    // save estimate to local storage
    this.api.updateEstimateData();
  }

  public removeItem(i: number) {
    (this.form.get('quantities') as FormArray).removeAt(i);
    this.api.estimateData.items.splice(i, 1);
    this.api.updateEstimateData();
  }

  public hasAssessmentResultForCategory(result: string, category: any): boolean {
    const assessments = this.api.categoryAssessments.filter((assessment) => {
      if (assessment.category === category.id) {
        if (this.api.estimateData.questionnaire.qualities[assessment.name] === result) {
          return true;
        }
      }
      return false;
    });
    return assessments.length > 0;
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
