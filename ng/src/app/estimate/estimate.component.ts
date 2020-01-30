import {Router} from "@angular/router";
import {WizardStepsService} from "../wizard-steps.service";
import { ToastrService } from 'ngx-toastr';
import {Component, OnInit} from '@angular/core';
import {ApiService} from "../api.service";
import {FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {forkJoin, zip} from "rxjs";
import {map} from "rxjs/operators";
import * as _ from 'lodash';
import {CategoryItem, EstimateItem, Item} from "../estimate-data";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {ItemSelectModalComponent} from "../item-select-modal/item-select-modal.component";
import {NgbModalRef} from "@ng-bootstrap/ng-bootstrap/modal/modal-ref";

const CATEGORY_UNASSIGNED = 'Unassigned';


@Component({
  selector: 'app-estimator',
  templateUrl: './estimate.component.html',
  styleUrls: ['./estimate.component.scss']
})
export class EstimateComponent implements OnInit {
  public isLoading = false;
  public form: FormGroup;
  public inventoryResults: Item[] = [];
  public serviceResults: Item[] = [];
  public modalRef: NgbModalRef;

  constructor(
    private router: Router,
    private api: ApiService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private modalService: NgbModal,
    public wizardSteps: WizardStepsService,
  ) {
  }

  ngOnInit() {

    // build form
    this.buildForm();

    // watch for quantity changes
    this.form.valueChanges.subscribe(
      (data: any) => {
        this.api.estimateData.discount_percent = data.discountPercent;
        this.api.estimateData.discount_applied_to_all = data.discountAppliedAll;
        _.forEach(data.categories, (catControls: any, catName: string) => {
          this.api.estimateData.category_items.forEach((catItem: CategoryItem) => {
            if (catItem.name === catName) {
              catItem.items.forEach((item, i: number) => {
                item.quantity = catControls.quantities[i];
                item.price = catControls.prices[i];
                item.description = catControls.descriptions[i];
                item.amount = item.price * item.quantity;
              })
            }
          });
        });
        this.api.updateEstimateData();
      }
    );
  }

  public categoryChildren(category: any) {
    return this.api.categoriesChildren.filter((child) => {
      return child.parent === category.id;
    });
  }

  public categorySelected(category: any) {

    // reset
    this.isLoading = true;
    this.inventoryResults = [];
    this.serviceResults = [];

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

    if (inventoryQueries.concat(serviceQueries).length > 0) {
      const forkJoins = [];

      if (inventoryQueries.length > 0) {
        forkJoins.push(
          forkJoin(inventoryQueries).pipe(
            map((data: any[]) => {
              this.inventoryResults = [].concat(...data);  // flatten
              return this.inventoryResults;
            }),
          ),
        )
      }
      if (serviceQueries.length > 0) {
        forkJoins.push(
          forkJoin(serviceQueries).pipe(
            map((data: any[]) => {
              this.serviceResults = [].concat(...data);  // flatten
              return this.serviceResults;
            }),
          )
        );
      }

      zip(...forkJoins).subscribe(
        () => {
          this.isLoading = false;
          this.openItemsModal(category.name, category);
        },
        (error) => {
          console.error(error);
          this.toastr.error('An unknown error occurred');
        }
      );
    } else {
      this.isLoading = false;
      this.toastr.warning(`No associated items for ${category.name} category`);
    }
  }

  public buildForm() {

    // build form
    this.form = this.fb.group({
      'categories': this.fb.group({}),
      'customSearch': new FormControl(''),
      'discountPercent': new FormControl(this.api.estimateData.discount_percent, Validators.pattern('[0-9.]+')),
      'discountAppliedAll': new FormControl(!!this.api.estimateData.discount_applied_to_all),
    });

    // mark as touched to avoid the strange error: ExpressionChangedAfterItHasBeenCheckedError
    // https://github.com/angular/angular/issues/23657
    this.form.get('customSearch').markAsTouched();

    // also include an "unassigned" category group for things that were manually searched for
    const categories = this.api.categories.concat({name: CATEGORY_UNASSIGNED});

    categories.forEach((category: any) => {

      // add controls
      const itemQuantitiesControl = new FormArray([]);
      const itemPricesControl = new FormArray([]);
      const itemDescriptionsControl = new FormArray([]);
      const categoryControl = this.fb.group({
        'quantities': itemQuantitiesControl,
        'prices': itemPricesControl,
        'descriptions': itemDescriptionsControl,
      });
      (this.form.get('categories') as FormGroup).addControl(category.name, categoryControl);

      this.api.estimateData.category_items.forEach((catItem: CategoryItem) => {
        if (catItem.name === category.name) {
          // add category item controls
          catItem.items.forEach((item) => {
            itemQuantitiesControl.push(new FormControl(item.quantity));
            itemPricesControl.push(new FormControl(item.price));
            itemDescriptionsControl.push(new FormControl(item.description));
          });
        }
      });
    });
  }

  public removeItem(item: EstimateItem, catName: string, itemIndex: number) {
    // remove the item from the category
    this.api.estimateData.category_items.forEach((catItem) => {
      if (catItem.name === catName) {
        catItem.items.splice(itemIndex, 1);
      }
    });

    // sort and save to local storage
    this._sortCategoryItems();
    this.api.updateEstimateData();

    // remove controls
    const categoriesControlGroup = this.form.get('categories') as FormGroup;
    const catControlGroup = categoriesControlGroup.get(catName) as FormGroup;
    const quantitiesControl = catControlGroup.get('quantities') as FormArray;
    const pricesControl = catControlGroup.get('prices') as FormArray;
    const descriptionsControl = catControlGroup.get('descriptions') as FormArray;
    quantitiesControl.removeAt(itemIndex);
    pricesControl.removeAt(itemIndex);
    descriptionsControl.removeAt(itemIndex);
  }

  public openItemsModal(title: string, category?: any) {

    // unsubscribe any existing subscriptions
    if (this.modalRef && this.modalRef.componentInstance) {
      const component = this.modalRef.componentInstance;
      component.addItemChange.unsubscribe();
      component.removeItemChange.unsubscribe();
    }

    this.modalRef = this.modalService.open(ItemSelectModalComponent, {size: 'xl'});

    // inputs
    this.modalRef.componentInstance.title = title;
    this.modalRef.componentInstance.category = category;
    this.modalRef.componentInstance.inventoryResults = this.inventoryResults;
    this.modalRef.componentInstance.serviceResults = this.serviceResults;

    // outputs
    this.modalRef.componentInstance.removeItemChange.subscribe(
      (data) => {
        this.itemRemoved(data);
      }
    );
    this.modalRef.componentInstance.addItemChange.subscribe(
      (data) => {
        this.itemAdded(data);
      }
    );

    // modal closed
    this.modalRef.result
      .finally(() => {
        this.modalService.dismissAll();
        window.scrollTo(0, 0);
      });
  }

  public submitCustomSearch() {
    this.isLoading = true;
    const searchValue = this.form.get('customSearch').value;
    const queries = [
      this.api.fetchService({search: searchValue}).pipe(
        map((data) => {
          this.serviceResults = data;
          return this.serviceResults;
        })
      ),
      this.api.fetchInventory({search: searchValue}).pipe(
        map((data) => {
          this.inventoryResults = data;
          return this.inventoryResults;
        })
      ),
    ];
    zip(...queries).pipe().subscribe(
      (data) => {
        this.isLoading = false;
        this.openItemsModal(searchValue);
      },
      (error) => {
        this.isLoading = false;
        this.toastr.error('An unknown error occurred');
      });
  }

  public itemAdded(data) {
    const item: Item = data.item;
    let catName: string;
    if (data.category) {
      catName = this.getParentCategoryForCategory(data.category).name;
    } else {
      catName = this.getParentCategoryNameForCategory(data.title) || CATEGORY_UNASSIGNED;
    }

    const categoriesControlGroup = this.form.get('categories') as FormGroup;
    const catControlGroup = categoriesControlGroup.get(catName) as FormGroup;
    const quantitiesControl = catControlGroup.get('quantities') as FormArray;
    const pricesControl = catControlGroup.get('prices') as FormArray;
    const descriptionsControl = catControlGroup.get('descriptions') as FormArray;

    // add new form controls to category
    quantitiesControl.push(new FormControl(1));
    pricesControl.push(new FormControl(item.price));
    descriptionsControl.push(new FormControl(item.description));

    // add to category items
    const category = this.api.estimateData.category_items.find((catItem) => {
      return catItem.name === catName;
    });

    const estimateItem: EstimateItem = {
      id: item.id,
      name: item.name,
      full_name: item.full_name,
      type: item.type.toLowerCase(),
      price: item.price,
      amount: item.price,  // same as price since it defaults to single quantity
      description: item.description,
      quantity: 1,
    };

    if (category) {
      category.items.push(estimateItem);
    } else {
      this.api.estimateData.category_items.push({
        name: catName,
        items: [estimateItem],
      });
      this._sortCategoryItems();
    }
    // save estimate to local storage
    this.api.updateEstimateData();
  }

  public itemRemoved(data: any) {
    let catName: string;
    if (data.category) {
      catName = this.getParentCategoryForCategory(data.category).name;
    } else {
      catName = this.getParentCategoryNameForCategory(data.title) || CATEGORY_UNASSIGNED;
    }
    const matchingCatIndex = this.api.estimateData.category_items.findIndex((catItem) => {
      return catItem.name === catName;
    });
    if (matchingCatIndex !== -1) {
      const matchingIndex = this.api.estimateData.category_items[matchingCatIndex].items.findIndex((item) => {
        return data.item.id === item.id;
      });
      if (matchingIndex !== -1) {
        this.removeItem(data.item, catName, matchingIndex);
      }
    }
  }

  public getParentCategoryForCategory(category: any) {
    // return parent category this is a child category
    if (category.parent) {
      category = this.api.categories.find((cat) => {
        return cat.id === category.parent;
      })
    }
    return category;
  }

  public getParentCategoryNameForCategory(name: string) {
    let category = this.api.categories.concat(this.api.categoriesChildren).find((cat) => {
      return cat.name === name;
    });

    // return parent category this is a child category
    if (category && category.parent) {
      category = this.api.categories.find((cat) => {
        return cat.id === category.parent;
      })
    }
    return category ? category.name : null;
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

  protected _sortCategoryItems() {
    // sort category items in same order as main categories
    const sortedCategoryItems: CategoryItem[] = [];
    // capture any unassigned category items that were manually searched for
    let unassignedCategoryItems: CategoryItem = this.api.estimateData.category_items.find((catItem) => {
      return catItem.name === CATEGORY_UNASSIGNED;
    });
    this.api.categories.forEach((cat) => {
      const catItemsMatch = this.api.estimateData.category_items.find((catItem: CategoryItem) => {
        return catItem.name === cat.name && catItem.items.length > 0;
      });
      if (catItemsMatch) {
        sortedCategoryItems.push(catItemsMatch);
      }
    });
    this.api.estimateData.category_items = sortedCategoryItems;
    // include any "Unassigned" items
    if (unassignedCategoryItems) {
      this.api.estimateData.category_items.push(unassignedCategoryItems);
    }
  }
}
