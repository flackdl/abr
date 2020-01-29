import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {Item} from "../estimate-data";
import {NgSelectComponent} from "@ng-select/ng-select";


@Component({
  selector: 'app-item-select-modal',
  templateUrl: './item-select-modal.component.html',
  styleUrls: ['./item-select-modal.component.scss']
})
export class ItemSelectModalComponent implements OnInit {
  @Input('category') category: any;
  @Input('title') title: string;
  @Input('inventoryResults') inventoryResults = [];
  @Input('serviceResults') serviceResults = [];
  @Output() addItemChange = new EventEmitter();
  @Output() removeItemChange = new EventEmitter();
  @ViewChild("inventorySelect", {static: true}) inventorySelect: NgSelectComponent;
  @ViewChild("serviceSelect", {static: true}) serviceSelect: NgSelectComponent;

  public selectedServiceItems: any[] = [];
  public selectedInventoryItems: any[] = [];

  constructor(
    public activeModal: NgbActiveModal,
    ) { }

  ngOnInit() {
    // automatically open inventory drop-down if it has any, otherwise service
    if (this.inventoryResults.length > 0) {
      this.inventorySelect.open();
    } else if (this.serviceResults.length > 0) {
      this.serviceSelect.open();
    }
  }

  public itemAdded(item: Item) {
    this.addItemChange.emit({
      item: item,
      title: this.title,
      category: this.category,
    });
  }

  public itemRemoved(event: any) {
    const item = event.value;  // "item" is event.value
    this.removeItemChange.emit({
      item: item,
      title: this.title,
      category: this.category,
    });
  }
}
