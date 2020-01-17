import {Router} from "@angular/router";
import {WizardStepsService} from "../wizard-steps.service";
import { ToastrService } from 'ngx-toastr';
import {Component, OnInit} from '@angular/core';
import {ApiService} from "../api.service";
import {FormArray, FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {forkJoin, zip} from "rxjs";
import {map} from "rxjs/operators";
import * as _ from 'lodash';
import {CategoryItem, EstimateItem, Item} from "../estimate-data";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {ItemSelectModalComponent} from "../item-select-modal/item-select-modal.component";
import {NgbModalRef} from "@ng-bootstrap/ng-bootstrap/modal/modal-ref";


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
          this.openCategoryItemsModal(category);
        },
        (error) => {
          console.error(error);
          this.toastr.error('An unknown error occurred');
        }
      );
    } else {
      this.isLoading = false;
    }
  }

  public buildForm() {
    // build form
    this.form = this.fb.group({
      'categories': this.fb.group({}),
    });

    this.api.categories.forEach((category: any) => {

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
    const categoriesControlGroup = this.form.get('categories') as FormGroup;
    const catControlGroup = categoriesControlGroup.get(catName) as FormGroup;
    const quantitiesControl = catControlGroup.get('quantities') as FormArray;
    const pricesControl = catControlGroup.get('prices') as FormArray;
    const descriptionsControl = catControlGroup.get('descriptions') as FormArray;

    // remove controls
    quantitiesControl.removeAt(itemIndex);
    pricesControl.removeAt(itemIndex);
    descriptionsControl.removeAt(itemIndex);

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

    this._sortCategoryItems();

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

  public categoryButtonClass(category: any) {
    return {
      'btn-outline-danger': this.hasAssessmentResultForCategory('bad', category),
      'btn-outline-warning': this.hasAssessmentResultForCategory('ok', category),
      'btn-outline-success': this.hasAssessmentResultForCategory('good', category),
      'btn-outline-dark': this.hasAssessmentResultForCategory('na', category),
      'btn-outline-secondary': !category.show_in_assessment,
    };
  }

  public openCategoryItemsModal(category: any) {

    // unsubscribe any existing subscriptions
    if (this.modalRef && this.modalRef.componentInstance) {
      const component = this.modalRef.componentInstance;
      component.addItemChange.unsubscribe();
      component.removeItemChange.unsubscribe();
    }

    this.modalRef = this.modalService.open(ItemSelectModalComponent, {size: 'xl'});

    // inputs
    this.modalRef.componentInstance.category = category;
    this.modalRef.componentInstance.inventoryResults = this.inventoryResults;
    this.modalRef.componentInstance.serviceResults = this.serviceResults;

    // outputs
    this.modalRef.componentInstance.removeItemChange.subscribe(
      (item) => {
        this.itemRemoved(item);
      }
    );
    this.modalRef.componentInstance.addItemChange.subscribe(
      (item) => {
        this.itemAdded(item);
      }
    );

    // model closed
    this.modalRef.result
      .finally(() => {
        this.modalService.dismissAll();
        window.scrollTo(0, 0);
      });
  }

  public itemAdded(item: Item) {

    const catName = this.getCategoryNameForItemName(item.name);
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

  protected _sortCategoryItems() {
    // sort category items in same order as main categories
    const sortedCategoryItems: CategoryItem[] = [];
    this.api.categories.forEach((cat) => {
      const catItemsMatch = this.api.estimateData.category_items.find((catItem: CategoryItem) => {
        return catItem.name === cat.name && catItem.items.length > 0;
      });
      if (catItemsMatch) {
        sortedCategoryItems.push(catItemsMatch);
      }
    });
    this.api.estimateData.category_items = sortedCategoryItems;
  }

  public itemRemoved(item: any) {
    const catName = this.getCategoryNameForItemName(item.name);
    const matchingCatIndex = this.api.estimateData.category_items.findIndex((catItem) => {
      return catItem.name === catName;
    });
    if (matchingCatIndex !== -1) {
      const matchingIndex = this.api.estimateData.category_items[matchingCatIndex].items.findIndex((item) => {
        return item.id === item.id;
      });
      if (matchingIndex !== -1) {
        this.api.estimateData.category_items[matchingCatIndex].items.splice(matchingIndex, 1);
      }
      this._sortCategoryItems();
      this.api.updateEstimateData();
    }
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
