let pollingRateSeconds = parseInt('{{ polling_rate_seconds }}');
let isDebug = '{{ debug }}'.length > 0;
let apiHeaders = {
  'content-type': 'application/json',
  'X-CSRFToken': Cookies.get('csrftoken'),
};
let estimatesMixin = {
  el: '#abr',
  delimiters: ['{$', '$}'],
  data: {
    isLoading: true,
    estimates: [],
    error: {
      auth: false,
      unknown: false,
      message: '',
    },
    maxLengthNote: 250,
    isRequestingData: false,
    isRequestingInventoryData: false,
    showingEstimateNotes: null,
    tmpAllInventoryItems: [],
    allInventoryItems: [],
    allInventoryItemsJSON: '',
    estimatesParts: [],
    orders: [],
  },
  methods: {
    getAllInventoryItems: function(page, all_stock, items) {
      this.isRequestingInventoryData = true;
      if (!items || !items.length) {
        items = [];
      }
      // recursive function to page through all the inventory results
      let headers = {'content-type': 'application/json'};
      let params = {'page': page};
      // conditionally get all items regardless of stock
      if (all_stock) {
        params['all_stock'] = true;
      }
      return this.$http.get('{% url "json-inventory-items" %}', {'params': params, headers: headers}).then((response) => {
        return response.json().then((json) => {
          // potentially has more pages
          if (json.items.length) {
            return this.getAllInventoryItems(++page, all_stock, items.concat(json.items));
          } else {
            // recursion complete
            this.allInventoryItems = items;
            this.isRequestingInventoryData = false;
          }
        });
      }, (error) => {
        // reset on error
        this.isRequestingInventoryData = false;
      });
    },
    estimateHasTagNumber: function(e) {
      return _.find(e['CustomField'], (field) => {
        return field['Name'] === 'Tag #' && field['StringValue'];
      });
    },
    getEstimates: function() {

      this.isRequestingData = true;

      // reset errors
      this.error = {
        auth: false,
        unknown: false,
        message: '',
      };

      return this.$http.get('{% url "json-estimates" %}', {headers: {'content-type': 'application/json'}}).then((response) => {
          this.isRequestingData = false;

          return response.json().then((json) => {

            this.isLoading = false;

            if (json['success']) {
              if (json['estimates']) {

                // wipe and rebuild
                this.estimates = [];

                // attempt to create a "due date+time" using the ExpirationDate and a custom time field
                _.forEach(json.estimates, (estimate) => {
                  let due_time = moment(this.getCustomField(estimate, 'Expiration Time'), 'h:mma');
                  if (due_time.isValid()) {
                    estimate.ExpirationDate = moment(estimate.ExpirationDate).hour(due_time.hours()).minute(due_time.minutes()).format();
                  }
                });

                // group by statuses
                let statusGroups = _.groupBy(json.estimates, 'TxnStatus');

                // sort estimates by due date
                _.forEach(statusGroups, (group) => {
                  group.sort((a, b) => {
                    return new Date(a.ExpirationDate) - new Date(b.ExpirationDate);
                  });
                });

                // distinguish in-shop vs not-in-shop "Pending" estimates
                statusGroups['Pending-In'] = [];
                statusGroups['Pending-Out'] = [];
                _.each(statusGroups['Pending'], (estimate) => {
                  let group = this.estimateHasTagNumber(estimate) ? 'Pending-In' : 'Pending-Out';
                  statusGroups[group].push(estimate);
                });
                // remove since we're splitting it out into two groups
                delete statusGroups['Pending'];

                // build by status order preference
                _.forEach(['Accepted', 'Pending-In', 'Pending-Out', 'Closed'], (status) => {
                  if (_.has(statusGroups, status)) {
                    _.forEach(statusGroups[status], (estimate) => {
                      estimate.class = status;
                      this.estimates.push(estimate);
                    });
                  }
                });
              }
            } else {
              // authentication error
              if (json['reason'] === 'authentication') {
                this.error.auth = true;
              } else {
                this.error.unknown = true;
              }
              console.log('json failure', json, this.error);
            }
          });
        },
        // failure
        (error) => {
          this.isRequestingData = false;
          this.error.unknown = true;
          console.log('failure', error);
        });
    },
    estimateUrl: function (estimate) {
      if (isDebug) {
        return 'https://app.sandbox.qbo.intuit.com/app/estimate?txnId=' + estimate.Id;
      }
      return 'https://qbo.intuit.com/app/estimate?txnId=' + estimate.Id;
    },
    customerUrl: function (estimate) {
      if (isDebug) {
        return 'https://app.sandbox.qbo.intuit.com/app/customerdetail?nameId=' + estimate.CustomerRef.value;
      }
      return 'https://qbo.intuit.com/app/customerdetail?nameId=' + estimate.CustomerRef.value;
    },
    getCustomField: function (estimate, field) {
      let value;
      if(estimate['CustomField'] && estimate['CustomField'].length) {
        value = _.find(estimate['CustomField'], (f) => {
          return f['Name'] === field;
        });
      }
      return value ? value['StringValue'] : '';
    },
    totalLabor: function (estimate) {
      let total = 0;
      _.forEach(estimate['Line'], (item) => {
        // no tax indicates labor
        if (item['SalesItemLineDetail'] && item['SalesItemLineDetail']['TaxCodeRef'] && item['SalesItemLineDetail']['TaxCodeRef']['value'] === 'NON') {
          total += (item['SalesItemLineDetail']['UnitPrice'] * item['SalesItemLineDetail']['Qty']);
        }
      });
      return total;
    },
    hasError: function () {
      return _.find(this.error, (type) => {
        return !!type;
      });
    },
    showEstimateNotes: function(e) {
      this.showingEstimateNotes = e;
    },
    shouldShowEstimateNotes: function(e) {
      return this.showingEstimateNotes && this.showingEstimateNotes.Id == e.Id;
    },
    getNotes: function(e) {
      // show full notes
      if (this.shouldShowEstimateNotes(e)) {
        return e.PrivateNote;
      }
      // truncated notes
      else if (e.PrivateNote && e.PrivateNote.length >= this.maxLengthNote) {
        return e.PrivateNote.slice(0, this.maxLengthNote - 1) + '...';
      }
      return e.PrivateNote;
    },
    getEstimatesParts: function () {
      // "expand" estimates by part so there's one estimate per part it needs
      return this.getEstimates().then(
        () => {
          // filter out Accepted & Closed
          let estimates = _.filter(this.estimates, (estimate) => {
            return !_.includes(['Accepted', 'Closed'], estimate.TxnStatus);
          });
          let estimatesParts = [];
          _.forEach(estimates, (item) => {
            _.forEach(this.parts(item), (part) => {
              estimatesParts.push({
                estimate: item,
                part: part,
              });
            });
          });
          this.estimatesParts = estimatesParts;
        },
        (error) => {
          console.log(error);
        });
    },
    parts: function (estimate) {
      // returns only taxable parts (non service/labor items)
      let parts = [];
      _.forEach(estimate['Line'], (item) => {
        // tax indicates part
        if (item['SalesItemLineDetail'] && item['SalesItemLineDetail']['TaxCodeRef'] && item['SalesItemLineDetail']['TaxCodeRef']['value'] === 'TAX') {
          parts.push(item);
        }
      });
      return parts;
    },
	  getInventoryPartFromEstimatePart(part) {
		  return _.find(this.allInventoryItems, (item) => {
			  return String(item.Id) === part.SalesItemLineDetail.ItemRef.value;
		  });
	  },
    getInventoryQuantityOnHand(part) {
      let found_part = this.getInventoryPartFromEstimatePart(part);
      return found_part ? found_part.QtyOnHand : 0;
    },
    getTotalInventoryOrderQuantity(part) {
      // return the total quantity needed for this part (in all estimates)
      let parts = [];
      for (let estimate of this.estimates) {
        for (let line of estimate.Line) {
          if (line.SalesItemLineDetail && line.SalesItemLineDetail.ItemRef.value === part.SalesItemLineDetail.ItemRef.value) {
            parts.push(line);
          }
        }
      }
      return _.sumBy(parts, (part) => {
        return part.SalesItemLineDetail.Qty;
      })
    },
    getOrders() {
      // reset any previous error
      this.error.message = '';
      let params = {
        arrived: false,
      };
      return this.$http.get('{% url "order-list" %}', {params: params, headers: apiHeaders}).then(
        (response) => {
          response.json().then((data) => {
            this.orders = data;
          })
        }, (error) => {
          this.error.message = 'Failed retrieving orders';
          console.log(error);
        });
    },
    getOrderPartFromEstimatePart(estimatePart) {
      for (let order of this.orders) {
        let found_part = _.find(order.parts, (part) => {
        	let isPart = part.part_id == estimatePart.part.SalesItemLineDetail.ItemRef.value;
	        // NOTE: the "MiscHardware" part means multiple/generic parts get grouped under the same QBO Item so we need to
	        // check uniqueness by the part id and description
	        if (isPart && estimatePart.part.SalesItemLineDetail.ItemRef.name === 'MiscHardware') {
		        isPart = part.part_description === estimatePart.part.Description;
	        }
          let isEstimate = part.estimate_id == estimatePart.estimate.DocNumber;
          return isPart && isEstimate;
        });
        if (found_part) {
          return found_part;
        }
      }
    },
    getSkuFromPart(part) {
      let item = this.getInventoryPartFromEstimatePart(part);
      return item ? item.Sku : '';
    },
    moment: moment,
  },
};
