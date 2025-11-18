sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"RECI_MASTER/controller/ErrorHandler",
	"sap/ui/model/resource/ResourceModel",
	"sap/ui/export/Spreadsheet"
], function(Controller, ErrorHandler, ResourceModel, Spreadsheet) {
	"use strict";

	var busyDialog = new sap.m.BusyDialog();
	var i18n;

	return Controller.extend("RECI_MASTER.controller.reci_uwl", {

		onInit: function() {
			
			// ********************* IMAGE MODEL ************************
			var vPathImage = jQuery.sap.getModulePath("RECI_MASTER") + "/Image/";
			var oImageModel = new sap.ui.model.json.JSONModel({
				path: vPathImage
			});
			this.getView().setModel(oImageModel, "JM_ImageModel");

			// **********************************************************
			
			this.f4Cache = {};
			var i18nModel = new ResourceModel({
				bundleName: "RECI_MASTER.i18n.i18n"
			});
			this.getView().setModel(i18nModel, "i18n");

			i18n = this.getView().getModel("i18n").getResourceBundle();

			this.oRouter = this.getOwnerComponent().getRouter(this);
			this.oRouter.getRoute("reci_uwl").attachPatternMatched(this.fnRouter, this);
		},

		fnRouter: function() {
			busyDialog.open();
			var that = this;
			this.fnClearData();

			this.getView().byId("id_dashBoard_h").removeStyleClass("cl_listhighlight");
			this.getView().byId("id_dashBoard_h").addStyleClass("cl_list_con");
			this.getView().byId("id_uwl_h").addStyleClass("cl_listhighlight");
			this.getView().byId("id_uwl_h").removeStyleClass("cl_list_con");

			var oUsernameSet = this.getOwnerComponent().getModel("JMConfig");
			oUsernameSet.read("/UsernameSet", {
				success: function(odata) {
					var oJsonModel = new sap.ui.model.json.JSONModel();
					oJsonModel.setData({
						Uname: odata.results[0].Uname,
						Sysid: odata.results[0].Sysid
					});
					that.getView().setModel(oJsonModel, "JM_UserModel");
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error");
				}
			});

			//  to get the Application table result this filter is used
			var of4helpSet = this.getOwnerComponent().getModel("JM_Material");
			var oFilter = new sap.ui.model.Filter({
				filters: [
					new sap.ui.model.Filter("F4Type", sap.ui.model.FilterOperator.EQ, "F"),
					new sap.ui.model.Filter("FieldId", sap.ui.model.FilterOperator.EQ, "UID_APPID"),
					new sap.ui.model.Filter("Process", sap.ui.model.FilterOperator.EQ, "U")
				],
				and: true
			});
			of4helpSet.read("/f4helpSet", {
				filters: [oFilter],
				success: function(oData) {
					var oModel = new sap.ui.model.json.JSONModel();
					oModel.setData({
						List: oData.results
					});
					that.getView().setModel(oModel, "JM_AppIdModel");
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error");
				}
			});

			var aFilters = [
				new sap.ui.model.Filter("Appid", "EQ", ""),
				new sap.ui.model.Filter("Userid", "EQ", ""),
				new sap.ui.model.Filter("StartDate", "EQ", this.Date),
				new sap.ui.model.Filter("Transid", "EQ", "")
			];

			var oUWLSet = this.getOwnerComponent().getModel("JMConfig");
			oUWLSet.read("/UWLSet", {
				filters: aFilters,
				success: function(oData) {
					var aUwlData = oData.results;
					var recordLength = aUwlData.length;
					that.getView().byId("id_tableRecordCnt").setText("(" + recordLength + ")");
					var oUwlModel = new sap.ui.model.json.JSONModel();
					oUwlModel.setData(aUwlData);
					that.getView().setModel(oUwlModel, "JM_UWLModel");
					busyDialog.close();
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error");
				}
			});
		},

		// *-----------------------------------------------------------------------------------
		//					Live Change Event Functionalities
		// *----------------------------------------------------------------------------------
		fnLiveChange: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var sUpper = sValue.toUpperCase();
			oEvent.getSource().setValue(sUpper);
		},

		fnF4press: function(oEvent) {
			busyDialog.open();
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedUserid = id;
			var omodel = this.getOwnerComponent().getModel();
			var that = this;
			var aAppFilters = [
				new sap.ui.model.Filter("F4Type", sap.ui.model.FilterOperator.EQ, "P"),
				new sap.ui.model.Filter("FieldId", sap.ui.model.FilterOperator.EQ, id),
				new sap.ui.model.Filter("Process", sap.ui.model.FilterOperator.EQ, "U")
			];

			var oCombinedFilter = new sap.ui.model.Filter({
				filters: aAppFilters,
				and: true
			});

			omodel.read("/f4helpSet", {
				filters: [oCombinedFilter],
				success: function(odata, Response) {
					var aResults = odata.results;
					var oFirst = aResults[0];
					if (oFirst.MsgType === "I") {
						ErrorHandler.showCustomSnackbar(oFirst.Message, "Error");
						return;
					}
					var oLabels = {};
					var aFormattedRows = [];
					if (oFirst.Label1 && oFirst.Value1) oLabels.col1 = oFirst.Label1;
					if (oFirst.Label2 && oFirst.Value2) oLabels.col2 = oFirst.Label2;
					if (oFirst.Label3 && oFirst.Value3) oLabels.col3 = oFirst.Label3;
					if (oFirst.Label4 && oFirst.Value4) oLabels.col4 = oFirst.Label4;

					aResults.forEach(function(item) {
						var row = {};
						if (oLabels.col1) row.col1 = item.Value1;
						if (oLabels.col2) row.col2 = item.Value2;
						if (oLabels.col3) row.col3 = item.Value3;
						if (oLabels.col4) row.col4 = item.Value4;
						aFormattedRows.push(row);
					});
					var oJsonModel = new sap.ui.model.json.JSONModel({
						labels: oLabels,
						rows: aFormattedRows
					});
					that.getView().setModel(oJsonModel, "JM_F4Model");
					var vTitle = that.getView().getModel("JM_F4Model").getData().labels.col1;
					that.fnF4fragopen(vTitle, oEvent).open();
					busyDialog.close();
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error");
				}
			});

		},

		fnAppidDropDown: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedAppid = oEvent.getSource().getSelectedKey();
			this.getView().byId(id).setValueState("None");
		},

		fnDownloadUWLData: function() {
			var oModel = this.getView().getModel("JM_UWLModel");
			var aAllData = oModel.getProperty("/");

			if (!aAllData || aAllData.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("downloadNoData_Err"), "Information");
				return;
			}

			// Column definitions
			var aCols = [{
				label: "Transaction ID",
				property: "Transid",
				type: "string"
			}, {
				label: "Transaction Request",
				property: "WiText",
				type: "string"
			}, {
				label: "Sent",
				property: "WiCd",
				type: "string"
			}, {
				label: "User ID",
				property: "WiCruser",
				type: "string"
			}];

			// Export all data
			var oSpreadsheet = new sap.ui.export.Spreadsheet({
				workbook: {
					columns: aCols
				},
				dataSource: aAllData,
				fileName: "UWL_AllData.xlsx",
				worker: false,
				showProgress: false
			});
			var that = this;

			oSpreadsheet.build().then(function() {
				that.showCustomSnackbar(i18n.getText("downloadComplete_Success"), "Success");
			}).catch(function(oError) {
				that.showCustomSnackbar(i18n.getText("downloadExport_Err") + oError.message, "Error");
			});
		},

		fnDateDropDown: function(oEvent) {
			var oSelectedKey = oEvent.getSource().getSelectedKey();
			var oDateRange = this.byId("UID_RDATE");
			var today = new Date();
			var fromDate, toDate;
			switch (oSelectedKey) {
				case "CY": // Current Year
					fromDate = new Date(today.getFullYear(), 0, 1);
					toDate = new Date(today);
					break;
				case "CFY": // Current Financial Year (Apr 1 - Mar 31)
					if (today.getMonth() >= 3) {
						fromDate = new Date(today.getFullYear(), 3, 1);
						toDate = new Date(today.getFullYear() + 1, 2, 31);
					} else {
						fromDate = new Date(today.getFullYear() - 1, 3, 1);
						toDate = new Date(today.getFullYear(), 2, 31);
					}
					break;
				case "PFY": // Previous Financial Year
					if (today.getMonth() >= 3) {
						fromDate = new Date(today.getFullYear() - 1, 3, 1);
						toDate = new Date(today.getFullYear(), 2, 31);
					} else {
						fromDate = new Date(today.getFullYear() - 2, 3, 1);
						toDate = new Date(today.getFullYear() - 1, 2, 31);
					}
					break;
				case "HY":
					fromDate = new Date(today);
					fromDate.setMonth(today.getMonth() - 6);
					toDate = new Date(today);
					break;
				case "ANN":
					fromDate = new Date(today);
					fromDate.setFullYear(today.getFullYear() - 1);
					toDate = new Date(today);
					break;
				case "QTR2": // Apr 1 â€“ Jun 30
					fromDate = new Date(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1, 3, 1);
					toDate = new Date(fromDate.getFullYear(), 5, 30);
					break;
				case "QTR3": // Jul 1 â€“ Sep 30
					fromDate = new Date(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1, 6, 1);
					toDate = new Date(fromDate.getFullYear(), 8, 30);
					break;
				case "QTR4": // Oct 1 â€“ Dec 31
					fromDate = new Date(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1, 9, 1);
					toDate = new Date(fromDate.getFullYear(), 11, 31);
					break;
				case "QTR1": // Jan 1 â€“ Mar 31
					fromDate = new Date(today.getMonth() >= 3 ? today.getFullYear() + 1 : today.getFullYear(), 0, 1);
					toDate = new Date(fromDate.getFullYear(), 2, 31);
					break;
			}
			// Set date range
			oDateRange.setDateValue(fromDate);
			oDateRange.setSecondDateValue(toDate);
		},

		fnTableFilter: function(oEvent) {
			var oButton = oEvent.getSource();
			var that = this;

			var oList = new sap.m.List({
				items: [
					new sap.m.StandardListItem({
						title: "Customize",
						type: "Active",
						icon: "Image/customize.svg",
						press: that.fnCustomizeTableColumns.bind(that)
					}).addStyleClass("cl_uwl_customizefilterlistitem"),

					new sap.m.StandardListItem({
						title: that.textWrap ? "Clip Text" : "Wrap Text",
						type: "Active",
						icon: "Image/Warptext.svg",
						press: that.fnWrapText.bind(that)
					}).addStyleClass("cl_uwl_wrapfilterlistitem")
				]
			}).addStyleClass("cl_uwl_filterlistitem");

			var oClrButton = new sap.m.Button({
				text: "Clear",
				icon: "Image/clearallicon.svg",
				press: function() {
					var oTable = that.getView().byId("id_UWLtable");
					var aColumns = oTable.getColumns();
					aColumns.forEach(function(oColumn) {
						oTable.filter(oColumn, "");
					});
				}
			}).addStyleClass("cl_uwl_clearfilterlistitem");

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
			var vColumnArray = this.getView().byId("id_UWLtable").getColumns();
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
				this.Customzie = sap.ui.xmlfragment("RECI_MASTER.Fragment.customize_table", this);
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
				ErrorHandler.showCustomSnackbar(i18n.getText("noColumnSelectedError"), "Error");
			} else {
				for (var i = 0; i < vColumnArray.length; i++) {
					this.getView().byId("id_UWLtable").getColumns()[i].setVisible(vColumnArray[i].Visible);
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
		
		fnWrapText: function(oEvent) {
			var that = this;
			var oTable = that.getView().byId("id_UWLtable");
			var oColumns = oTable.getColumns();
			var oItem = oEvent.getSource();

			var iTransReqColIndex = 3;

			if (!that.textWrap) {
				oItem.setTitle("Clip Text");
				that.textWrap = true;

				oColumns[iTransReqColIndex].setWidth("45%");
				oColumns[iTransReqColIndex - 2].setWidth("30%");
				oTable.addStyleClass("cl_uwl_TransReqWrap");
			} else {
				oItem.setTitle("Wrap Text");
				that.textWrap = false;

				oColumns[iTransReqColIndex].setWidth("15%");
				oColumns[iTransReqColIndex - 2].setWidth("70%");
				oTable.removeStyleClass("cl_uwl_TransReqWrap");
			}
		},

		fnUWLSearch: function() {
			busyDialog.open();
			if (this.selectedAppid) {
				var rangeDate = this.getView().byId("UID_RDATE").getValue();
				var formattedRange;
				if (rangeDate) {
					var aRangeParts = rangeDate.split(" - ");
					// Basic structure check
					if (aRangeParts.length !== 2) {
						ErrorHandler.showCustomSnackbar(i18n.getText("dateSelection_Err"), "Error");
						return;
					}
					var startRaw = aRangeParts[0].trim();
					var endRaw = aRangeParts[1].trim();
					// Now try to parse using Date
					var startStr = new Date(startRaw);
					var endStr = new Date(endRaw);
					if (isNaN(startStr.getTime()) || isNaN(endStr.getTime())) {
						ErrorHandler.showCustomSnackbar(i18n.getText("dateInvalidValues_Err"), "Error");
						return;
					}
					// Check if start is before end
					if (startStr > endStr) {
						ErrorHandler.showCustomSnackbar(i18n.getText("dateAlign_Err"), "Error");
						return;
					}
					// Format and assign
					var startDate = this.fnFormatDate(startStr);
					var endDate = this.fnFormatDate(endStr);
					formattedRange = startDate + "-" + endDate;
				} else {
					formattedRange = "";
				}
				var transId = this.getView().byId("UID_TRANSID").getValue();
				var userId = this.getView().byId("UID_USERID").getValue();
				var oFilters = [
					new sap.ui.model.Filter("Appid", sap.ui.model.FilterOperator.EQ, this.selectedAppid),
					new sap.ui.model.Filter("Transid", sap.ui.model.FilterOperator.EQ, transId),
					new sap.ui.model.Filter("Userid", sap.ui.model.FilterOperator.EQ, userId),
					new sap.ui.model.Filter("StartDate", sap.ui.model.FilterOperator.EQ, formattedRange)
				];
				var oCombinedFilter1 = new sap.ui.model.Filter({
					filters: oFilters,
					and: true
				});
				var searchServiceCall = this.getOwnerComponent().getModel("JMConfig");
				var that = this;
				searchServiceCall.read("/UWLSet", {
					filters: [oCombinedFilter1],
					success: function(oData) {
						var aUwlData = oData.results;
						var recordLength = aUwlData.length;
						that.getView().byId("id_tableRecordCnt").setText("(" + recordLength + ")");
						var oUwlModel = new sap.ui.model.json.JSONModel();
						oUwlModel.setData(aUwlData); // Wrap in 'results' for table binding
						that.getView().setModel(oUwlModel, "JM_UWLModel");
						busyDialog.close();
					},
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error");
					}
				});
			} else {
				ErrorHandler.showCustomSnackbar("Application Id is Mandatory", "Error");
				this.getView().byId("UID_APPID").setValueState("Error");
				this.getView().byId("UID_APPID").setValueStateText(" ");
				busyDialog.close();
			}
		},

		fnFormatDate: function(date) {
			var yyyy = date.getFullYear();
			var mm = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
			var dd = String(date.getDate()).padStart(2, "0");
			return yyyy + mm + dd;
		},

		// to open fragment
		fnF4fragopen: function(vTitle, oEvent) {
			if (!this.f4HelpFrag) {
				this.f4HelpFrag = sap.ui.xmlfragment(this.getView().getId(), "RECI_MASTER.fragment.F4Help", this);
				this.getView().addDependent(this.f4HelpFrag);
			}
			this.f4HelpFrag.setTitle(vTitle);
			return this.f4HelpFrag;
		},

		// if selecting any row from the f4 
		fnF4Itempress: function(oEvent) {
			var oItem = oEvent.getSource();
			var oContext = oItem.getBindingContext("JM_F4Model");
			if (oContext) {
				var item = oContext.getProperty("col1");
				this.getView().byId(this.selectedUserid).setValue(item);
			}
			this.fnAfterCloseFragment(oEvent);
		},

		fnf4HelpCancel: function(oEvent) {
			var that = this;
			setTimeout(function() {
				that.fnF4fragopen().close();
			}, 0);
		},

		fnAfterCloseFragment: function(oEvent) {
			this.f4HelpFrag.destroy();
			this.f4HelpFrag = null;
		},

		// to search the values in the F4 help
		fnValueSearch: function(oEvent) {
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

		fnClearData: function() {
			this.selectedAppid = "";
			this.selectedUserid = "";
			this.getView().byId("UID_APPID").setValue("");
			this.getView().byId("UID_TRANSID").setValue("");
			this.getView().byId("UID_RDATE").setValue("");
			this.getView().byId("UID_USERID").setValue("");

			var today = new Date();
			var toDate = new Date(today);
			var fromDate = new Date(today);
			fromDate.setDate(fromDate.getDate() - 7);

			// Function to format for your backend (if needed)
			function fnFormatDate(date) {
				var yyyy = date.getFullYear();
				var mm = String(date.getMonth() + 1).padStart(2, '0');
				var dd = String(date.getDate()).padStart(2, '0');
				return yyyy + mm + dd;
			}

			// Example backend string: 20250716-20250731
			this.Date = fnFormatDate(fromDate) + "-" + fnFormatDate(toDate);

			// Set the DateRangeSelection field
			var oDateRange = this.byId("UID_RDATE");
			if (oDateRange) {
				oDateRange.setDateValue(fromDate); // Start date
				oDateRange.setSecondDateValue(toDate); // End date
			}

			var oViewstateModel = new sap.ui.model.json.JSONModel({
				fromUWL: false
			});
			sap.ui.getCore().setModel(oViewstateModel, "JM_ViewStateModel");
		},

		fnTransidPress: function(oEvent) {
			var GlobalData = this.getView().getModel("JM_UWLModel").getData();
			var index = oEvent.getSource().getBindingContext("JM_UWLModel").sPath.split("/")[1];

			var transId = GlobalData[index].Transid;
			var workItemId = GlobalData[index].WiId;
			var TypeLevel = GlobalData[index].TypeLvl;
			var sendBack = GlobalData[index].SendBackInd;

			var appid = GlobalData[index].Appid;
			if (appid === "RC" || appid === "RX") {
				var jsonData = {
					Appid: appid,
					Transid: transId,
					Ind: "X",
					MsgType: "D",
					WiId: workItemId,
					Level: TypeLevel,
					Sendback: sendBack
				};
				var oContextModel = this.getOwnerComponent().getModel("JM_ContextModel");
				oContextModel.setData(jsonData); // replaces the data
				oContextModel.refresh(true); // updates the bindings
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_initiator");
			}
		},

		// *************************************************************************************************************************
		//									Navigation function logic
		// *************************************************************************************************************************

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

		fnNavExpandList: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			if (id === "id_appList") {
				this.getView().byId("id_appList_i").setVisible(true);
			}

		},

		onNavBack: function() {
			this.fnClearData();
			sap.ui.core.UIComponent.getRouterFor(this).navTo("Dashboard");
		}

	});

});