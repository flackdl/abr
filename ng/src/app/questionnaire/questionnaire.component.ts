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
  ) { }

  ngOnInit() {
    const qualityGroup = {};
    this.qualityChoiceRows.forEach((row) => {
      row.forEach((name) => {
        qualityGroup[this.getQualityKey(name)] = ['', Validators.required];
      });
    });
    const formGroup = {
      bike_model: ['', Validators.required],
      qualities: this.fb.group(qualityGroup),
    };
    this.form = this.fb.group(formGroup);
  }

  public create() {
    console.log(this.form);
  }

  protected getQualityKey(name: string) {
    return name.toLowerCase().replace(' ', '_');
  }

}
