sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"RECI_MASTER/controller/ErrorHandler",
	"sap/ui/model/resource/ResourceModel",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Filter",
	"RECI_MASTER/Formatter/formatter"
], function(Controller, ErrorHandler, ResourceModel, FilterOperator, Filter, formatter) {
	"use strict";

	var i18n;
	var busyDialog = new sap.m.BusyDialog();

	return Controller.extend("RECI_MASTER.controller.reci_dashboard", {
		formatter: formatter,

		onInit: function() {
			// ********************* IMAGE MODEL ************************
			var vPathImage = jQuery.sap.getModulePath("RECI_MASTER") + "/Image/";
			var oImageModel = new sap.ui.model.json.JSONModel({
				path: vPathImage
			});
			this.getView().setModel(oImageModel, "JM_ImageModel");

			// **********************************************************
			
			
			
			var i18nModel = new ResourceModel({
				bundleName: "RECI_MASTER.i18n.i18n"
			});
			this.getView().setModel(i18nModel, "i18n");

			i18n = this.getView().getModel("i18n").getResourceBundle();

			this.f4Cache = {};
			this.oRouter = this.getOwnerComponent().getRouter(this);
			this.oRouter.getRoute("reci_dashboard").attachPatternMatched(this.fnRouter, this);
		},

		fnRouter: function() {

			// Apply UI style changes
			this.getView().byId("id_uwl_h").removeStyleClass("cl_listhighlight");
			this.getView().byId("id_appList_h").removeStyleClass("cl_listhighlight");
			this.getView().byId("id_appList_h").addStyleClass("cl_list_con");
			this.getView().byId("id_uwl_h").addStyleClass("cl_list_con");
			this.getView().byId("id_dashBoard_h").addStyleClass("cl_listhighlight");

			// to expand and collapse the value
			var opayload = {
				visible: true,
				advanceSearch: false,
				toolbar: true
			};
			var model = new sap.ui.model.json.JSONModel(opayload);
			this.getView().setModel(model, "JM_Visible");

			// to set the customize table
			var oVisibility = {
				trans: true,
				application: true,
				sapcode: true,
				desc: true,
				startDate: true,
				endDate: true,
				userid: true,
				overAlltime: true,
				wrap: false
			};
			this.getView().setModel(new sap.ui.model.json.JSONModel(oVisibility), "JMVisible");

			this.fnUsernameGet().then(function(Username) {
				if (Username !== "" || Username !== undefined) {
					this.fnsetDashboardData(Username);
					this.fnOdataCallforStatus();
				}
			}.bind(this));

		},

		fnOdataCallforStatus: function() {
			var oPayload = {
				FieldId: "DID_RECI_STATUS",
				Process: "D",
				F4Type: "F"
			};
			oPayload.NavSerchResult = [];

			var omodel1 = this.getOwnerComponent().getModel("JMConfig");
			omodel1.setUseBatch(false);
			busyDialog.open();
			omodel1.create("/SearchHelpSet", oPayload, {
				success: function(odata) {
					var aResults = odata.NavSerchResult.results;
					var oJsonModel = new sap.ui.model.json.JSONModel();
					oJsonModel.setData(aResults);
					this.getView().setModel(oJsonModel, "JMStatus");
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error");
				}
			});
		},
		fnUsernameGet: function() {
			return new Promise(function(Resolve, Reject) {
				var oUserModel = this.getOwnerComponent().getModel("JMConfig");
				busyDialog.open();
				oUserModel.read("/UsernameSet", {
					success: function(oData) {
						var oJsonModel = new sap.ui.model.json.JSONModel();
						oJsonModel.setData(oData.results);
						var username = oData.results[0].Uname;
						this.getView().setModel(oJsonModel, "JM_UserModel");
						Resolve(username);
						var uname = oData.results[0].Uname;
						this.getView().byId("DID_RECI_WF_AGENT").setValue(uname);
						busyDialog.close();
					}.bind(this),
					error: function(oResponse) {
						Reject(undefined);
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error");
					}
				});
			}.bind(this));
		},

		fnsetDashboardData: function(username) {
			var drafted = "";
			var oUserModel = this.getOwnerComponent().getModel("JMConfig");

			var oComboBox = this.getView().byId("DID_RECI_STATUS");
			oComboBox.setSelectedKey("C"); // for example
			var sStatus = drafted === "" ? "C" : drafted;
			var today = new Date();
			var sevenDaysBefore = new Date();
			sevenDaysBefore.setDate(today.getDate() - 7);

			this.getView().byId("DID_RECI_FDATE").setDateValue(sevenDaysBefore);
			this.getView().byId("DID_RECI_TDATE").setDateValue(today);

			this.oPayload = {
				Transid: "",
				AppId: "ALL",
				UserId: username,
				StartDate: sevenDaysBefore,
				EndDate: today,
				Status: sStatus,
				ObjValue: "",
				Top: 0,
				Skip: 0,
				WfParm3: "",
				WfParm4: "",
				NavDashTab: [],
				NavDashLvl: []
			};
			busyDialog.open();
			oUserModel.create("/DashboardSet", this.oPayload, {
				success: function(oData) {
					// Populate models from dashboard data
					var oJsonModel = new sap.ui.model.json.JSONModel(oData);
					this.getView().setModel(oJsonModel, "JM_RECORDCOUNT");
					oJsonModel.refresh(true);

					var oFilterDataJsonModel = new sap.ui.model.json.JSONModel();
					var aFilterResults = oData.NavDashTab.results;

					// Added by saraswathi
					oFilterDataJsonModel.setData(aFilterResults);
					this.getView().setModel(oFilterDataJsonModel, "JM_DASHBOARD");

					this.totalRecords = oData.TotalCount;
					this.pageSize = 250;
					this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
					this.currentPage = 1;

					this.fnCreatePagination();

					var aData = oFilterDataJsonModel.getData();
					aData.forEach(function(n) {
						n.levelIcon = "Image/level.svg";
						n.expanded = false;
						n.canExpand = n.AppId !== "Material Block and Unblock";
						if (!n.canExpand) {
							n.levelIcon = "";
						}
					});
					oFilterDataJsonModel.setData(aData);
					oFilterDataJsonModel.refresh(true);

					var iCount = aFilterResults.length;
					this.getView().byId("idResultCount").setText("(" + iCount + ")");

					var oDashLevelModel = new sap.ui.model.json.JSONModel({
						LevelData: oData.NavDashLvl.results || []
					});
					oData.NavDashLvl.results.forEach(function(item) {
						switch (item.Status) {
							case "Complete":
								item.rowClass = "Success"; // or highlight: "Success"
								break;
							case "Requested / Inprogress":
								item.rowClass = "Warning"; // or highlight: "Error"
								break;
							case "Initiated":
								item.rowClass = "Warning"; // or highlight: "Warning"
								break;
							case "Completed":
								item.rowClass = "Success"; // or highlight: "Success"
								break;
							case "Rejected":
								item.rowClass = "Error";
								break;
							case "Saved as draf":
								item.rowClass = "Informtaion";
								break;
							default:
								item.rowClass = "Information"; // or highlight: "None"
						}
					});
					this.getView().setModel(oDashLevelModel, "LevelModel");
					busyDialog.close();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error");
				}
			});
		},

		fnCreatePagination: function() {
			var hbox = this.getView().byId("idPaginationBar");
			hbox.removeAllItems();

			var totalPages = this.totalPages;
			var currentPage = this.currentPage;

			var that = this;

			function createBtn(label, page, isActive, icon, iconAfter) {
				return new sap.m.Button({
					text: label,
					icon: icon || "",
					//type: isActive ? "Emphasized" : "Default",
					enabled: page >= 1 && page <= totalPages,
					press: function() {
						if (page !== that.currentPage) {

							if (page === 1) {
								that.oPayload.Top = 0;
								that.oPayload.Skip = 0;
							} else {
								that.oPayload.Top = 250;
								that.oPayload.Skip = (page - 1) * 250;
							}

							that.currentPage = page;

							that.fnCreatePagination();
							that.fngetSearch(true);
						}

					}
				}).addStyleClass("sapUiTinyMarginEnd " + (isActive ? " cl_paginationButtonActive" : "cl_paginationButton"));
			}

			// Prev button
			hbox.addItem(createBtn("Previous", currentPage - 1));

			var oVBox = new sap.m.HBox({
				alignItems: "Center"
			});

			// Number series
			for (var i = 1; i <= totalPages; i++) {
				oVBox.addItem(createBtn(i.toString(), i, i === currentPage));
			}
			hbox.addItem(oVBox);
			// Next button
			hbox.addItem(createBtn("Next", currentPage + 1));
		},

		fnLevelIconPress: function(oEvent) {
			var oImage = oEvent.getSource();
			var oContext = oImage.getBindingContext("JM_DASHBOARD");
			var oRowData = oContext.getObject();
			
			var sTransId = oRowData.Transid;
			
			// Toggle expand state
			oRowData.expanded = !oRowData.expanded;
			
			// Toggle icon path
			oRowData.levelIcon = oRowData.expanded ? "Image/level_open.svg" : "Image/level.svg";
			
			// Icon style classes
			oImage.removeStyleClass("cl_db_levelIconOpen");
			oImage.removeStyleClass("cl_db_columnCellIcon");
			oImage.addStyleClass(oRowData.expanded ? "cl_db_levelIconOpen" : "cl_db_columnCellIcon");
			// Filter LevelModel data for this row only
			if (oRowData.expanded) {
				var oFullLevelData = this.getView().getModel("LevelModel").getProperty("/LevelData") || [];
				var aFiltered = oFullLevelData.filter(function(item) {
					return item.Transid === sTransId;
				});
				// Set filtered data temporarily in the row object
				oRowData._FilteredLevelData = aFiltered;
			}
			// Refresh model to update icon, expanded state, and filtered inner table
			oContext.getModel().refresh();
		},

		//*------------------------------------------------------------------------------------------------- 
		//										expand collable for table 
		// *------------------------------------------------------------------------------------------------

		fnExpand: function() {
			this.getView().getModel("JM_Visible").setProperty("/visible", false);
			this.getView().byId("id_Scrollcontainer").removeStyleClass("cl_listScrollhegiht");
			this.getView().byId("id_Scrollcontainer").addStyleClass("cl_listScrollhegihtSS");
		},

		fnCollapse: function() {
			this.getView().getModel("JM_Visible").setProperty("/visible", true);
			this.getView().byId("id_Scrollcontainer").removeStyleClass("cl_listScrollhegihtSS");
			this.getView().byId("id_Scrollcontainer").addStyleClass("cl_listScrollhegiht");
		},

		// *-------------------------------------------------------------------------------------------------
		//									Table Filter column function logic
		// *-------------------------------------------------------------------------------------------------

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

		fnCustomizeTableColumns: function() {
			var aListHeaders = [{
				CId: "trans",
				CName: "Transaction Id",
				Visible: true
			}, {
				CId: "application",
				CName: "Application",
				Visible: true
			}, {
				CId: "sapcode",
				CName: "SAP Code",
				Visible: true
			}, {
				CId: "desc",
				CName: "Description",
				Visible: true
			}, {
				CId: "startDate",
				CName: "Start Date",
				Visible: true
			}, {
				CId: "endDate",
				CName: "End Date",
				Visible: true
			}, {
				CId: "userid",
				CName: "User Id",
				Visible: true
			}, {
				CId: "overAlltime",
				CName: "Over all time",
				Visible: true
			}];
			var oVisibleModel = new sap.ui.model.json.JSONModel(aListHeaders);
			this.getView().setModel(oVisibleModel, "JMColumn");
			if (!this.Customzie) {
				this.Customzie = sap.ui.xmlfragment("RECI_MASTER.Fragment.customize_table", this);
				this.getView().addDependent(this.Customzie);
			}
			this.Customzie.open();
			if (this.aSelectedIndices) {
				var vSelectedIndices = [this.aSelectedIndices];
			} else {
				vSelectedIndices = [];
			}

			var vItems = sap.ui.getCore().byId('id_columnSel').getItems();
			if (vSelectedIndices.length === 0) {
				sap.ui.getCore().byId("id_checkselect").setSelected(true);
				sap.ui.getCore().byId("id_checkselect").removeStyleClass("cl_checkbox");
				sap.ui.getCore().byId("id_checkselect").addStyleClass("cl_checkboxSel");
			}
			for (var i = 0; i < vSelectedIndices.length; i++) {
				vItems[this.aSelectedIndices[i]].getContent()[0].getContent()[0].removeStyleClass("cl_checkbox");
				vItems[this.aSelectedIndices[i]].getContent()[0].getContent()[0].addStyleClass("cl_checkboxSel");
			}
		},

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
				ErrorHandler.showCustomSnackbar(i18n.getText("columnSelectionRequired"), "Error");
			} else {
				for (var i = 0; i < vColumnArray.length; i++) {
					var id = vColumnArray[i].CId;
					var satate = vColumnArray[i].Visible;
					this.getView().getModel("JMVisible").setProperty("/" + id, satate);
				}
				this.getView().getModel("JMVisible").refresh(true);
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

		// *-------------------------------------------------------------------------------------------------
		//									Search press function
		// *-------------------------------------------------------------------------------------------------
		fnSearch: function() {
			this.fngetSearch(false);
		},
		fngetSearch: function(isPaginationSearch) {
			var that = this;
			var iTop = (!isPaginationSearch) ? 0 : (this.oPayload.Top ? this.oPayload.Top : 0);
			var iSkip = (!isPaginationSearch) ? 0 : (this.oPayload.Skip ? this.oPayload.Skip : 0);

			var bAllEmpty = true;

			// fixed inputs
			[
				"DID_RECI_TRANS_ID",
				"DID_RECI_WF_APPID",
				"DID_RECI_WF_AGENT",
				"DID_RECI_FDATE",
				"DID_RECI_TDATE",
				"DID_RECI_STATUS",
				"DID_OBJVAL"
			].forEach(function(sId) {
				var oInput = that.getView().byId(sId);
				if (oInput && oInput.getValue().trim() !== "") {
					bAllEmpty = false;
				}
			});

			// dynamic inputs
			if (this._dynamicInputIds) {
				this._dynamicInputIds.forEach(function(id) {
					var oInput = that.getView().byId(id);
					if (oInput && oInput.getValue().trim() !== "") {
						bAllEmpty = false;
					}
				});
			}

			if (bAllEmpty) {
				ErrorHandler.showCustomSnackbar(i18n.getText("searchFieldRequired"), "Error");
				return;
			}

			var sStatus = this.getView().byId("DID_RECI_STATUS").getSelectedKey();
			var sAppID = this.getView().byId("DID_RECI_WF_APPID").getValue();
			if (sAppID.length > 2) {
				sAppID = sAppID.split("-")[0].trim();
			}

			var oModel = this.getView().getModel("JMConfig");
			this.oPayload = {
				Transid: this.getView().byId("DID_RECI_TRANS_ID").getValue(),
				AppId: bAllEmpty ? "ALL" : sAppID,
				UserId: this.getView().byId("DID_RECI_WF_AGENT").getValue(),
				StartDate: this.getView().byId("DID_RECI_FDATE").getValue() || null,
				EndDate: this.getView().byId("DID_RECI_TDATE").getValue() || null,
				Status: sStatus,
				ObjValue: this.getView().byId("DID_OBJVAL").getValue(),
				Top: iTop,
				Skip: iSkip,
				WfParm3: "",
				WfParm4: "",
				NavDashTab: [],
				NavDashLvl: []
			};

			// Set dynamic fields if any
			if (this._dynamicInputIds) {
				this._dynamicInputIds.forEach(function(id, index) {
					var oInput = that.getView().byId(id);
					if (oInput) {
						that.oPayload["WfParm" + (index + 1)] = oInput.getValue();
					}
				});
			}

			busyDialog.open();
			oModel.create("/DashboardSet", this.oPayload, {
				success: function(oData) {
					var oJsonModel = new sap.ui.model.json.JSONModel();
					var aResults = oData.NavDashTab.results;
					oJsonModel.setData(aResults);
					that.getView().setModel(oJsonModel, "JM_DASHBOARD");

					// Pagination setup
					that.totalRecords = oData.TotalCount;
					that.pageSize = 250;
					that.totalPages = Math.ceil(that.totalRecords / that.pageSize);
					if (!isPaginationSearch) {
						that.currentPage = 1;
					}
					that.fnCreatePagination();

					// UI adjustments and post-processing
					var aData = oJsonModel.getData();
					aData.forEach(function(oItem) {
						oItem.levelIcon = "Image/level.svg";
						oItem.canExpand = true;
						oItem.expanded = false;

						if (oItem.AppId === "Material Block and Unblock") {
							oItem.levelIcon = "";
							oItem.canExpand = false;
						}
					});
					oJsonModel.setData(aData);
					oJsonModel.refresh(true);

					// Update count text
					var iCount = aResults.length;
					that.getView().byId("idResultCount").setText("(" + iCount + ")");

					// Set Level data
					var oDashLevelModel = new sap.ui.model.json.JSONModel({
						LevelData: oData.NavDashLvl.results || []
					});
					oData.NavDashLvl.results.forEach(function(item) {
						switch (item.Status) {
							case "Complete":
								item.rowClass = "Success"; // or highlight: "Success"
								break;
							case "Requested / Inprogress":
								item.rowClass = "Warning"; // or highlight: "Error"
								break;
							case "Initiated":
								item.rowClass = "Warning"; // or highlight: "Warning"
								break;
							case "Completed":
								item.rowClass = "Success"; // or highlight: "Success"
								break;
							case "Rejected":
								item.rowClass = "Error";
								break;
							case "Saved as draf":
								item.rowClass = "Informtaion";
								break;
							default:
								item.rowClass = "Information"; // or highlight: "None"
						}
					});
					that.getView().setModel(oDashLevelModel, "LevelModel");

					// Show messages
					// ErrorHandler.showCustomSnackbar(aData.length + " " + i18n.getText("RecordFetchSuccess"), "success");
					// if (aData.length === 0) {
					// 	// ErrorHandler.showCustomSnackbar(i18n.getText("noRecord"), "Warning");
					// 	that.getView().byId("id_List").removeStyleClass("cl_MainList");
					// } else {
					// 	that.getView().byId("id_List").addStyleClass("cl_MainList");
					// }

					// Only update record count model if on first page (to avoid flicker during pagination)
					if (that.oPayload.Top === 0 && that.oPayload.Skip === 0) {
						var oCountJsonModel = new sap.ui.model.json.JSONModel();
						oCountJsonModel.setData(oData);
						that.getView().setModel(oCountJsonModel, "JM_RECORDCOUNT");
					}

					busyDialog.close();
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error");
				}
			});
		},

		// *-------------------------------------------------------------------------------------------------
		//									Live Change Actions
		// *-------------------------------------------------------------------------------------------------

		fnLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oInput.getId().split("--")[1];
			var vValue = oInput.getValue().toUpperCase();

			// Convert input to uppercase (for text fields)
			oInput.setValue(vValue);

			this.selectedField = id;
			oInput.setValueState("None"); // reset previous error	
		},

		// *-------------------------------------------------------------------------------------------------
		//									F4 logic
		// *-------------------------------------------------------------------------------------------------

		fnF4press: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedField = id;
			var f4type;
			if (["DID_RECI_STATUS", "DID_RECI_WF_APPID"].includes(id)) {
				f4type = "F";
			} else {
				f4type = "P";
			}
			var oPayload = {
				FieldId: id,
				Process: "D",
				F4Type: f4type
			};
			oPayload.NavSerchResult = [];
			this.bindTextF4model(oPayload, oEvent);
		},

		bindTextF4model: function(opayload, oEvent) {
			var oJsonModel;
			var vTitle;
			var oLabels = {};
			var vLength;
			var aFormattedRows = [];
			var omodel1 = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			omodel1.create("/SearchHelpSet", opayload, {
				success: function(odata) {
					if (odata.MsgType === "E") {
						ErrorHandler.showCustomSnackbar(odata.Message, "Error");
						return;
					}

					var aResults = odata.NavSerchResult.results;
					if (aResults.length > 0) {
						var oFirst = aResults[0];
						if (oFirst && (oFirst.DomvalueL || oFirst.Ddtext)) {
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								ErrorHandler.showCustomSnackbar(oFirst.Message, "Error");
								return;
							}
							vLength = aResults.length;
							oLabels.col1 = "Key";
							if (oFirst.Label2) oLabels.col2 = oFirst.Label2;
							aResults.forEach(function(item) {
								var row = {};
								if (oLabels.col1) row.col1 = item.DomvalueL;
								if (oLabels.col2) row.col2 = item.Ddtext;
								if (oLabels.col3) row.col3 = item.DomvalueL3;
								if (oLabels.col4) row.col4 = item.DomvalueL4;
								aFormattedRows.push(row);
							});
							oJsonModel = new sap.ui.model.json.JSONModel({
								labels: oLabels,
								rows: aFormattedRows
							});
							this.getView().setModel(oJsonModel, "JM_F4Model");
							vTitle = this.getView().byId(this.selectedField + "_TXT").getText() + " (" + vLength + ")";
							this.fnF4fragopen(oEvent, vTitle).open();
						} else {
							vLength = odata.NavSerchResult.results.length;
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								ErrorHandler.showCustomSnackbar(oFirst.Message, "Error");
								return;
							}
							if (oFirst.Label1) oLabels.col1 = oFirst.Label1;
							if (oFirst.Label2) oLabels.col2 = oFirst.Label2;
							if (oFirst.Label3) oLabels.col3 = oFirst.Label3;
							if (oFirst.Label4) oLabels.col4 = oFirst.Label4;

							if (this.selectedField === "ID_RECI_VAGRP") {
								aResults
									.filter(function(item) {
										return item.Value3 === this.getView().getModel("JM_KeydataModel").getProperty("/Werks");
									})
									.forEach(function(item) {
										var row = {};
										row.col1 = item.Value1;
										if (oLabels.col2) row.col2 = item.Value2;
										if (oLabels.col3) row.col3 = item.Value3;
										if (oLabels.col4) row.col4 = item.Value4;
										aFormattedRows.push(row);
									});
							} else {
								aResults.forEach(function(item) {
									var row = {};
									if (oLabels.col1 === "Material") {
										row.col1 = item.Value1 ? item.Value1.replace(/^0+/, "") : item.Value1;
									} else {
										row.col1 = item.Value1;
									}
									if (oLabels.col2) row.col2 = item.Value2;
									if (oLabels.col3) row.col3 = item.Value3;
									if (oLabels.col4) row.col4 = item.Value4;
									aFormattedRows.push(row);
								});
							}
							oJsonModel = new sap.ui.model.json.JSONModel({
								labels: oLabels,
								rows: aFormattedRows
							});
							this.getView().setModel(oJsonModel, "JM_F4Model");
							this.getView().getModel("JM_F4Model");
							vTitle = this.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";
							this.fnF4fragopen(oEvent, vTitle).open();
						}
					}
					busyDialog.close();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error");
				}
			});

		},

		fnF4Itempress: function(oEvent) {
			var oItem = oEvent.getSource();
			var oContext = oItem.getBindingContext("JM_F4Model");
			if (!oContext) {
				return;
			}
			var item = oContext.getProperty("col1"); // Value (e.g., 'IN')
			var item1 = oContext.getProperty("col2"); // Description (e.g., 'India')
			this.getView().byId(this.selectedField).setValue(item);
			this.getView().byId(this.selectedField).setValueState("None");

			var desId = this.getView().byId(this.selectedField + "_DES");
			if (desId) {
				desId.setValue(item1);
			}

			this.fnAfterCloseFragment();
		},

		fnF4fragopen: function(oEvent, vTitle) {
			if (!this.f4HelpFrag) {
				this.f4HelpFrag = sap.ui.xmlfragment(this.getView().getId(), "RECI_MASTER.fragment.F4Help", this);
				this.getView().addDependent(this.f4HelpFrag);
			}
			this.f4HelpFrag.setTitle(vTitle);
			return this.f4HelpFrag;
		},

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

		fnValueSearch: function(oEvent) {
			var oInput = oEvent.getSource();
			var sValue = oInput.getValue();
			oInput.setValue(sValue.toUpperCase());
			var sQuery = oEvent.getSource().getValue().toLowerCase();
			// Get table and binding
			var oTable = this.byId("idMaterialTable");
			var oBinding = oTable.getBinding("items");
			if (!oBinding) return;
			var aFilters = [];
			// Filter on all possible columns
			if (sQuery) {
				aFilters.push(new sap.ui.model.Filter({
					filters: [
						new sap.ui.model.Filter("col1", sap.ui.model.FilterOperator.StartsWith, sQuery),
						new sap.ui.model.Filter("col2", sap.ui.model.FilterOperator.StartsWith, sQuery),
						new sap.ui.model.Filter("col3", sap.ui.model.FilterOperator.StartsWith, sQuery),
						new sap.ui.model.Filter("col4", sap.ui.model.FilterOperator.StartsWith, sQuery)
					],
					and: false
				}));
			}
			oBinding.filter(aFilters, "Application");
		},

		// *-------------------------------------------------------------------------------------------------
		//									Transaction ID click functinalities
		// *-------------------------------------------------------------------------------------------------
		fnTransidPress: function(oEvent) {
			var index = oEvent.getSource().getBindingContext("JM_DASHBOARD").sPath.split("/")[1];
			var vTransid = oEvent.getSource().getModel("JM_DASHBOARD").getProperty("/" + index).Transid;
			var appid = vTransid.substring(0, 2);
			var status = oEvent.getSource().getModel("JM_DASHBOARD").getProperty("/" + index).Status;
			var progress = "";
			if (status === "Complete") {
				progress = "Complete";
			} else if (status === "Requested / Inprogress") {
				progress = "Inprogress";
			} else if (status === "Sendback") {
				progress = "SendBack";
			} else if (status === "Reject") {
				progress = "Reject";
			} else if (status === "Saved as draft") {
				progress = "Draft";
			}
			if (status === "Saved as draft") {
				var jsonData = {
					Appid: appid,
					Transid: vTransid,
					Ind: "D",
					Level: "I",
					Progress: progress
				};
				var oProductionVersion = this.getOwnerComponent().getModel("JM_ContextModel");
				oProductionVersion.setData(jsonData); // replaces the data
				oProductionVersion.refresh(true); // updates the bindings
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_initiator");
			}
			if (status === "Complete" || status === "Requested / Inprogress" || status === "Sendback" || status === "Reject") {
				jsonData = {
					Appid: appid,
					Transid: vTransid,
					Ind: "T",
					Level: "I",
					Progress: progress
				};
				oProductionVersion = this.getOwnerComponent().getModel("JM_ContextModel");
				oProductionVersion.setData(jsonData); // replaces the data
				oProductionVersion.refresh(true); // updates the bindings
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_initiator");
			}
		},

		// *-------------------------------------------------------------------------------------
		//							Dynamic field Binding
		// *------------------------------------------------------------------------------------
		fnAppidLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oInput.getId().split("--")[1];
			var vValue = oInput.getValue().toUpperCase();
			this.selectedField = id;
			oInput.setValue(vValue);
			this.fnReadf4Cache(id, vValue, "F");

		},

		fnReadf4Cache: function(vId, vValue, f4type) {
			var that = this;
			var match;
			var updateDesc = function(results) {
				if (f4type === "F") {
					match = results.find(function(item) {
						return item.DomvalueL === vValue.toUpperCase();
					});
					if (match) {
						that.Appid = match.DomvalueL;
						that.fnGetWfParmId().then(function(oWfid) {
							if (oWfid) {
								that.fncreateDynamicField(oWfid);
								that.getView().byId("id_AdvanceSrchImg").removeStyleClass("cl_db_AdvanceSearchDisabled");
								that.getView().byId("id_AdvanceSrchText").removeStyleClass("cl_db_AdvanceSearchDisabled");
							}
						}.bind(that));
					} else {
						that.getView().byId("id_AdvanceSrchImg").addStyleClass("cl_db_AdvanceSearchDisabled");
						that.getView().byId("id_AdvanceSrchText").addStyleClass("cl_db_AdvanceSearchDisabled");
						that.fnClearAdvanceSearch();
					}
				}
			};
			if (this.f4Cache[vId]) {
				updateDesc(this.f4Cache[vId]);
			} else {
				that.f4domainValue(vId, vValue, f4type, function(results) {
					that.f4Cache[vId] = results;
					updateDesc(results);
				});
			}
		},

		fnGetWfParmId: function() {
			return new Promise(function(Resolve, Reject) {

				var oWFParmSet = this.getOwnerComponent().getModel("JMConfig");
				busyDialog.open();
				oWFParmSet.read("/WFParmSet", {
					filters: [
						new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, this.Appid)
					],
					success: function(oData) {
						var aPayload = [];
						var oResult = oData.results[0]; // taking first record

						for (var key in oResult) {
							if (oResult.hasOwnProperty(key) && key.match(/Id$/)) {
								var sIdValue = oResult[key];
								var sNameKey = key.replace("Id", "Name");
								var sFnmValue = oResult[sNameKey];

								// Only add if ID and Name are not empty
								if (sIdValue && sFnmValue) {
									aPayload.push({
										id: sIdValue,
										Fnm: sFnmValue
									});
								}
							}
						}

						Resolve(aPayload);
						busyDialog.close();
					}.bind(this),
					error: function(oResponse) {
						busyDialog.close();
						Reject(false);
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error");
					}
				});
			}.bind(this));
		},
		fncreateDynamicField: function(vFieldIdArray) {
			for (var i = 0; i < vFieldIdArray.length; i++) {
				var id = vFieldIdArray[i].id + "--" + Date.now();
				var fieldName = vFieldIdArray[i].Fnm;
				this.fncreateF4inputField(id, fieldName);
			}
		},
		fnClearAdvanceSearch: function() {
			var oParent = this.getView().byId("id_advanceSearch");

			if (oParent) {
				var aItems = oParent.getItems();
				aItems.forEach(function(oItem) {
					oParent.removeItem(oItem);
					oItem.destroy();
				});
				oParent.rerender();
			}
		},
		fncreateF4inputField: function(id, Fieldname) {
			var oParent = this.getView().byId("id_advanceSearch");

			if (!oParent) {
				jQuery.sap.log.error("Parent Grid 'id_advanceSearch' not found!");
				return;
			}

			// Create Label
			var oLabel = new sap.m.Label({
				text: Fieldname
			}).addStyleClass("cl_inputLabel");

			// Create Input
			var oInput = new sap.m.Input({
				id: this.createId(id), // ensures unique ID within view
				liveChange: this.fnLiveChange.bind(this),
				valueHelpRequest: this.fnF4press.bind(this),
				showValueHelp: true,
				maxLength: 18
			}).addStyleClass("cl_inputField");

			// Create VBox with layoutData
			var oVBox = new sap.m.VBox({
				layoutData: new sap.ui.layout.GridData({
					span: "L3 M12 S12"
				})
			}).addStyleClass("sapUiSmallMarginEnd");

			// Add Label and Input into VBox
			oVBox.addItem(oLabel);
			oVBox.addItem(oInput);

			// Add VBox into the Grid
			oParent.addItem(oVBox);
		},

		f4domainValue: function(vId, value, f4type, fnCallback) {
			var that = this;

			var opayload = {
				FieldId: vId,
				F4Type: f4type,
				Process: "D"
			};
			opayload.NavSerchResult = [];

			var omodel1 = this.getOwnerComponent().getModel("JMConfig");
			// busyDialog.open();
			omodel1.create("/SearchHelpSet", opayload, {
				success: function(oData) {
					that.f4Cache[vId] = oData.NavSerchResult.results;
					if (fnCallback) {
						fnCallback(oData.NavSerchResult.results);
					}
					// busyDialog.close();
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error");
				}
			});
		},

		fnCheckDatavalidation: function(id, value) {
			var data = this.f4Cache[id];
			if (!data || !Array.isArray(data)) {
				return 0;
			}
			var sQuery = value ? value.toUpperCase() : "";
			var aMatched = [];

			if (sQuery) {
				aMatched = data.filter(function(item) {
					return (
						(item.Value1 && item.Value1.toUpperCase().includes(sQuery))
					);
				});
			}
			// Return matched length
			return aMatched.length;
		},

		fnPressAdvSearch: function() {
			var oButton = this.getView().byId("id_AdvanceSrchText");
			if (!oButton.hasStyleClass("cl_db_AdvanceSearchDisabled")) {
				var oVisibleModel = this.getView().getModel("JM_Visible");
				if (oVisibleModel) {
					oVisibleModel.setProperty("/advanceSearch", true);
					oVisibleModel.setProperty("/toolbar", false);
				}
			}
		},
		fnPressAdvClose: function() {
			var oVisibleModel = this.getView().getModel("JM_Visible");
			oVisibleModel.setProperty("/advanceSearch", false);
			oVisibleModel.setProperty("/toolbar", true);
		},

		//*----------------------------------------------------------------------------------------- 
		//							Clear all button logic
		// *-----------------------------------------------------------------------------------------

		fnOpeanClearallMeassage: function() {
			var oPopupModel = new sap.ui.model.json.JSONModel({
				title: "Information",
				text: "Are you sure want to clear all?",
				negativeButton: "No",
				negativeIcon: "Image/Cancel.svg",
				positiveButton: "Yes",
				positiveIcon: "Image/Apply.svg",
				Indicator: "CLEARALL"
			});
			// Set model with name
			this.getView().setModel(oPopupModel, "JM_Popup");
			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment(this.getView().getId(),
					"RECI_MASTER.Fragment.ConfirmationExit", // Fragment path
					this
				);
				this.getView().addDependent(this.oDialog);
			}
			this.oDialog.open();
		},
		fnConfirmationFragmentClose: function() {
			if (this.oDialog) {
				this.oDialog.close();
				this.oDialog.destroy(); // if you want destroy after close
				this.oDialog = null;
			}
		},

		fnSubmitConfirmation: function() {
			var state = this.getView().getModel("JM_Popup").getProperty("/Indicator");
			if (state === "CLEARALL") {
				this.fnConfirmationFragmentClose();
				this.fnClearall();
			}
		},

		fnClearall: function() {
			this.getView().byId("DID_RECI_TRANS_ID").setValue(""); // Transaction id
			this.getView().byId("DID_RECI_WF_AGENT").setValue(""); // App id
			this.getView().byId("DID_RECI_WF_APPID").setSelectedKey(""); // status
			this.getView().byId("DID_RECI_FDATE").setValue(""); // User id
			this.getView().byId("DID_RECI_TDATE").setValue(""); // From date
			this.getView().byId("DID_DATERANGE").setValue(""); // To date
			this.getView().byId("DID_RECI_STATUS").setValue(""); // object value
			this.getView().byId("DID_OBJVAL").setValue(""); // Date range
			this.getView().byId("idResultCount").setText("");
			this.getView().byId("DID_OBJVAL").setValue(""); // object value
			this.getView().byId("idPaginationBar").removeAllItems();
			var oMainModel = this.getView().getModel("JM_DASHBOARD");
			oMainModel.setProperty("/", []);
		},
		// *---------------------------------------------------------------------------------------
		//								View Details
		// *--------------------------------------------------------------------------------------
		fnPressViewDetails: function() {
			var oList = this.byId("id_List");
			this.aSelectedItems = oList.getSelectedItems(); // all selected items
			var aSelectedData = [];
			var aSelectedItems = oList.getSelectedItems();
			var oDateType = new sap.ui.model.type.Date({
				pattern: "dd-MM-yyyy"
			});
			this.SelectedListData = aSelectedData;
			var aData = [];

			aSelectedItems.forEach(function(item) {
				var oContext = item.getBindingContext("JM_DASHBOARD");
				if (oContext) {
					var i = oContext.getObject(); // single row object

					aData.push({
						"Application": i.AppId,
						"Description": i.Description,
						"End Date": oDateType.formatValue(new Date(i.EndDate), "string"),
						"Next App": i.NextApp,
						"Overall Time": i.OveralTime,
						"Sap Code": formatter.fnremoveLeadingZeros(i.Sapcode),
						"Start Date": oDateType.formatValue(new Date(i.StartDate), "string"),
						"Status": i.Status,
						"Transid": i.Transid,
						"User Id": i.UserId
					});
				}
			});
			var oDetailModel = new sap.ui.model.json.JSONModel(aData);
			this.getView().setModel(oDetailModel, "oDetailModel");

			if (this.SelectedListData) {
				if (!this.Detailsfrag) {
					this.Detailsfrag = sap.ui.xmlfragment("idMatDetailsDialog", "RECI_MASTER.fragment.viewDetails", this);
					this.getView().addDependent(this.Detailsfrag);
				}
				var oTable = sap.ui.core.Fragment.byId("idMatDetailsDialog", "idMatDetailsTable");
				oTable.removeAllColumns();

				var aListData = this.getView().getModel("oDetailModel").getData();

				if (aListData.length > 0) {
					var aFields = Object.keys(aListData[0]).filter(function(k) {
						return k !== "Transid";
					});

					var aTransposed = aFields.map(function(field) {
						var oRow = {
							Field: field
						};
						aListData.forEach(function(item) {
							oRow[item.Transid] = item[field]; // each Transid becomes column
						});
						return oRow;
					});

					this.getView().setModel(new sap.ui.model.json.JSONModel(aTransposed), "TransposedModel");

					// First column 
					oTable.addColumn(new sap.ui.table.Column({
						label: new sap.m.Label({
							text: "Field"
						}),
						// templateShareable: true,
						template: new sap.m.Text({
							text: "{TransposedModel>Field}"
						}),
						width: "100px"
					}));
					// Dynamic columns by Transid
					aListData.forEach(function(oColData) {
						oTable.addColumn(new sap.ui.table.Column({
							label: new sap.m.Label({
								text: oColData.Transid
							}),
							// templateShareable: true,
							template: new sap.m.Text({
								text: "{TransposedModel>" + oColData.Transid + "}",
								wrapping: false
							}),
							tooltip: "{TransposedModel>" + oColData.Transid + "}",
							width: "160px"
						}));
					});
					// Bind rows
					oTable.bindRows("TransposedModel>/");
				}
			}
			if (aSelectedItems.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("noDataOrItemSelected"), "Error");
				return;
			}
			if (aListData.length > 5) {
				ErrorHandler.showCustomSnackbar(i18n.getText("maxFiveSelection"), "Warning");
				return;
			}
			if (aListData.length < 3) {
				ErrorHandler.showCustomSnackbar(i18n.getText("selectMinimumThree"), "Warning");
				return;
			}
			this.Detailsfrag.open();
		},

		fnCancelDetails: function() {
			if (this.Detailsfrag) {
				this.Detailsfrag.close();
				this.Detailsfrag.destroy();
				this.Detailsfrag = null;
			}
		},

		fnExportExcel: function() {
			sap.ui.core.BusyIndicator.show(0);
			var that = this;
			var oFullLevelData = that.getView().getModel("LevelModel").getProperty("/LevelData") || [];
			var filename = "DashBoard_Data.xlsx";
			var aExportData = [];

			var oList = this.getView().byId("id_List");
			var aItems = oList.getItems();

			var aData = [];
			aItems.forEach(function(oItem) {
				var oCtx = oItem.getBindingContext("JM_DASHBOARD");
				if (oCtx) {
					aData.push(oCtx.getObject());
				}
			});
			if (aData.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("download_Empty_validation"), "Warning");
				sap.ui.core.BusyIndicator.hide();
				return;
			}
			aData.forEach(function(oItem) {
				// Push main (header) row
				aExportData.push({
					"Status": oItem.Status,
					"Transaction ID": oItem.Transid,
					"Application Id": oItem.AppId,
					"SAP Code": oItem.Sapcode,
					"Description": oItem.Description,
					"Start Date": oItem.StartDate,
					"End Date": oItem.EndDate,
					"User Id": oItem.UserId,
					"Next Approver": oItem.NextApp,
					"Overall Time": oItem.OveralTime,
					"Role": "",
					"User ID": "",
					"Initiation Date": "",
					"Initiation Time": "",
					"Overall Time Taken": "",
					"Status(Level)": "",
					"SLA": "",
					"Reminder": ""
				});
				// Get matching subtable rows from LevelModel
				var aFiltered = oFullLevelData.filter(function(item) {
					return item.Transid === oItem.Transid;
				});

				// Push subtable rows
				aFiltered.forEach(function(sub) {
					aExportData.push({
						"Status": "",
						"Transaction ID": "", // blank for sub-rows
						"Application Id": "",
						"SAP Code": "",
						"Description": "",
						"Start Date": "",
						"End Date": "",
						"User Id": "",
						"Next Approver": "",
						"Overall Time": "",
						"Role": sub.Roll || "",
						"User ID": sub.UserId || "",
						"Initiation Date": sub.InitiatedDate || "",
						"Initiation Time": formatter.fnDBformatODataTime(sub.InitiatedTime) || "",
						"Overall Time Taken": sub.OveralAllTime || "",
						"Status(Level)": sub.Status || "",
						"SLA": "",
						"Reminder": ""
					});
				});
			});
			// return;
			var worksheet = window.XLSX.utils.json_to_sheet(aExportData, {
				skipHeader: false
			});
			var workbook = window.XLSX.utils.book_new();
			window.XLSX.utils.book_append_sheet(workbook, worksheet, "Material Headers");
			window.XLSX.writeFile(workbook, filename);

			setTimeout(function() {
				sap.ui.core.BusyIndicator.hide();
				ErrorHandler.showCustomSnackbar(i18n.getText("download_Success"), "success");
			}.bind(this), 1000);
		},
		fnUpdateFinished: function(oEvent) {
			// var sStatusbadge = this.getView().byId("id_StatusBadge");
			var oTable = oEvent.getSource(); // 
			var oItems = oTable.getItems();

			oItems.forEach(function(oItem) {
				var oCtx = oItem.getBindingContext("JM_DASHBOARD");
				if (!oCtx) return;

				var sStatus = oCtx.getProperty("Status");
				var sClass = "";
				switch (sStatus) {
					case "Completed":
						sClass = "cl_CompletedBackground";
						break;
					case "Complete":
						sClass = "cl_CompletedBackground";
						break;
					case "Initiated":
						sClass = "cl_InitiatedBackground";
						break;
					case "Requested / Inprogress":
						sClass = "cl_RequestedBackground";
						break;
					case "Saved as draft":
						sClass = "cl_draftBackground";
						break;
					case "Rejected":
						sClass = "cl_rejectBackground";
						break;
					case "Sendback":
						sClass = "cl_sendBackBackground";
						break;
					default:
						sClass = "rowDefault";
				}
				// }
				var aCells = oItem.getCells();
				var shbox = aCells[6];

				shbox.removeStyleClass("cl_CompletedBackground");
				shbox.removeStyleClass("cl_InitiatedBackground");
				shbox.removeStyleClass("cl_RequestedBackground");
				shbox.removeStyleClass("cl_draftBackground");
				shbox.removeStyleClass("cl_sendBackBackground");
				shbox.removeStyleClass("cl_rejectBackground");
				
				// Add the new class
				shbox.addStyleClass(sClass);
			});
		},

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
		}

	});

});