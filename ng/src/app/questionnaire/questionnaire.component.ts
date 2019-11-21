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
    [{name: 'chain', label: 'Chain Wear'}, {name: 'hanger', label: 'Hanger'}],
    [{name: 'cassette_freewheel', label: 'Cassette/Freewheel'}, {name: 'chainrings', label: 'Chainrings'}],
    [{name: 'rear_der_cable', label: 'Rear DER cable'}, {name: 'front_der_cable', label: 'Front DER cable'}],
    [{name: 'rear_der', label: 'Rear DER'}, {name: 'front_der', label: 'Front DER'}],
    [{name: 'rr_brake_cable', label: 'RR Brake Cable'}, {name: 'ft_brake_cable', label: 'FT Brake Cable'}],
    [{name: 'rear_brake', label: 'Rear Brake'}, {name: 'front_brake', label: 'Front Brake'}],
    [{name: 'rear_tire', label: 'Rear Tire'}, {name: 'front_tire', label: 'Front Tire'}],
  ];

  constructor(
    private fb: FormBuilder,
  ) { }

  ngOnInit() {
    const qualityGroup = {};
    this.qualityChoiceRows.forEach((row) => {
      row.forEach((option) => {
        qualityGroup[option.name] = ['', Validators.required];
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

}
