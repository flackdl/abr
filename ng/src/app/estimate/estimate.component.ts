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
import {CategoryItem, EstimateItem, Item} from "../estimate-data";


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
    this.buildForm();

    // watch for quantity changes
    this.form.valueChanges.subscribe(
      (data: any) => {
        _.forEach(data.categories, (quantities: number[], catName: string) => {
          this.api.estimateData.category_items.forEach((catItem: CategoryItem) => {
            if (catItem.name === catName) {
              catItem.items.forEach((item, i: number) => {
                item.quantity = quantities[i];
                item.amount = item.price * item.quantity;
              })
            }
          });
        });
        this.api.updateEstimateData();
      }
    );
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
      if (catPrefix.type === 'service') {
        serviceQueries.push(this.api.fetchService({name: catPrefix.prefix}));
      } else {
        inventoryQueries.push(this.api.fetchInventory({name: catPrefix.prefix}));
      }
    });

    if (inventoryQueries.concat(serviceQueries).length >= 1) {
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

  public buildForm() {
    // build form
    this.form = this.fb.group({
      'categories': this.fb.group({}),
    });

    this.api.categories.forEach((category: any) => {

      // add quantities control
      const itemQuantitiesControl = new FormArray([]);
      (this.form.get('categories') as FormGroup).addControl(category.name, itemQuantitiesControl);

      this.api.estimateData.category_items.forEach((catItem: CategoryItem) => {
        if (catItem.name === category.name) {
          // add quantity control
          catItem.items.forEach((item) => {
            itemQuantitiesControl.push(new FormControl(item.quantity));
          });
        }
      });
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

  public itemAdded(item: Item) {
    // TODO - prevent duplicates

    const cat = this.getCategoryNameForItemName(item.name);
    // add new form control to category
    (this.form.get('categories').get(cat) as FormArray).push(new FormControl(1));
    // add to category items
    const category = this.api.estimateData.category_items.find((catItem) => {
      return catItem.name === cat;
    });
    const estimateItem: EstimateItem = {
      id: item.id,
      name: item.name,
      full_name: item.full_name,
      type: item.type,
      price: item.price,
      amount: item.price,
      description: item.description,
      quantity: 1,
    };
    if (category) {
      category.items.push(estimateItem);
    } else {
      this.api.estimateData.category_items.push({
        name: cat,
        items: [estimateItem],
      });
    }
    // save estimate to local storage
    this.api.updateEstimateData();
  }

  public itemRemoved(event: any) {
    // the "item" is in event.value
    const item = event.value;
    const cat = this.getCategoryNameForItemName(item.name);
    const matchingCatIndex = this.api.estimateData.category_items.findIndex((catItem) => {
      return catItem.name === cat;
    });
    if (matchingCatIndex !== -1) {
      const matchingIndex = this.api.estimateData.category_items[matchingCatIndex].items.findIndex((item) => {
        return item.id === item.id;
      });
      if (matchingIndex !== -1) {
        this.api.estimateData.category_items[matchingCatIndex].items.splice(matchingIndex, 1);
      }
      this.api.updateEstimateData();
    }
  }

  public removeItem(item: EstimateItem, catName: string, itemIndex: number) {
    // remove control
    ((this.form.get('categories') as FormGroup).get(catName) as FormArray).removeAt(itemIndex);

    // update selected values
    const selectedItems = item.type === 'Service' ? this.selectedServiceItems : this.selectedInventoryItems;
    const matchingIndex = selectedItems.findIndex((it) => {
      return item.id === it.id;
    });
    if (matchingIndex !== -1) {
      selectedItems.splice(matchingIndex, 1);
      // update selected items
      // reassign like this for change detection with ng-select
      // https://github.com/ng-select/ng-select#change-detection
      this.selectedInventoryItems = [...this.selectedInventoryItems];
      this.selectedServiceItems = [...this.selectedServiceItems];
    }

    // remove the item from the estimate data
    this.api.estimateData.category_items.forEach((catItem) => {
      let catItemIndex = -1;
      catItem.items.forEach((it, i) => {
        if (it.id === item.id) {
          catItemIndex = i;
        }
      });
      if (catItemIndex >= 0) {
        catItem.items.splice(catItemIndex, 1);
      }
    });

    // save to local storage
    this.api.updateEstimateData();
  }

  public hasAssessmentResultForCategory(result: string, category: any): boolean {
    // checks if there are any assessments for this category matching "result"
    // result: "good", "ok", "bad" etc
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

  public submit() {
    // mark all controls as dirty to force validation
    this.api.markFormDirty(this.form);

    if (this.form.valid) {
      this.router.navigate([this.wizardSteps.nextStep(this)]);
    } else {
      this.toastr.error('Invalid form');
    }
  }
}
