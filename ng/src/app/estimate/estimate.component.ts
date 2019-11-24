import { ToastrService } from 'ngx-toastr';
import {Component, OnInit} from '@angular/core';
import {ApiService} from "../api.service";
import {FormBuilder, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-estimator',
  templateUrl: './estimate.component.html',
  styleUrls: ['./estimate.component.scss']
})
export class EstimateComponent implements OnInit {
  public isLoading = false;
  public form: FormGroup;

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
    const catPrefixes = this.api.serviceCategoryPrefixes.filter((prefix) => {
      return prefix.category === category.id;
    });
    catPrefixes.forEach((catPrefix) => {
      this.api.fetchInventory({sku: catPrefix.prefix}).subscribe(
        (data) => {
          console.log(data);
        }
      );
    })
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
