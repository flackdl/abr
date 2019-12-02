import {WizardStepsService} from "../wizard-steps.service";
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
    public wizardSteps: WizardStepsService,
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

  public getMainCategories() {
    return this.api.categories.filter((category) => {
      return !category.service_only;
    })
  }

  public getServiceOnlyCategories() {
    return this.api.categories.filter((category) => {
      return category.service_only;
    })
  }

  public categoryChildren(category: any) {
    return this.api.categoriesChildren.filter((child) => {
      return child.parent === category.id;
    });
  }

  public categorySelected(category: any) {
    this.selectedCategory = category.name;

    // reset
    this.isItemsLoading = true;
    this.selectedInventoryItems = [];
    this.selectedServiceItems = [];

    const inventoryQueries = [];
    const serviceQueries = [];

    // query inventory and services with matching prefixes for this category and, if a child, it's parent category
    this.api.categoryPrefixes.filter((prefix) => {

      if (prefix.category === category.id) {
        return true;
      }

      if (category.parent) {
        const parentCategory = this.api.categories.find((cat) => {
          return cat.id === category.parent;
        });
        return prefix.category === parentCategory.id;
      }

      return false;

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
          if (category.service_only) {
            this.serviceSelect.open();
          } else {
            this.inventorySelect.open();
          }
        }),
      ).subscribe(
        () => {},
        (error) => {
          console.error(error);
          this.toastr.error('An unknown error occurred');
        }
      );
    } else {
      this.isItemsLoading = false;
    }
  }

  public buildFormFromExistingEstimate() {
    if (this.api.estimateData.items) {
      this.api.estimateData.items.forEach((item) => {
        (this.form.controls['quantities'] as FormArray).push(new FormControl(item.quantity));
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
    // checks if there are any assessments for this category matching "result"
    // result: "good", "ok", "bad"
    const assessments = this.api.categories.filter((cat) => {
      if (cat.id === category.id) {
        if (this.api.estimateData.assessments[category.name] === result) {
          return true;
        }
      }
      return false;
    });
    return assessments.length > 0;
  }

  public isCategorySelected(category: any): boolean {

    // parent category is selected
    if (this.selectedCategory === category.name) {
      return true;
    }

    // child category is selected
    return this.api.categoriesChildren.find((child) => {
      return child.parent === category.id && child.name === this.selectedCategory;
    });
  }

  public categoryButtonClass(category: any) {
    return {
      'category-selected': this.isCategorySelected(category),
      'btn-outline-danger': this.hasAssessmentResultForCategory('bad', category),
      'btn-outline-warning': this.hasAssessmentResultForCategory('ok', category),
      'btn-outline-success': this.hasAssessmentResultForCategory('good', category),
      'btn-outline-dark': this.hasAssessmentResultForCategory('na', category),
    };
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
