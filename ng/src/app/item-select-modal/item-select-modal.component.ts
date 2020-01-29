import {Component, EventEmitter, Input, OnInit, Output, ViewChild, ViewEncapsulation} from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {Item} from "../estimate-data";
import {NgSelectComponent} from "@ng-select/ng-select";


@Component({
  selector: 'app-item-select-modal',
  templateUrl: './item-select-modal.component.html',
  styleUrls: ['./item-select-modal.component.scss'],
  // it's necessary to remove view encapsulation so we can add custom styles to ng-select
  // https://github.com/ng-select/ng-select#custom-styles
  encapsulation: ViewEncapsulation.None
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
    // open both select drop-downs
    this.serviceSelect.open();
    this.inventorySelect.open();
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
