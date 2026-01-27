sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"MANAGED_RECIPE/controller/ErrorHandler",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Filter",
	"MANAGED_RECIPE/Formatter/formatter",
	"sap/ui/model/resource/ResourceModel"
], function(Controller, ErrorHandler, FilterOperator, Filter, formatter, ResourceModel) {
	"use strict";

	var i18n;
	var busyDialog = new sap.m.BusyDialog();

	return Controller.extend("MANAGED_RECIPE.controller.reci_operations", {
		formatter: formatter,

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
			this.oRouter.getRoute("reci_operations").attachPatternMatched(this.fnRouter, this);
		},

		//*-----------------------------------------------------------------------------
		//				Initial Function logic when page load 
		//*-----------------------------------------------------------------------------
		fnRouter: function() {
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var that = this;
			oModel.read("/UsernameSet", {
				success: function(oData) {
					var oJsonModel = new sap.ui.model.json.JSONModel();
					oJsonModel.setData(oData.results);
					that.getView().setModel(oJsonModel, "JM_UserModel");
					that.UserName = oData.results[0].Uname;
					busyDialog.close();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
			// this.getView().byId("id_dashBoard_h").removeStyleClass("cl_listhighlight");
			// this.getView().byId("id_dashBoard_h").addStyleClass("cl_list_con");
			// this.getView().byId("id_appList_h").addStyleClass("cl_listhighlight");
			// this.getView().byId("id_appList_h").removeStyleClass("cl_list_con");

			var oKeyDataModel = this.getOwnerComponent().getModel("JM_KeyData");
			var oGobalOperationmodel = this.getOwnerComponent().getModel("JM_Operation");
			var oRecipeModel = this.getOwnerComponent().getModel("JM_Recipe");
			if (Object.keys(oKeyDataModel.getData() || {}).length > 0 && Object.keys(oRecipeModel.getData() || {}).length > 0) {
				if (Object.keys(oGobalOperationmodel.getData() || {}).length > 0) {
					var vKeyData = oKeyDataModel.getData();
					var lkeyDataModel = new sap.ui.model.json.JSONModel(vKeyData);
					this.getView().setModel(lkeyDataModel, "JM_KeydataModel"); // local model for the Key data 
					this.AppId = this.getOwnerComponent().getModel("JM_KeyData").getProperty("/AppId");

					var vRecipeData = oRecipeModel.getData();
					var lRecipeModel = new sap.ui.model.json.JSONModel(vRecipeData);
					this.getView().setModel(lRecipeModel, "JM_RecipeData"); // local model for the Recipe Data

					var GlobaldescModel = sap.ui.getCore().getModel("JM_DescriptionModel");
					var oFromUwl = this.getOwnerComponent().getModel("JM_ContextModel");
					if (GlobaldescModel && Object.keys(oFromUwl.getData() || {}).length > 0) {
						var descData = GlobaldescModel.getData();
						var descModel = new sap.ui.model.json.JSONModel(descData);
						this.getView().setModel(descModel, "JM_DescriptionModel");
					}
					if (!this.Bmsch) {
						this.Bmsch = this.getView().getModel("JM_RecipeData").getProperty("/Bmsch");
						this.Meinh = this.getView().getModel("JM_RecipeData").getProperty("/Plnme");
					} else {
						if (this.Bmsch !== this.getView().getModel("JM_RecipeData").getProperty("/Bmsch") ||
							this.Meinh !== this.getView().getModel("JM_RecipeData").getProperty("/Plnme")) {
							this.fnUpdateBaseQuantiy();
						}
					}
					this.fnInitilizeTableRevApr();
					this.fnInitializeScreen();

					if (this.Ind === "D" || this.Ind === "T") {
						this.getView().byId("changelog").setVisible(false);
					}

					var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
					var Appid = this.getOwnerComponent().getModel("JM_ContextModel").getProperty("/Appid");
					if (Object.keys(oChangeLogModel.getData() || {}).length > 0) {
						// Get data and create a deep copy
						var existingData = oChangeLogModel ? JSON.parse(JSON.stringify(oChangeLogModel.getData())) : [];
						this.OrgChangeLog = JSON.parse(JSON.stringify(existingData));
						// Check if model has some data and AppId === "RX"
						if (existingData && existingData.length > 0 && Appid === "RX") {
							this.fnsetIndicationforChangedData(existingData);
						}
					} else {
						this.OrgChangeLog = [];
					}
					this.fnSetUserField();
				} else {
					if (oKeyDataModel && oRecipeModel) {
						vKeyData = oKeyDataModel.getData();
						lkeyDataModel = new sap.ui.model.json.JSONModel(vKeyData);
						this.getView().setModel(lkeyDataModel, "JM_KeydataModel"); // local model for the Key data 

						vRecipeData = oRecipeModel.getData();
						lRecipeModel = new sap.ui.model.json.JSONModel(vRecipeData);
						this.getView().setModel(lRecipeModel, "JM_RecipeData"); // local model for the Recipe Data
						this.AppId = this.getOwnerComponent().getModel("JM_KeyData").getProperty("/AppId");

						this.fnCreateTenRowData();
						this.fnSetUserField();
						this.getView().byId("id_title").setText(i18n.getText("opeartionTitle"));
					}
				}
			} else {
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_search");
			}
		},

		fnHighlightinputfield: function(ChangedData) {
			// Loop through filtered data and highlight the matching controls
			ChangedData.forEach(function(item) {
				var sFieldId = item.FieldId; // get FieldId from each object
				if (sFieldId) {
					// Find the control using the FieldId
					var oControl = this.byId(sFieldId);
					// Add highlight class if control exists
					if (oControl) {
						oControl.addStyleClass("cl_HighLightInput");
					}
				}
			}.bind(this)); // keep controller context
		},

		fnsetIndicationforChangedData: function(ChangedData) {
			if (this.AppId === "RX") {
				var oTable = this.getView().byId("id_OperationTable");
				var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
				var aChangeLogData = oChangeLogModel ? oChangeLogModel.getData() : [];
				if (Array.isArray(aChangeLogData) && aChangeLogData.length > 0) {
					var aChangedItems = aChangeLogData.filter(function(item) {
						return item.ProcessInd === "O";
					});

					var aChangedItemNos = aChangedItems
						.filter(function(oItem) {
							return oItem.ItemNo;
						})
						.map(function(oItem) {
							return oItem.ItemNo;
						});

					// Apply row-level highlight using RowSettings
					oTable.setRowSettingsTemplate(
						new sap.ui.table.RowSettings({
							highlight: {
								path: "JM_ReciOperations>Vornr",
								formatter: function(sPosnr) {
									if (aChangedItemNos.includes(sPosnr)) {
										return sap.ui.core.IndicationColor.Indication06; // Highlight color
									}
									return sap.ui.core.IndicationColor.None;
								}
							}
						})
					);
				}
			}
		},

		fnClearChangeLog: function() {
			var oTable = this.byId("id_OperationTable");

			var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			var aChangeLogData = oChangeLogModel ? oChangeLogModel.getData() : [];
			var oComponent = this.getOwnerComponent();
			var oContextModel = oComponent.getModel("JM_ContextModel");
			var oUwlData = oContextModel.getData() || {};

			if (Array.isArray(aChangeLogData) && aChangeLogData.length > 0 && oUwlData.Appid === "RX") {
				oTable.getRows().forEach(function(oRow) {
					oRow.removeStyleClass("cl_HighLightRow");
					oRow.getCells().forEach(function(oCell) {
						oCell.removeStyleClass("cl_HighLightInput");
					});
				});
			}

			// if (!oChangeLogModel) {
			// 	oChangeLogModel = new sap.ui.model.json.JSONModel();
			// 	this.getOwnerComponent().setModel(oChangeLogModel, "JM_ChangeLog");
			// }
			// if (this.OrgChangeLog) {
			// 	oChangeLogModel.setData(this.OrgChangeLog);
			// }
		},

		fnCreateTenRowData: function() {
			this.getView().getModel("JM_KeydataModel");
			this.Werks = this.getView().getModel("JM_KeydataModel").getProperty("/Werks");
			this.getView().getModel("JM_RecipeData");

			//Don't update Base quantity if the Resouce is present in the table and check the this.Bmsch is not equal
			if (!this.Bmsch) {
				this.Bmsch = this.getView().getModel("JM_RecipeData").getProperty("/Bmsch");
				this.Meinh = this.getView().getModel("JM_RecipeData").getProperty("/Plnme");
			} else {
				if (this.Bmsch !== this.getView().getModel("JM_RecipeData").getProperty("/Bmsch") ||
					this.Meinh !== this.getView().getModel("JM_RecipeData").getProperty("/Plnme")) {
					this.fnUpdateBaseQuantiy();
				}
			}

			// Create the JSON model
			var oOperationModel = new sap.ui.model.json.JSONModel();

			// Create editable model
			var oEditableModel = new sap.ui.model.json.JSONModel();
			var editableData = {};

			// Load 10 data for Vornr table
			var tableData = [];
			var currentDate = new Date();
			var endDate = new Date(9999, 11, 31); // 31.12.9999
			for (var i = 1; i <= 10; i++) {
				var vornr = (i * 10).toString().padStart(4, "0"); // Generates 0010, 0020, ...
				tableData.push({
					Vornr: vornr, //operation
					Phflg: false, //phase
					Pvznr: "", //sup_operation
					Phseq: "", //Destination
					Arbpl: "", //Resource
					Steus: "PI01", //control key
					Txtkz: false,
					Ktsch: "",
					Ltxa1: "",
					Txtsp: "",
					Ckselkz: "X",
					Klakz: false,
					Bezkz: false,
					Bmsch: this.Bmsch, //Base Quantity
					Meinh: this.Meinh, // Unit of Measures
					Vgw01: "",
					Vge01: "",
					Lar01: "",
					Vgw02: "",
					Vge02: "",
					Lar02: "",
					Vgw03: "",
					Vge03: "",
					Lar03: "",
					Vgw04: "",
					Vge04: "",
					Lar04: "",
					Vgw05: "",
					Vge05: "",
					Lar05: "",
					Vgw06: "",
					Vge06: "",
					Lar06: "",
					Ddehn: false,
					Werks: this.getView().getModel("JM_KeydataModel").getProperty("/Werks"), //Plant
					Aennr: "", // Change Number
					Datuv: currentDate, //valid from
					Datub: endDate, // valid to
					Umrez: this.getView().getModel("JM_RecipeData").getProperty("/Umrez"), // charge Quantity
					Umren: this.getView().getModel("JM_RecipeData").getProperty("/Umren"), // Operation Quantity
					Usr00: "", // user fields
					Usr01: "", // user fields
					Usr02: "",
					Usr03: "",
					Usr04: "",
					Use04: "",
					Usr05: "",
					Use05: "",
					Usr06: "",
					Use06: "",
					Usr07: "",
					Use07: "",
					Usr08: "",
					Usr09: "",
					Usr10: false,
					Usr11: false,
					Slwid: "", //Key word ID for user-defined fields
					Loanz: "",
					Loart: "",
					Logrp: "",
					Rsanz: "",
					Prz01: "",
					Rasch: "",
					Rfgrp: "",
					Rfsch: "",
					Qlkapar: "",
					Anzma: "",
					Qpart: "",
					Infnr: "",
					Ekorg: "",
					Ebeln: "",
					Ebelp: "",
					Sortl: "",
					Plifz: "",
					Matkl: "",
					Ekgrp: "",
					Lifnr: "",
					Peinh: "",
					Sakto: "",
					Frdlb: false,
					Preis: "",
					Waers: "",
					QlSearch: "",
					Qsel1: true,
					Qsel2: false,
					Qsel3: false,
					Vgtl1: "",
					Vgtl2: "",
					Vgtl3: "",
					Vgtl4: "",
					Vgtl5: "",
					Vgtl6: ""
				});

				editableData[vornr] = {
					Vornr: "nonEdit", // Opeartion
					Phflg: "Edit", //phase
					Pvznr: "Edit", //sup_operation
					Phseq: "Edit", //Destination
					Arbpl: "Edit", //Resource
					Ckselkz: "nonEdit", // Relevany to costing
					Ddehn: "nonEdit", //flex
					Meinh: "Edit",
					Bmsch: "Edit",
					Ktsch: "Edit",
					Ltxa1: "Edit",
					Steus: "Edit",
					Vgw01: "nonEdit",
					Vge01: "nonEdit",
					Lar01: "nonEdit",
					Vgw02: "nonEdit",
					Vge02: "nonEdit",
					Lar02: "nonEdit",
					Vgw03: "nonEdit",
					Vge03: "nonEdit",
					Lar03: "nonEdit",
					Vgw04: "nonEdit",
					Vge04: "nonEdit",
					Lar04: "nonEdit",
					Vgw05: "nonEdit",
					Vge05: "nonEdit",
					Lar05: "nonEdit",
					Vgw06: "nonEdit",
					Vge06: "nonEdit",
					Lar06: "nonEdit"
				};
				oOperationModel.setData({
					Operations: tableData
				});
				this.getView().setModel(oOperationModel, "JM_ReciOperations"); // local model for reci Operation data
			}
			oEditableModel.setData(editableData);
			this.getView().setModel(oEditableModel, "JM_EditableModel"); // local model for the editable non editable properties
		},

		fnSetUserField: function() {
			// 1. Create a new JSON model with default data
			var Model = new sap.ui.model.json.JSONModel({
				Visible: false
			});

			// 2. Assign it to the view with the name "JM_UFTemplate"
			this.getView().setModel(Model, "JM_UFTemplate");

			//Call entity for User Fields
			var oInitiator = this.getOwnerComponent().getModel();
			var oPayload = {
				Matnr: this.getView().getModel("JM_KeydataModel").getProperty("/Matnr"),
				Ind: "G"
			};
			oPayload.NavRecipeBasic = [];
			oPayload.NavRecipeComments = [];
			oPayload.NavRecipeAttachment = [];
			oPayload.NavUserInput = [];
			busyDialog.open();
			oInitiator.create("/Recipe_HeaderSet", oPayload, {
				success: function(oData) {
					if (oData && oData.NavUserInput && oData.NavUserInput.results && oData.NavUserInput.results.length > 0) {
						var oUserFieldRes = oData.NavUserInput.results;
						var oUFModel = [];
						this.oUFVisibleModel = {};
						oUFModel.push({
							Key: "",
							text: " "
						});
						for (var j = 0; j < oUserFieldRes.length; j++) {
							var data = oUserFieldRes[j];
							var oCreaterUF = {
								Key: data.Slwid,
								text: data.Ktext
							};
							oUFModel.push(oCreaterUF);
							this.oUFVisibleModel[data.Slwid] = {
								Swrt0: data.Swrt0,
								Swrt1: data.Swrt1,
								Swrt2: data.Swrt2,
								Swrt3: data.Swrt3,
								Swrt4: data.Swrt4,
								Swrt5: data.Swrt5,
								Swrt6: data.Swrt6,
								Swrt7: data.Swrt7,
								Swrt8: data.Swrt8,
								Swrt9: data.Swrt9,
								Swrt10: data.Swrt10,
								Swrt11: data.Swrt11
							};
						}

						var UFJsonModel = new sap.ui.model.json.JSONModel(oUFModel);
						this.getView().setModel(UFJsonModel, "JM_UFModel"); // local model
					}
					busyDialog.close();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		// Reviwer Logic to set the table field 
		fnInitilizeTableRevApr: function() {
			var oGlobalOperationdata = this.getOwnerComponent().getModel("JM_Operation");
			var Ind = this.getOwnerComponent().getModel("JM_ContextModel").getProperty("/Ind");
			this.Werks = this.getView().getModel("JM_KeydataModel").getProperty("/Werks");
			var tableData = [];
			var editableData = {};

			// Create the JSON model
			var oOperationModel = new sap.ui.model.json.JSONModel();
			// Create editable model
			var oEditableModel = new sap.ui.model.json.JSONModel();

			var OpeartionData = JSON.parse(JSON.stringify(oGlobalOperationdata.getData().NavRecipe_Operation));
			for (var i = 0; i < OpeartionData.length; i++) {

				OpeartionData[i].Klakz = (OpeartionData[i].Klakz === "X") ? true : false;
				OpeartionData[i].Qsel1 = (OpeartionData[i].Qsel1 === "X") ? true : false;
				OpeartionData[i].Qsel2 = (OpeartionData[i].Qsel2 === "X") ? true : false;
				OpeartionData[i].Qsel3 = (OpeartionData[i].Qsel3 === "X") ? true : false;
				OpeartionData[i].Frdlb = (OpeartionData[i].Frdlb === "X") ? true : false;

				tableData.push(OpeartionData[i]);
				if (OpeartionData[i].Phflg === true) {
					editableData[OpeartionData[i].Vornr] = {
						Vornr: "nonEdit", // Opeartion
						Phflg: "Edit", //phase
						Pvznr: "Edit", //sup_operation
						Phseq: "Edit", //Destination
						Arbpl: "nonEdit", //Resource
						Ckselkz: "Edit", // Relevany to costing
						Ddehn: "Edit", //flex
						Ltxa1: "Edit",
						Meinh: "Edit",
						Bmsch: "Edit",
						Ktsch: "Edit",
						Steus: "Edit",
						Vgw01: "Edit",
						Vge01: "Edit",
						Lar01: "Edit",
						Vgw02: "Edit",
						Vge02: "Edit",
						Lar02: "Edit",
						Vgw03: "Edit",
						Vge03: "Edit",
						Lar03: "Edit",
						Vgw04: "Edit",
						Vge04: "Edit",
						Lar04: "Edit",
						Vgw05: "Edit",
						Vge05: "Edit",
						Lar05: "Edit",
						Vgw06: "Edit",
						Vge06: "Edit",
						Lar06: "Edit"
					};
				} else {
					editableData[OpeartionData[i].Vornr] = {
						Vornr: "nonEdit", // Opeartion
						Phflg: "nonEdit", //phase
						Pvznr: "nonEdit", //sup_operation
						Phseq: "nonEdit", //Destination
						Arbpl: "Edit", //Resource
						Ddehn: "nonEdit", //flex
						Vgw01: "nonEdit",
						Vge01: "nonEdit",
						Lar01: "nonEdit",
						Vgw02: "nonEdit",
						Ltxa1: "Edit",
						Meinh: "Edit",
						Bmsch: "Edit",
						Steus: "Edit",
						Ktsch: "Edit",
						Ckselkz: "nonEdit", // Relevany to costing
						Vge02: "nonEdit",
						Lar02: "nonEdit",
						Vgw03: "nonEdit",
						Vge03: "nonEdit",
						Lar03: "nonEdit",
						Vgw04: "nonEdit",
						Vge04: "nonEdit",
						Lar04: "nonEdit",
						Vgw05: "nonEdit",
						Vge05: "nonEdit",
						Lar05: "nonEdit",
						Vgw06: "nonEdit",
						Vge06: "nonEdit",
						Lar06: "nonEdit"
					};
				}
				oOperationModel.setData({
					Operations: tableData
				});
				this.getView().setModel(oOperationModel, "JM_ReciOperations"); // local model setting for recipe Operation
				// Deep copy to avoid reference sharing
				var oOperationCopy = new sap.ui.model.json.JSONModel(
					JSON.parse(JSON.stringify(oOperationModel.getData()))
				);

				var oOriginalData = this.getOwnerComponent()
					.getModel("JM_InitialDatas")
					.getProperty("/NavRecipe_Operation/results");
				// Create a deep copy (completely independent of the source)
				oOperationCopy = JSON.parse(JSON.stringify({
					Operations: oOriginalData
				}));

				// Set it as a separate model (unlinked to the original)
				var oNewModel = new sap.ui.model.json.JSONModel(oOperationCopy);
				this.getView().setModel(oNewModel, "JM_OperationInitialModel");
			}

			oEditableModel.setData(editableData);
			this.getView().setModel(oEditableModel, "JM_EditableModel"); // local editable model 

			if (OpeartionData.length === 0) {
				this.fnCreateTenRowData();
			} else {
				if (Ind !== "T") {
					var rowLength = 10 - OpeartionData.length;
					for (var j = 0; j < rowLength; j++) {
						this.fnAddRow();
					}
				} else {
					if (Ind === "T") {
						this.fnMakaAllnonEdit();
					}
				}
			}
		},

		fnMakaAllnonEdit: function() {
			var oEditableModel = this.getView().getModel("JM_EditableModel");
			var oData = oEditableModel.getData();

			for (var sKey in oData) {
				if (oData.hasOwnProperty(sKey)) {
					var oInnerObj = oData[sKey];
					for (var sField in oInnerObj) {
						if (oInnerObj.hasOwnProperty(sField)) {
							oInnerObj[sField] = "nonEdit";
						}
					}
				}
			}
			oEditableModel.refresh(true);
		},

		// upadte base quantity column without any created data
		fnUpdateBaseQuantiy: function() {
			var oOperationModel = this.getView().getModel("JM_ReciOperations");
			var oData = oOperationModel.getData().Operations; // Access Operations array
			var newBmsch = this.getView().getModel("JM_RecipeData").getProperty("/Bmsch");
			var newMeinh = this.getView().getModel("JM_RecipeData").getProperty("/Plnme");
			this.Bmsch = newBmsch;
			this.Meinh = newMeinh;
			oData.forEach(function(aData) {
				if (aData.Arbpl === "") {
					aData.Bmsch = newBmsch; // update base quantity
					aData.Meinh = newMeinh; // update base quantity
				}
			});
			// refresh model to reflect changes in UI
			oOperationModel.refresh(true);
		},

		// *-------------------------------------------------------------------------------------
		//		Function for F4 Event (added by sabarish babu 07-10-2025)
		// *-------------------------------------------------------------------------------------

		// view F4 press function trigger
		fnF4press: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedField = id;
			this.parentId = oEvent.getSource().getParent();
			var vMaintainedId = id.split("-")[0];
			var oInput = oEvent.getSource();
			var oBindInfo = oInput.getBindingInfo("value");
			var sModelName = oBindInfo.parts[0].model;
			var sFieldPath = oBindInfo.parts[0].path;
			var oContext = oBindInfo.binding.oContext;

			if (!sModelName || !sFieldPath || !oContext) {
				return;
			}

			var sRowPath = oContext.getPath(); // e.g., "/rows/0"
			var sFullPath = sRowPath + "/" + sFieldPath; // full path to update value

			this.Vornr = this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Vornr");
			this.selectedF4path = sFullPath;
			this.ModelName = sModelName;
			if (this.selectedField.split("-")[0] === "ID_OPER_KTSCH") {
				var vResource = this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Arbpl");
				if (vResource === "") {
					ErrorHandler.showCustomSnackbar(i18n.getText("EnterResource"), "Error", this);
					return;
				}
			}

			this.bindTextF4model("P", vMaintainedId, "X", oEvent);
		},

		fnF4Itempress: function(oEvent) {
			var oItem = oEvent.getSource();
			var oContext = oItem.getBindingContext("JM_F4Model");
			if (!oContext) {
				return;
			}
			var item = oContext.getProperty("col1"); // Value (e.g., 'IN')
			var item1 = oContext.getProperty("col2");

			if (this.fragmentFlag) {
				this.f4fragItempress(this.selectedField, item, item1);
				this.fragmentFlag = false;
				this.fnAfterCloseFragment();
				return;
			}

			this.getView().byId(this.selectedField).setValue(item);
			this.getView().byId(this.selectedField).setValueState("None");

			if (this.selectedField.split("-")[0] === "ID_OPER_ARBPL") {
				this.getView().byId(this.selectedField).setValueState("None");
				this.getView().byId(this.selectedField).setValueStateText("");
				this.fnResourceItemPress(item);
				this.fnClearErrorState(this.selectedF4path.split("/").slice(0, -1).join("/"), this.selectedF4path);
			}
			if (this.selectedField.split("-")[0] === "ID_OPER_PHSEQ") {
				this.getView().byId(this.selectedField).setValueState("None");
				this.getView().byId(this.selectedField).setValueStateText("");
				this.fndestinationItemPress();
				this.fnClearErrorState(this.selectedF4path.split("/").slice(0, -1).join("/"), this.selectedF4path);
			}
			if (this.selectedField.split("-")[0] === "ID_OPER_KTSCH") {
				var oModel = this.getView().getModel("JM_ReciOperations");
				if (oModel) {
					var selectedpath = this.selectedF4path.substring(0, this.selectedF4path.lastIndexOf("/"));
					oModel.setProperty(selectedpath + "/Ltxa1", item1);
					oModel.refresh(true);
				}
			}

			if (this.AppId === "RX") {
				var vtriggeredCell = this.selectedF4path;
				var sRowPath = vtriggeredCell.substring(0, vtriggeredCell.lastIndexOf("/"));
				this.fnUpdateChangelog(sRowPath, vtriggeredCell, item);
			}

			this.fnAfterCloseFragment();
		},

		// fragment F4 press trigger
		fnFragF4press: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedField = oEvent.getSource().getId();
			this.fragmentFlag = true;
			if (id === "ID_OPER_INFNR_F") {
				this.bindTextF4model("P", id, "X", oEvent);
			} else {
				this.bindTextF4model("P", id, "X", oEvent);
			}
		},

		f4fragItempress: function(id, val, desc) {
			var inputField = this.getView().byId(id);
			var descField = this.getView().byId(id + "_DES");
			if (descField) {
				inputField.setValue(val);
				descField.setValue(desc);
			} else {
				inputField.setValue(val);
			}

			if (this.selectedField.split("--")[1] === "ID_OPER_INFNR_F") {
				this.getView().byId("ID_OPER_EKORG_F").setValue(desc);
				if (this.AppId === "RX") {
					this.fnUpdateChangeLogforFragment("ID_OPER_EKORG_F", desc);
				}
				this.fnCallBackenUpdateInfoRec(val, desc);
			}

			if (this.selectedField.split("--")[1] === "ID_OPER_EBELP_F") {
				this.getView().byId("ID_OPER_EBELN_F").setValue(desc);
			}
			this.getView().byId(this.selectedField).setValueState("None");
			if (this.AppId === "RX") {
				this.fnUpdateChangeLogforFragment(id.split("--")[1], val);
			}
			this.fnAfterCloseFragment();

			this.selectedField = undefined;
		},

		fnCallBackenUpdateInfoRec: function(Infnr, Ekorg) {
			var servicecall = this.getOwnerComponent().getModel();
			var oPayload = {};
			oPayload.Ind = "T";
			oPayload.NavRecipe_Operation = [{
				Werks: this.getView().getModel("JM_KeydataModel").getProperty("/Werks"),
				Infnr: Infnr,
				Ekorg: Ekorg
			}];
			oPayload.NavDescription = [];
			servicecall.create("/Recipe_HeaderSet", oPayload, {
				success: function(oData) {
					var result = oData.NavRecipe_Operation.results[0];
					var Description = oData.NavDescription.results;
					var DialogOperationModel = this.getView().getModel("JM_ReciOperationsDialog");
					if (DialogOperationModel) {
						DialogOperationModel.setProperty("/Sortl", result.Sortl);
						if (result.Sortl !== "") {
							this.fnUpdateChangeLogforFragment("ID_OPER_SORTL_F", result.Sortl);
						}
						DialogOperationModel.setProperty("/Matkl", result.Matkl);
						if (result.Matkl !== "") {
							this.fnUpdateChangeLogforFragment("ID_OPER_MATKL_F", result.Matkl);
						}
						DialogOperationModel.setProperty("/Ekgrp", result.Ekgrp);
						if (result.Ekgrp !== "") {
							this.fnUpdateChangeLogforFragment("ID_OPER_EKGRP_F", result.Ekgrp);
						}
						DialogOperationModel.setProperty("/Lifnr", result.Lifnr);
						if (result.Lifnr !== "") {
							this.fnUpdateChangeLogforFragment("ID_OPER_LIFNR_F", result.Lifnr);
						}
						DialogOperationModel.setProperty("/Plifz", result.Plifz);
						if (result.Plifz !== "") {
							this.fnUpdateChangeLogforFragment("ID_OPER_PLIFZ_F", result.Plifz);
						}
						DialogOperationModel.setProperty("/Peinh", result.Peinh);
						if (result.Peinh !== "") {
							this.fnUpdateChangeLogforFragment("ID_OPER_PEINH_F", result.Peinh);
						}
						DialogOperationModel.setProperty("/Preis", result.Preis);
						if (result.Preis !== "") {
							this.fnUpdateChangeLogforFragment("ID_OPER_PREIS_F", result.Preis);
						}
						DialogOperationModel.setProperty("/Waers", result.Waers);
						if (result.Waers !== "") {
							this.fnUpdateChangeLogforFragment("ID_OPER_WAERS_F", result.Waers);
						}
					}
					for (var i = 0; i < Description.length; i++) {
						var id = "ID_OPER_" + Description[i].Fieldname + "_F_DES";
						this.getView().byId(id).setValue(Description[i].Fielddesc);
					}

				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});

		},

		// update the resource value for created phase
		fnUpdateResourceforPhase: function(Vornr, value) {
			var oOperModel = this.getView().getModel("JM_ReciOperations");
			var oData = oOperModel.getData(); // entire model data
			var aOperations = oData.Operations; // the array of operations
			var sIndex = [];
			if (aOperations && aOperations.length > 0) {
				for (var i = 0; i < aOperations.length; i++) {
					var operationData = aOperations[i];
					if (operationData.Pvznr === Vornr && operationData.Phflg === true) {
						var sRowpath = "/Operations/" + i;
						var triggeredCell = "/Operations/" + i + "/Arbpl";

						var vArbpl = value;
						operationData.Arbpl = value;
						this.fnClearErrorState(sRowpath, sRowpath + "/Pvznr");
						sIndex.push(i);
						if (this.AppId === "RX") {
							this.fnUpdateChangelog(sRowpath, triggeredCell, vArbpl);
						}
					}
				}
			}
			// Set back only the Operations array
			oOperModel.setProperty("/Operations", aOperations);

			for (var j = 0; j < sIndex.length; j++) {
				var index = sIndex[j];
				sRowpath = "/Operations/" + index;
				this.fngetStandardValue(sRowpath);
				this.batch = true;
			}

		},

		// to open the F4 fragment
		fnF4fragopen: function(oEvent, vTitle) {
			if (!this.f4HelpFrag) {
				this.f4HelpFrag = sap.ui.xmlfragment(this.getView().getId(), "MANAGED_RECIPE.fragment.F4Help", this);
				this.getView().addDependent(this.f4HelpFrag);
			}
			this.f4HelpFrag.setTitle(vTitle);
			return this.f4HelpFrag;
		},

		// to close the F4 fragment
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

		// F4 Search Field logic
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

		// to get the F4 data and bind to model
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
			busyDialog.open();
			omodel1.create("/SearchHelpSet", oPayload, {
				filters: filter,
				success: function(odata, Response) {
					if(odata.MsgType === "I"){
						ErrorHandler.showCustomSnackbar(odata.Message, "Error", that);
						busyDialog.close();
						return;
					}
					
					var aResults = odata.NavSerchResult.results;
					if (aResults.length > 0) {
						var oFirst = aResults[0];
						if (that.selectedField.split("-")[0] === "ID_OPER_PHSEQ") {
							aResults = aResults.filter(function(item) {
								return item.Value3 === that.Werks;
							});
						}
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

						//filter by plant for Destination field 
						aResults.forEach(function(item) {
							var row = {};
							row.col1 = item.Value1;
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
						that.getView().getModel("JM_F4Model"); // local model
						vTitle = that.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";
						that.fnF4fragopen(oEvent, vTitle).open();
					}
					busyDialog.close();
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});

		},

		fnReadf4Cache: function(vId, vValue, f4type, oEvent) {
			var that = this;
			var match;
			var updateDesc = function(results) {
				if (f4type === "P" || f4type === "X") {
					if (that.selectedField === "KID_RECI_MATNR") {
						match = results.find(function(item) {
							return item.Value1.replace(/^0+/, "") === vValue.toUpperCase();
						});
					} else {
						match = results.find(function(item) {
							return item.Value1 === vValue.toUpperCase();
						});
					}
					if (match) {
						if (!that.fragLiveChangeFlag) {
							if (that.selectedField && that.selectedField.split("-")[0] === "ID_OPER_KTSCH" && that.oNextInput) {
								that.oNextInput.setValue(match.Value2);
								that.oNextInput = undefined;
							} else {
								var parts = vId.split("_"); // split by underscore
								var lastPart = parts[parts.length - 2]; // take the last part
								var fieldname = lastPart.charAt(0) + lastPart.slice(1).toLowerCase() + "Des";
								var oDialogModel = that.getView().getModel("JM_ReciOperationsDialog");
								if (oDialogModel) {
									oDialogModel.setProperty("/" + fieldname, match.Value2);
									oDialogModel.refresh(true);
								}
							}
						} else {
							that.getView().byId(vId).setValue(match.Value1);
							var desField = that.getView().byId(vId + "_DES");
							if (desField) {
								desField.setValue(match.Value2);
							} else {
								desField.setValue("");
							}
						}
					} else {
						parts = vId.split("_"); // split by underscore
						lastPart = parts[parts.length - 2]; // take the last part
						fieldname = lastPart.charAt(0) + lastPart.slice(1).toLowerCase() + "Des";
						if (that.fragLiveChangeFlag) {
							oDialogModel = that.getView().getModel("JM_ReciOperationsDialog");
							if (oDialogModel) {
								oDialogModel.setProperty("/" + fieldname, "");
								oDialogModel.refresh(true);
							}
						}
					}
				}
				var length = that.fnCheckDatavalidation(vId, vValue);
				if (length === 0 && vValue !== "" && that.selectedField) {
					if (!that.fragLiveChangeFlag) {
						that.fnSetErrorState(that.selectedF4path.split("/").slice(0, -1).join("/"), that.selectedF4path);
					}
					that.getView().byId(that.selectedField).setValueState("Error");
					that.getView().byId(that.selectedField).setValueStateText(vValue + " value is not Avalible");
					that.selectedField = undefined;
					that.fragLiveChangeFlag = false;
				} else {
					if (that.selectedField) {
						if (!that.fragLiveChangeFlag) {
							that.fnClearErrorState(that.selectedF4path.split("/").slice(0, -1).join("/"), that.selectedF4path);
						}
						that.getView().byId(that.selectedField).setValueState("None");
						that.fragLiveChangeFlag = false;
						that.selectedField = undefined;
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

		// get Description from Backend
		f4descriptionGet: function(vId, value, f4type, fnCallback) {
			var that = this;
			var filter;
			var oModel = this.getOwnerComponent().getModel("JMConfig");

			// filter = [
			// 	new sap.ui.model.Filter("F4Type", sap.ui.model.FilterOperator.EQ, f4type),
			// 	new sap.ui.model.Filter("FieldId", sap.ui.model.FilterOperator.EQ, vId),
			// 	new sap.ui.model.Filter("Process", sap.ui.model.FilterOperator.EQ, "A")
			// ];
			var oPayload = {
				FieldId: vId,
				F4Type: f4type,
				Process: "X"
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

		// *----------------------------------------------------------------------------------------
		//					Phase logic
		// *----------------------------------------------------------------------------------------

		fnPhaseSelect: function(oEvent) {
			var oCheckBox = oEvent.getSource();
			var oBindInfo = oCheckBox.getBindingInfo("selected");
			if (oBindInfo) {
				var oContext = oBindInfo.binding.oContext;
				var sModelName = oBindInfo.parts[0].model;
				var sFieldPath = oBindInfo.parts[0].path;

				if (!sModelName || !sFieldPath || !oContext) {
					return;
				}
				var sRowPath = oContext.getPath(); // e.g., "/rows/0"
				var oMainModel = this.getView().getModel(sModelName);
				var vVornr = oMainModel.getProperty(sRowPath + "/Vornr");
				// Get selected state
				var bSelected = oEvent.getParameter("selected");
				// Access your editable model
				var oEditModel = this.getView().getModel("JM_EditableModel");
				if (!oEditModel) {
					return;
				}
				// Set property based on checkbox selection
				if (bSelected) {
					oEditModel.setProperty("/" + vVornr + "/Arbpl", "nonEdit");
				} else {
					oEditModel.setProperty("/" + vVornr + "/Arbpl", "Edit");
				}

				oEditModel.updateBindings(true);
				if (this.AppId === "RX") {
					var vtriggeredCell = sRowPath + "/" + sFieldPath;
					this.fnUpdateChangelog(sRowPath, vtriggeredCell, bSelected);
				}
			}
		},

		// *----------------------------------------------------------------------------------------
		//					Sup Operation logic Handling (Live Change, Submit)
		// *----------------------------------------------------------------------------------------

		fnSupOperationLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oEvent.getSource().getId().split("--")[1];
			var vValue = oEvent.getSource().getValue();
			this.selectedField = id;

			// parent Error State Clear
			this.getView().byId(id).setValueState("None"); // Input State clear
			this.fnNumberFieldValidation(oEvent);

			var oRow = oEvent.getSource().getParent();
			var oTableRow = oRow.getParent();
			var aCells = oTableRow.getCells();
			var iCurrentCellIndex = aCells.indexOf(oEvent.getSource().getParent());

			var oBindInfo = oInput.getBindingInfo("value");
			var oContext = oBindInfo.binding.oContext;
			var sFieldPath = oBindInfo.parts[0].path;
			var sRowPath = oContext.getPath(); // e.g., "/rows/0"
			this.fnClearErrorState(sRowPath, sRowPath + "/Pvznr");

			if (vValue === "" && aCells[iCurrentCellIndex + 1].getItems()[0].getValue() === "") {
				this.fnRemovePhaseState(sRowPath);
				if (this.AppId === "RX") {
					var vtriggeredCell = sRowPath + "/" + sFieldPath;
					this.fnUpdateChangelog(sRowPath, vtriggeredCell, vValue);
				}
				return;
			}

			if (vValue.length === 4) {
				// check if supOperation is present or not
				var oOperModel = this.getView().getModel("JM_ReciOperations").getData();
				this.operationId = [];
				// check that Operations array exists
				if (oOperModel && oOperModel.Operations && oOperModel.Operations.length > 0) {
					for (var i = 0; i < oOperModel.Operations.length; i++) {
						var item = oOperModel.Operations[i];
						// only push Vornr where Arbpl has value
						if (item.Arbpl && item.Arbpl !== "" && !item.Phflg) {
							this.operationId.push(item.Vornr);
						}
					}
				}

				if (this.operationId.indexOf(vValue) === -1) {
					oInput = this.getView().byId(this.selectedField);
					oInput.setValueState("Error");
					oInput.setValueStateText(i18n.getText("enterExistingOperationNumber"));
					ErrorHandler.showCustomSnackbar(i18n.getText("enterExistingOperationNumber"), "Error", this);
					this.fnSetErrorState(sRowPath, sRowPath + "/Pvznr");
				} else {
					//check destination of that take next input
					if (iCurrentCellIndex !== -1 && iCurrentCellIndex + 1 < aCells.length) {
						var oDestinationCell = aCells[iCurrentCellIndex + 1];
						var oDestinationInput = oDestinationCell.getItems ? oDestinationCell.getItems()[0] : oDestinationCell;
						if (oDestinationInput && oDestinationInput.getValue) {
							var destinationValue = oDestinationInput.getValue();
							if (destinationValue === "") {
								this.fnSetErrorState(sRowPath, sRowPath + "/Phseq");
								oDestinationInput.setValueState("Error");
								oDestinationInput.focus();
								oDestinationInput.setValueStateText(i18n.getText("enterControlRecipeDestination", [vValue]));
							} else {
								var fromOperation = vValue;
								var toOperation = aCells[iCurrentCellIndex - 2].getItems()[0].getValue();
								this.fnUpdatePhaseRow(fromOperation, toOperation, sRowPath);
								this.fngetStandardValue(sRowPath);
							}
						}
					}
				}
			}
			if (this.AppId === "RX") {
				vtriggeredCell = sRowPath + "/" + sFieldPath;
				this.fnUpdateChangelog(sRowPath, vtriggeredCell, vValue);
			}
		},

		fnUpdateChangelog: function(sRowPath, vTriggeredCell, vValue) {
			var sField = vTriggeredCell.split("/").pop(); // "Pvznr"
			var oTable = this.byId("id_OperationTable");
			var aColumns = oTable.getColumns();

			var iColIndex = -1;
			var sColLabel = "";

			aColumns.forEach(function(oColumn, index) {
				var sFilterProp = oColumn.getFilterProperty();
				if (sFilterProp === sField) {
					iColIndex = index;
					sColLabel = oColumn.getLabel().getText();
				}
			});

			if (iColIndex === -1) {
				return;
			}

			var oInitialModel = this.getView().getModel("JM_OperationInitialModel");

			// Each row has a unique operation number (Vornr)
			var vVornr = oInitialModel.getProperty(sRowPath + "/Vornr") || "";

			if (vVornr === "") {
				var notInitialModel = this.getView().getModel("JM_ReciOperations");

				if (notInitialModel) {
					var newRow = JSON.parse(JSON.stringify(notInitialModel.getProperty(sRowPath)));
					vVornr = newRow.Vornr || "";
					newRow[sField] = "";
					oInitialModel.setProperty(sRowPath, newRow);
					oInitialModel.refresh(true);
				}
			}
			var sFieldName = vTriggeredCell.split("/").pop();
			var newValue = vValue;
			var oldValue = oInitialModel.getProperty(vTriggeredCell);

			// Build a unique ID for each field in a row
			var sUniqueId = "O|" + vVornr + "|" + sFieldName;

			// Get or create the ChangeLog model
			var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			if (!oChangeLogModel) {
				oChangeLogModel = new sap.ui.model.json.JSONModel([]);
				this.getOwnerComponent().setModel(oChangeLogModel, "JM_ChangeLog");
			}

			// Get or create the ChangeLog local model
			var oChangeLocalModel = this.getView().getModel("JM_ChangeLogBackup");
			if (!oChangeLocalModel) {
				oChangeLocalModel = new sap.ui.model.json.JSONModel([]);
				this.getView().setModel(oChangeLocalModel, "JM_ChangeLogBackup");
			}

			var oChangeLogData = oChangeLogModel.getData();
			if (!Array.isArray(oChangeLogData)) {
				oChangeLogData = [];
			} else {
				this.prviousArray = oChangeLogData;
			}

			var oChangeLocalData = oChangeLocalModel.getData();
			if (!Array.isArray(oChangeLocalData)) {
				oChangeLocalData = [];
			} else {
				this.prviousArray = oChangeLogData;
			}

			function normalizeBoolean(val) {
				if (typeof val === "boolean") {
					return val ? "X" : "";
				}
				return val;
			}

			// Apply before comparison
			oldValue = normalizeBoolean(oldValue);
			newValue = normalizeBoolean(newValue);

			// Find existing entry in main changelog
			var idxMain = -1;
			for (var i = 0; i < oChangeLogData.length; i++) {
				if (oChangeLogData[i].UniqueId === sUniqueId) {
					idxMain = i;
					break;
				}
			}

			// Find existing entry in local changelog
			var idxLocal = -1;
			for (i = 0; i < oChangeLocalData.length; i++) {
				if (oChangeLocalData[i].UniqueId === sUniqueId) {
					idxLocal = i;
					break;
				}
			}

			// Add, update, or remove change log entry
			if (oldValue !== newValue) {
				if (idxMain === -1) {
					// Add new change record
					oChangeLogData.push({
						UniqueId: sUniqueId,
						ItemNo: vVornr,
						FieldId: sFieldName,
						ProcessInd: "O",
						ProcessDesc: "Operation",
						FieldName: sColLabel + " - " + vVornr,
						OldValue: oldValue,
						NewValue: newValue,
						ChangedBy: this.UserName,
						ChangedOn: new Date()
					});
				} else {
					oChangeLogData[idxMain].NewValue = newValue;
				}

				if (idxLocal === -1) {
					oChangeLocalData.push({
						UniqueId: sUniqueId,
						ItemNo: vVornr,
						FieldId: sFieldName,
						ProcessInd: "O",
						ProcessDesc: "Operation",
						FieldName: sColLabel + " - " + vVornr,
						OldValue: oldValue,
						NewValue: newValue
					});
				} else {
					oChangeLocalData[idxLocal].NewValue = newValue;
				}
			} else {
				// Remove entry if reverted to original value
				if (idxMain !== -1) {
					oChangeLogData.splice(idxMain, 1);
				}
				if (idxLocal !== -1) {
					oChangeLocalData.splice(idxLocal, 1);
				}
			}

			// Update and refresh models
			oChangeLogModel.setData(oChangeLogData);
			oChangeLogModel.refresh(true);

			oChangeLocalModel.setData(oChangeLocalData);
			oChangeLocalModel.refresh(true);
		},

		// *----------------------------------------------------------------------------------------
		//					Fragment common Live change action 
		// *----------------------------------------------------------------------------------------

		fnFragLivechange: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oInput.getId().split("--")[1];
			var vValue = oInput.getValue().toUpperCase();

			// Convert input to uppercase (for text fields)
			oInput.setValue(vValue);

			this.selectedField = id;
			oInput.setValueState("None"); // reset previous error
			this.fragLiveChangeFlag = true;
			var desId = this.getView().byId(id + "_DES");
			if (desId) {
				this.fnReadf4Cache(id, vValue.toUpperCase(), "P");

			}
			if (this.AppId === "RX") {
				this.fnUpdateChangeLogforFragment(id, vValue);
			}
		},

		fnUpdateChangeLogforFragment: function(vId, newvalue) {

			var sFieldId = vId;
			var readableName = sFieldId.replace(/^ID_OPER_/, "").replace(/_F$/, "");

			var oTable = this.byId("id_OperationTable");
			var iSelectedIndex = oTable.getSelectedIndex();
			var sRowPath = "/Operations/" + iSelectedIndex;

			// Convert to PascalCase (first letter uppercase)
			readableName = readableName.toLowerCase().replace(/(?:^|_)([a-z])/g, function(match, group1) {
				return group1.toUpperCase();
			});

			var oInitialModel = this.getView().getModel("JM_OperationInitialModel");
			var vVornr = "";
			var oldValue = "";
			var newValue = newvalue;

			if (oInitialModel) {
				vVornr = oInitialModel.getProperty(sRowPath + "/Vornr");
				oldValue = oInitialModel.getProperty(sRowPath + "/" + readableName);
			}

			function normalizeValue(val) {
				if (val === null || val === undefined) {
					return '';
				}
				if (typeof val === "number" && val === 0) {
					return '';
				}
				if (typeof val === "string") {
					val = val.trim();
					if (/^0+(\.0+)?$/.test(val)) {
						return '';
					}
				}
				return val;
			}

			oldValue = normalizeValue(oldValue);
			newValue = normalizeValue(newValue);

			// Build a unique ID for each field in a row
			var sUniqueId = "O|" + vVornr + "|" + readableName;
			var labelMap = {
				"ID_OPER_VGW01_F": "1st Std Value",
				"ID_OPER_VGW02_F": "2nd Std Value",
				"ID_OPER_VGW03_F": "3rd Std Value",
				"ID_OPER_VGW04_F": "4th Std Value",
				"ID_OPER_VGW05_F": "5th Std Value",
				"ID_OPER_VGW06_F": "6th Std Value",
				"ID_OPER_VGE01_F": "1st Std Value Unit",
				"ID_OPER_VGE02_F": "2nd Std Value Unit",
				"ID_OPER_VGE03_F": "3rd Std Value Unit",
				"ID_OPER_VGE04_F": "4th Std Value Unit",
				"ID_OPER_VGE05_F": "5th Std Value Unit",
				"ID_OPER_VGE06_F": "6th Std Value Unit",
				"LAR01": "Activity Type",
				"ID_OPER_USR04": this.getView().byId("ID_OPER_USTEXT01").getText() + "Value",
				"ID_RECI_USE04": this.getView().byId("ID_OPER_USTEXT01").getText() + "Unit",
				"ID_OPER_USR05": this.getView().byId("ID_OPER_USTEXT02").getText() + "Value",
				"ID_RECI_USE05": this.getView().byId("ID_OPER_USTEXT02").getText() + "Unit",
				"ID_OPER_USR06": this.getView().byId("ID_OPER_USTEXT03").getText() + "Value",
				"ID_RECI_USE06": this.getView().byId("ID_OPER_USTEXT03").getText() + "Unit",
				"ID_OPER_USR07": this.getView().byId("ID_OPER_USTEXT04").getText() + "Value",
				"ID_RECI_USE07": this.getView().byId("ID_OPER_USTEXT04").getText() + "Unit"
			};
			var string = labelMap[vId] || "";

			// Get or create the ChangeLog model
			var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			if (!oChangeLogModel) {
				oChangeLogModel = new sap.ui.model.json.JSONModel([]);
				this.getOwnerComponent().setModel(oChangeLogModel, "JM_ChangeLog");
			}

			// Get or create the ChangeLog local model
			var oChangeLocalModel = this.getView().getModel("JM_ChangeLogBackup");
			if (!oChangeLocalModel) {
				oChangeLocalModel = new sap.ui.model.json.JSONModel([]);
				this.getView().setModel(oChangeLocalModel, "JM_ChangeLogBackup");
			}

			var oChangeLogData = oChangeLogModel.getData();
			if (!Array.isArray(oChangeLogData)) {
				oChangeLogData = [];
			}

			var oChangeLocalData = oChangeLocalModel.getData();
			if (!Array.isArray(oChangeLocalData)) {
				oChangeLocalData = [];
			}

			// Find existing entry in main changelog
			var idxMain = -1;
			for (var i = 0; i < oChangeLogData.length; i++) {
				if (oChangeLogData[i].UniqueId === sUniqueId) {
					idxMain = i;
					break;
				}
			}

			// Find existing entry in local changelog
			var idxLocal = -1;
			for (var j = 0; j < oChangeLocalData.length; j++) {
				if (oChangeLocalData[j].UniqueId === sUniqueId) {
					idxLocal = j;
					break;
				}
			}

			// Add, update, or remove change log entry
			if (oldValue !== newValue) {
				if (idxMain === -1) {
					// Add new change record
					oChangeLogData.push({
						UniqueId: sUniqueId,
						ItemNo: vVornr,
						FieldId: vId,
						ProcessInd: "O",
						ProcessDesc: "Operation",
						FieldName: (string === "") ? this.getView().byId(vId + "_TXT").getText() + " - " + vVornr : string,
						OldValue: oldValue,
						NewValue: newValue,
						Indicator: "X",
						ChangedBy: this.UserName,
						ChangedOn: new Date()
					});
				} else {
					// Update existing entry
					oChangeLogData[idxMain].NewValue = newValue;
				}

				if (idxLocal === -1) {
					oChangeLocalData.push({
						UniqueId: sUniqueId,
						ItemNo: vVornr,
						FieldId: vId,
						ProcessInd: "O",
						ProcessDesc: "Operation",
						FieldName: (string === "") ? this.getView().byId(vId + "_TXT").getText() + " - " + vVornr : string,
						OldValue: oldValue,
						NewValue: newValue,
						ChangedBy: this.UserName,
						ChangedOn: new Date()
					});
				} else {
					oChangeLocalData[idxLocal].NewValue = newValue;
				}
			} else {
				// Remove entry if reverted to original value
				if (idxMain !== -1) {
					this.removedArray = [oChangeLogData[idxMain]];
					oChangeLogData.splice(idxMain, 1);
				}
				if (idxLocal !== -1) {
					oChangeLocalData.splice(idxLocal, 1);
				}
			}

			// Update and refresh models
			oChangeLogModel.setData(oChangeLogData);
			oChangeLogModel.refresh(true);

			oChangeLocalModel.setData(oChangeLocalData);
			oChangeLocalModel.refresh(true);

		},

		fnUpdatePhaseRow: function(operaionfield, toOperation, selectedRow) {
			var oOperModel = this.getView().getModel("JM_ReciOperations");
			var oData = oOperModel.getData();
			var fromOperData = null;
			if (oData && oData.Operations && oData.Operations.length > 0) {
				for (var i = 0; i < oData.Operations.length; i++) {
					if (oData.Operations[i].Vornr === operaionfield) {
						fromOperData = oData.Operations[i];
						break;
					}
				}
				if (fromOperData) {
					for (var j = 0; j < oData.Operations.length; j++) {
						if (oData.Operations[j].Vornr === toOperation) {
							oData.Operations[j].Phflg = true;
							oData.Operations[j].Arbpl = fromOperData.Arbpl;

							var vVornr = this.getView().getModel("JM_ReciOperations").getProperty(selectedRow + "/Vornr");
							var oModel = this.getView().getModel("JM_EditableModel");
							if (oModel) {
								for (i = 1; i <= 6; i++) {
									var stdValue = "/Vgw0" + i;
									var stdUnit = "/Vge0" + i;
									var ActTyp = "/Lar0" + i;
									oModel.setProperty("/" + vVornr + stdValue, "Edit");
									oModel.setProperty("/" + vVornr + stdUnit, "Edit");
									oModel.setProperty("/" + vVornr + ActTyp, "Edit");
								}
								oModel.setProperty("/" + vVornr + "/Arbpl", "nonEdit");
								oModel.setProperty("/" + vVornr + "/Ckselkz", "Edit");
								oModel.updateBindings(true);
							}
							var triggeredCell = selectedRow + "/Arbpl";
							if (this.AppId === "RX") {
								this.fnUpdateChangelog(selectedRow, triggeredCell, fromOperData.Arbpl);
							}
							break;
						}

					}
				}
			}
			oOperModel.setData(oData);
		},

		fnRemovePhaseState: function(rowPath) {
			var vVornr = this.getView().getModel("JM_ReciOperations").getProperty(rowPath + "/Vornr");
			var bindedData = this.getView().getModel("JM_ReciOperations").getProperty(rowPath);
			bindedData.Phflg = false;
			bindedData.Vge01 = "";
			bindedData.Vge02 = "";
			bindedData.Vge03 = "";
			bindedData.Vge04 = "";
			bindedData.Vge05 = "";
			bindedData.Vge06 = "";
			bindedData.Vgw01 = "";
			bindedData.Vgw02 = "";
			bindedData.Vgw03 = "";
			bindedData.Vgw04 = "";
			bindedData.Vgw05 = "";
			bindedData.Vgw06 = "";
			bindedData.Lar01 = "";
			bindedData.Lar02 = "";
			bindedData.Lar03 = "";
			bindedData.Lar04 = "";
			bindedData.Lar05 = "";
			bindedData.Lar06 = "";
			var oModel = this.getView().getModel("JM_EditableModel");
			if (oModel) {
				for (var i = 1; i <= 6; i++) {
					var stdValue = "/Vgw0" + i;
					var stdUnit = "/Vge0" + i;
					var ActTyp = "/Lar0" + i;
					oModel.setProperty("/" + vVornr + stdValue, "nonEdit");
					oModel.setProperty("/" + vVornr + stdUnit, "nonEdit");
					oModel.setProperty("/" + vVornr + ActTyp, "nonEdit");
				}
				oModel.setProperty("/" + vVornr + "/Arbpl", "Edit");
				oModel.setProperty("/" + vVornr + "/Phseq", "Edit");
				oModel.setProperty("/" + vVornr + "/Pvznr", "Edit");
				oModel.setProperty("/" + vVornr + "/Phflg", "Edit");
				oModel.updateBindings(true);
			}
		},

		fngetStandardValue: function(rowPath) {
			var oModelData = this.getView().getModel("JM_ReciOperations").getProperty(rowPath);
			var oDeepCopy = JSON.parse(JSON.stringify(oModelData));
			var payload = {
				Ind: "T"
			};
			var oCorrectedData = this.fnModifyPayload(oDeepCopy);
			payload.NavRecipe_Operation = [oCorrectedData];
			payload.NavReturn_Msg = [];
			var ServiceCall = this.getOwnerComponent().getModel();

			var boolean = true;
			if (this.batch) {
				boolean = false;
			}

			ServiceCall.setUseBatch(boolean);

			ServiceCall.create("/Recipe_HeaderSet", payload, {
				success: function(oData) {
					var oPayload = oData.NavRecipe_Operation.results[0];
					var id = rowPath.split("/")[2];
					oModelData = this.getView().getModel("JM_ReciOperations");
					var oModeldata1 = this.getView().getModel("JM_ReciOperations").getProperty(rowPath);
					var sBasePath = "/Operations/" + id + "/";
					var aFields = ["Vgtl", "Vge", "Vgw", "Lar"];

					for (var i = 0; i < aFields.length; i++) {
						var sFieldGroup = aFields[i];
						// Loop through suffixes 1–6
						for (var j = 1; j <= 6; j++) {
							var sField;
							// For Vgtl → no leading zero (Vgtl1..Vgtl6)
							if (sFieldGroup === "Vgtl") {
								sField = sFieldGroup + j;
							}
							// For others → use leading zero (Vge01..Vge06)
							else {
								sField = sFieldGroup + ("0" + j).slice(-2);
							}
							// Copy only if exists in payload
							if (oPayload.hasOwnProperty(sField)) {
								oModelData.setProperty(sBasePath + sField, oPayload[sField]);
							}
						}
					}
					var data = oModeldata1;
					var vVornr = this.getView().getModel("JM_ReciOperations").getProperty("/Operations/" + id + "/Vornr");
					var oModel1 = this.getView().getModel("JM_EditableModel");

					// Loop through 1 to 6
					for (var k = 1; k <= 6; k++) {
						var sIndex = ("0" + k).slice(-2); // "01".."06"
						var vgtlField = "Vgtl" + k;
						if (data[vgtlField] === "") {
							["Vge", "Vgw", "Lar"].forEach(function(prefix) {
								oModel1.setProperty("/" + vVornr + "/" + prefix + sIndex, "nonEdit");
							});
						} else {
							["Vge", "Vgw", "Lar"].forEach(function(prefix) {
								oModel1.setProperty("/" + vVornr + "/" + prefix + sIndex, "Edit");
							});
						}
					}
					oModel1.refresh(true);
					oModelData.refresh(true);
				}.bind(this),
				error: function(oResponse) {

				}
			});
			// ServiceCall.setUseBatch(bOldBatch);
		},

		// *----------------------------------------------------------------------------------------
		//					Destination logic Handling (Live Change, Submit)
		// *----------------------------------------------------------------------------------------

		fnDestinationLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oEvent.getSource().getId().split("--")[1];
			var vValue = oEvent.getSource().getValue();
			this.selectedField = id;

			this.getView().byId(id).setValueState("None"); // Input State clear
			this.fnNumberFieldValidation(oEvent);

			var oBindInfo = oInput.getBindingInfo("value");
			var oContext = oBindInfo.binding.oContext;
			var sFieldPath = oBindInfo.parts[0].path;
			var sRowPath = oContext.getPath(); // e.g., "/rows/0"
			this.fnClearErrorState(sRowPath, sRowPath + "/Phseq");

			var oRow = oEvent.getSource().getParent();
			var oTableRow = oRow.getParent();
			var aCells = oTableRow.getCells();
			var iCurrentCellIndex = aCells.indexOf(oEvent.getSource().getParent());

			if (vValue === "" && aCells[iCurrentCellIndex - 1].getItems()[0].getValue() === "") {
				this.fnRemovePhaseState(sRowPath);
				if (this.AppId === "RX") {
					var vtriggeredCell = sRowPath + "/" + sFieldPath;
					this.fnUpdateChangelog(sRowPath, vtriggeredCell, vValue);
				}
				return;
			}

			this.fnReadf4Destination("ID_OPER_PHSEQ", vValue, "P").then(function(flag) {
				if (flag) {
					if (vValue.length === 2) {
						//check destination of that take next input
						if (iCurrentCellIndex !== -1 && iCurrentCellIndex - 1 < aCells.length) {
							var oSupOperationCell = aCells[iCurrentCellIndex - 1];
							var oSupOperationInput = oSupOperationCell.getItems ? oSupOperationCell.getItems()[0] : oSupOperationCell;
							if (oSupOperationInput && oSupOperationInput.getValue) {
								var supOpeationValue = oSupOperationInput.getValue();
								if (supOpeationValue === "") {
									this.fnSetErrorState(sRowPath, sRowPath + "/Pvznr");
									oSupOperationInput.setValueState("Error");
									oSupOperationInput.focus();
									oSupOperationInput.setValueStateText(i18n.getText("enterControlRecipeDestination", [vValue]));
								} else {
									var fromOperation = this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Pvznr");
									var toOperation = aCells[iCurrentCellIndex - 3].getItems()[0].getValue();
									this.fnUpdatePhaseRow(fromOperation, toOperation, sRowPath);
									this.fngetStandardValue(sRowPath);
								}
							}
						}
					}
				} else {
					if (vValue.length === 2) {
						oInput = this.getView().byId(this.selectedField);
						oInput.setValueState("Error");
						oInput.setValueStateText(i18n.getText("validDestination"));
						ErrorHandler.showCustomSnackbar(i18n.getText("validDestination"), "Error", this);
						this.fnSetErrorState(sRowPath, sRowPath + "/Phseq");
					}
				}

			}.bind(this));
			if (this.AppId === "RX") {
				vtriggeredCell = sRowPath + "/" + sFieldPath;
				this.fnUpdateChangelog(sRowPath, vtriggeredCell, vValue);
			}
		},

		fndestinationItemPress: function() {
			var path = this.selectedF4path;
			var sBasePath = path.substring(0, path.lastIndexOf("/"));
			var fromOpeartion = this.getView().getModel("JM_ReciOperations").getProperty(sBasePath + "/Pvznr");
			var toOpeartion = this.getView().getModel("JM_ReciOperations").getProperty(sBasePath + "/Vornr");
			if (fromOpeartion === "") {
				this.fnSetErrorState(sBasePath, sBasePath + "/Pvznr");
				ErrorHandler.showCustomSnackbar(i18n.getText("EnterSupOperation"), "Error", this);
			} else {
				this.fnUpdatePhaseRow(fromOpeartion, toOpeartion, sBasePath);
				this.fngetStandardValue(sBasePath);
			}
		},

		fnReadf4Destination: function(vId, vValue, f4type) {
			return new Promise(function(resolve, reject) {
				var that = this;

				var updateDesc = function(results) {
					// Filter based on Plant
					results = results.filter(function(item) {
						return item.Value3 === that.getView().getModel("JM_KeydataModel").getProperty("/Werks");
					});

					var match = results.find(function(item) {
						return item.Value1 === vValue;
					});
					resolve(!!match);
				};

				if (this.f4Cache[vId]) {
					updateDesc(this.f4Cache[vId]);
				} else {
					this.f4descriptionGet(vId, vValue, f4type, function(results) {
						that.f4Cache[vId] = results;
						updateDesc(results);
					});
				}
			}.bind(this));
		},

		// *----------------------------------------------------------------------------------------
		//			Resource field logic handling (Live change, Submit, select item from F4)
		// *----------------------------------------------------------------------------------------

		fnResourceLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			// var parent = oInput.getParent();
			var id = oInput.getId().split("-")[2];
			var vValue = oInput.getValue().toUpperCase();

			var oRow = oEvent.getSource().getParent();
			var oTableRow = oRow.getParent();
			var aCells = oTableRow.getCells();
			var iCurrentCellIndex = aCells.indexOf(oEvent.getSource().getParent());

			var oBindInfo = oInput.getBindingInfo("value");
			var oContext = oBindInfo.binding.oContext;
			var sFieldPath = oBindInfo.parts[0].path;
			var sRowPath = oContext.getPath(); // e.g., "/rows/0"
			this.selectedF4path = sRowPath;

			var fromOpeartion = this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Pvznr");
			var toOpeartion = this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Vornr");
			var Vornr = this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Vornr");
			this.fnClearErrorState(sRowPath, sRowPath + "/" + sFieldPath);

			oInput.setValue(vValue);
			if (vValue === "") {
				this.fnRemovePhaseState(sRowPath);
				this.fnCheckSupOperationValidation(sRowPath, Vornr);
				if (this.AppId === "RX") {
					var vtriggeredCell = sRowPath + "/" + sFieldPath;
					this.fnUpdateChangelog(sRowPath, vtriggeredCell, vValue);
				}
				return;
			}

			this.fnReadf4Resource(id, vValue, "P", oEvent).then(function(flag) {
				if (flag) {
					if (iCurrentCellIndex !== -1 && iCurrentCellIndex - 1 < aCells.length) {
						var oDestinationCell = aCells[iCurrentCellIndex - 1];
						var oDestinationInput = oDestinationCell.getItems ? oDestinationCell.getItems()[0] : oDestinationCell;
						var oSupOperationCell = aCells[iCurrentCellIndex - 2];
						var oSupOperationInput = oSupOperationCell.getItems ? oSupOperationCell.getItems()[0] : oSupOperationCell;

						if (oDestinationInput && oDestinationInput.getValue() && oDestinationInput.getValue() !== "" && oSupOperationInput.getValue() ===
							"") {
							var destinationValue = oDestinationInput.getValue();
							if (destinationValue !== "") {
								this.fnClearErrorState(sRowPath, sRowPath + "/Pvznr");
								oSupOperationInput.setValueState("None");
								this.fnclearDestinationMakeNonedit();
							}
						} else if (oSupOperationInput.getValue() !== "" && oDestinationInput !== "") {
							this.fnCheckSupOperation(oSupOperationInput.getValue()).then(function(state) {
								if (!state) {
									this.fnSetErrorState(sRowPath, sRowPath + "/Pvznr");
									oSupOperationInput.setValueState("Error");
									this.fnClearErrorState(sRowPath, sRowPath + "/Phseq");
									oSupOperationInput.focus();
									oSupOperationInput.setValueStateText(i18n.getText("enterControlRecipeDestination", [oSupOperationInput.getValue()]));
								} else {
									this.fnClearErrorState(sRowPath, sRowPath + "/" + sFieldPath);
									oSupOperationInput.setValueState("None");
									sap.ui.getCore().applyChanges();
									this.fnUpdatePhaseRow(fromOpeartion, toOpeartion, sRowPath);
									this.fngetStandardValue(sRowPath);
								}
							}.bind(this));
						} else {
							this.fnValidateArbplBackend(vValue, sRowPath).then(function(state) {
								if (state) {
									this.fnClearErrorState(sRowPath, sRowPath + "/" + sFieldPath);
									this.fnmakeNonEditDependentFields();
									this.fnUpdateResourceforPhase(Vornr, vValue);
								}
							}.bind(this));
						}
					}
				}
			}.bind(this));
			if (this.AppId === "RX") {
				vtriggeredCell = sRowPath + "/" + sFieldPath;
				this.fnUpdateChangelog(sRowPath, vtriggeredCell, vValue);
			}
		},

		fnCheckSupOperationValidation: function(sRowpath, Vornr) {
			var oOperationModel = this.getView().getModel("JM_ReciOperations");
			if (!oOperationModel) {
				return;
			}
			var operationData = oOperationModel.getProperty("/Operations") || [];
			var oTable = this.getView().byId("id_OperationTable");
			for (var i = 0; i < operationData.length; i++) {
				var data = operationData[i];
				if (data.Pvznr === Vornr) {
					var row = oTable.getRows()[i];
					if (!row) continue;
					var cells = row.getCells();
					if (cells.length > 2) {
						var vBox = cells[2];
						if (vBox) {
							// vBox.addStyleClass("cl_errorState"); // corrected class name
							this.fnSetErrorState("/Operations/" + i, "/Operations/" + i + "/Pvznr");
							var input = vBox.getItems ? vBox.getItems()[0] : null;
							if (input) {
								input.setValueState("Error");
								input.setValueStateText(i18n.getText("enterExistingOperationNumber"));
							}
						}
					}
				}
			}
		},

		fnResourceItemPress: function(item) {
			var sRowPath = this.selectedF4path.split("/").slice(0, -1).join("/");
			var index = sRowPath.split("/")[2];
			var oDestinationInput = this.getView().byId("ID_OPER_PHSEQ");
			var supoperationValue = this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Pvznr");
			var destinationValue = this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Phseq");
			var oSupOperationInput = this.getView().byId("PVZNR");

			var fromOpeartion = this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Pvznr");
			var toOpeartion = this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Vornr");
			var Vornr = this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Vornr");

			if (oDestinationInput && supoperationValue === "" && destinationValue !== "") {
				if (destinationValue !== "") {
					this.fnClearErrorState("/Operations/" + index, "Opeartions/" + index + "/Pvznr");
					this.fnClearErrorState("/Operations/" + index, "Opeartions/" + index + "/Phseq");
					this.fnclearDestinationMakeNonedit();
				}
			} else if (supoperationValue !== "" && destinationValue !== "") {
				this.fnCheckSupOperation(supoperationValue).then(function(state) {
					if (!state) {
						this.fnSetErrorState("/Operations/" + index, "Opeartions/" + index + "/Pvznr");
						oSupOperationInput.setValueState("Error");
						this.fnClearErrorState("/Operations/" + index, "Opeartions/" + index + "/Phseq");
						oSupOperationInput.focus();
						oSupOperationInput.setValueStateText(i18n.getText("enterControlRecipeDestination", [supoperationValue]));
					} else {
						this.fnClearErrorState("/Operations/" + index, "Opeartions/" + index + "/Pvznr");
						oSupOperationInput.setValueState("None");
						sap.ui.getCore().applyChanges();
						this.fnUpdatePhaseRow(fromOpeartion, toOpeartion, sRowPath);
						this.fngetStandardValue(sRowPath);
					}
				}.bind(this));
			} else {
				this.fnValidateArbplBackend(item, sRowPath).then(function(state) {
					if (state) {
						this.fnmakeNonEditDependentFields();
						this.fnUpdateResourceforPhase(Vornr, item);
					}
				}.bind(this));
			}

		},

		fnValidateArbplBackend: function(vValue, sRowPath) {
			return new Promise(function(Resolve, Reject) {
				var oPayload = {
					Ind: "O"
				};
				oPayload.NavRecipe_Operation = [{
					Arbpl: vValue,
					Werks: this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Werks"),
					Bmsch: this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Bmsch"),
					Umrez: this.fnToEdmDecimal(this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Umrez"), 5, 0),
					Umren: this.fnToEdmDecimal(this.getView().getModel("JM_ReciOperations").getProperty(sRowPath + "/Umren"), 5, 0)
				}];
				oPayload.NavReturn_Msg = [];
				var ServiceCall = this.getOwnerComponent().getModel();
				ServiceCall.create("/Recipe_HeaderSet", oPayload, {
					success: function(oData) {
						if (oData.MsgType !== "E") {
							Resolve(true);
						} else {
							Resolve(false);
						}
					},
					error: function(oResponse) {
						Reject(false);
					}
				});
			}.bind(this));

		},

		fnCheckSupOperation: function(vValue) {
			return new Promise(function(Resolve, Reject) {
				var oOperModel = this.getView().getModel("JM_ReciOperations").getData();
				this.operationId = [];
				// check that Operations array exists
				if (oOperModel && oOperModel.Operations && oOperModel.Operations.length > 0) {
					for (var i = 0; i < oOperModel.Operations.length; i++) {
						var item = oOperModel.Operations[i];
						// only push Vornr where Arbpl has value
						if (item.Arbpl && item.Arbpl !== "" && !item.Phflg) {
							this.operationId.push(item.Vornr);
						}
					}
				}
				if (this.operationId.indexOf(vValue) === -1) {
					Resolve(false);
				} else {
					Resolve(true);
				}
			}.bind(this));
		},

		fnclearDestinationMakeNonedit: function(sRowpath) {
			var that = this;
			var oPopupModel = new sap.ui.model.json.JSONModel({
				title: "Information",
				text: i18n.getText("assignedCRDAutoDeletion"),
				negativeButton: "Cancel",
				negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
				positiveButton: "Proceed",
				positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Apply.svg",
				Indicator: "DEL_DESTINATION"
			});
			// Set model with name
			this.getView().setModel(oPopupModel, "JM_Popup"); // local model
			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment(this.getView().getId(),
					"MANAGED_RECIPE.Fragment.ConfirmationExit", // Fragment path
					this
				);
				this.getView().addDependent(this.oDialog);
			}
			this.oDialog.open();
		},

		fnReadf4Resource: function(vId, vValue, f4type) {
			return new Promise(function(resolve, reject) {
				var that = this;

				var updateDesc = function(results) {

					var match = results.find(function(item) {
						return item.Value1 === vValue;
					});
					resolve(!!match);
				};

				if (this.f4Cache[vId]) {
					updateDesc(this.f4Cache[vId]);
				} else {
					this.f4descriptionGet(vId, vValue, f4type, function(results) {
						that.f4Cache[vId] = results;
						updateDesc(results);
					});
				}
			}.bind(this));
		},

		//*-----------------------------------------------------------------------------------------
		//					 confirmation close and submit button functionlaties
		// *----------------------------------------------------------------------------------------

		fnConfirmationFragmentClose: function() {
			if (this.oDialog) {
				this.oDialog.close();
				this.oDialog.destroy(); // if you want destroy after close
				this.oDialog = null;
			}
		},

		fnSubmitConfirmation: function() {
			var state = this.getView().getModel("JM_Popup").getProperty("/Indicator");
			if (state === "DEL_DESTINATION") {
				var vSelectedRow = this.selectedF4path.split("/")[2];
				this.getView().getModel("JM_ReciOperations").setProperty("/Operations/" + vSelectedRow + "/Phseq", "");
				this.getView().getModel("JM_ReciOperations").setProperty("/Operations/" + vSelectedRow + "/Pvznr", "");
				this.fnmakeNonEditDependentFields();
				this.fnConfirmationFragmentClose();
			}
			if (state === "CLOSE_OPER_DIALOG") {
				this.fnUpdatechangelogDefaultData();
				this.fnConfirmationFragmentClose();
				if (this.duplicateDialog) {
					this.duplicateDialog.close();
					this.duplicateDialog.destroy();
					this.duplicateDialog = null;
				}
			}
			if (state === "DELETEROW") {
				var oTable = this.byId("id_OperationTable");
				var aSelectedIndices = oTable.getSelectedIndices();
				var indexValue = [];
				indexValue.push(aSelectedIndices);
				if (aSelectedIndices.length === 0) {
					ErrorHandler.showCustomSnackbar(i18n.getText("msgSelectRowToRemove"), "Error", this);
					return;
				}
				var oModel = this.getView().getModel("JM_ReciOperations");
				var aData = oModel.getProperty("/Operations");
				var aSelectedVornr = [];

				aData.forEach(function(val, index) {
					if (aSelectedIndices.includes(index)) {
						aSelectedVornr.push(val.Vornr);
					}
				});
				aData.forEach(function(item, index) {
					if (aSelectedVornr.includes(item.Pvznr) && !aSelectedIndices.includes(index)) {
						indexValue[0].push(index);
					}
				});
				indexValue[0].sort(function(a, b) {
					return b - a;
				});

				if (this.AppId === "RX") {
					this.onDeleteOperation(indexValue);
				}

				indexValue[0].forEach(function(iIndex) {
					aData.splice(iIndex, 1);
				});
				oModel.setProperty("/Operations", aData);
				oModel.refresh();
				oModel.updateBindings(true);
				oTable.clearSelection();
				this.fnConfirmationFragmentClose();
			}
			if (state === "BACK") {
				this.fnConfirmationFragmentClose();
				this.fnNavBack();
			}
		},
		onDeleteOperation: function(aDeletedIndexes) {
			var that = this;
			if (!aDeletedIndexes || aDeletedIndexes.length === 0) {
				return;
			}

			// Flatten nested index array if needed
			if (Array.isArray(aDeletedIndexes[0])) {
				aDeletedIndexes = aDeletedIndexes[0];
			}

			// Models
			var oInitialModel = this.getOwnerComponent().getModel("JM_InitialDatas");
			var aInitialData = oInitialModel.getProperty("/NavRecipe_Operation/results") || [];

			var oCurrentModel = this.getView().getModel("JM_ReciOperations");
			var aCurrentOps = oCurrentModel.getProperty("/Operations") || [];

			var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			var aChangeLogData = oChangeLogModel.getData();
			if (!Array.isArray(aChangeLogData)) {
				aChangeLogData = [];
			}

			aDeletedIndexes.forEach(function(iIndex) {
				var oItem = aCurrentOps[iIndex];
				if (!oItem) {
					return;
				}
				var vVornr = oItem.Vornr || "";
				var vArbpl = oItem.Arbpl || "";
				var vPvznr = oItem.Pvznr || "";
				var vPhseq = oItem.Phseq || "";
				if (!vVornr) {
					return;
				}

				aChangeLogData = aChangeLogData.filter(function(entry) {
					return !(entry.UniqueId && entry.UniqueId.indexOf("O|" + vVornr + "|") === 0);
				});
				var bExistsInInitial = aInitialData.some(function(oInit) {
					return oInit.Vornr === vVornr;
				});

				if (bExistsInInitial) {
					aChangeLogData.push({
						UniqueId: "O|" + vVornr + "|Arbpl",
						ItemNo: vVornr,
						FieldId: "Arbpl",
						ProcessInd: "O",
						ProcessDesc: i18n.getText("Operations"),
						FieldName: i18n.getText("ResourceDeleted", vVornr),
						OldValue: vArbpl,
						NewValue: "DELETED",
						ChangedBy: that.UserName,
						ChangedOn: new Date()
					});
					if (vPvznr) {
						aChangeLogData.push({
							UniqueId: "O|" + vVornr + "|Pvznr",
							ItemNo: vVornr,
							FieldId: "Pvznr",
							ProcessInd: "O",
							ProcessDesc: i18n.getText("Operations"),
							FieldName: i18n.getText("SupOperationDeleted", vVornr),
							OldValue: vPvznr,
							NewValue: "DELETED",
							ChangedBy: that.UserName,
							ChangedOn: new Date()
						});
					}
					if (vPhseq) {
						aChangeLogData.push({
							UniqueId: "O|" + vVornr + "|Phflg",
							ItemNo: vVornr,
							FieldId: "Phflg",
							ProcessInd: "O",
							ProcessDesc: i18n.getText("Operations"),
							FieldName: i18n.getText("DestinationDeleted", vVornr),
							OldValue: vPhseq,
							NewValue: "DELETED",
							ChangedBy: that.UserName,
							ChangedOn: new Date()
						});
					}
				}
			});
			oChangeLogModel.setData(aChangeLogData);
			oChangeLogModel.refresh(true);
		},

		fnUpdatechangelogDefaultData: function() {
			var oMainModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			if (!oMainModel) {
				oMainModel = new sap.ui.model.json.JSONModel();
				this.getOwnerComponent().setModel(oMainModel, "JM_ChangeLog");
			}
			if (this.OrgChangeLog) {
				oMainModel.setData(this.OrgChangeLog);
			}
		},

		fnmakeNonEditDependentFields: function() {
			var vSelectedRow = this.selectedF4path.split("/")[2];
			var vSelectedField = this.selectedF4path.split("/")[3];

			var vVornr = this.getView().getModel("JM_ReciOperations").getProperty("/Operations/" + vSelectedRow + "/Vornr");
			var vArbpl = this.getView().getModel("JM_ReciOperations").getProperty("/Operations/" + vSelectedRow + "/" + vSelectedField);
			this.getView().getModel("JM_ReciOperations").setProperty("/Operations/" + vSelectedRow + "/Ckselkz", "");

			if (vArbpl !== "") {
				var oModel = this.getView().getModel("JM_EditableModel");
				if (oModel) {
					oModel.setProperty("/" + vVornr + "/Phflg", "nonEdit");
					oModel.setProperty("/" + vVornr + "/Pvznr", "nonEdit");
					oModel.setProperty("/" + vVornr + "/Phseq", "nonEdit");
					oModel.updateBindings(true);
				}
			}
		},

		// *----------------------------------------------------------------------------------------
		//					Standard Key Text Logic Handling
		// *----------------------------------------------------------------------------------------
		fnStdKeyTextLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oInput.getId().split("--")[1];
			var parentId = oInput.getParent();

			var vValue = oInput.getValue().toUpperCase();
			var oBindInfo = oInput.getBindingInfo("value");
			var oContext = oBindInfo.binding.oContext;
			var sFieldPath = oBindInfo.parts[0].path;
			var sRowPath = oContext.getPath(); // e.g., "/rows/0"

			this.selectedF4path = sRowPath + "/" + sFieldPath;
			this.selectedField = id;

			var Model = this.getView().getModel("JM_ReciOperations");
			if (Model) {
				var vArbpl = Model.getProperty(sRowPath + "/Arbpl");
				if (vArbpl === "") {
					oInput.setValue("");
					this.fnSetErrorState(sRowPath, sRowPath + "/Arbpl");
					ErrorHandler.showCustomSnackbar(i18n.getText("EnterResource"), "Error", this);
					return;
				} else {
					this.fnClearErrorState(sRowPath, sRowPath + "/Arbpl");
					var oRow = oEvent.getSource().getParent(); // VBox or HBox inside the table cell
					var oTableRow = oRow.getParent(); // TableRow or ColumnListItem
					var aCells = oTableRow.getCells();
					var iCurrentCellIndex = aCells.indexOf(oEvent.getSource().getParent());
					if (iCurrentCellIndex !== -1 && iCurrentCellIndex + 1 < aCells.length) {
						var oNextCell = aCells[iCurrentCellIndex + 1];
						var oNextInput = oNextCell.getItems ? oNextCell.getItems()[0] : oNextCell; // handle VBox with Input inside
						this.oNextInput = oNextInput;
						if (oNextInput && oNextInput.getValue() !== "" && vValue === "") {
							oNextInput.setValue("");
						}
					}
					// Convert input to uppercase (for text fields)
					oInput.setValue(vValue);
					this.fnClearErrorState(sRowPath, sRowPath + "/Ktsch");

					this.fnReadf4Cache(id.split("-")[0], vValue, "P");
					if (this.AppId === "RX") {
						var vtriggeredCell = sRowPath + "/" + sFieldPath;
						this.fnUpdateChangelog(sRowPath, vtriggeredCell, vValue);
					}
				}
			}

		},

		// *----------------------------------------------------------------------------------------
		//					Opeation Unit live Change Logic Handling
		// *----------------------------------------------------------------------------------------
		fnOpeartionUnitLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oInput.getId().split("--")[1];
			var vValue = oInput.getValue().toUpperCase();

			// Convert input to uppercase (for text fields)
			var oBindInfo = oInput.getBindingInfo("value");
			var oContext = oBindInfo.binding.oContext;
			var sFieldPath = oBindInfo.parts[0].path;
			var sRowPath = oContext.getPath(); // e.g., "/rows/0"

			oInput.setValue(vValue);
			this.selectedField = id;
			this.selectedF4path = sRowPath + "/" + sFieldPath;

			this.fnClearErrorState(sRowPath, sRowPath + "/" + sFieldPath);
			this.fnReadf4Cache(id.split("-")[0], vValue, "P");
		},

		fnActivtystdUnitLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oInput.getId().split("--")[1];
			var vValue = oInput.getValue().toUpperCase();
			// Convert input to uppercase (for text fields)
			var oBindInfo = oInput.getBindingInfo("value");
			var oContext = oBindInfo.binding.oContext;
			var sFieldPath = oBindInfo.parts[0].path;
			var sRowPath = oContext.getPath(); // e.g., "/rows/0"

			oInput.setValue(vValue);
			this.selectedField = id;
			this.selectedF4path = sRowPath + "/" + sFieldPath;

			this.fnClearErrorState(sRowPath, sRowPath + "/" + sFieldPath);

			this.fnReadf4Cache(id.split("-")[0], vValue, "P");
		},
		//*-----------------------------------------------------------------------------------------
		//					to Open the Operation Dialog function
		// *----------------------------------------------------------------------------------------

		fnOperationDialog: function(oEvent) {
			var oTable = this.byId("id_OperationTable");
			var oTableModel = oTable.getModel("JM_ReciOperations");
			var aSelectedIndices = oTable.getSelectedIndices(); // returns array of selected indices
			var aTableData = oTableModel.getProperty("/Operations");

			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("SelectRow"), "Information", this);
				return;
			}
			if (aSelectedIndices.length > 1) {
				ErrorHandler.showCustomSnackbar(i18n.getText("SelectOnlyOneLine"), "Information", this);
				return;
			}
			// Get the selected row data
			var iSelectedIndex = aSelectedIndices[0];
			var oSelectedRow = aTableData[iSelectedIndex];

			if (!oSelectedRow.Arbpl && !oSelectedRow.Pvznr) {
				ErrorHandler.showCustomSnackbar(i18n.getText("SelectOnlyCreatedRecords"), "Information", this);
				return;
			}

			var that = this;
			if (!that.duplicateDialog) {
				that.duplicateDialog = sap.ui.xmlfragment(that.getView().getId(),
					"MANAGED_RECIPE.Fragment.reci_operations", // Fragment name
					that // Pass controller instance
				);
				that.getView().addDependent(that.duplicateDialog);
			}
			var sPath = oTable.getContextByIndex(aSelectedIndices).getPath();
			var oModel = this.getView().getModel("JM_ReciOperations");
			var oModeldata = JSON.parse(JSON.stringify(oModel.getProperty(sPath)));
			var oDialogModel = new sap.ui.model.json.JSONModel(oModeldata);
			this.getView().setModel(oDialogModel, "JM_ReciOperationsDialog");
			oDialogModel.refresh(true);

			var descriptionModel = this.getView().getModel("JM_DescriptionModel");
			var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			var Appid = this.getOwnerComponent().getModel("JM_ContextModel").getProperty("/Appid");
			if (Object.keys(oChangeLogModel.getData() || {}).length > 0 && Appid === "RX") {
				// Get data and create a deep copy
				var existingData = oChangeLogModel ? JSON.parse(JSON.stringify(oChangeLogModel.getData())) : [];
				// Check if model has some data and AppId === "RX"
				if (existingData && existingData.length > 0 && this.AppId === "RX") {
					existingData = existingData.filter(function(item) {
						return item.ItemNo === oModeldata.Vornr;
					});
					this.fnHighlightinputfield(existingData);
				}
			}

			if (descriptionModel) {
				var descriptionData = descriptionModel.getData();
				var itemNumber = oModeldata.Vornr;
				if (descriptionData[itemNumber]) {
					var data = descriptionData[itemNumber];
					data.forEach(function(item) {
						// Case 1: FieldName = "CKSELKZ"
						if (["CKSELKZ", "STATU", "MATKL", "EKGRP", "LIFNR", "SAKTO", "WAERS"].includes(item.FieldName)) {
							var desId = "ID_OPER_" + item.FieldName + "_F_DES";
							var oInput = this.getView().byId(desId);
							if (oInput) {
								oInput.setValue(item.desc || "");
							}
						} else {
							if (oModel.getProperty(sPath + "/Qpart") !== "") {
								this.fnReadf4Cache("ID_OPER_QPART_F", oModel.getProperty(sPath + "/Qpart"), "P");
							}
							if (oModel.getProperty(sPath + "/Matkl") !== "") {
								this.fnReadf4Cache("ID_OPER_MATKL_F", oModel.getProperty(sPath + "/Qpart"), "P");
							}
							if (oModel.getProperty(sPath + "/Ekgrp") !== "") {
								this.fnReadf4Cache("ID_OPER_EKGRP_F", oModel.getProperty(sPath + "/Ekgrp"), "P");
							}
							if (oModel.getProperty(sPath + "/Lifnr") !== "") {
								this.fnReadf4Cache("ID_OPER_LIFNR_F", oModel.getProperty(sPath + "/Lifnr"), "P");
							}
							if (oModel.getProperty(sPath + "/Sakto") !== "") {
								this.fnReadf4Cache("ID_OPER_SAKTO_F", oModel.getProperty(sPath + "/Sakto"), "P");
							}
							if (oModel.getProperty(sPath + "/Ckselkz") !== "") {
								this.fnReadf4Cache("ID_OPER_CKSELKZ_F", oModel.getProperty(sPath + "/Ckselkz"), "P");
							}
						}
					}.bind(this));
				}
			} else {
				if (oModel.getProperty(sPath + "/Qpart") !== "") {
					this.fnReadf4Cache("ID_OPER_QPART_F", oModel.getProperty(sPath + "/Qpart"), "P");
				}
				if (oModel.getProperty(sPath + "/Matkl") !== "") {
					this.fnReadf4Cache("ID_OPER_MATKL_F", oModel.getProperty(sPath + "/Qpart"), "P");
				}
				if (oModel.getProperty(sPath + "/Ekgrp") !== "") {
					this.fnReadf4Cache("ID_OPER_EKGRP_F", oModel.getProperty(sPath + "/Ekgrp"), "P");
				}
				if (oModel.getProperty(sPath + "/Lifnr") !== "") {
					this.fnReadf4Cache("ID_OPER_LIFNR_F", oModel.getProperty(sPath + "/Lifnr"), "P");
				}
				if (oModel.getProperty(sPath + "/Sakto") !== "") {
					this.fnReadf4Cache("ID_OPER_SAKTO_F", oModel.getProperty(sPath + "/Sakto"), "P");
				}
				if (oModel.getProperty(sPath + "/Ckselkz") !== "") {
					this.fnReadf4Cache("ID_OPER_CKSELKZ_F", oModel.getProperty(sPath + "/Ckselkz"), "P");
				}
			}
			this.firstTymUF = true;
			this.fnUserFields();
			that.duplicateDialog.open();
		},

		fncloseDialog: function() {
			var that = this;
			var oPopupModel = new sap.ui.model.json.JSONModel({
				title: i18n.getText("Information"),
				text: i18n.getText("DiscardChangesOnCancel"),
				negativeButton: "No",
				negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
				positiveButton: "Yes",
				positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Apply.svg",
				Indicator: "CLOSE_OPER_DIALOG"
			});
			// Set model with name
			this.getView().setModel(oPopupModel, "JM_Popup");
			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment(this.getView().getId(),
					"MANAGED_RECIPE.Fragment.ConfirmationExit", // Fragment path
					this
				);
				this.getView().addDependent(this.oDialog);
			}
			this.oDialog.open();
		},
		fnDialogClose: function() {
			if (this.duplicateDialog) {
				this.duplicateDialog.close();
				this.duplicateDialog.destroy();
				this.duplicateDialog = null;
			}
		},

		//*-----------------------------------------------------------------------------------------
		//					 on Save and Back press in Operation Dialog functionalities
		// *----------------------------------------------------------------------------------------

		fnNavtoOperaHeader: function() {
			var changedData = this.getView().getModel("JM_ReciOperationsDialog").getData();
			changedData.Klakz = (changedData.Klakz === true) ? "X" : "";
			changedData.Qsel1 = (changedData.Qsel1 === true) ? "X" : "";
			changedData.Qsel2 = (changedData.Qsel2 === true) ? "X" : "";
			changedData.Qsel3 = (changedData.Qsel3 === true) ? "X" : "";
			changedData.Frdlb = (changedData.Frdlb === true) ? "X" : "";
			changedData.Vgw01 = this.fnToEdmDecimal(changedData.Vgw01, 9, 3);
			changedData.Vgw02 = this.fnToEdmDecimal(changedData.Vgw02, 9, 3);
			changedData.Vgw03 = this.fnToEdmDecimal(changedData.Vgw03, 9, 3);
			changedData.Vgw04 = this.fnToEdmDecimal(changedData.Vgw04, 9, 3);
			changedData.Vgw05 = this.fnToEdmDecimal(changedData.Vgw05, 9, 3);
			changedData.Vgw06 = this.fnToEdmDecimal(changedData.Vgw06, 9, 3);
			changedData.Loanz = this.fnToEdmDecimal(changedData.Loanz, 3, 0);
			changedData.Preis = this.fnToEdmDecimal(changedData.Preis, 9, 3);
			changedData.Plifz = this.fnToEdmDecimal(changedData.Plifz, 3, 0);
			changedData.Datuv = changedData.Datuv;
			changedData.Datub = changedData.Datub;
			changedData.Usr08 = changedData.Usr08 ? this.fntoEdmDateTime(changedData.Usr08) : null;
			changedData.Usr09 = changedData.Usr09 ? this.fntoEdmDateTime(changedData.Usr09) : null;
			changedData.Umrez = this.fnToEdmDecimal(changedData.Umrez, 5, 0);
			changedData.Peinh = this.fnToEdmDecimal(changedData.Peinh, 5, 0);
			changedData.Umren = this.fnToEdmDecimal(changedData.Umren, 5, 0);
			changedData.Usr04 = this.fnToEdmDecimal(changedData.Usr04, 13, 3);
			changedData.Usr05 = this.fnToEdmDecimal(changedData.Usr05, 13, 3);
			changedData.Usr06 = this.fnToEdmDecimal(changedData.Usr06, 13, 3);
			changedData.Anzma = this.fnToEdmDecimal(changedData.Anzma, 5, 2);
			changedData.Usr07 = this.fnToEdmDecimal(changedData.Usr07, 13, 3);
			var oModel = this.getOwnerComponent().getModel();
			var oPayload = {
				"Ind": "O"
			};
			// Deep copy of changedData (so original remains intact)
			var oChangedCopy = JSON.parse(JSON.stringify(changedData));
			oPayload.NavRecipe_Operation = [oChangedCopy];
			oPayload.NavReturn_Msg = [];
			// Now safely remove description fields
			oPayload.NavRecipe_Operation.forEach(function(oItem) {
				["Datub", "Datuv", "Usr08", "Usr09"].forEach(function(field) {
					var value = oItem[field];
					if (typeof value === "string" && value.endsWith("Z")) {
						oItem[field] = new Date(value);
					}
				});
			});
			Object.keys(oPayload.NavRecipe_Operation[0]).forEach(function(key) {
				if (key.endsWith("Des")) {
					delete oPayload.NavRecipe_Operation[0][key];
				}
			});
			busyDialog.open();
			oModel.create("/Recipe_HeaderSet", oPayload, {
				success: function(oData) {
					var first = oData.NavReturn_Msg.results[0].MsgType;
					if (oData.NavReturn_Msg && oData.NavReturn_Msg.results && oData.NavReturn_Msg.results.length > 0 && first !== "S") {
						var aMessages = oData.NavReturn_Msg.results;
						var sFirstMsg = aMessages[0].Message;

						ErrorHandler.showCustomSnackbar(sFirstMsg, "Error", this);
						for (var i = 0; i < aMessages.length; i++) {
							var oMsg = aMessages[i];
							var sId = "ID_OPER_" + oMsg.Fnm + "_F";

							var oControl = this.getView().byId(sId);
							if (oControl) {
								if (sId === "ID_OPER_FRDLB_F") {
									oControl.addStyleClass("cl_checkboxError");
								} else {
									if (oControl.setValueState) {
										oControl.setValueState("Error");
									}
									if (oControl.setValueStateText) {
										oControl.setValueStateText(oMsg.Message);
									}
								}
							}
						}
					} else {
						this.fnAftersuccess(changedData);
						this.fnSaveChangeLogFragment();
					}
					busyDialog.close();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		fnSaveChangeLogFragment: function() {
			var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			var oChangeLocalModel = this.getView().getModel("JM_ChangeLogBackup");

			if (!oChangeLogModel || !oChangeLocalModel) {
				return;
			}

			var aMainData = oChangeLogModel.getData() || [];
			var aLocalData = oChangeLocalModel.getData() || [];

			// Deep copy of main data to avoid side effects
			var aMergedData = JSON.parse(JSON.stringify(aMainData));

			for (var i = 0; i < aLocalData.length; i++) {
				var localEntry = aLocalData[i];
				var found = false;

				// Check if entry already exists in main model by UniqueId
				for (var j = 0; j < aMergedData.length; j++) {
					if (aMergedData[j].UniqueId === localEntry.UniqueId) {
						aMergedData[j].NewValue = localEntry.NewValue;
						aMergedData[j].OldValue = localEntry.OldValue;
						aMergedData[j].FrgInd = localEntry.FrgInd; // Keep "X"
						found = true;
						break;
					}
				}
				if (!found) {
					aMergedData.push(localEntry);
				}
			}

			oChangeLogModel.setData(aMergedData);
			oChangeLogModel.refresh(true);
			oChangeLocalModel.setData([]);
			oChangeLocalModel.refresh(true);
		},

		fnAftersuccess: function(changedData) {
			var oTable = this.byId("id_OperationTable");
			changedData.Klakz = (changedData.Klakz === "X") ? true : false;
			changedData.Qsel1 = (changedData.Qsel1 === "X") ? true : false;
			changedData.Qsel2 = (changedData.Qsel2 === "X") ? true : false;
			changedData.Qsel3 = (changedData.Qsel3 === "X") ? true : false;
			changedData.Frdlb = (changedData.Frdlb === "X") ? true : false;
			var aSelectedIndices = oTable.getSelectedIndices(); // array
			var sPath = oTable.getContextByIndex(aSelectedIndices[0]).getPath(); // take first selected
			var oModel = this.getView().getModel("JM_ReciOperations");
			oModel.setProperty(sPath, changedData);
			oModel.refresh(true);
			var Vornr = changedData.Vornr;
			this.fnUpdateOtherDataforPhase(Vornr, changedData);
			this.fnConfirmationFragmentClose();
			if (this.duplicateDialog) {
				this.duplicateDialog.close();
				this.duplicateDialog.destroy();
				this.duplicateDialog = null;
			}
		},

		fnUpdateOtherDataforPhase: function(Vornr, Data) {
			var oOperModel = this.getView().getModel("JM_ReciOperations");
			var oData = oOperModel.getData(); // entire model data
			var aOperations = oData.Operations; // the array of operations

			if (aOperations && aOperations.length > 0) {
				for (var i = 0; i < aOperations.length; i++) {
					var operationData = aOperations[i];
					if (operationData.Pvznr === Vornr && operationData.Phflg === true) {
						operationData.Steus = Data.Steus;
					}
				}
			}
			// Set back only the Operations array
			oOperModel.setProperty("/Operations", aOperations);
			oOperModel.refresh(true);
		},

		// *----------------------------------------------------------------------------------------
		//					Table filter button Logic handling(Customize table, wrap text)
		// *----------------------------------------------------------------------------------------

		fnCustomTable: function(oEvent) {
			var oButton = oEvent.getSource();
			var that = this;

			var oList = new sap.m.List({
				items: [
					new sap.m.StandardListItem({
						title: "Customize",
						type: "Active",
						icon: "Image/customize.svg",
						press: that.fnCustomize.bind(that)
					}).addStyleClass("cl_uwl_customizefilterlistitem")

					// new sap.m.StandardListItem({
					// 	title: that.textWrap ? "Clip Text" : "Wrap Text",
					// 	type: "Active",
					// 	icon: "Image/Warptext.svg"
					// }).addStyleClass("cl_uwl_wrapfilterlistitem")
				]
			}).addStyleClass("cl_uwl_filterlistitem");

			var oClrButton = new sap.m.Button({
				text: "Clear",
				icon: "Image/Clearall.svg",
				press: function() {
					var oTable = that.getView().byId("id_OperationTable");
					var aColumns = oTable.getColumns();

					aColumns.forEach(function(oColumn) {
						// Clear filters
						oTable.filter(oColumn, "");

						// Clear sorting
						oColumn.setSorted(false);
						oColumn.setSortOrder(null);
					});

					// Remove sorters from binding
					oTable.getBinding("rows").sort(null);
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

		fnCustomize: function(oEvent) {
			var vFinalBinding = [];
			var vSelectedIndex = [];
			var vColumnArray = this.getView().byId('id_OperationTable').getColumns();
			for (var i = 0; i < vColumnArray.length; i++) {
				vFinalBinding.push({
					CName: vColumnArray[i].getLabel().getText(),
					CId: vColumnArray[i].getId().split('--').pop(),
					Visible: vColumnArray[i].getVisible(),
					IsFixed: i < 6
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
			this.vSelectedIndex = vSelectedIndex; //Added for live filter functionaity
			this.vItems = vItems; //Added for live filter functionaity
			if (vSelectedIndex.length === vItems.length) {
				sap.ui.getCore().byId("id_checkselect").setSelected(true);
				sap.ui.getCore().byId("id_checkselect").removeStyleClass("cl_checkbox");
				sap.ui.getCore().byId("id_checkselect").addStyleClass("cl_checkboxSel");
			}
			for (i = 0; i < vSelectedIndex.length; i++) {
				vItems[vSelectedIndex[i]].getContent()[0].getContent()[0].removeStyleClass("cl_checkbox");
				vItems[vSelectedIndex[i]].getContent()[0].getContent()[0].addStyleClass("cl_checkboxSel");
			}

			for (var j = 0; j < vItems.length; j++) {
				var oItemCtx = vItems[j].getBindingContext("JMColumn");
				var bIsFixed = oItemCtx.getProperty("IsFixed");
				if (bIsFixed) {
					var oCheckBox = vItems[j].getContent()[0].getContent()[0];
					oCheckBox.setSelected(true); // Always selected
					oCheckBox.setEnabled(false); // Disable deselection
					oCheckBox.addStyleClass("cl_fixed_checkbox"); // Optional visual style
				}
			}
		},

		//Apply column selection to the table
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
				ErrorHandler.showCustomSnackbar(i18n.getText("ColumnSelectionMandatory"), "Warning", this);

			} else {
				for (var i = 0; i < vColumnArray.length; i++) {
					this.getView().byId("id_OperationTable").getColumns()[i].setVisible(vColumnArray[i].Visible);
				}
				this.fnCancel();
			}

		},

		// Selection Mode
		fnCheckSel: function(oEvent) {
			if (!oEvent.getSource().getSelected()) {
				oEvent.getSource().removeStyleClass("cl_checkboxSel");
				oEvent.getSource().addStyleClass("cl_checkbox");
			} else {

				oEvent.getSource().removeStyleClass("cl_checkbox");
				oEvent.getSource().addStyleClass("cl_checkboxSel");

			}
		},

		// Select All
		fnCheckSelAll: function(oEvent) {
			var oModel = this.getView().getModel("JMColumn");
			var aData = oModel.getData() || [];
			var bSelectAll = !!oEvent.getSource().getSelected();
			var oList = sap.ui.getCore().byId("id_columnSel");

			// Update model data: ensure IsFixed and Visible
			aData.forEach(function(item, i) {
				item.IsFixed = item.IsFixed === true || item.isFixed === true || i < 6;
				item.Visible = item.IsFixed || bSelectAll;
			});

			oModel.setData(aData);
			oModel.refresh(true);

			// Update fragment checkboxes
			if (oList) {
				oList.getItems().forEach(function(oListItem, j) {
					var oChk = oListItem.getContent()[0].getContent()[0];
					var oRow = oListItem.getBindingContext("JMColumn").getObject() || aData[j];

					if (oRow) {
						oChk.setEnabled(!oRow.IsFixed);
						oChk.setSelected(oRow.Visible);
						oChk.removeStyleClass(oRow.Visible ? "cl_checkbox" : "cl_checkboxSel");
						oChk.addStyleClass(oRow.Visible ? "cl_checkboxSel" : "cl_checkbox");
					}
				});
			}
			// Keep "Select All" checkbox consistent
			var totalNonFixed = 0;
			var selectedNonFixed = 0;

			for (var i = 0; i < aData.length; i++) {
				if (!aData[i].IsFixed) {
					totalNonFixed++;
					if (aData[i].Visible) {
						selectedNonFixed++;
					}
				}
			}

			var oSelectAllChk = oEvent.getSource();
			var isAllSelected = totalNonFixed > 0 && selectedNonFixed === totalNonFixed;
			oSelectAllChk.setSelected(isAllSelected);
			oSelectAllChk.removeStyleClass(isAllSelected ? "cl_checkbox" : "cl_checkboxSel");
			oSelectAllChk.addStyleClass(isAllSelected ? "cl_checkboxSel" : "cl_checkbox");
		},

		// Close the popup
		fnCancel: function() {
			this.Customzie.close();
			this.Customzie.destroy();
			this.Customzie = null;
		},

		// Filter Column Selection
		fnColumnFilter: function(oEvent) {
			var vQuery = oEvent.getParameter("newValue").toLowerCase();

			// Get the list
			var vList = sap.ui.getCore().byId("id_columnSel");
			var vBinding = vList.getBinding("items");

			// Apply filter
			if (vQuery) {
				var oFilter = new sap.ui.model.Filter({
					path: "CName",
					operator: sap.ui.model.FilterOperator.Contains,
					value1: vQuery,
					caseSensitive: false
				});
				vBinding.filter([oFilter]);
			} else {
				vBinding.filter([]); // Reset filter
			}

			// After filtering, reapply CSS for selected and fixed checkboxes
			var aItems = vList.getItems();
			for (var i = 0; i < aItems.length; i++) {
				var oItemCtx = aItems[i].getBindingContext("JMColumn");
				var oChk = aItems[i].getContent()[0].getContent()[0]; // checkbox
				var bVisible = oItemCtx.getProperty("Visible");
				var bIsFixed = oItemCtx.getProperty("IsFixed");

				// Remove any previous classes
				oChk.removeStyleClass("cl_checkbox");
				oChk.removeStyleClass("cl_checkboxSel");
				oChk.removeStyleClass("cl_fixed_checkbox");

				if (bIsFixed) {
					oChk.setSelected(true);
					oChk.setEnabled(false);
					oChk.addStyleClass("cl_checkboxSel");
				} else if (bVisible) {
					oChk.setSelected(true);
					oChk.setEnabled(true);
					oChk.addStyleClass("cl_checkboxSel");
				} else {
					oChk.setSelected(false);
					oChk.setEnabled(true);
					oChk.addStyleClass("cl_checkbox");
				}
			}

			var totalNonFixed = 0,
				selectedNonFixed = 0;
			var aData = this.getView().getModel("JMColumn").getData() || [];
			for (var j = 0; j < aData.length; j++) {
				if (!aData[j].IsFixed) {
					totalNonFixed++;
					if (aData[j].Visible) selectedNonFixed++;
				}
			}
			var oSelectAllChk = sap.ui.getCore().byId('id_checkselect');
			var isAllSelected = totalNonFixed > 0 && selectedNonFixed === totalNonFixed;
			oSelectAllChk.setSelected(isAllSelected);
			oSelectAllChk.removeStyleClass(isAllSelected ? "cl_checkbox" : "cl_checkboxSel");
			oSelectAllChk.addStyleClass(isAllSelected ? "cl_checkboxSel" : "cl_checkbox");
		},

		// *----------------------------------------------------------------------------------------
		//					Function table Header button (Delete, Add, deselect, Search)
		// *----------------------------------------------------------------------------------------

		fnDeselectAll: function() {
			var oTable = this.getView().byId("id_OperationTable");
			if (oTable.getSelectedIndices().length === 0) {
				ErrorHandler.showCustomSnackbar("No row selected", "Warning", this);
			}
			oTable.clearSelection();
		},

		fnFilterDBTable: function(oEvent) {
			var sQuery = oEvent.getSource().getValue().trim().toLowerCase();
			var oTable = this.byId("id_OperationTable");
			var oBinding = oTable.getBinding("rows");

			if (!oBinding) {
				return;
			}
			var aFilters = [];
			if (sQuery) {
				aFilters.push(new sap.ui.model.Filter({
					filters: [
						new sap.ui.model.Filter("Vornr", sap.ui.model.FilterOperator.Contains, sQuery),
						new sap.ui.model.Filter("Description", sap.ui.model.FilterOperator.Contains, sQuery),
						new sap.ui.model.Filter("Destination", sap.ui.model.FilterOperator.Contains, sQuery)
					],
					and: false
				}));
			}
			oBinding.filter(aFilters, "Application");
		},

		fnDeleteRow: function(oEvent) {
			var that = this;
			var oTable = this.byId("id_OperationTable");
			var aSelectedIndices = oTable.getSelectedIndices();
			var indexValue = [];
			indexValue.push(aSelectedIndices);
			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar("Please select a row to remove", "Error", this);
				return;
			}
			var oPopupModel = new sap.ui.model.json.JSONModel({
				title: i18n.getText("Information"),
				text: i18n.getText("DeleteRecordPhaseWarning"),
				negativeButton: "No",
				negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
				positiveButton: "Yes",
				positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Apply.svg",
				Indicator: "DELETEROW"
			});
			// Set model with name
			this.getView().setModel(oPopupModel, "JM_Popup");
			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment(this.getView().getId(),
					"MANAGED_RECIPE.Fragment.ConfirmationExit", // Fragment path
					this
				);
				this.getView().addDependent(this.oDialog);
			}
			this.oDialog.open();
		},

		fnAddRow: function() {
			var oOperModel = this.getView().getModel("JM_ReciOperations");
			var oEditableModel = this.getView().getModel("JM_EditableModel");

			if (oOperModel && oEditableModel) {
				var oData = oOperModel.getProperty("/Operations") || [];
				var lastVornor = Number(oData[oData.length - 1].Vornr);
				var editableData = oEditableModel.getData() || {};

				// Get current date object
				var currentDate = new Date();
				var endDate = new Date(9999, 11, 31); // 31.12.9999

				// New row data
				var newVornr = String(lastVornor + 10).padStart(4, "0");
				var newRow = {
					Vornr: newVornr, //operation
					Phflg: false, //phase
					Pvznr: "", //sup_operation
					Phseq: "", //Destination
					Arbpl: "", //Resource
					Steus: "PI01", //control key
					Txtkz: false,
					Ktsch: "",
					Ltxa1: "",
					Txtsp: "",
					Ckselkz: "X",
					Klakz: false,
					Bezkz: false,
					Bmsch: this.Bmsch, //Base Quantity
					Meinh: this.Meinh, // Unit of Measures
					Vgw01: "",
					Vge01: "",
					Lar01: "",
					Vgw02: "",
					Vge02: "",
					Lar02: "",
					Vgw03: "",
					Vge03: "",
					Lar03: "",
					Vgw04: "",
					Vge04: "",
					Lar04: "",
					Vgw05: "",
					Vge05: "",
					Lar05: "",
					Vgw06: "",
					Vge06: "",
					Lar06: "",
					Ddehn: false,
					Werks: this.getView().getModel("JM_KeydataModel").getProperty("/Werks"), //Plant
					Aennr: "", // Change Number
					Datuv: currentDate, //valid from
					Datub: endDate, // valid to
					Umrez: this.getView().getModel("JM_RecipeData").getProperty("/Umrez"), // charge Quantity
					Umren: this.getView().getModel("JM_RecipeData").getProperty("/Umren"), // Operation Quantity
					Usr00: "", // user fields
					Usr01: "", // user fields
					Usr02: "",
					Usr03: "",
					Usr04: "",
					Use04: "",
					Usr05: "",
					Use05: "",
					Usr06: "",
					Use06: "",
					Usr07: "",
					Use07: "",
					Usr08: "",
					Usr09: "",
					Usr10: false,
					Usr11: false,
					Slwid: "", //Key word ID for user-defined fields
					Loanz: "",
					Loart: "",
					Logrp: "",
					Rsanz: "",
					Prz01: "",
					Rasch: "",
					Rfgrp: "",
					Rfsch: "",
					Qlkapar: "",
					Anzma: "",
					Qpart: "",
					Infnr: "",
					Ekorg: "",
					Ebeln: "",
					Ebelp: "",
					Sortl: "",
					Plifz: "",
					Matkl: "",
					Ekgrp: "",
					Lifnr: "",
					Peinh: "",
					Sakto: "",
					Frdlb: false,
					Preis: "",
					Waers: "",
					QlSearch: "",
					Qsel1: true,
					Qsel2: false,
					Qsel3: false,
					Vgtl1: "",
					Vgtl2: "",
					Vgtl3: "",
					Vgtl4: "",
					Vgtl5: "",
					Vgtl6: ""
				};

				// Add to operations array
				oData.push(newRow);

				// Update editable model for this new Vornr
				editableData[newVornr] = {
					Vornr: "nonEdit", // Opeartion
					Phflg: "Edit", //phase
					Pvznr: "Edit", //sup_operation
					Phseq: "Edit", //Destination
					Arbpl: "Edit", //Resource
					Ckselkz: "nonEdit", // Relevany to costing
					Ddehn: "nonEdit", //flex
					Meinh: "Edit",
					Bmsch: "Edit",
					Ktsch: "Edit",
					Ltxa1: "Edit",
					Steus: "Edit",
					Vgw01: "nonEdit",
					Vge01: "nonEdit",
					Lar01: "nonEdit",
					Vgw02: "nonEdit",
					Vge02: "nonEdit",
					Lar02: "nonEdit",
					Vgw03: "nonEdit",
					Vge03: "nonEdit",
					Lar03: "nonEdit",
					Vgw04: "nonEdit",
					Vge04: "nonEdit",
					Lar04: "nonEdit",
					Vgw05: "nonEdit",
					Vge05: "nonEdit",
					Lar05: "nonEdit",
					Vgw06: "nonEdit",
					Vge06: "nonEdit",
					Lar06: "nonEdit"
				};

				// Set back to models
				oOperModel.setProperty("/Operations", oData);
				oOperModel.refresh(true);

				oEditableModel.setData(editableData);
				oEditableModel.refresh(true);
			}
		},

		// *----------------------------------------------------------------------------------------
		//						User field tab actions logics
		// *----------------------------------------------------------------------------------------

		fnUserFields: function() {
			var sUFfields = this.getView().byId("id_userfield").getSelectedKey();
			var oModel = this.getView().getModel("JM_UFTemplate");
			switch (sUFfields) {
				case "":
					oModel.setProperty("/Visible", false);
					oModel.refresh(true);
					break;
				case "0000001":
					oModel.setProperty("/Visible", true);
					oModel.refresh(true);
					if (this.oUFVisibleModel["0000001"]) {
						var data = this.oUFVisibleModel["0000001"];
						var oSetModel = new sap.ui.model.json.JSONModel({
							Swrt0: data.Swrt0,
							Swrt1: data.Swrt1,
							Swrt2: data.Swrt2,
							Swrt3: data.Swrt3,
							Swrt4: data.Swrt4,
							Swrt5: data.Swrt5,
							Swrt6: data.Swrt6,
							Swrt7: data.Swrt7,
							Swrt8: data.Swrt8,
							Swrt9: data.Swrt9,
							Swrt10: data.Swrt10,
							Swrt11: data.Swrt11
						});
						this.getView().setModel(oSetModel, "JM_UFTextTemplate"); // local Model
					}
					if (!this.firstTymUF) {
						this.clearUserfieldValues();

					}
					this.firstTymUF = false;
					break;
				case "WCM":
					oModel.setProperty("/Visible", true);
					oModel.refresh(true);
					if (this.oUFVisibleModel["WCM"]) {
						data = this.oUFVisibleModel["WCM"];
						oSetModel = new sap.ui.model.json.JSONModel({
							Swrt0: data.Swrt0,
							Swrt1: data.Swrt1,
							Swrt2: data.Swrt2,
							Swrt3: data.Swrt3,
							Swrt4: data.Swrt4,
							Swrt5: data.Swrt5,
							Swrt6: data.Swrt6,
							Swrt7: data.Swrt7,
							Swrt8: data.Swrt8,
							Swrt9: data.Swrt9,
							Swrt10: data.Swrt10,
							Swrt11: data.Swrt11
						});
						this.getView().setModel(oSetModel, "JM_UFTextTemplate"); // Local model
					}
					if (!this.firstTymUF) {
						this.clearUserfieldValues();

					}
					this.firstTymUF = false;
					break;
			}
		},

		clearUserfieldValues: function() {
			var opeartionDialogModel = this.getView().getModel("JM_ReciOperationsDialog");
			if (opeartionDialogModel) {
				// var data = opeartionDialogModel.getData();
				for (var i = 0; i < 10; i++) {
					var filed = "Usr" + String(i).padStart(2, "0");
					opeartionDialogModel.setProperty("/" + filed, "");
					opeartionDialogModel.refresh(true);
				}
			}
		},

		// *----------------------------------------------------------------------------------------
		//						Save and Navigate to Initiator screen 
		// *----------------------------------------------------------------------------------------

		fnsaveOperation: function() {
			var that = this;
			this.fnCheckValidation().then(function(state) {
					if (state) {
						var oPayload = that.fnCreatePayload();
						for (var i = 0; i < oPayload.NavRecipe_Operation.length; i++) {
							Object.keys(oPayload.NavRecipe_Operation[i]).forEach(function(key) {
								if (key.endsWith("Des")) {
									delete oPayload.NavRecipe_Operation[i][key];
								}
							});
						}
						that.fncheckValdation(oPayload);
					}
				})
				.catch(function(message) {
					ErrorHandler.showCustomSnackbar(message, "Error", that);
				});
		},
		fnCheckValidation: function() {
			return new Promise(function(resolve, reject) {
				var EditableModel = this.getView().getModel("JM_EditableModel");
				var data = EditableModel ? EditableModel.getData() : {};
				var errorIndex = -1;
				var outerKey = null;
				var errorKey = null;
				var keys = Object.keys(data);
				for (var i = 0; i < keys.length; i++) {
					var k = keys[i];
					var obj = data[k];
					for (var f in obj) {
						if (obj.hasOwnProperty(f)) {
							if (obj[f] === "Error") {
								errorIndex = i;
								outerKey = k;
								errorKey = f;
								break;
							}
						}
					}
					if (errorIndex !== -1) {
						break;
					}
				}
				var message = "";
				// ---- FOUND ERROR → REJECT ----
				if (errorIndex !== -1) { // <-- FIXED CONDITION
					var oTable = this.byId("id_OperationTable");
					var aRows = oTable.getRows();
					var oRow = aRows[errorIndex];
					var aCells = oRow.getCells();
					for (var c = 0; c < aCells.length; c++) {
						var cell = aCells[c];
						if (cell.getItems &&
							cell.getItems()[0] &&
							cell.getItems()[0].getValueState() === "Error") {
							message = cell.getItems()[0].getValueStateText();
							break;
						}
					}
					message = (message === "") ? "Validation Error" : message;
					reject(message);
					return;
				}
				// ---- NO ERRORS ----
				resolve(true);

			}.bind(this));
		},

		fnCreatePayload: function() {
			this.fnClearChangedFlag();
			var vOparationData = JSON.parse(
				JSON.stringify(this.getView().getModel("JM_ReciOperations").getProperty("/Operations"))
			);
			var oPayload = {};
			oPayload.NavRecipe_Operation = [];

			// Loop through all operation data
			vOparationData.forEach(function(data) {
				// Include only if at least one key field is not empty
				if (data.Arbpl !== "") {
					data.Klakz = (data.Klakz === true) ? "X" : "";
					data.Qsel1 = (data.Qsel1 === true) ? "X" : "";
					data.Qsel2 = (data.Qsel2 === true) ? "X" : "";
					data.Qsel3 = (data.Qsel3 === true) ? "X" : "";
					data.Frdlb = (data.Frdlb === true) ? "X" : "";
					data.Vgw01 = this.fnToEdmDecimal(data.Vgw01, 9, 3);
					data.Vgw02 = this.fnToEdmDecimal(data.Vgw02, 9, 3);
					data.Vgw03 = this.fnToEdmDecimal(data.Vgw03, 9, 3);
					data.Vgw04 = this.fnToEdmDecimal(data.Vgw04, 9, 3);
					data.Vgw05 = this.fnToEdmDecimal(data.Vgw05, 9, 3);
					data.Vgw06 = this.fnToEdmDecimal(data.Vgw06, 9, 3);
					data.Loanz = this.fnToEdmDecimal(data.Loanz, 3, 0);
					data.Preis = this.fnToEdmDecimal(data.Preis, 9, 3);
					data.Plifz = this.fnToEdmDecimal(data.Plifz, 3, 0);
					data.Datuv = this.fntoEdmDateTime(data.Datuv);
					data.Datub = this.fntoEdmDateTime(data.Datub);
					data.Usr08 = data.Usr08 ? this.fntoEdmDateTime(data.Usr08) : null;
					data.Usr09 = data.Usr09 ? this.fntoEdmDateTime(data.Usr09) : null;
					data.Umrez = this.fnToEdmDecimal(data.Umrez, 5, 0);
					data.Peinh = this.fnToEdmDecimal(data.Peinh, 5, 0);
					data.Umren = this.fnToEdmDecimal(data.Umren, 5, 0);
					data.Usr04 = this.fnToEdmDecimal(data.Usr04, 13, 3);
					data.Usr05 = this.fnToEdmDecimal(data.Usr05, 13, 3);
					data.Usr06 = this.fnToEdmDecimal(data.Usr06, 13, 3);
					data.Usr07 = this.fnToEdmDecimal(data.Usr07, 13, 3);
					data.Anzma = this.fnToEdmDecimal(data.Anzma, 5, 2);
					oPayload.NavRecipe_Operation.push(data);
				}
			}.bind(this));

			return oPayload;
		},
		fnClearChangedFlag: function() {
			var oModel = this.getView().getModel("JM_ReciOperations");
			if (!oModel) return;

			var aRows = oModel.getProperty("/Operations") || [];

			// Remove the 'Changed' property from each row
			for (var i = 0; i < aRows.length; i++) {
				if (aRows[i].hasOwnProperty("Changed")) {
					delete aRows[i].Changed;
				}
			}

			// Update and refresh model bindings
			oModel.setProperty("/Operations", aRows);
			oModel.refresh(true);
		},

		fnToEdmDecimal: function(value, totalDigits, decimalPlaces) {
			if (value === null || value === undefined || value === "") {
				return decimalPlaces > 0 ? "0." + "0".repeat(decimalPlaces) : "0";
			}
			var num = parseFloat(value);
			if (isNaN(num)) {
				return decimalPlaces > 0 ? "0." + "0".repeat(decimalPlaces) : "0";
			}
			var fixedValue = num.toFixed(decimalPlaces);
			var parts = fixedValue.split(".");
			var intPart = parts[0];
			var decPart = parts[1] || "";
			var maxIntLength = totalDigits - decimalPlaces;
			if (intPart.length > maxIntLength) {
				intPart = intPart.slice(0, maxIntLength);
			}
			var result = decimalPlaces > 0 ? intPart + "." + decPart : intPart;
			return result;
		},

		// fntoEdmDateTime: function(vValue) {
		// 	var value = vValue;
		// 	if (typeof value === "string" && value.endsWith("Z")) {
		// 		return new Date(value);
		// 	}
		// 	// if (!vValue) {
		// 	// 	return "";
		// 	// }
		// 	// // Ensure it's a valid Date object
		// 	// var oDate = new Date(vValue);
		// 	// // Handle invalid or timezone-shifted dates
		// 	// if (isNaN(oDate.getTime())) {
		// 	// 	return vValue; // fallback
		// 	// }
		// 	// var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
		// 	// 	pattern: "dd.MM.yyyy",
		// 	// 	UTC: true // prevent timezone offset
		// 	// });
		// 	// return oDateFormat.format(oDate);

		// },
		fntoEdmDateTime: function(vValue) {

			// case 1: String ending with Z (UTC)
			if (typeof vValue === "string" && vValue.endsWith("Z")) {
				return new Date(vValue);
			}

			// case 2: Local date string like "Fri Dec 31 9999 05:30:00 GMT+0530..."
			if (typeof vValue === "string") {
				return new Date(vValue);
			}

			// case 3: Already a Date object
			if (vValue instanceof Date) {
				return vValue;
			}

			return null;
		},

		fncheckValdation: function(oPayload) {
			oPayload.Ind = "O";
			oPayload.NavReturn_Msg = [];
			var serviceCall = this.getOwnerComponent().getModel();
			serviceCall.setUseBatch(false);

			busyDialog.open();
			serviceCall.create("/Recipe_HeaderSet", oPayload, {
				success: function(oData) {
					if (oData.MsgTyp === "E") {

						var ErrorPopUp = oData.NavReturn_Msg.results[0].Message;
						ErrorHandler.showCustomSnackbar(ErrorPopUp, "Error", this);

						for (var i = 0; i < oData.NavReturn_Msg.results.length; i++) {
							var data = oData.NavReturn_Msg.results[i];
							var oTable = this.byId("id_OperationTable");
							var oModel = oTable.getModel("JM_ReciOperations"); // your table model
							var aData = oModel.getProperty("/Operations");
							var searchValue = data.ItemNo;

							var iIndex = aData.findIndex(function(item) {
								return item.Vornr === searchValue; // <-- change field name as needed
							});

							if (iIndex !== -1) {
								var sFieldName = data.Fnm.charAt(0).toUpperCase() + data.Fnm.slice(1).toLowerCase();
								this.fnSetErrorState("/Operations/" + iIndex, "/Operations/" + iIndex + "/" + sFieldName);
							}
						}
					} else {
						this.fnClearChangeLog();
						var oOperationData = {
							NavRecipe_Operation: oPayload.NavRecipe_Operation
						};
						var oRecipeData = this.getOwnerComponent().getModel("JM_Operation");
						oRecipeData.setData(oOperationData); // replaces the data
						oRecipeData.refresh(true); // updates the bindings

						var oView = this.getView();

						var aGlobalModels = [
							"JM_EditableModel",
							"JM_ReciOperations"
						];

						aGlobalModels.forEach(function(sModelName) {
							// --- Clear from View level ---
							var oViewModel = oView.getModel(sModelName);
							if (oViewModel) {
								oViewModel.destroy(); // free memory
								oView.setModel(new sap.ui.model.json.JSONModel({}), sModelName);
							}
						});

						sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_initiator");
					}
					busyDialog.close();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		// ----------------------------------------------------------------------------------------------------
		//				Logic for F4 check the field value is present or not in the field
		// ----------------------------------------------------------------------------------------------------

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

		fnQuanDataElementValidation: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oInput.getId().split("--")[1];
			var vValue = oInput.getValue().toUpperCase();
			this.selectedField = id;

			oInput.setValueState("None"); // Reset previous error

			var oBindInfo = oInput.getBindingInfo("value");
			var oContext = oBindInfo.binding.oContext;
			var sFieldPath = oBindInfo.parts[0].path;
			var sRowPath = oContext.getPath(); // e.g., "/rows/0"

			this.fnClearErrorState(sRowPath, sRowPath + sFieldPath);
			var inputType = oInput.getType();
			if (inputType === "Number") {
				var maxLength = oInput.getMaxLength();
				var hasDot = vValue.indexOf(".") !== -1;

				// Allowed chars: digits and single dot
				vValue = vValue.replace(/[^0-9.]/g, "");

				// Keep only the first dot
				var firstDotIndex = vValue.indexOf(".");
				if (firstDotIndex !== -1) {
					var parts = vValue.split(".");
					var integerPart = parts[0];
					var decimalPart = parts[1] ? parts[1].substring(0, 3) : ""; // limit to 3 decimals
					vValue = integerPart + (decimalPart ? "." + decimalPart : "");
				}

				// Remove trailing dot if it exists
				if (vValue.charAt(vValue.length - 1) === ".") {
					vValue = vValue.substring(0, vValue.length - 1);
				}

				// Determine effective max length
				var effectiveMaxLength = hasDot ? maxLength + 1 : maxLength;
				// Prevent input if limit reached
				if (vValue.length > effectiveMaxLength) {
					vValue = vValue.substring(0, effectiveMaxLength);
				}
				oInput.setValue(vValue);
			}
			if (this.AppId === "RX") {
				var vtriggeredCell = sRowPath + "/" + sFieldPath;
				this.fnUpdateChangelog(sRowPath, vtriggeredCell, vValue);
			}

		},

		fnQuanDataElementValidation2Dec: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oInput.getId().split("--")[1];
			var vValue = oInput.getValue().toUpperCase();
			this.selectedField = id;

			oInput.setValueState("None"); // Reset previous error

			var oBindInfo = oInput.getBindingInfo("value");
			var oContext = oBindInfo.binding.oContext;
			var sFieldPath = oBindInfo.parts[0].path;
			var sRowPath = oContext.getPath(); // e.g., "/rows/0"

			this.fnClearErrorState(sRowPath, sRowPath + sFieldPath);

			var inputType = oInput.getType();
			if (inputType === "Number") {
				var maxLength = oInput.getMaxLength();
				var hasDot = vValue.indexOf(".") !== -1;

				// Allowed chars: digits and single dot
				vValue = vValue.replace(/[^0-9.]/g, "");

				// Keep only the first dot
				var firstDotIndex = vValue.indexOf(".");
				if (firstDotIndex !== -1) {
					var parts = vValue.split(".");
					var integerPart = parts[0];
					var decimalPart = parts[1] ? parts[1].substring(0, 2) : ""; // limit to 3 decimals
					vValue = integerPart + (decimalPart ? "." + decimalPart : "");
				}

				// Remove trailing dot if it exists
				if (vValue.charAt(vValue.length - 1) === ".") {
					vValue = vValue.substring(0, vValue.length - 1);
				}

				// Determine effective max length
				var effectiveMaxLength = hasDot ? maxLength + 1 : maxLength;
				// Prevent input if limit reached
				if (vValue.length > effectiveMaxLength) {
					vValue = vValue.substring(0, effectiveMaxLength);
				}
				oInput.setValue(vValue);
			}
			if (this.AppId === "RX") {
				var vtriggeredCell = sRowPath + "/" + sFieldPath;
				this.fnUpdateChangelog(sRowPath, vtriggeredCell, vValue);
			}

		},

		fnNumberFieldValidation: function(oEvent) {
			var oInput = oEvent.getSource();
			var vValue = oInput.getValue();
			var maxLength = oInput.getMaxLength(); // e.g., 10

			var oBindInfo = oInput.getBindingInfo("value");
			var oContext = oBindInfo.binding.oContext;
			var sFieldPath = oBindInfo.parts[0].path;
			var sRowPath = oContext.getPath(); // e.g., "/rows/0"

			// Reset previous error
			oInput.setValueState("None");

			// Remove non-digit characters
			var cleaned = vValue.replace(/[^0-9]/g, "");

			// Trim to maxLength if exceeded
			if (cleaned.length > maxLength) {
				cleaned = cleaned.substring(0, maxLength);
			}

			// Update input
			oInput.setValue(cleaned);

			if (this.AppId === "RX") {
				var vtriggeredCell = sRowPath + "/" + sFieldPath;
				this.fnUpdateChangelog(sRowPath, vtriggeredCell, vValue);
			}

		},

		fnQuanDataElementValidationFrag: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oInput.getId().split("--")[1];
			var vValue = oInput.getValue().toUpperCase();
			this.selectedField = id;
			var parent = oInput.getParent();
			parent.removeStyleClass("cl_errorState"); // reset previous error
			oInput.setValueState("None"); // Reset previous error

			var inputType = oInput.getType();
			if (inputType === "Number") {
				var maxLength = oInput.getMaxLength();
				var hasDot = vValue.indexOf(".") !== -1;

				// Allowed chars: digits and single dot
				vValue = vValue.replace(/[^0-9.]/g, "");

				// Keep only the first dot
				var firstDotIndex = vValue.indexOf(".");
				if (firstDotIndex !== -1) {
					var parts = vValue.split(".");
					var integerPart = parts[0];
					var decimalPart = parts[1] ? parts[1].substring(0, 3) : ""; // limit to 3 decimals
					vValue = integerPart + (decimalPart ? "." + decimalPart : "");
				}

				// Remove trailing dot if it exists
				if (vValue.charAt(vValue.length - 1) === ".") {
					vValue = vValue.substring(0, vValue.length - 1);
				}

				// Determine effective max length
				var effectiveMaxLength = hasDot ? maxLength + 1 : maxLength;
				// Prevent input if limit reached
				if (vValue.length > effectiveMaxLength) {
					vValue = vValue.substring(0, effectiveMaxLength);
				}
				oInput.setValue(vValue);
			}
			if (this.AppId === "RX") {
				this.fnUpdateChangeLogforFragment(id, vValue);
			}

		},

		fnQuanDataElementValidation2DecFrag: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oInput.getId().split("--")[1];
			var vValue = oInput.getValue().toUpperCase();
			this.selectedField = id;
			var parent = oInput.getParent();
			parent.removeStyleClass("cl_errorState"); // reset previous error
			oInput.setValueState("None"); // Reset previous error

			var inputType = oInput.getType();
			if (inputType === "Number") {
				var maxLength = oInput.getMaxLength();
				var hasDot = vValue.indexOf(".") !== -1;

				// Allowed chars: digits and single dot
				vValue = vValue.replace(/[^0-9.]/g, "");

				// Keep only the first dot
				var firstDotIndex = vValue.indexOf(".");
				if (firstDotIndex !== -1) {
					var parts = vValue.split(".");
					var integerPart = parts[0];
					var decimalPart = parts[1] ? parts[1].substring(0, 2) : ""; // limit to 3 decimals
					vValue = integerPart + (decimalPart ? "." + decimalPart : "");
				}

				// Remove trailing dot if it exists
				if (vValue.charAt(vValue.length - 1) === ".") {
					vValue = vValue.substring(0, vValue.length - 1);
				}

				// Determine effective max length
				var effectiveMaxLength = hasDot ? maxLength + 1 : maxLength;
				// Prevent input if limit reached
				if (vValue.length > effectiveMaxLength) {
					vValue = vValue.substring(0, effectiveMaxLength);
				}

				oInput.setValue(vValue);
			}
			if (this.AppId === "RX") {
				this.fnUpdateChangeLogforFragment(id, vValue);
			}

		},

		fnNumberFieldValidationFrag: function(oEvent) {
			var oInput = oEvent.getSource();
			var vValue = oInput.getValue();
			var id = oInput.getId().split("--")[1];
			var maxLength = oInput.getMaxLength(); // e.g., 10

			// Reset previous error
			oInput.setValueState("None");

			// Remove non-digit characters
			var cleaned = vValue.replace(/[^0-9]/g, "");

			// Trim to maxLength if exceeded
			if (cleaned.length > maxLength) {
				cleaned = cleaned.substring(0, maxLength);
			}

			// Update input
			oInput.setValue(cleaned);

			if (this.AppId === "RX") {
				this.fnUpdateChangeLogforFragment(id, vValue);
			}

		},

		fnmakeEditDependentFields: function() {
			var vSelectedRow = this.selectedF4path.split("/")[2];
			var vSelectedField = this.selectedF4path.split("/")[3];

			var vVornr = this.getView().getModel("JM_ReciOperations").getProperty("/Operations/" + vSelectedRow + "/Vornr");
			var vArbpl = this.getView().getModel("JM_ReciOperations").getProperty("/Operations/" + vSelectedRow + "/" + vSelectedField);
			this.getView().getModel("JM_ReciOperations").setProperty("/Operations/" + vSelectedRow + "/Ckselkz", "");

			if (vArbpl !== "") {
				var oModel = this.getView().getModel("JM_EditableModel");
				if (oModel) {
					oModel.setProperty("/" + vVornr + "/Phflg", "Edit");
					oModel.setProperty("/" + vVornr + "/Pvznr", "Edit");
					oModel.setProperty("/" + vVornr + "/Phseq", "Edit");
					oModel.updateBindings(true);
				}
			}
		},

		// ----------------------------------------------------------------------- added by sabarish for to navigation back and Cancel button
		fnCancelback: function() {
			var oView = this.getView();
			var aModelsToDestroy = [
				"JM_KeydataModel",
				"JM_RecipeData",
				"JM_UFModel",
				"JM_F4Model",
				"JM_Popup",
				"JM_UFTextTemplate"
			];

			aModelsToDestroy.forEach(function(sModelName) {
				var oModel = oView.getModel(sModelName);
				if (oModel) {
					oModel.destroy();
					oView.setModel(null, sModelName);
				}
			});

			if (this.AppId === "RX") {
				this.fnClearLogFunction();
			}

			sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_initiator");
		},

		fnClearLogFunction: function() {
			// Changed by srikanth
			var oMainModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			if (!oMainModel) {
				oMainModel = new sap.ui.model.json.JSONModel();
				this.getOwnerComponent().setModel(oMainModel, "JM_ChangeLog");
			}
			if (this.OrgChangeLog) {
				oMainModel.setData(this.OrgChangeLog);
			}
		},

		fnBackConfirmation: function() {
			var that = this;
			var oPopupModel = new sap.ui.model.json.JSONModel({
				title: i18n.getText("Information"),
				text: i18n.getText("UnsavedChangesLeaveConfirm"),
				negativeButton: "No",
				negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
				positiveButton: "Yes",
				positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Apply.svg",
				Indicator: "BACK"
			});
			// Set model with name
			this.getView().setModel(oPopupModel, "JM_Popup");
			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment(this.getView().getId(),
					"MANAGED_RECIPE.Fragment.ConfirmationExit", // Fragment path
					this
				);
				this.getView().addDependent(this.oDialog);
			}
			this.oDialog.open();
		},

		fnNavBack: function() {
			var oView = this.getView();
			var aModelsToDestroy = [
				"JM_KeydataModel",
				"JM_RecipeData",
				"JM_UFModel",
				"JM_F4Model",
				"JM_Popup",
				"JM_UFTextTemplate"
			];

			aModelsToDestroy.forEach(function(sModelName) {
				var oModel = oView.getModel(sModelName);
				if (oModel) {
					oModel.destroy();
					oView.setModel(null, sModelName);
				}
			});
			sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_initiator");
		},

		fnconvertCheckbox: function() {
			var vOparationData = this.getView().getModel("JM_ReciOperations").getProperty("/Operations");
			var oPayload = {};
			oPayload.NavRecipe_Operation = [];

			// Loop through all operation data
			vOparationData.forEach(function(data) {
				// Include only if at least one key field is not empty
				if (data.Arbpl !== "") {
					data.Klakz = (data.Klakz === "X") ? true : false;
					data.Qsel1 = (data.Qsel1 === "X") ? true : false;
					data.Qsel2 = (data.Qsel2 === "X") ? true : false;
					data.Qsel3 = (data.Qsel3 === "X") ? true : false;
					data.Frdlb = (data.Frdlb === "X") ? true : false;
				}
			});
		},

		fnGetStandarFieldValues: function() {
			var id = this.selectedF4path.split("/")[2];
			var oPayload = {
				Ind: "T"
			};
			var oModelData = this.getView().getModel("JM_ReciOperations").getProperty("/Operations/" + id);
			var oCopy = JSON.parse(JSON.stringify(oModelData));
			var oCorrectedData = this.fnModifyPayload(oCopy);
			oPayload.NavRecipe_Operation = [oCorrectedData];
			var serviceCall = this.getOwnerComponent().getModel();

			oPayload.NavReturn_Msg = [];
			busyDialog.open();
			serviceCall.create("/Recipe_HeaderSet", oPayload, {
				success: function(oData) {

					oPayload = oData.NavRecipe_Operation.results[0];
					id = this.selectedF4path.split("/")[2];
					oModelData = this.getView().getModel("JM_ReciOperations");
					var oModelData1 = this.getView().getModel("JM_ReciOperations").getProperty("/Operations/" + id);

					oModelData.setProperty("/Operations/" + id + "/Vgtl1", oPayload.Vgtl1);
					oModelData.setProperty("/Operations/" + id + "/Vgtl2", oPayload.Vgtl2);
					oModelData.setProperty("/Operations/" + id + "/Vgtl3", oPayload.Vgtl3);
					oModelData.setProperty("/Operations/" + id + "/Vgtl4", oPayload.Vgtl4);
					oModelData.setProperty("/Operations/" + id + "/Vgtl5", oPayload.Vgtl5);
					oModelData.setProperty("/Operations/" + id + "/Vgtl6", oPayload.Vgtl6);

					oModelData.setProperty("/Operations/" + id + "/Vge01", oPayload.Vge01);
					oModelData.setProperty("/Operations/" + id + "/Vge02", oPayload.Vge02);
					oModelData.setProperty("/Operations/" + id + "/Vge03", oPayload.Vge03);
					oModelData.setProperty("/Operations/" + id + "/Vge04", oPayload.Vge04);
					oModelData.setProperty("/Operations/" + id + "/Vge05", oPayload.Vge05);
					oModelData.setProperty("/Operations/" + id + "/Vge06", oPayload.Vge06);

					oModelData.setProperty("/Operations/" + id + "/Vgw01", oPayload.Vgw01);
					oModelData.setProperty("/Operations/" + id + "/Vgw02", oPayload.Vgw02);
					oModelData.setProperty("/Operations/" + id + "/Vgw03", oPayload.Vgw03);
					oModelData.setProperty("/Operations/" + id + "/Vgw04", oPayload.Vgw04);
					oModelData.setProperty("/Operations/" + id + "/Vgw05", oPayload.Vgw05);
					oModelData.setProperty("/Operations/" + id + "/Vgw06", oPayload.Vgw06);

					oModelData.setProperty("/Operations/" + id + "/Lar01", oPayload.Lar01);
					oModelData.setProperty("/Operations/" + id + "/Lar02", oPayload.Lar02);
					oModelData.setProperty("/Operations/" + id + "/Lar03", oPayload.Lar03);
					oModelData.setProperty("/Operations/" + id + "/Lar04", oPayload.Lar04);
					oModelData.setProperty("/Operations/" + id + "/Lar05", oPayload.Lar05);
					oModelData.setProperty("/Operations/" + id + "/Lar06", oPayload.Lar06);

					oModelData.updateBindings(true);

					this.fnNonEditStandardValues(oModelData1);

					busyDialog.close();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		fnModifyPayload: function(payload) {
			delete payload.Klakz;
			delete payload.Qsel1;
			delete payload.Qsel2;
			delete payload.Qsel3;
			delete payload.Frdlb;
			delete payload.Ddehn;
			payload.Vgw01 = this.fnToEdmDecimal(payload.Vgw01, 9, 3);
			payload.Vgw02 = this.fnToEdmDecimal(payload.Vgw02, 9, 3);
			payload.Vgw03 = this.fnToEdmDecimal(payload.Vgw03, 9, 3);
			payload.Vgw04 = this.fnToEdmDecimal(payload.Vgw04, 9, 3);
			payload.Vgw05 = this.fnToEdmDecimal(payload.Vgw05, 9, 3);
			payload.Vgw06 = this.fnToEdmDecimal(payload.Vgw06, 9, 3);
			payload.Loanz = this.fnToEdmDecimal(payload.Loanz, 3, 0);
			payload.Preis = this.fnToEdmDecimal(payload.Preis, 3, 0);
			payload.Plifz = this.fnToEdmDecimal(payload.Plifz, 3, 0);
			payload.Datuv = this.fntoEdmDateTime(payload.Datuv);
			payload.Datub = this.fntoEdmDateTime(payload.Datub);
			payload.Umrez = this.fnToEdmDecimal(payload.Umrez, 5, 0);
			payload.Umren = this.fnToEdmDecimal(payload.Umren, 5, 0);
			payload.Peinh = this.fnToEdmDecimal(payload.Peinh, 5, 0);
			payload.Usr04 = this.fnToEdmDecimal(payload.Usr04, 13, 3);
			payload.Usr05 = this.fnToEdmDecimal(payload.Usr05, 13, 3);
			payload.Usr06 = this.fnToEdmDecimal(payload.Usr06, 13, 3);
			payload.Usr07 = this.fnToEdmDecimal(payload.Usr07, 13, 3);
			payload.Anzma = this.fnToEdmDecimal(payload.Anzma, 5, 2);
			payload.Usr08 = null;
			payload.Usr09 = null;
			return payload;
		},

		fnNonEditStandardValues: function(oModel) {
			var data = oModel;
			var id = this.selectedF4path.split("/")[2];
			var vVornr = this.getView().getModel("JM_ReciOperations").getProperty("/Operations/" + id + "/Vornr");
			var oModel1 = this.getView().getModel("JM_EditableModel");

			// Loop through 1 to 6
			for (var i = 1; i <= 6; i++) {
				var sIndex = ("0" + i).slice(-2); // "01".."06"
				var vgtlField = "Vgtl" + i;
				if (data[vgtlField] === "") {
					["Vge", "Vgw", "Lar"].forEach(function(prefix) {
						oModel1.setProperty("/" + vVornr + "/" + prefix + sIndex, "nonEdit");
					});
				}
			}
		},

		fnFocusTargetField: function(sTargetId) {
			// Define your tab ID mappings
			var ID_STD_VALUES = [
				"ID_OPER_VGW01_F", "ID_OPER_VGE01_F",
				"ID_OPER_VGW02_F", "ID_OPER_VGE02_F",
				"ID_OPER_VGW03_F", "ID_OPER_VGE03_F",
				"ID_OPER_VGW04_F", "ID_OPER_VGE04_F",
				"ID_OPER_VGW05_F", "ID_OPER_VGE05_F",
				"ID_OPER_VGW06_F", "ID_OPER_VGE06_F"
			];

			var ID_GEN_VALUES = [
				"ID_OPER_CKSELKZ_F",
				"ID_OPER_QPART_F",
				"ID_OPER_INFNR_F",
				"ID_OPER_EKORG_F",
				"ID_OPER_EBELN_F",
				"ID_OPER_EBELP_F",
				"ID_OPER_MATKL_F",
				"ID_OPER_EKGRP_F",
				"ID_OPER_LIFNR_F",
				"ID_OPER_SAKTO_F",
				"ID_OPER_WAERS_F"
			];

			var oIconTabBar = this.byId("id_icontabbar");
			var sSelectedKey = "";

			// Use indexOf() instead of includes()
			if (ID_STD_VALUES.indexOf(sTargetId) !== -1) {
				sSelectedKey = "ID_STD_VALUES"; // tab key for Standard Values
			} else if (ID_GEN_VALUES.indexOf(sTargetId) !== -1) {
				sSelectedKey = "ID_GEN_VALUES"; // tab key for General Values
			}

			if (sSelectedKey) {
				oIconTabBar.setSelectedKey(sSelectedKey);

				// Wait for UI to render before focusing
				setTimeout(function() {
					var oTargetControl = this.byId(sTargetId);
					if (oTargetControl) {
						oTargetControl.focus();
					}
				}.bind(this), 300);
			}
		},

		fnback: function() {
			var oView = this.getView();
			var aModelsToDestroy = [
				"JM_KeydataModel",
				"JM_RecipeData",
				"JM_UFModel",
				"JM_F4Model",
				"JM_Popup",
				"JM_UFTextTemplate"
			];

			aModelsToDestroy.forEach(function(sModelName) {
				var oModel = oView.getModel(sModelName);
				if (oModel) {
					oModel.destroy();
					oView.setModel(null, sModelName);
				}
			});
			sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_initiator");
		},
		//*-----------------------------------------------------------------------------------------
		//					 Change Log Functionlalites
		// *----------------------------------------------------------------------------------------
		fnChangelog: function() {
			if (!this.Changelog) {
				this.Changelog = sap.ui.xmlfragment(this.getView().getId(),
					"MANAGED_RECIPE.Fragment.ChangeLog", // Fragment name
					this // Pass controller instance
				);
				this.getView().addDependent(this.Changelog);
			}

			this.Changelog.open();
		},
		fnCloseChanLogDialog: function() {
			if (this.Changelog) {
				this.Changelog.close();
				this.Changelog.destroy();
				this.Changelog = null;
			}
		},

		fnSetErrorState: function(RowPath, triggerdpath) {
			var Field = triggerdpath.split("/").pop();
			var EditableModel = this.getView().getModel("JM_EditableModel");
			if (EditableModel) {
				var OperationsModel = this.getView().getModel("JM_ReciOperations");
				if (OperationsModel) {
					var vVornr = OperationsModel.getProperty(RowPath + "/Vornr");
				}
				EditableModel.setProperty("/" + vVornr + "/" + Field, "Error");
				EditableModel.refresh(true);
			}
		},
		fnClearErrorState: function(sRowPath, triggerdpath) {
			var Field = triggerdpath.split("/").pop();
			var EditableModel = this.getView().getModel("JM_EditableModel");
			if (EditableModel) {
				var OperationsModel = this.getView().getModel("JM_ReciOperations");
				if (OperationsModel) {
					var vVornr = OperationsModel.getProperty(sRowPath + "/Vornr");
				}
				EditableModel.setProperty("/" + vVornr + "/" + Field, "nonError");
				EditableModel.refresh(true);
			}
		},

		fnInitializeScreen: function() {
			var oContextModel = this.getOwnerComponent().getModel("JM_ContextModel");
			var oData = oContextModel.getData() || {};

			// If no context → default title
			if (!Object.keys(oData).length) {
				this.getView().byId("id_title").setText("Recipe Creation - Initiator");
				return;
			}

			var state = oData.Level;
			var tranid = oData.Transid;
			var AppId = oData.Appid;
			var SendBack = oData.Sendback;
			var Progress = oData.Progress;
			var string = "";

			// Helper to set base title
			function getBase(AppId1) {
				if (AppId1 === "RC") {
					return "Recipe Opeartion Creation ";
				}
				if (AppId1 === "RX") {
					return "Recipe Change ";
				}
				return "Recipe Operation Change ";
			}

			// ------- State A or R -------
			if (state === "A" || state === "R") {
				string = getBase(AppId);

				if (state === "R" && SendBack !== "X") {
					string += "- Reviewer - " + tranid;
				} else if (state === "A" && SendBack !== "X") {
					string += "- Approver - " + tranid;
				} else if (SendBack === "X") {
					string += "- Send Back Record - " + tranid;
				}

				this.getView().byId("id_title").setText(string);
				return;
			}

			// ------- State I -------
			if (state === "I") {
				var footerBtnModel = new sap.ui.model.json.JSONModel({
					sendBack: false,
					Reject: false,
					Draft: false
				});
				this.getView().setModel(footerBtnModel, "JM_FooterBtnModel");

				string = getBase(AppId);

				if (Progress === "Complete") {
					string += "- Completed Record - " + tranid;
				} else if (Progress === "Inprogress") {
					string += "- Inprogress Record - " + tranid;
				} else if (Progress === "Draft") {
					string += "- Drafted Record - " + tranid;
				} else if (Progress === "SendBack" || SendBack === "X") {
					string += "- Send Back Record - " + tranid;
				} else if (Progress === "Reject") {
					string += "- Rejected Record - " + tranid;
				} else {
					string += "- Initiator - " + tranid;
				}

				this.getView().byId("id_title").setText(string);
				return;
			}

			// ------- Other states -------
			string = "Recipe Operation Change - Initiator";
			this.getView().byId("id_title").setText(string);
		}

	});

});