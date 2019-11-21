import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-questionnaire',
  templateUrl: './questionnaire.component.html',
  styleUrls: ['./questionnaire.component.scss']
})
export class QuestionnaireComponent implements OnInit {
  public form: FormGroup;
  public qualityChoices = ['good', 'ok', 'bad'];
  public qualities = [
    {name: 'chain', label: 'Chain Wear'},
    {name: 'hanger', label: 'Hanger'},
    {name: 'cassette_freewheel', label: 'Cassette/Freewheel'},
    {name: 'chainrings', label: 'Chainrings'},
  ];

  constructor(
    private fb: FormBuilder,
  ) { }

  ngOnInit() {
    const qualityGroup = {};
    this.qualities.forEach((option) => {
      qualityGroup[option.name] = ['', Validators.required];
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

}
