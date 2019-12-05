import {Router} from "@angular/router";
import {WizardStepsService} from "../wizard-steps.service";
import { ToastrService } from 'ngx-toastr';
import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from "../api.service";
import {FormArray, FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {forkJoin, merge} from "rxjs";
import {map, tap} from "rxjs/operators";
import {NgSelectComponent} from "@ng-select/ng-select";
import * as _ from 'lodash';
import {EstimateItem, Item} from "../estimate-data";

type CategoryItem = {
  name: string,
  items: EstimateItem[],
  subtotal: number,
};



@Component({
  selector: 'app-estimator',
  templateUrl: './estimate.component.html',
  styleUrls: ['./estimate.component.scss']
})
export class EstimateComponent implements OnInit {
  public isLoading = false;
  public isItemsLoading = false;
  public form: FormGroup;
  public selectedInventoryItems: any[] = [];
  public selectedServiceItems: any[] = [];
  public inventoryResults: Item[] = [];
  public serviceResults: Item[] = [];
  public selectedCategory: string;

  @ViewChild("inventorySelect", {static: true}) inventorySelect: NgSelectComponent;
  @ViewChild("serviceSelect", {static: true}) serviceSelect: NgSelectComponent;

  constructor(
    private router: Router,
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

    // watch for quantity changes
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

    // query inventory and services with matching prefixes for this category and, if a child, it's parent category too
    this.api.categoryPrefixes.filter((prefix) => {

      if (prefix.category === category.id) {
        return true;
      }

      // child category
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
    this.api.estimateData.items.forEach((item: EstimateItem) => {
      if (item.type === 'Service') {
        this.selectedServiceItems.push(item);
      } else {
        this.selectedInventoryItems.push(item);
      }
      (this.form.controls['quantities'] as FormArray).push(new FormControl(item.quantity));
    });
  }

  public getCategoryNameForItemName(name: string) {
    let category;
    const prefixMatch = this.api.categoryPrefixes.find((prefix) => {
      return name.toLowerCase().startsWith(prefix.prefix.toLowerCase());
    });
    if (prefixMatch) {
      category = this.api.categories.concat(this.api.categoriesChildren).find((cat) => {
        return cat.id === prefixMatch.category;
      });
    }

    // return parent category this is a child category
    if (category.parent) {
      category = this.api.categories.find((cat) => {
        return cat.id === category.parent;
      })
    }
    return category ? category.name : null;
  }

  public getItemsGroupedByCategory(): CategoryItem[] {
    const categoryItems: CategoryItem[] = [];
    const groups = _.groupBy(this.api.estimateData.items, (item) => {
      return this.getCategoryNameForItemName(item.name);
    });
    _.forEach(groups, (items, categoryName) => {
      categoryItems.push({
        name: categoryName,
        items: items,
        subtotal: this.api.getSubTotalForItems(items),
      });
    });
    return categoryItems;
  }

  public itemAdded(item: any) {
    // add new form control
    (this.form.controls['quantities'] as FormArray).push(new FormControl(1));
    // add to estimate items
    this.api.estimateData.items.push(item);
    // save estimate to local storage
    this.api.updateEstimateData();
  }

  public itemRemoved(event: any) {
    // the "item" is in event.value
    const matchingIndex = this.api.estimateData.items.findIndex((it) => {
      return it.id === event.value.id;
    });
    if (matchingIndex !== -1) {
      this.api.estimateData.items.splice(matchingIndex, 1);
      this.api.updateEstimateData();
    }
  }

  public removeItem(item: Item, i: number) {
    console.log('removing', item, i);
    (this.form.get('quantities') as FormArray).removeAt(i);
    const matchingIndex = this.selectedInventoryItems.findIndex((it) => {
      return item.id === it.id;
    });
    // TODO - handle "Service"
    if (matchingIndex !== -1) {
      this.selectedInventoryItems.splice(matchingIndex, 1);
      // this method is necessary for change detection with ng-select
      // https://github.com/ng-select/ng-select#change-detection
      this.selectedInventoryItems = [...this.selectedInventoryItems];
    }
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

    if (this.form.valid) {
      this.router.navigate([this.wizardSteps.nextStep(this)]);
    } else {
      this.toastr.error('Invalid form');
    }
  }
}
