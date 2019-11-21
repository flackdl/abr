import {ToastrService} from "ngx-toastr";
import {ApiService} from "../api.service";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-questionnaire',
  templateUrl: './questionnaire.component.html',
  styleUrls: ['./questionnaire.component.scss']
})
export class QuestionnaireComponent implements OnInit {
  public form: FormGroup;
  public qualityChoices = ['good', 'ok', 'bad'];
  public qualityChoiceRows = [
    ['Chain Wear', 'Hanger'],
    ['Cassette/Freewheel', 'Chainrings'],
    ['Rear DER cable', 'Front DER cable'],
    ['Rear DER', 'Front DER'],
    ['RR Brake Cable', 'FT Brake Cable'],
    ['Rear Brake', 'Front Brake'],
    ['Rear Tire', 'Front Tire'],
  ];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService,
  ) { }

  ngOnInit() {
    const qualityGroup = {};
    this.qualityChoiceRows.forEach((row) => {
      row.forEach((name) => {
        qualityGroup[this.getQualityKey(name)] = ['', Validators.required];
      });
    });
    this.form = this.fb.group({
      bike_model: ['', Validators.required],
      qualities: this.fb.group(qualityGroup),
    });
  }

  public create() {
    // mark all inputs as dirty then validate
    this.form.get('bike_model').markAsDirty();
    Object.keys((this.form.controls['qualities'] as FormGroup).controls).forEach((key) => {
      const input = this.form.get('qualities').get(key);
      input.markAsDirty();
    });

    if (this.form.valid) {
      this.api.updateEstimateData({
        questionnaire: {
          bike_model: this.form.get('bike_model').value,
          qualities: this.form.get('qualities').value,
        },
      });
    } else {
      this.toastr.error('Invalid form entries');
    }
  }

  public getQualityKey(name: string) {
    return name.toLowerCase().replace(' ', '_');
  }

  public isQualityDirty(quality: string): boolean {
    const key = this.getQualityKey(quality);
    const input = this.form.get('qualities').get(key);
    return input.dirty;
  }

  public isQualityValid(quality: string): boolean {
    const key = this.getQualityKey(quality);
    const input = this.form.get('qualities').get(key);
    return input.valid;
  }

}
