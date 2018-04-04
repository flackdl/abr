let pollingRateSeconds = 100;  // TODO use settings
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
			return this.$http.get('/json/inventory-items', {'params': params, headers: headers}).then((response) => {
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
		estimate_has_tag_number: function(e) {
			return _.find(e['CustomField'], (field) => {
				return field['Name'] == 'Tag #' && field['StringValue'];
			});
		},
		get_estimates: function() {
			if (this.isRequestingData) {
				console.log('already fetching data...');
				return Promise.resolve();
			}

			this.isRequestingData = true;

			// reset errors
			this.error = {
				auth: false,
				unknown: false,
			};

			return this.$http.get('/json/estimates', {headers: {'content-type': 'application/json'}}).then((response) => {
					this.isRequestingData = false;

					return response.json().then((json) => {

						this.isLoading = false;

						if (json['success']) {
							if (json['estimates']) {

								// wipe and rebuild
								this.estimates = [];

								// attempt to create a "due date+time" using the ExpirationDate and a custom time field
								_.forEach(json.estimates, (estimate) => {
									let due_time = moment(this.get_custom_field(estimate, 'Expiration Time'), 'h:mma');
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
									let group = this.estimate_has_tag_number(estimate) ? 'Pending-In' : 'Pending-Out';
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
							if (json['reason'] == 'authentication') {
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
		estimate_url: function (estimate) {
			return 'https://qbo.intuit.com/app/estimate?txnId=' + estimate.Id;
		},
		customer_url: function (estimate) {
			return 'https://qbo.intuit.com/app/customerdetail?nameId=' + estimate.CustomerRef.value;
		},
		get_custom_field: function (estimate, field) {
			let value = '';
			if(estimate['CustomField'] && estimate['CustomField'].length) {
				value = _.find(estimate['CustomField'], (f) => {
					return f['Name'] == field;
				});
			}
			return value['StringValue'];
		},
		total_labor: function (estimate) {
			let total = 0;
			_.forEach(estimate['Line'], (item) => {
				// no tax indicates labor
				if (item['SalesItemLineDetail'] && item['SalesItemLineDetail']['TaxCodeRef'] && item['SalesItemLineDetail']['TaxCodeRef']['value'] === 'NON') {
					total += (item['SalesItemLineDetail']['UnitPrice'] * item['SalesItemLineDetail']['Qty']);
				}
			});
			return total;
		},
		has_error: function () {
			return _.find(this.error, (type) => {
				return type ? true : false;
			});
		},
		show_estimate_notes: function(e) {
			this.showingEstimateNotes = e;
		},
		should_show_estimate_notes: function(e) {
			return this.showingEstimateNotes && this.showingEstimateNotes.Id == e.Id;
		},
		get_notes: function(e) {
			// show full notes
			if (this.should_show_estimate_notes(e)) {
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
      return this.get_estimates().then(
        () => {
          this.estimates = _.filter(this.estimates, (estimate) => {
            return estimate.TxnStatus !== 'Accepted';
          });
          let estimatesParts = [];
          _.forEach(this.estimates, (item) => {
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
    getInventoryQuantityOnHand(part) {
      let found_part = _.find(this.allInventoryItems, (item) => {
        return String(item.Id) === part.SalesItemLineDetail.ItemRef.value;
      });
      return found_part ? found_part.QtyOnHand : 0;
    },
		getTotalInventoryOrderQuantity(part) {
			// return the total quantity needed for this part (in all active estimates)
			let identicalEstimatesParts = _.filter(app.estimatesParts, (estimatePart) => {
				return estimatePart.part.SalesItemLineDetail.ItemRef.value == part.SalesItemLineDetail.ItemRef.value;
			});
			return _.sumBy(identicalEstimatesParts, (estimatePart) => {
				return estimatePart.part.SalesItemLineDetail.Qty;
			})
		},
    getOrders() {
      return this.$http.get('/api/orders/', {headers: apiHeaders}).then(
        (response) => {
          response.json().then((data) => {
            this.orders = data;
          })
        }, (error) => {
        	// TODO
		      console.log(error);
	      });
    },
		getOrderPartFromEstimatePart(estimatePart) {
			for (let order of this.orders) {
				let found_part = _.find(order.parts, (part) => {
					let isPart = part.part_id == estimatePart.part.SalesItemLineDetail.ItemRef.value;
					let isEstimate = part.estimate_id == estimatePart.estimate.DocNumber;
					return isPart && isEstimate;
				});
				if (found_part) {
					return found_part;
				}
			}
		},
		moment: moment,
	},
};
