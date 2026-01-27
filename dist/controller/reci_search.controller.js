sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"MANAGED_RECIPE/controller/ErrorHandler",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Filter",
	"sap/ui/export/Spreadsheet",
	"MANAGED_RECIPE/Formatter/formatter",
	"sap/ui/model/resource/ResourceModel"
], function(Controller, ErrorHandler, FilterOperator, Filter, Spreadsheet, formatter, ResourceModel) {
	"use strict";

	var i18n;
	var busyDialog = new sap.m.BusyDialog();

	return Controller.extend("MANAGED_RECIPE.controller.reci_search", {
		formatter: formatter,

		// on Intial Load of page/view
		onInit: function() {

			// ********************* IMAGE MODEL ************************
			var vPathImage = jQuery.sap.getModulePath("MANAGED_RECIPE") + "/Image/";
			var oImageModel = new sap.ui.model.json.JSONModel({
				path: vPathImage
			});
			this.getView().setModel(oImageModel, "JM_ImageModel");

			// **********************************************************

			var i18nModel = new ResourceModel({
				bundleName: "MANAGED_RECIPE.i18n.i18n"
			});
			this.getView().setModel(i18nModel, "i18n");

			i18n = this.getView().getModel("i18n").getResourceBundle();

			this.f4Cache = {};
			this.oRouter = this.getOwnerComponent().getRouter(this);
			this.oRouter.getRoute("reci_search").attachPatternMatched(this.fnRouter, this);
		},
		
		// on Every time load of page/view
		fnRouter: function() {
			var oVisModel = new sap.ui.model.json.JSONModel({
				labelVisible: true
			});
			this.getView().setModel(oVisModel, "RoadMapUI");
			sap.ui.Device.resize.attachHandler(this._onResize, this);
			this._onResize();
			
			// this.getView().byId("id_dashBoard_h").removeStyleClass("cl_listhighlight");
			// this.getView().byId("id_dashBoard_h").addStyleClass("cl_list_con");
			// this.getView().byId("id_appList_h").addStyleClass("cl_listhighlight");
			// this.getView().byId("id_appList_h").removeStyleClass("cl_list_con");

			busyDialog.open();
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			oModel.read("/UsernameSet", {
				success: function(oData) {
					var oJsonModel = new sap.ui.model.json.JSONModel();
					oJsonModel.setData(oData.results);
					this.getView().setModel(oJsonModel, "JM_UserModel"); // local model
					busyDialog.close();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
			var oEntity = {
				"MdmMaster": "R",
				"Flag": "V",
				"NavSearch_Variant": []
			};
			oModel.create("/Search_VariantSet", oEntity, {
				success: function(oData) {
					sap.ui.core.BusyIndicator.hide();
					var oJsonVariant = new sap.ui.model.json.JSONModel();
					var aResults = oData.NavSearch_Variant.results || [];

					// Create a new array with a placeholder as the first element
					var aNewData = [{
						VariantName: "Select Variant"
					}].concat(aResults);

					// Set the new array to model
					oJsonVariant.setData(aNewData);
					this.getView().setModel(oJsonVariant, "JMListVariant"); // local model for varient set
					busyDialog.close();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
			this.fnClearAllfields();
			var oVisibleModel = new sap.ui.model.json.JSONModel({
				visible: true,
				rowCount: 7
			});
			this.getView().setModel(oVisibleModel, "JM_Visible"); // local model for visible and rowCount 
		},
		


		// *-------------------------------------------------------------------------------------
		//		Function for Live Change (added by sabarish babu 07-10-2025)
		// *-------------------------------------------------------------------------------------

		// live change function for all input fields
		fnLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oEvent.getSource().getId().split("--")[1];
			var vValue = oEvent.getSource().getValue().toUpperCase();
			oInput.setValue(vValue);
			this.selectedField = id;
			this.getView().byId(id).setValueState("None");
			if (id === "SID_RECI_MATNR") {
				this.fnReadf4Cache(id, vValue.toUpperCase().replace(/^0+/, ""), "P");
			} else {
				this.fnReadf4Cache(id, vValue.toUpperCase(), "P");
			}
		},

		// Read the f4 details in the this.f4Cache
		fnReadf4Cache: function(vId, vValue, f4type) {
			var that = this;
			var match;
			var descriptionField;
			var updateDesc = function(results) {
				if (f4type === "P" || f4type === "X") {
					// Default: match Value1/Value2 as usual
					if (that.selectedField === "SID_RECI_MATNR") {
						match = results.find(function(item) {
							return item.Value1.replace(/^0+/, "") === vValue.toUpperCase();
						});
					} else {
						match = results.find(function(item) {
							return item.Value1 === vValue.toUpperCase();
						});
					}
					if (match) {
						descriptionField = that.getView().byId(that.selectedField + "_DES");
						if (descriptionField) {
							descriptionField.setValue(match.Value2);
						}
					} else {
						descriptionField = that.getView().byId(that.selectedField + "_DES");
						if (descriptionField) {
							descriptionField.setValue("");
						}
					}
				}
			};
			if (this.f4Cache[vId]) {
				updateDesc(this.f4Cache[vId]);
			} else {
				this.f4descriptionGet(vId, vValue, f4type, function(results) {
					that.f4Cache[vId] = results;
					updateDesc(results);
				});
			}
		},

		// get the description of F4 details from backend
		f4descriptionGet: function(vId, value, f4type, fnCallback) {
			var that = this;
			var filter;
			var oModel = this.getOwnerComponent().getModel("JMConfig");

			var oPayload = {
				FieldId: vId,
				F4Type: f4type,
				Process: "S"
			};
			oPayload.NavSerchResult = [];
			oModel.create("/SearchHelpSet", oPayload, {
				filters: filter,
				success: function(oData) {
					that.f4Cache[vId] = oData.NavSerchResult.results;
					if (fnCallback) {
						fnCallback(oData.NavSerchResult.results);
					}
				},
				error: function(oResponse) {
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		// *-------------------------------------------------------------------------------------
		//		Function for F4 Event (added by sabarish babu 07-10-2025)
		// *-------------------------------------------------------------------------------------

		// when F4 press for all fields
		fnF4press: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedField = id;
			this.bindTextF4model("P", id, "S", oEvent);
		},

		// bind the f4 date for JM_F4model 
		bindTextF4model: function(SearchHelp, sitem, process, oEvent) {
			var oJsonModel;
			var vTitle;
			var oLabels = {};
			var vLength;
			var aFormattedRows = [];
			var that = this;
			var filter = [];
			that.sitem = sitem;
			// var ftype = new Filter("F4Type", FilterOperator.EQ, SearchHelp);
			// var sitem1 = new Filter("FieldId", FilterOperator.EQ, sitem);
			// var process1 = new Filter("Process", FilterOperator.EQ, process);
			// filter.push(ftype);
			// filter.push(sitem1);
			// filter.push(process1);
			var oPayload = {
				FieldId: sitem,
				Process: process,
				F4Type: SearchHelp
			};
			oPayload.NavSerchResult = [];
			var omodel1 = that.getOwnerComponent().getModel("JMConfig");
			omodel1.create("/SearchHelpSet", oPayload, {
				filters: filter,
				success: function(odata, Response) {
					var aResults = odata.NavSerchResult.results;
					if (aResults.length > 0) {
						var oFirst = aResults[0];
						if (oFirst && (oFirst.DomvalueL || oFirst.Ddtext)) {
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								ErrorHandler.showCustomSnackbar(oFirst.Message, "Error", this);
								return;
							}
							vLength = aResults.length;
							oLabels.col1 = "Key";
							if (oFirst.Label2) {
								oLabels.col2 = oFirst.Label2;
							}
							aResults.forEach(function(item) {
								var row = {};
								if (oLabels.col1) {
									row.col1 = item.DomvalueL;
								}
								if (oLabels.col2) {
									row.col2 = item.Ddtext;
								}
								if (oLabels.col3) {
									row.col3 = item.DomvalueL3;
								}
								if (oLabels.col4) {
									row.col4 = item.DomvalueL4;
								}
								aFormattedRows.push(row);
							});
							oJsonModel = new sap.ui.model.json.JSONModel({
								labels: oLabels,
								rows: aFormattedRows
							});
							that.getView().setModel(oJsonModel, "JM_F4Model");
							vTitle = sap.ui.getCore().byId(that.sitem + "_TXT").getText() + " (" + vLength + ")";
							that.fnF4fragopen(oEvent, vTitle).open();
						} else {
							vLength = odata.NavSerchResult.results.length;
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								ErrorHandler.showCustomSnackbar(oFirst.Message, "Error", this);
								return;
							}
							if (oFirst.Label1) {
								oLabels.col1 = oFirst.Label1;
							}
							if (oFirst.Label2) {
								oLabels.col2 = oFirst.Label2;
							}
							if (oFirst.Label3) {
								oLabels.col3 = oFirst.Label3;
							}
							if (oFirst.Label4) {
								oLabels.col4 = oFirst.Label4;
							}
							// Validate
							aResults.forEach(function(item) {
								var row = {};
								if (oLabels.col1 === "Material") {
									row.col1 = item.Value1 ? item.Value1.replace(/^0+/, "") : item.Value1;
								} else {
									row.col1 = item.Value1;
								}
								if (oLabels.col2) {
									row.col2 = item.Value2;
								}
								if (oLabels.col3) {
									row.col3 = item.Value3;
								}
								if (oLabels.col4) {
									row.col4 = item.Value4;
								}
								aFormattedRows.push(row);
							});
							oJsonModel = new sap.ui.model.json.JSONModel({
								labels: oLabels,
								rows: aFormattedRows
							});
							that.getView().setModel(oJsonModel, "JM_F4Model");
							that.getView().getModel("JM_F4Model");
							vTitle = that.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";
							that.fnF4fragopen(oEvent, vTitle).open();
						}
					}
				},
				error: function(oResponse) {
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});

		},

		// when F4 dialog item press
		fnF4Itempress: function(oEvent) {
			var oItem = oEvent.getSource();
			var oContext = oItem.getBindingContext("JM_F4Model");
			if (!oContext) {
				return;
			}
			var item = oContext.getProperty("col1"); // Value (e.g., 'IN')
			var item1 = oContext.getProperty("col2"); // Description (e.g., 'India')

			this.getView().byId(this.selectedField).setValue(item);
			this.getView().byId(this.selectedField + "_DES").setValue(item1);
			this.fnAfterCloseFragment();
		},

		// to open the f4 fragment
		fnF4fragopen: function(oEvent, vTitle) {
			if (!this.f4HelpFrag) {
				this.f4HelpFrag = sap.ui.xmlfragment(this.getView().getId(), "MANAGED_RECIPE.fragment.F4Help", this);
				this.getView().addDependent(this.f4HelpFrag);
			}
			this.f4HelpFrag.setTitle(vTitle);
			return this.f4HelpFrag;
		},

		// to close the f4 fragement
		fnf4HelpCancel: function(oEvent) {
			this.fnF4fragopen().close();
			this.f4HelpFrag.destroy();
			this.f4HelpFrag = null;
		},

		fnAfterCloseFragment: function(oEvent) {
			this.fnF4fragopen().close();
			this.f4HelpFrag.destroy();
			this.f4HelpFrag = null;
		},

		// search field for f4 fragment
		fnValueSearch: function(oEvent) {
			var oInput = oEvent.getSource();
			var sValue = oInput.getValue();
			oInput.setValue(sValue.toUpperCase());
			var sQuery = oEvent.getSource().getValue().toLowerCase();

			// Get table and binding
			var oTable = this.byId("idMaterialTable");
			var oBinding = oTable.getBinding("items");
			if (!oBinding) {
				return;
			}
			var aFilters = [];

			// Filter on all possible columns
			if (sQuery) {
				aFilters.push(new sap.ui.model.Filter({
					filters: [
						new sap.ui.model.Filter("col1", sap.ui.model.FilterOperator.Contains, sQuery),
						new sap.ui.model.Filter("col2", sap.ui.model.FilterOperator.Contains, sQuery),
						new sap.ui.model.Filter("col3", sap.ui.model.FilterOperator.Contains, sQuery),
						new sap.ui.model.Filter("col4", sap.ui.model.FilterOperator.Contains, sQuery)
					],
					and: false
				}));
			}
			oBinding.filter(aFilters, "Application");
		},

		// *-----------------------------------------------------------------------------------------
		//			 Function for To search table Records (Added by sabarish - 06-10-2025)
		// *-----------------------------------------------------------------------------------------

		// to search the record based on search criteria
		fnSearch: function() {
			var oSearchEntity = this.getOwnerComponent().getModel();
			var payLoad = {
				Matnr: this.getView().byId("SID_RECI_MATNR").getValue(),
				Plnnr: this.getView().byId("SID_RECI_PLNNR").getValue(),
				Werks: this.getView().byId("SID_RECI_WERKS").getValue(),
				And: this.getView().byId("id_and").getSelected(),
				Or: this.getView().byId("id_or").getSelected()
			};
			payLoad.NavRecipeSearch = [];

			if (!payLoad.Matnr && !payLoad.Plnnr && !payLoad.Werks) {
				ErrorHandler.showCustomSnackbar(i18n.getText("searchFieldRequiredError"), "Error", this);
				return;
			}

			busyDialog.open();
			oSearchEntity.create("/Recipe_Search_HeaderSet", payLoad, {
				success: function(oData) {
					var length = oData.NavRecipeSearch.results.length;
					var vSearchResults = {
						records: oData.NavRecipeSearch.results,
						total: "(" + length + ")"
					};
					var oModel = new sap.ui.model.json.JSONModel(vSearchResults);
					this.getView().setModel(oModel, "JM_Recidetails");
					oModel.refresh(true);
					busyDialog.close();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		// *-----------------------------------------------------------------------------------------
		//	  Function for To Expand and Collapse the search table (Added by sabarish - 06-10-2025)
		// *-----------------------------------------------------------------------------------------

		// expand and collapse the search item table
		fnExpand: function() {
			this.getView().getModel("JM_Visible").setProperty("/visible", false);
			this.getView().getModel("JM_Visible").setProperty("/rowCount", 13);
			this.getView().byId("id_search_container").removeStyleClass("sapUiLargeMarginTop");
			this.getView().byId("id_searchTableBox").removeStyleClass("cl_border");
			this.getView().byId("id_search_container").addStyleClass("sapUiTinyMarginTop");
			this.getView().byId("id_searchTableBox").addStyleClass("cl_borderSS");
		},

		fnCollapse: function() {
			this.getView().getModel("JM_Visible").setProperty("/rowCount", 7);
			this.getView().getModel("JM_Visible").setProperty("/visible", true);
			// this.getView().byId("id_search_container").addStyleClass("sapUiLargeMarginTop");
			this.getView().byId("id_searchTableBox").addStyleClass("cl_border");
			this.getView().byId("id_search_container").removeStyleClass("sapUiTinyMarginTop");
			this.getView().byId("id_searchTableBox").removeStyleClass("cl_borderSS");
		},

		// *-----------------------------------------------------------------------------------------
		//			Function for Table Filter functionalities (Added by sabarish - 06-10-2025)
		// *-----------------------------------------------------------------------------------------

		// table filter icon press
		fnTableFilter: function(oEvent) {
			var oButton = oEvent.getSource();
			var that = this;

			var oList = new sap.m.List({
				items: [
					new sap.m.StandardListItem({
						title: i18n.getText("Customize"),
						type: "Active",
						icon: "Image/customize.svg",
						press: that.fnCustomizeTableColumns.bind(that)
					}).addStyleClass("cl_uwl_customizefilterlistitem"),

					new sap.m.StandardListItem({
						title: that.textWrap ? i18n.getText("ClipText") : i18n.getText("WrapText"),
						type: "Active",
						icon: "Image/Warptext.svg",
						press: that.fnWrapText.bind(that)
					}).addStyleClass("cl_uwl_wrapfilterlistitem")
				]
			}).addStyleClass("cl_uwl_filterlistitem");

			var oClrButton = new sap.m.Button({
				text: i18n.getText("Clear"),
				icon: "Image/Clearall.svg",
				press: function() {
					var oTable = that.getView().byId("id_UWLtable");
					var aColumns = oTable.getColumns();
					aColumns.forEach(function(oColumn) {
						oTable.filter(oColumn, "");
					});
				}
			}).addStyleClass("cl_primaryButton");

			var oPopover = new sap.m.Popover({
				placement: sap.m.PlacementType.Bottom,
				offsetX: 54,
				content: new sap.m.VBox({
					items: [oList],
					justifyContent: "Center",
					alignItems: "Center"
				}),
				footer: new sap.m.Bar({
					contentMiddle: [oClrButton]
				})
			});

			oPopover.addStyleClass("cl_uwl_PopOver sapUiSizeCompact");
			oPopover.openBy(oButton);
		},

		// on customize list select
		fnCustomizeTableColumns: function() {
			var vFinalBinding = [];
			var vSelectedIndex = [];
			var vColumnArray = this.getView().byId("id_search_table").getColumns();
			for (var i = 0; i < vColumnArray.length; i++) {
				vFinalBinding.push({
					CName: vColumnArray[i].getLabel().getText(),
					CId: vColumnArray[i].getId().split("--").pop(),
					Visible: vColumnArray[i].getVisible()

				});
				if (vColumnArray[i].getVisible()) {
					vSelectedIndex.push(i);
				}
			}
			var oVisibleModel = new sap.ui.model.json.JSONModel(vFinalBinding);
			this.getView().setModel(oVisibleModel, "JMColumn");

			if (!this.Customzie) {
				this.Customzie = sap.ui.xmlfragment("MANAGED_RECIPE.Fragment.customize_table", this);
				this.getView().addDependent(this.Customzie);
			}
			this.Customzie.open();
			var vItems = sap.ui.getCore().byId("id_columnSel").getItems();
			if (vSelectedIndex.length === vItems.length) {
				sap.ui.getCore().byId("id_checkselect").setSelected(true);
				sap.ui.getCore().byId("id_checkselect").removeStyleClass("cl_checkbox");
				sap.ui.getCore().byId("id_checkselect").addStyleClass("cl_checkboxSel");
			}
			for (i = 0; i < vSelectedIndex.length; i++) {
				vItems[vSelectedIndex[i]].getContent()[0].getContent()[0].removeStyleClass("cl_checkbox");
				vItems[vSelectedIndex[i]].getContent()[0].getContent()[0].addStyleClass("cl_checkboxSel");
			}
		},

		// apply button press in customize dialog
		fnApplyCustomizeColumn: function() {
			var vColumnModel = this.getView().getModel("JMColumn");
			var vColumnArray = [];
			if (vColumnModel !== undefined) {
				vColumnModel.updateBindings(true);
				vColumnArray = vColumnModel.getData();
			}
			var vAllFalse = vColumnArray.every(function(oItem) {
				return oItem.Visible === false;
			});
			if (vAllFalse === true) {
				ErrorHandler.showCustomSnackbar(i18n.getText("noColumnSelectedError"), "Error", this);
			} else {
				for (var i = 0; i < vColumnArray.length; i++) {
					this.getView().byId("id_search_table").getColumns()[i].setVisible(vColumnArray[i].Visible);
				}
				this.fnCancel();
			}
		},

		// Selection Mode
		fnCheckSel: function(oEvent) {
			if (!oEvent.getSource().getSelected()) {
				oEvent.getSource().removeStyleClass("cl_checkboxSel");
				oEvent.getSource().addStyleClass("cl_Customizecheckbox");
			} else {
				oEvent.getSource().removeStyleClass("cl_Customizecheckbox");
				oEvent.getSource().addStyleClass("cl_checkboxSel");
			}
		},

		// Select All
		fnCheckSelAll: function(oEvent) {
			var vData = this.getView().getModel("JMColumn").getData();
			if (!oEvent.getSource().getSelected()) {
				oEvent.getSource().removeStyleClass("cl_checkboxSel");
				oEvent.getSource().addStyleClass("cl_Customizecheckbox");
			} else {
				oEvent.getSource().removeStyleClass("cl_Customizecheckbox");
				oEvent.getSource().addStyleClass("cl_checkboxSel");
			}
			vData.forEach(function(oItem) {
				oItem.Visible = oEvent.getSource().getSelected();
			});
			this.getView().getModel("JMColumn").updateBindings(true);
			var vItems = sap.ui.getCore().byId("id_columnSel").getItems();
			for (var i = 0; i < vData.length; i++) {
				if (!oEvent.getSource().getSelected()) {
					vItems[i].getContent()[0].getContent()[0].removeStyleClass("cl_checkboxSel");
					vItems[i].getContent()[0].getContent()[0].addStyleClass("cl_Customizecheckbox");
				} else {
					vItems[i].getContent()[0].getContent()[0].removeStyleClass("cl_Customizecheckbox");
					vItems[i].getContent()[0].getContent()[0].addStyleClass("cl_checkboxSel");
				}
			}
		},

		// Close the popup
		fnCancel: function() {
			this.Customzie.close();
		},

		// Filter Column Selection
		fnColumnFilter: function(oEvent) {
			var vQuery = oEvent.getParameter("newValue").toLowerCase();
			// Get the list
			var vList = sap.ui.getCore().byId("id_columnSel");
			var vBinding = vList.getBinding("items");
			if (vQuery) {
				var oFilter = new sap.ui.model.Filter({
					path: "CName", // The property in your model to search
					operator: sap.ui.model.FilterOperator.Contains,
					value1: vQuery,
					caseSensitive: false
				});
				vBinding.filter([oFilter]);
			} else {
				vBinding.filter([]); // Reset filter
			}
		},

		// on wrap list press
		fnWrapText: function(oEvent) {
			var that = this;
			var oTable = that.getView().byId("id_search_table");
			var oColumns = oTable.getColumns();

			var oItem = oEvent.getSource();
			var iTransReqColIndex = 3;

			if (!that.textWrap) {
				oItem.setTitle("Clip Text");
				that.textWrap = true;
				oColumns[iTransReqColIndex - 2].setWidth("10%");
				oTable.addStyleClass("cl_uwl_TransReqWrap");
			} else {
				oItem.setTitle("Wrap Text");
				that.textWrap = false;
				oColumns[iTransReqColIndex - 2].setWidth("30%");
				oTable.removeStyleClass("cl_uwl_TransReqWrap");
			}
		},

		// *-----------------------------------------------------------------------------------------
		//			Function for Create Varient functionalities (Added by sabarish - 06-10-2025)
		// *-----------------------------------------------------------------------------------------

		// open the varient dialog
		fnOpenVariant: function(oEvent) {
			var that = this;
			var sVarname = this.getView().byId("id_combo").getSelectedKey();
			if (sVarname !== "Select Variant") {
				if (!this.Confirmation) {
					var oPopupModel = new sap.ui.model.json.JSONModel({
						title: i18n.getText("Confirmation"),
						text: i18n.getText("variantModifyConfirmMsg"),
						negativeButton: i18n.getText("Cancel"),
						negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
						positiveButton: i18n.getText("Proceed"),
						positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Duplicate.svg",
						Indicator: "MODIFY_VAR", // indication for Modifiy varient
						VarientName: sVarname
					});
					// Set model with name
					this.getView().setModel(oPopupModel, "JM_Popup");

					this.Confirmation = sap.ui.xmlfragment("MANAGED_RECIPE.Fragment.ConfirmationExit", this);
					this.getView().addDependent(this.Confirmation);
				}
				this.Confirmation.open();
			} else {
				if (!this.Variant) {
					this.Variant = sap.ui.xmlfragment("MANAGED_RECIPE.Fragment.create_varient", this);
					this.getView().addDependent(this.Variant);
				}
				this.Variant.open();
				var vItem = this.getView().getModel("JMListVariant");
				if (vItem !== undefined) {
					vItem = vItem.getData();
					var vFinEntity = [];
					vItem.slice(1).forEach(function(oItem) {
						var oEn = {
							VarintName: oItem.VariantName,
							New: false
						};
						vFinEntity.push(oEn);
					});
					var oJSONVariant = new sap.ui.model.json.JSONModel(vFinEntity);
					this.getView().setModel(oJSONVariant, "JMVaraint");
					sap.ui.getCore().byId("id_variantTab").setSelectedIndex(0);
				}
			}
		},

		// close the varient dialog
		fnConfirmationFragmentClose: function() {
			if (this.Confirmation) {
				this.Confirmation.close();
				this.Confirmation.destroy();
				this.Confirmation = null;
			}
		},

		// press submit for the varient dialog
		fnSubmitConfirmation: function() {
			var state = this.getView().getModel("JM_Popup").getProperty("/Indicator");
			var variantName = this.getView().getModel("JM_Popup").getProperty("/VarientName");
			if (state === "MODIFY_VAR") {
				this.fnConfirmationFragmentClose();
				this.fnSaveVariantBackend(variantName);
			}
			if (state === "CHANGE") {
				this.fnConfirmationFragmentClose();
				if (this.Selecteddata) {
					this.fnChangeLogic(this.Selecteddata);
				}
			}
			if (state === "DELETE_VARIENT") {
				var oTable = sap.ui.getCore().byId("id_variantTab");
				var iIndex = oTable.getSelectedIndex();
				if (iIndex === -1) {
					var vMsg = i18n.getText("DeletionSuccess");
					ErrorHandler.showCustomSnackbar(vMsg, "success", this);
					return;
				}
				var oModel = this.getView().getModel("JMVaraint");
				var aData = oModel.getData();
				var vVariantName = aData[iIndex].VarintName;

				/* -------------------------------
				   DELETE FROM JMVaraint MODEL
				-------------------------------- */
				aData.splice(iIndex, 1);
				oModel.setData(aData);
				oModel.refresh(true);

				/* -------------------------------
				   DELETE FROM JMListVariant MODEL (ES5)
				-------------------------------- */
				var oListModel = this.getView().getModel("JMListVariant");
				if (oListModel) {
					var aList = oListModel.getData();
					var iRemoveIndex = -1;
					for (var i = 0; i < aList.length; i++) {
						if (aList[i].VariantName === vVariantName) {
							iRemoveIndex = i;
							break;
						}
					}
					if (iRemoveIndex !== -1) {
						aList.splice(iRemoveIndex, 1);
						oListModel.setData(aList);
						oListModel.refresh(true);
					}
				}
				// Clear table selection
				oTable.clearSelection();
				// Prepare backend delete payload
				var oMainModel = this.getView().getModel("JMConfig");
				var oPayload = {
					MdmMaster: "R",
					VariantName: vVariantName,
					Flag: "D",
					NavSearch_Variant: []
				};
				// Create call
				oMainModel.create("/Search_VariantSet", oPayload, {
					success: function() {
						ErrorHandler.showCustomSnackbar(i18n.getText("Variant_Delete_Success"), "success", this);
						this.fnConfirmationFragmentClose();
					}.bind(this),
					error: function() {
						ErrorHandler.showCustomSnackbar(i18n.getText("Variant_Delete_Error"), "Error", this);
					}.bind(this)
				});
			}
		},

		//Add variant
		fnAddVariant: function() {
			var vMaterial = this.getView().byId("SID_RECI_MATNR").getValue();
			var vPlant = this.getView().byId("SID_RECI_WERKS").getValue();
			var vGroup = this.getView().byId("SID_RECI_PLNNR").getValue();
			var vAnd = this.byId("id_and").getSelected();
			var vOr = this.byId("id_and").getSelected();
			var vSelectedIndex = [];
			var vColumnArray = this.getView().byId("id_search_table").getColumns();
			for (var i = 0; i < vColumnArray.length; i++) {
				if (vColumnArray[i].getVisible()) {
					vSelectedIndex.push(i);
				}
			}

			if (vMaterial === "" && vPlant === "" && vGroup === "" && vSelectedIndex.length === 14) {
				ErrorHandler.showCustomSnackbar(i18n.getText("inputOrColumnSelectionRequired"), "Warning", this);
			} else {
				var vTemp = [];
				var vUser = this.getView().getModel("JM_UserModel").getData();
				var vVariant = this.getView().getModel("JMVaraint");
				if (vVariant !== undefined) {
					vTemp = vVariant.getData();
					if (vTemp.length > 0) {
						var oLast = vTemp[vTemp.length - 1]; // last record
						if (oLast.New === true) {
							ErrorHandler.showCustomSnackbar(i18n.getText("completeSavePreviousRowWarn"), "Warning", this);
							return;
						}
						var vSelIndex = sap.ui.getCore().byId("id_variantTab").getSelectedIndex();
						if (vSelIndex === -1) {
							ErrorHandler.showCustomSnackbar(i18n.getText("SelectVarientToSave"), "Warning", this);
							return;
						}
						var vlen = vSelIndex;
						var vTextLen = vTemp[vlen].VarintName.length;
					}
				}
				if (vlen >= 0 && vTemp[vlen].VarintName === "") {
					ErrorHandler.showCustomSnackbar(i18n.getText("completePreviousRowWarn"), "Warning", this);
				} else if (vTextLen < 3) {
					ErrorHandler.showCustomSnackbar(i18n.getText("variantNameMinimumCharsWarn"), "Warning", this);
				} else if (vVariant !== undefined && this.Save !== undefined && !this.Save) {
					ErrorHandler.showCustomSnackbar(i18n.getText("saveVariantBeforeAddRowWarn"), "Warning", this);
				} else {
					var vEntity = {
						VarintName: "",
						User: vUser[0].Uname,
						New: true
					};
					vTemp.push(vEntity);
					var oJSONVariant = new sap.ui.model.json.JSONModel(vTemp);
					this.getView().setModel(oJSONVariant, "JMVaraint");
					sap.ui.getCore().byId("id_variantTab").setSelectedIndex((vTemp.length - 1));

					var vTable = sap.ui.getCore().byId("id_variantTab");
					vTable.setFirstVisibleRow((vTemp.length - 1));

					vTable.attachEventOnce("rowsUpdated", function() {
						var vSelRow = vTable.getFirstVisibleRow();
						vTable.getRows()[(vTemp.length - 1) - vSelRow].getCells()[0].focus();
						vTable.getRows()[(vTemp.length - 1) - vSelRow].getCells()[0].removeStyleClass("cl_varTabInput");
						vTable.getRows()[(vTemp.length - 1) - vSelRow].getCells()[0].addStyleClass("cl_varTabNew");
					});
				}
			}
		},

		// Delete Varaint
		fnDeleteVariant: function() {
			var that = this;
			var vSelIndex = sap.ui.getCore().byId("id_variantTab").getSelectedIndex();
			if (vSelIndex < 0) {
				var vErrorMsg = i18n.getText("SelectItem");
				ErrorHandler.showCustomSnackbar(i18n.getText(vErrorMsg), "Error", this);
			} else {
				var oPopupModel = new sap.ui.model.json.JSONModel({
					title: "Information",
					text: "Do you want to delete this varient",
					negativeButton: "Cancel",
					negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
					positiveButton: "Proceed",
					positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Continue.svg",
					Indicator: "DELETE_VARIENT"
				});
				// Set model with name
				this.getView().setModel(oPopupModel, "JM_Popup");
				if (!this.Confirmation) {
					this.Confirmation = sap.ui.xmlfragment(this.getView().getId(),
						"MANAGED_RECIPE.Fragment.ConfirmationExit", // Fragment path
						this
					);
					this.getView().addDependent(this.Confirmation);
				}
				this.Confirmation.open();

			}
		},

		fnSaveVariant: function() {
			this.fnSaveVariantBackend(undefined);
		},

		//Sumbit
		fnSaveVariantBackend: function(variant) {
			this.Save = true;
			var oModel = this.getView().getModel("JMConfig");
			var oModel1 = this.getView().getModel("JMListVariant");
			var aVariants = oModel1.getData();
			var vSelIndex;
			var variantName;
			var message;

			if (variant) {
				variantName = variant;
				message = i18n.getText("variantModifiedSuccess");
			} else {
				vSelIndex = sap.ui.getCore().byId("id_variantTab").getSelectedIndex();
				variantName = this.getView().getModel("JMVaraint").getData()[vSelIndex].VarintName.toUpperCase();
				message = i18n.getText("variantSavedSuccess");

				// Check if the variant already exists
				var exists = aVariants.some(function(item) {
					return item.VariantName === variantName;
				});
			}

			if (exists) {
				// Show error if variant already exists
				ErrorHandler.showCustomSnackbar(i18n.getText("variantAlreadyExists", [variantName]), "Error", this);
				return; // stop further processing
			}
			// Check if the variant name is at least 4 characters
			if (!variantName || variantName.length < 4) {
				ErrorHandler.showCustomSnackbar(i18n.getText("variantNameMinLength"), "Error", this);
				return; // stop further processing
			}

			var vIdArray = ["SID_RECI_MATNR", "SID_RECI_MATNR_DES", "SID_RECI_WERKS", "SID_RECI_WERKS_DES", "SID_RECI_PLNNR",
				"SID_RECI_PLNNR_DES", "id_or", "id_and"
			];
			var vArrayVariant = [];
			var oThat = this;
			vIdArray.forEach(function(oItem) {
				var vValue;
				if (oItem === "id_or" || oItem === "id_and") {
					var isSelected = oThat.getView().byId(oItem).getSelected();
					vValue = isSelected ? "True" : "False";
				} else {
					vValue = oThat.getView().byId(oItem).getValue();
				}
				if (vValue !== "") {
					var oPayload = {
						"MdmMaster": "R",
						"VariantName": variantName,
						"FieldId": oItem,
						"Value": vValue
					};
					vArrayVariant.push(oPayload);
				}
			});
			// Collect table column visibility
			var oTable = this.getView().byId("id_search_table");
			if (oTable) {
				oTable.getColumns().forEach(function(oCol) {
					var sColId = oCol.getId();
					var sField = sColId.split("--").pop();
					vArrayVariant.push({
						MdmMaster: "R",
						VariantName: variantName,
						FieldId: sField,
						Value: oCol.getVisible() ? "X" : ""
					});
				});
			}
			var oEntity = {
				"MdmMaster": "R",
				"Flag": "S",
				"VariantName": variantName,
				"NavSearch_Variant": vArrayVariant
			};
			var that = this;
			oModel.create("/Search_VariantSet", oEntity, {
				success: function(oData) {
					ErrorHandler.showCustomSnackbar(message, "success", that);
					if (!variant) {
						variantName = oEntity.VariantName;
						aVariants = that.getView().getModel("JMListVariant").getData();
						aVariants.push({
							VariantName: variantName
						});
						that.getView().getModel("JMListVariant").setData(aVariants);
					}
					that.fnCancelVariant();
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});
		},

		// varient row selections
		fnVarinatSelect: function(oEvent) {
			var oValueModel = this.getOwnerComponent().getModel("JMConfig");
			var sVarname = oEvent.getSource().getSelectedKey();
			var oTable = this.getView().byId("id_search_table");
			var aColumns = oTable.getColumns();

			if (sVarname === "Select Variant") {
				this.fnClearAllfields();
				aColumns.forEach(function(col) {
					col.setVisible(true);
				});
				return;
			}

			aColumns.forEach(function(col) {
				col.setVisible(false);
			});
			this.fnClearAllfields();

			var oPayload = {
				MdmMaster: "R",
				VariantName: sVarname,
				Flag: "G",
				NavSearch_Variant: []
			};
			oValueModel.create("/Search_VariantSet", oPayload, {
				success: function(oData, response) {
					var aResults = oData.NavSearch_Variant.results;
					var oView = this.getView();
					// Loop through each result entry
					aResults.forEach(function(item) {
						var sFieldId = item.FieldId;
						var sValue = item.Value;
						if (sFieldId === "id_and" || sFieldId === "id_or") {
							var oCheckbox = oView.byId(sFieldId);
							var state = (sValue === "True") ? true : false;
							oCheckbox.setSelected(state);
						} else {
							if (sValue !== "X") {
								var oInput = oView.byId(sFieldId);
								if (oInput) {
									if (oInput.setValue) {
										oInput.setValue(sValue);
									} else if (oInput.setText) {
										oInput.setText(sValue);
									}
								}
							} else {
								var iColIndex = parseInt(sFieldId.replace("__column", ""), 10);
								if (!isNaN(iColIndex) && aColumns[iColIndex]) {
									// If Value = "X" → show the column
									var bVisible = (sValue === "X");
									aColumns[iColIndex].setVisible(bVisible);
								}
							}
						}
					});
					this.fnSearch();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});

		},

		// Close Varaint
		fnCancelVariant: function() {
			this.Variant.close();
		},

		// *-----------------------------------------------------------------------------------------
		//			Function for Search Field (Added by sabarish - 06-10-2025)
		// *-----------------------------------------------------------------------------------------

		//search filter in the table  
		fnSearchTable: function(oEvent) {
			var sQuery = oEvent.getParameter("value").toLowerCase();
			var oTable = this.getView().byId("id_search_table");
			var oBinding = oTable.getBinding("rows");
			var oModel = this.getView().getModel("JM_Recidetails");
			var aAllData = oModel.getProperty("/records") || [];

			// If search is empty → reset filter and count
			if (!sQuery) {
				oBinding.filter([]);
				oModel.setProperty("/total", "(" + aAllData.length + ")");
				return;
			}

			// Create filters for multiple fields
			var aFilters = [
				new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Maktx", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Plnnr", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Plnme", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Statu", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Annam", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Aennr", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Stlan", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Stlal", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Verid", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Zkriz", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Plnal", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Plnty", sap.ui.model.FilterOperator.Contains, sQuery),
				new sap.ui.model.Filter("Plnnr", sap.ui.model.FilterOperator.Contains, sQuery)
			];

			var oFinalFilter = new sap.ui.model.Filter({
				filters: aFilters,
				and: false
			});

			// Apply filter
			oBinding.filter(oFinalFilter);

			// Delay count update slightly to let binding update
			setTimeout(function() {
				var iFilteredLength = oBinding.getLength();
				oModel.setProperty("/total", "(" + iFilteredLength + ")");
			}, 100);
		},

		// download functinalite in the table records
		fnDownloadTable: function() {
			var oModel = this.getView().getModel("JM_Recidetails");
			var aData = oModel.getProperty("/records") || [];

			if (aData.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("noDatatoDownload"), "Information", this);
				return;
			}
			if (!aData || aData.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("noDatatoDownload"), "Information", this);
				return;
			}

			// Build hard-coded structure for Excel
			var rowData = aData.map(function(item) {
				var row = {};
				row[i18n.getText("ProcessState")] = formatter.fnConverStatustoTooltip(item.Status);
				row[i18n.getText("Material")] = item.Matnr || "";
				row[i18n.getText("MaterialDesc")] = item.Maktx || "";
				row[i18n.getText("Group")] = item.Plnnr || "";
				row[i18n.getText("TaskListType")] = item.Plnty || "";
				row[i18n.getText("GroupCounter")] = item.Plnal || "";
				row[i18n.getText("Counter")] = item.Zkriz || "";
				row[i18n.getText("ProductionVersion")] = item.Verid || "";
				row[i18n.getText("AlternativeBOM")] = item.Stlal || "";
				row[i18n.getText("Usage")] = item.Stlan || "";
				row[i18n.getText("Change")] = item.Aennr || "";
				row[i18n.getText("User")] = item.Annam || "";
				row[i18n.getText("Plant")] = item.Werks || "";
				row[i18n.getText("Status")] = item.Statu || "";
				row[i18n.getText("UnitofMeasures")] = item.Plnme || "";
				return row;
			});

			// Export to Excel
			if (typeof XLSX !== "undefined") {
				var wb = window.XLSX.utils.book_new();
				var ws = window.XLSX.utils.json_to_sheet(rowData);
				window.XLSX.utils.book_append_sheet(wb, ws, "TableData");
				window.XLSX.writeFile(wb, "TableValues.xlsx");
			} else {
				sap.m.MessageToast.show("XLSX library not loaded!");
			}
		},

		// *-----------------------------------------------------------------------------------------
		//			Function for Clear all the fields and Model (Added by sabarish - 06-10-2025)
		// *-----------------------------------------------------------------------------------------

		// clear all fields in search scren 
		fnClearAllfields: function() {
			this.getView().byId("SID_RECI_MATNR").setValue("");
			this.getView().byId("SID_RECI_PLNNR").setValue("");
			this.getView().byId("SID_RECI_PLNNR_DES").setValue("");
			this.getView().byId("SID_RECI_WERKS").setValue("");
			this.getView().byId("SID_RECI_WERKS_DES").setValue("");
			this.getView().byId("SID_RECI_MATNR_DES").setValue("");
			this.getView().byId("id_combo").setSelectedKey(0);
			this.getView().byId("idRBGroup").setSelectedIndex(0); // selects "No"   
			var vSearchResults = {
				records: []
			};
			var oModel = new sap.ui.model.json.JSONModel(vSearchResults);
			this.getView().setModel(oModel, "JM_Recidetails");
		},
		// *-----------------------------------------------------------------------------------------
		//			Function for Navigate Key Data (Added by sabarish - 06-10-2025)
		// *-----------------------------------------------------------------------------------------

		// create new drop down press
		fnMenu: function(oEvent) {
			var that = this;
			var sKey1 = oEvent.getParameter("item").getKey();
			switch (sKey1) {
				case "RECI_CREATE":
					this.fnSetParmdata("RC").then(function(state) {
						if (state) {
							sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_keydata");
						}
					}.bind(this));
					break;
				case "RECI_CHANGE":

					var oTable = this.getView().byId("id_search_table");
					var index = oTable.getSelectedIndex();
					if (index === -1) {
						ErrorHandler.showCustomSnackbar(i18n.getText("selectRowToChangeProcess"), "Warning", this);
						return;
					}

					this.Selecteddata = this.getView().getModel("JM_Recidetails").getProperty("/records/" + index);

					if (this.Selecteddata.Status === "I" || this.Selecteddata.Status === "S" || this.Selecteddata.Status === "D") {
						ErrorHandler.showCustomSnackbar(this.Selecteddata.MsgLine, "Warning", this);
						return;
					}

					// show pop up
					// Example Popup model data
					var oPopupModel = new sap.ui.model.json.JSONModel({
						title: "Information",
						text: "Do you want to proceed with changing this recipe",
						negativeButton: "Cancel",
						negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
						positiveButton: "Proceed",
						positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Continue.svg",
						Indicator: "CHANGE"
					});
					// Set model with name
					this.getView().setModel(oPopupModel, "JM_Popup");
					if (!this.Confirmation) {
						this.Confirmation = sap.ui.xmlfragment(this.getView().getId(),
							"MANAGED_RECIPE.Fragment.ConfirmationExit", // Fragment path
							this
						);
						this.getView().addDependent(this.Confirmation);
					}
					this.Confirmation.open();

					break;
			}
		},

		// change function logic and get parm data and key data
		fnChangeLogic: function(Selecteddata) {
			var oServiceCall = this.getOwnerComponent().getModel();
			this.fnSetParmdata("RX").then(function(state) {
				if (state) {
					delete Selecteddata.__metadata;
					// Selecteddata.Appid = "RX";
					var oWfparm = this.getOwnerComponent().getModel("JM_ContextModel");
					oWfparm.setData(Selecteddata); // replaces the data
					oWfparm.refresh(true); // updates the bindings
					var oPayload = {};
					oPayload.Ind = "C";
					oPayload.Matnr = Selecteddata.Matnr;
					oPayload.Werks = Selecteddata.Werks;
					oPayload.NavRecipeSearch = [Selecteddata];
					oPayload.NavSearchDescription = [];
					oServiceCall.create("/Recipe_Search_HeaderSet", oPayload, {
						success: function(oData) {

							if (oData.MsgType === "E") {
								ErrorHandler.showCustomSnackbar(oData.Message, "Error", this);
							} else {

								var result = oData.NavSearchDescription.results;
								oPayload = {};
								for (var i = 0; i < result.length; i++) {
									var data = result[i];
									if (data.Fieldname === "MATNR") {
										oPayload.Matnr = data.Fieldvalue.replace(/^0+/, "");
										oPayload.Maktx = data.Fielddesc;
									}
									if (data.Fieldname === "PROFID_STD") {
										oPayload.ProfileDes = data.Fielddesc;
										oPayload.Profile = data.Fieldvalue;
									}
									if (data.Fieldname === "WERKS") {
										oPayload.WerksDes = data.Fielddesc;
										oPayload.Werks = data.Fieldvalue;
									}
								}
								oPayload.ReciDes = Selecteddata.Ktext;
								oPayload.AppId = "RX";
								oWfparm = this.getOwnerComponent().getModel("JM_KeyData");
								oWfparm.setData(oPayload); // replaces the data
								oWfparm.refresh(true); // updates the bindings
								this.Selecteddata = undefined;
								sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_keydata");
							}
						}.bind(this),
						error: function(oResponse) {
							busyDialog.close();
							var sMessage = ErrorHandler.parseODataError(oResponse);
							ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
						}.bind(this)
					});
				}
			}.bind(this));
		},

		// set the parm data in the model
		fnSetParmdata: function(AppId) {
			return new Promise(function(Resolve, Reject) {
				var KeyDataId = [
					"KID_RECI_MATNR", "KID_RECI_WERKS", "KID_RECI_PROFID_STD", "KID_RECI_RECIDES"
				];
				var oWFParmSet = this.getOwnerComponent().getModel("JMConfig");
				busyDialog.open();
				oWFParmSet.read("/WFParmSet", {
					filters: [
						new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, AppId)
					],
					success: function(oData) {
						var oEntry = oData.results[0];
						var oMatchedParams = {};
						var aInvalidParams = [];
						// Getting the workflow parameter
						Object.keys(oEntry).forEach(function(sKey) {
							if (/^WfParm\d+Id$/.test(sKey)) {
								var sVal = oEntry[sKey];
								if (sVal && sVal.trim() !== "") {
									if (KeyDataId.includes(sVal.trim())) {
										oMatchedParams[sKey] = sVal.trim();
									} else {
										aInvalidParams.push(sVal);
									}
								}
							}
						});
						oMatchedParams.AppId = oEntry.AppId;

						// bind the model for the next view
						var oWfparm = this.getOwnerComponent().getModel("JM_WfParm");
						oWfparm.setData(oMatchedParams); // replaces the data
						oWfparm.refresh(true); // updates the bindings

						if (aInvalidParams.length > 0) {
							ErrorHandler.showCustomSnackbar(i18n.getText("workflowParamNotMaintained"), "Error", this);
							Reject(false);
						} else if (Object.keys(oMatchedParams).length > 0) {
							busyDialog.close();
							Resolve(true);
						}
						busyDialog.close();
					}.bind(this),
					error: function(oResponse) {
						Reject(false);
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
					}.bind(this)
				});
			}.bind(this));
		},

		// navigation to the other views
		fnNavigateToView: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			// to navigate to the UWL screen
			if (id === "id_uwl") {
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_uwl");
			}
			if (id === "id_material") {
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_search");
			}
			if (id === "id_dashboard") {
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_dashboard");
			}
			if (id === "id_workFlow") {
				sap.m.URLHelper.redirect(
					"http://hd1sap.exalca.com:8000/sap/bc/ui5_ui5/sap/zmdm_search/webapp/index.html?sap-client=300&sap-ui-language=EN&sap-ui-xx-devmode=true",
					false);
			}
			if (id === "id_RulesEngine") {
				sap.m.URLHelper.redirect(
					"http://hd1sap.exalca.com:8000/sap/bc/ui5_ui5/sap/zmaintain_rules/webapp/index.html?sap-client=300&sap-ui-language=EN&sap-ui-xx-devmode=true",
					false);
			}
		},

		// to expand the child list
		fnNavExpandList: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			if (id === "id_appList") {
				this.getView().byId("id_appList_i").setVisible(true);
			}
		},

		fnSelectBomRow: function(oEvent) {
			var oTable = oEvent.getSource();
			var iSelectedIndex = oTable.getSelectedIndex();
			if (iSelectedIndex < 0) {
				return;
			}
			var oContext = oTable.getContextByIndex(iSelectedIndex);
			if (oContext) {
				var oRowData = oContext.getObject();
				var vStatus;
				switch (oRowData.Status) {
					case "C":
						vStatus = "success";
						break;
					case "I":
						vStatus = "Error";
						break;
					case "S":
						vStatus = "Error";
						break;
					case "R":
						vStatus = "Error";
						break;
				}
				if (oRowData.MsgLine !== "") {
					ErrorHandler.showCustomSnackbar(oRowData.MsgLine, vStatus, this);
				}
			}
		},

		fnMobileViewChanges: function() {
			this.getView().getModel("RoadMapUI").setProperty("/labelVisible", false);
			this.getView().byId("id_roadmap").removeStyleClass("cl_roadmap");
			this.getView().byId("id_roadmap").addStyleClass("cl_roadmapSS");
			this.getView().byId("id_roadmapHighlighter").removeStyleClass("cl_Highlightborder_roadMap");
			this.getView().byId("id_roadmapHighlighter").addStyleClass("cl_Highlightborder_roadMapSS");
		},
		fnTabDesktopViewChanges: function() {
			this.getView().getModel("RoadMapUI").setProperty("/labelVisible", true);
			this.getView().byId("id_roadmap").removeStyleClass("cl_roadmapSS");
			this.getView().byId("id_roadmap").addStyleClass("cl_roadmap");
			this.getView().byId("id_roadmapHighlighter").removeStyleClass("cl_Highlightborder_roadMapSS");
			this.getView().byId("id_roadmapHighlighter").addStyleClass("cl_Highlightborder_roadMap");
		},
		_onResize: function() {
			var oRange = sap.ui.Device.media.getCurrentRange(sap.ui.Device.media.RANGESETS.SAP_STANDARD);

			if (oRange.name === "Phone") {
				this.fnMobileViewChanges();
			} else {
				this.fnTabDesktopViewChanges();
			}
		},
	});
});