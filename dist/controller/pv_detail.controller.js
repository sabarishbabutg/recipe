sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"MANAGED_RECIPE/controller/ErrorHandler",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Filter",
	"MANAGED_RECIPE/Formatter/formatter",
	"sap/ui/model/resource/ResourceModel"

], function(Controller, ErrorHandler, FilterOperator, Filter, formatter, ResourceModel) {
	"use strict";

	var busyDialog = new sap.m.BusyDialog();
	var TransId;
	var i18n;

	var frontEndId = ["ID_PV_BSTMI", "ID_PV_BSTMA", "ID_PV_ADATU", "ID_PV_BDATU",
		"ID_PV_CSPLT", "ID_PV_MDV01", "ID_PV_MDV02", "ID_PV_PNGUID", "ID_PV_MATKO",
		"ID_PV_VERTO", "ID_PV_ELPRO", "ID_PV_EWM_LGNUM", "ID_PV_ALORT",
		"ID_PV_UCMAT", "ID_PV_EWM_LGPLA", "ID_PV_TSA_PRVBE", "ID_PV_PRVBE",
		"ID_PV_TEXT1", "ID_PV_SERKZ", "ID_PV_MKSP"
	];

	return Controller.extend("MANAGED_RECIPE.controller.pv_detail", {
		formatter: formatter,

		onInit: function() {
			this.oRouter = this.getOwnerComponent().getRouter(this);
			this.oRouter.getRoute("pv_detail").attachPatternMatched(this.fnRouter, this);
			this.f4Cache = {};
		},

		fnRouter: function() {

			// ********************* IMAGE MODEL ************************

			var vPathImage = jQuery.sap.getModulePath("MANAGED_RECIPE") + "/Image/";
			var oImageModel = new sap.ui.model.json.JSONModel({
				path: vPathImage
			});
			this.getView().setModel(oImageModel, "JM_ImageModel");

			// **********************************************************
			// ********************* i18n MODEL ************************

			var i18nModel = new ResourceModel({
				bundleName: "MANAGED_RECIPE.i18n.i18n"
			});
			this.getView().setModel(i18nModel, "i18n");
			i18n = this.getView().getModel("i18n").getResourceBundle();

			// **********************************************************

			var that = this;
			var oView = this.getView();
			var oComponent = this.getOwnerComponent();

			var oKeyDataModel = oComponent.getModel("JM_KeyData");
			var oGlobalProductionModel = oComponent.getModel("JM_ProductionVrsn");
			var oGlobalOperationModel = oComponent.getModel("JM_Operation");
			var oRecipeModel = oComponent.getModel("JM_Recipe");
			var oContextModel = oComponent.getModel("JM_ContextModel");

			var oModel = this.getOwnerComponent().getModel('JMConfig');
			busyDialog.open();
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
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});

			this.AppId = oKeyDataModel.getProperty("/AppId");
			this.finalCheck = false;
			this.aErrorIds = [];

			var oKeyData = oKeyDataModel.getData() || {};
			var oRecipeData = oRecipeModel.getData() || {};

			// --- Key Data & Recipe Check ---
			if (Object.keys(oKeyData).length > 0 && Object.keys(oRecipeData).length > 0) {
				var oHBoxBOM = oView.byId("ID_BOMIND");
				var oBtnBOM = oView.byId("ID_BOMIND_BTN");
				oHBoxBOM.setVisible(true);

				oView.setModel(new sap.ui.model.json.JSONModel(oKeyData), "JM_KeydataModel");
				oView.setModel(new sap.ui.model.json.JSONModel(oRecipeData), "JM_RecipeData");

				if (Object.keys(oGlobalOperationModel.getData() || {}).length > 0) {
					var OperationData = oGlobalOperationModel.getData();
					oView.setModel(new sap.ui.model.json.JSONModel(OperationData), "JM_OperationsData");
				}

				oBtnBOM.removeStyleClass("cl_IndicatorS cl_IndicatorP cl_IndicatorR");
				oBtnBOM.setIcon("Image/IndicatorP.svg");
				oBtnBOM.setText("Pending");
				oBtnBOM.setType("Emphasized");
				oBtnBOM.addStyleClass("cl_IndicatorP");
			} else {
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_search");
				return;
			}

			var oUwlData = oContextModel.getData() || {};
			var oTable = oView.byId("idMaterialComTable");
			// --- UWL Context Handling ---
			if (Object.keys(oUwlData).length > 0) {
				this.fnhandleUWLScenario(oUwlData, oKeyDataModel, oGlobalProductionModel, oGlobalOperationModel, oTable);
			} else {
				// Default Path (no UWL data)
				this.fnInitializeScreen();
				this.fnsetInitialModel();
			}

			this.hasGlobalValue = true;
			this.fnSetProductVersionIndicator();
			// *************** Change Log highlight logic ***************
			this.fnChangeLogHighlighter(oUwlData, oTable);

		},

		fnhandleUWLScenario: function(oUwlData, oKeyDataModel, oGlobalProductionModel, oGlobalOperationModel, oTable) {
			var oComponent = this.getOwnerComponent();
			var oView = this.getView();
			TransId = oUwlData.Transid;
			oView.setModel(new sap.ui.model.json.JSONModel(oUwlData), "JM_ContextModel");
			this.fnInitializeScreen();
			var oDescModel = sap.ui.getCore().getModel("JM_DescriptionModel");
			if (oKeyDataModel && oGlobalProductionModel && oGlobalOperationModel && oDescModel) {
				var KeyData = oKeyDataModel.getData();
				var ProdVersionData = oGlobalProductionModel.getData();
				var aOperationData = oGlobalOperationModel.getData().NavRecipe_Operation;
				var aDescData = oDescModel.getData();

				oView.setModel(new sap.ui.model.json.JSONModel(KeyData), "JM_KeydataModel");

				if (!oView.getModel("JM_DescriptionModel")) {
					oView.setModel(new sap.ui.model.json.JSONModel(aDescData), "JM_DescriptionModel");
				}

				if (ProdVersionData.NavPV_BasicFields && ProdVersionData.NavPV_BasicFields.length > 0 ||
					ProdVersionData.NavPV_MaterialCompData && ProdVersionData.NavPV_MaterialCompData.length > 0) {

					var basicData = ProdVersionData.NavPV_BasicFields[0];
					basicData.Mksp = basicData.Mksp || "0";
					Object.keys(basicData).forEach(function(key) {
						ProdVersionData[key] = basicData[key];
					});
					if (ProdVersionData.NavPV_MaterialCompData.length <= 10) {
						oTable.setVisibleRowCount(ProdVersionData.NavPV_MaterialCompData.length);
					} else {
						oTable.setVisibleRowCount(10);
					}

					// var oPvData = JSON.parse(JSON.stringify(ProdVersionData));
					var oPvData = jQuery.extend(true, {}, ProdVersionData);
					oView.setModel(new sap.ui.model.json.JSONModel(oPvData), "JM_ProductionModel");
				} else {
					oComponent.setModel(new sap.ui.model.json.JSONModel({}), "JM_ProductionVrsn");
					this.fnsetInitialModel();
				}
				// var oOprData = JSON.parse(JSON.stringify(aOperationData));
				var oOprData = jQuery.extend(true, [], aOperationData);
				var oOperationsDataModel = new sap.ui.model.json.JSONModel({
					"NavRecipe_Operation": oOprData
				});
				oView.setModel(oOperationsDataModel, "JM_OperationsData");
				sap.ui.getCore().setModel(oOperationsDataModel, "JM_ComponentMaterial");
			}
		},

		fnsetInitialModel: function() {
			var oView = this.getView();
			var oTable = oView.byId("idMaterialComTable");

			var oPvModel = this.getOwnerComponent().getModel("JM_ProductionVrsn");
			var oPvData = oPvModel.getData() || {};

			var oRecipeModel = oView.getModel("JM_RecipeData");
			var oKeyDataModel = oView.getModel("JM_KeydataModel");

			// -------------------------
			// CASE 1: NEW MODEL (EMPTY)
			// -------------------------
			if (Object.keys(oPvData).length === 0) {

				var oNewModel = {
					Verid: "",
					Mksp: "0",
					Bstmi: oRecipeModel.getProperty("/Losvn"),
					Bstma: oRecipeModel.getProperty("/Losbs"),
					Adatu: "",
					Bdatu: "",
					Plnty: "",
					Plnnr: "",
					Alnal: "",
					Stlal: "",
					Stlan: "",
					Csplt: "",
					Serkz: null,
					Mdv01: "",
					Mdv02: "",
					Pnguid: null,
					Text1: oKeyDataModel.getProperty("/Maktx"),
					NavPV_MaterialCompData: []
				};

				oView.setModel(new sap.ui.model.json.JSONModel(oNewModel), "JM_ProductionModel");
				oTable.setVisibleRowCount(6);

			} else {

				// --------------------------------------------
				// CASE 2: EXISTING MODEL – CLEAN MATERIAL ITEMS
				// --------------------------------------------
				var aCompList = oPvData.NavPV_MaterialCompData || [];

				aCompList = aCompList.filter(function(item) {
					return item.Idnrk && item.Idnrk.trim() !== "";
				});

				oPvData.Text1 = oKeyDataModel.getProperty("/Maktx");
				oPvData.NavPV_MaterialCompData = aCompList;
				var sPvData = jQuery.extend(true, {}, oPvData);
				oView.setModel(new sap.ui.model.json.JSONModel(sPvData), "JM_ProductionModel");

				oTable.setVisibleRowCount(aCompList.length);

				// BOM Button UI update
				if (aCompList.length > 0) {
					this.fnsetIndicator(oView, "ID_BOMIND", "ID_BOMIND_BTN", "Success");

				}
			}

			// -------------------------
			// DATE HANDLING SECTION
			// -------------------------
			var oValidTo = oView.byId("ID_PV_BDATU");
			oValidTo.setDateValue(new Date(9999, 11, 31));

			var oValidFrom = oView.byId("ID_PV_ADATU");
			var today = new Date();
			today.setHours(5, 30, 0, 0);
			oValidFrom.setDateValue(today);
		},

		fnInitializeScreen: function() {
			var contextModel = this.getOwnerComponent().getModel("JM_ContextModel");

			if (!Object.keys(contextModel.getData() || {}).length) {

				this.getView().byId("id_title").setText("Recipe Production Version Creation - Initiator");
				return;
			}

			var state = this.getOwnerComponent().getModel("JM_ContextModel").getProperty("/Level");
			var tranid = this.getOwnerComponent().getModel("JM_ContextModel").getProperty("/Transid");
			var AppId = this.getOwnerComponent().getModel("JM_ContextModel").getProperty("/Appid");
			var SendBack = this.getOwnerComponent().getModel("JM_ContextModel").getProperty("/Sendback");
			var Progress = this.getOwnerComponent().getModel("JM_ContextModel").getProperty("/Progress");

			if (state === "A") {
				var string = "";
				if (AppId === "RC") {
					string = "Recipe Production Version Creation ";
				} else if (AppId === "RX") {
					string = "Recipe Production Version Change ";
				}
				if (state === "R" && SendBack !== "X") {
					string += "- Reviewer - " + tranid;
				} else if (state === "A" && SendBack !== "X") {
					string += "- Approver - " + tranid;
				} else if (state === "R" && SendBack === "X") {
					string += "- Send Back Record - " + tranid;
				} else if (state === "A" && SendBack === "X") {
					string += "- Send Back Record - " + tranid;
				}
				this.getView().byId("id_title").setText(string);
			} else if (state === "R") {
				var string = "";
				if (AppId === "RC") {
					string = "Recipe Production Version Creation ";
				} else if (AppId === "RX") {
					string = "Recipe Production Version Change ";
				}
				if (state === "R" && SendBack !== "X") {
					string += "- Reviewer - " + tranid;
				} else if (state === "A" && SendBack !== "X") {
					string += "- Approver - " + tranid;
				} else if (state === "R" && SendBack === "X") {
					string += "- Send Back Record - " + tranid;
				} else if (state === "A" && SendBack === "X") {
					string += "- Send Back Record - " + tranid;
				}
				this.getView().byId("id_title").setText(string);
			} else if (state === "I") {

				var string = "";
				if (AppId === "RC") {
					string = "Recipe Production Version Creation ";
				} else if (AppId === "RX") {
					string = "Recipe Production Version Change ";
				}
				if (state === "I") {
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
						// No Progress, no SendBack → Default
						string += "- Initiator - " + tranid;
					}
				}
				this.getView().byId("id_title").setText(string);
			} else {
				var string = "";

				string = "Recipe Production Version Change ";

				this.getView().byId("id_title").setText(string + " - Initiator");
			}
		},

		fnChangeLogHighlighter: function(oUwlData, oTable) {
			var oView = this.getView();
			if (this.AppId === "RX") {
				var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
				var aChangeLogData = (oChangeLogModel && Array.isArray(oChangeLogModel.getData())) ? oChangeLogModel.getData() : [];
				if (Array.isArray(aChangeLogData) && aChangeLogData.length > 0 && oUwlData.Appid === "RX") {

					this.OrgChangeLog = JSON.parse(JSON.stringify(aChangeLogData));

					var aChangedItems = aChangeLogData.filter(function(item) {
						return item.ProcessInd === "P";
					});

					var aChangedItemNos = aChangedItems.filter(function(oItem) {
							return oItem.ItemNo;
						})
						.map(function(oItem) {
							return oItem.ItemNo;
						});

					// Apply row-level highlight using RowSettings
					oTable.setRowSettingsTemplate(
						new sap.ui.table.RowSettings({
							highlight: {
								path: "JM_ProductionModel>Posnr",
								formatter: function(sPosnr) {
									if (aChangedItemNos.includes(sPosnr)) {
										return sap.ui.core.IndicationColor.Indication06; // Highlight color
									}
									return sap.ui.core.IndicationColor.None;
								}
							}
						})
					);

					setTimeout(function() {
						aChangedItems.forEach(function(oItem) {
							if (!oItem.ItemNo && oItem.FieldId) {
								var oControl = oView.byId(oItem.FieldId);
								if (oControl) {
									oControl.addStyleClass("cl_HighLightInput");
								}
							}
						});
					}, 200);

				} else {
					this.OrgChangeLog = JSON.parse(JSON.stringify(aChangeLogData));
				}
				var ProductionModel = this.getView().getModel("JM_ProductionModel");
				if (ProductionModel) {
					if (!this.oldValue) {
						this.oldValue = JSON.parse(JSON.stringify(ProductionModel.getData()));
					}
				}
			}
		},

		// F4 fucntionalities

		fnF4press: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedField = id;
			this.bindTextF4model("P", id, "X", oEvent);
		},

		bindTextF4model: function(SearchHelp, sitem, process, oEvent) {
			var that = this;
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var KeyModel = this.getView().getModel("JM_KeydataModel");
			if (KeyModel) {
				var Werks = KeyModel.getProperty("/Werks");
				var Matnr = KeyModel.getProperty("/Matnr");
			}
			var oPayload = {
				FieldId: sitem,
				Process: process,
				F4Type: SearchHelp
			};

			if (["ID_PV_VERID", "ID_PV_STLAL"].includes(that.selectedField)) {
				oPayload.FieldNam1 = "MATNR";
				oPayload.Value1 =(/^\d+$/.test(Matnr)) ? ("000000000000000000" + Matnr).slice(-18) : Matnr;
				oPayload.FieldNam2 = "WERKS";
				oPayload.Value2 = Werks.toString().padStart(4, "0");
			} else if (["ID_PV_ELPRO", "ID_PV_ALORT", "ID_PV_PRVBE", "ID_PV_TSA_PRVBE"].includes(that.selectedField)) {
				oPayload.FieldNam1 = "WERKS";
				oPayload.Value1 = Werks.toString().padStart(4, "0");
			}

			oPayload.NavSerchResult = [];

			oModel.create("/SearchHelpSet", oPayload, {
				success: function(oData) {
					if (oData.MsgType === "I") {
						ErrorHandler.showCustomSnackbar(oData.Message, "Error", that);
						return;
					}
					var aResults = oData.NavSerchResult.results;
					if (!aResults.length) return;

					var oFirst = aResults[0];
					if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
						ErrorHandler.showCustomSnackbar(oFirst.Message, "Error", that);
						return;
					}

					// --- Build Labels ---
					var oLabels = {
						col1: oFirst.Label1 || "Key",
						col2: oFirst.Label2 || "",
						col3: oFirst.Label3 || "",
						col4: oFirst.Label4 || ""
					};

					// --- Build Rows ---
					var aFormattedRows = aResults.map(function(item) {
						var row = {
							col1: oLabels.col1 ? item.Value1 : "",
							col2: oLabels.col2 ? item.Value2 : "",
							col3: oLabels.col3 ? item.Value3 : "",
							col4: oLabels.col4 ? item.Value4 : ""
						};

						// Remove leading zeros for Material fields
						["col1", "col4"].forEach(function(key) {
							if (oLabels[key] === "Material" && row[key]) {
								row[key] = row[key].replace(/^0+/, "");
							}
						});
						return row;
					});

					var oJsonModel = new sap.ui.model.json.JSONModel({
						labels: oLabels,
						rows: aFormattedRows
					});
					that.getView().setModel(oJsonModel, "JM_F4Model");

					var oCtrl = sap.ui.getCore().byId(that.sitem + "_TXT");
					var vTitle = "";

					if (oCtrl && oCtrl.getText) {
						vTitle = oCtrl.getText() + " (" + aFormattedRows.length + ")";
					} else if (oLabels.col1) {
						vTitle = oLabels.col1 + " (" + aFormattedRows.length + ")";
					} else {
						vTitle = "List (" + aFormattedRows.length + ")";
					}
					that.fnF4fragopen(oEvent, vTitle).open();
				},
				error: function() {

				}
			});
		},

		fnF4Itempress: function(oEvent) {
			var oView = this.getView();
			this.hasGlobalValue = false;
			this.fnSetProductVersionIndicator();

			var oItem = oEvent.getSource();
			var oContext = oItem.getBindingContext("JM_F4Model");
			if (!oContext) {
				return;
			}
			var item = oContext.getProperty("col1");
			var item1 = oContext.getProperty("col2");

			this.getView().byId(this.selectedField).setValue(item);
			this.getView().byId(this.selectedField).setValueState("None");
			var sDesField = this.getView().byId(this.selectedField + "_DES");
			var BOMUsage = this.getView().byId("ID_PV_STLAN");
			if (sDesField) {
				sDesField.setValue(item1);
				sDesField.setValueState("None");
			}
			if (this.selectedField === "ID_PV_STLAL") {
				BOMUsage.setValue(item1);
				BOMUsage.setValueState("None");
				this.hasGlobalValue = false;
				this.fnSetProductVersionIndicator();
			}

			if (this.selectedField === "ID_PV_STLAN" || this.selectedField === "ID_PV_STLAL") {
				var pvModel = this.getView().getModel("JM_ProductionModel");
				if (pvModel) {
					pvModel.setProperty("/NavPV_MaterialCompData", []); // reset to empty array
				}

				var oComponentModel = sap.ui.getCore().getModel("JM_ComponentMaterial");
				if (oComponentModel) {
					oComponentModel.setData([]);
					oComponentModel.refresh(true);
				}

				var oTable = this.getView().byId("idMaterialComTable");
				oTable.setVisibleRowCount(6);
				this.fnsetIndicator(oView, "ID_BOMIND", "ID_BOMIND_BTN", "Pending");

			}

			if (this.AppId === "RX") {
				this.fnUpdateChangelog(this.selectedField);
			}

			this.fnAfterCloseFragment();
		},

		fnF4fragopen: function(oEvent, vTitle) {
			if (!this.f4HelpFrag) {
				this.f4HelpFrag = sap.ui.xmlfragment(this.getView().getId(), "MANAGED_RECIPE.fragment.F4Help", this);
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

		fnCheckBoxLiveChange: function(oEvent) {
			var oCheckBox = oEvent.getSource();
			var oCtx = oCheckBox.getBindingContext("JM_ProductionModel");

			// Create a fake event object similar to Input liveChange
			var oFakeEvent = {
				getSource: function() {
					return oCheckBox;
				},
				getParameter: function() {
					return {
						value: oCheckBox.getSelected() ? "X" : ""
					};
				},
				getBindingContext: function() {
					return oCtx;
				}
			};

			// Call your existing fnLiveChange
			this.fnLiveChange(oFakeEvent);
		},

		fnComboBoxLiveChange: function(oEvent) {
			var oComboBox = oEvent.getSource();
			var oCtx = oComboBox.getBindingContext("JM_ProductionModel");
			var oFakeEvent = {
				getSource: function() {
					return oComboBox;
				},
				getParameter: function(sParam) {

					if (sParam === "value") {
						return oComboBox.getSelectedKey();
					}
					return null;
				},
				getBindingContext: function() {
					return oCtx;
				}
			};
			this.fnLiveChange(oFakeEvent);
		},

		fnDateLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			oInput.setValueState("None");
			oInput.setValueStateText("");
		},

		fnLiveChange: function(oEvent) {
			var oView = this.getView();
			this.hasGlobalValue = false;
			this.fnSetProductVersionIndicator();

			var oInput = oEvent.getSource();
			var fieldId = oInput.getId();
			var id = fieldId.split("--")[1];
			var vValue = "";
			if (typeof oInput.getValue === "function") {
				vValue = oInput.getValue().toUpperCase();
				oInput.setValue(vValue);
				// oInput.setValueState("None");
			} else if (typeof oInput.getSelectedKey === "function") {
				vValue = oInput.getSelectedKey().toUpperCase();
			} else if (typeof oInput.getSelected === "function") {
				vValue = oInput.getSelected() ? "X" : "";
			} else {
				vValue = "";
			}

			var oFieldLengthMap = {
				"ID_PV_BSTMI": 13,
				"ID_PV_BSTMA": 13,
				"ID_PV_ADATU": 8,
				"ID_PV_BDATU": 8,
				"ID_PV_PLNNR": 8,
				"ID_PV_ALNAL": 2,
				"ID_PV_STLAL": 2,
				"ID_PV_STLAN": 1,
				"ID_PV_CSPLT": 4,
				"ID_PV_SERKZ": 1,
				"ID_PV_MDV01": 8,
				"ID_PV_MDV02": 8,
				"ID_PV_PNGUID": 16,
				"ID_PV_MATNR": 40,
				"ID_PV_WERKS": 4,
				"ID_PV_VERID": 4,
				"ID_PV_PRVBE": 10,
				"ID_PV_TSA_PRVBE": 10,
				"ID_PV_EWM_LGPLA": 18,
				"ID_PV_MATKO": 40,
				"ID_PV_VERTO": 4,
				"ID_PV_ELPRO": 4,
				"ID_PV_EWM_LGNUM": 4,
				"ID_PV_ALORT": 4,
				"ID_PV_UCMAT": 40
			};

			if (oFieldLengthMap[id] && vValue.length > oFieldLengthMap[id]) {
				var iMax = oFieldLengthMap[id];
				vValue = vValue.substring(0, iMax);
				oInput.setValue(vValue);
				return;
			} else {
				oInput.setValueState("None");
			}
			if (id === "ID_PV_STLAN" || id === "ID_PV_STLAL") {
				var pvModel = this.getView().getModel("JM_ProductionModel");
				if (pvModel) {
					pvModel.setProperty("/NavPV_MaterialCompData", []); // reset to empty array
				}
				var BomModel = this.getOwnerComponent().getModel("JM_Bom");
				var oBomData = BomModel.getData();
				if (oBomData && Object.keys(oBomData).length > 0) {
					BomModel.setData({}); // clears all data
					BomModel.refresh(true);
					ErrorHandler.showCustomSnackbar(i18n.getText("MaterialDataClearInfo"), "information", this);
				}

				var oTable = this.getView().byId("idMaterialComTable");
				oTable.setVisibleRowCount(6);
				this.fnsetIndicator(oView, "ID_BOMIND", "ID_BOMIND_BTN", "Pending");
			}
			// oInput.setValue(vValue);
			this.selectedField = id;
			var descriptionField = this.getView().byId(this.selectedField + "_DES");
			if (descriptionField) {
				descriptionField.setValue("");
			}
			this.getView().byId(id).setValueState("None");
			var oControl = this.getView().byId(id);

			if (oControl.getShowValueHelp && typeof oControl.getShowValueHelp === "function") {
				var hasF4Search = oControl.getShowValueHelp();
				this.fnReadf4Cache(id, vValue.toUpperCase(), "P", hasF4Search);
			}

			if (this.AppId === "RX") {
				this.fnUpdateChangelog(id);
			}

		},

		fnReadf4Cache: function(vId, vValue, f4type, IsSearchHelp) {
			var that = this;
			var match, descriptionField;

			function updateDesc(results) {
				if (f4type === "P" && IsSearchHelp && vValue !== "") {

					vValue = vValue.replace(/^0+/, "");
					match = results.find(function(item) {
						return item.Value1.replace(/^0+/, "") === vValue.toUpperCase();
					});

					descriptionField = that.getView().byId(that.selectedField + "_DES");
					if (match) {
						that.getView().byId(that.selectedField).setValueState("None");
						if (descriptionField) {
							descriptionField.setValue(match.Value2);
							descriptionField.setValueState("None");
						}

						if (that.selectedField === "ID_PV_STLAL") {
							var BomUsage = that.getView().byId("ID_PV_STLAN");
							if (BomUsage) {
								BomUsage.setValue(match.Value2);
								BomUsage.setValueState("None");
								that.hasGlobalValue = false;
								that.fnSetProductVersionIndicator();
							}
						}
						if (that.selectedField === "ID_PV_VERID") {
							var verId = that.getView().byId(that.selectedField);
							verId.setValueState("Error");
							verId.setValueStateText(vValue + " Already Exist");

						}
					} else {
						if (descriptionField) {
							descriptionField.setValue("");
						}
						if (that.selectedField === "ID_PV_STLAL") {
							var BomUsage = that.getView().byId("ID_PV_STLAN");
							if (BomUsage) {
								BomUsage.setValue("");
							}
						}

						var fieldCtrl = that.getView().byId(that.selectedField);

						if (that.selectedField === "ID_PV_STLAL" || that.selectedField === "ID_PV_VERID") {
							fieldCtrl.setValueState("None");
						} else {
							fieldCtrl.setValueState("Error");
							fieldCtrl.setValueStateText(vValue + " value is not Avalible");
						}

					}
				}
			}
			if (this.f4Cache[vId]) {
				updateDesc(this.f4Cache[vId]);
			} else {
				this.f4descriptionGet(vId, vValue, f4type, function(results) {
					that.f4Cache[vId] = results;
					updateDesc(results);
				});
			}
		},

		f4descriptionGet: function(vId, value, f4type, fnCallback) {
			var that = this;

			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var KeyModel = this.getView().getModel("JM_KeydataModel");
			if (KeyModel) {
				var Werks = KeyModel.getProperty("/Werks");
				var Matnr = KeyModel.getProperty("/Matnr");
			}
			var oPayload = {
				FieldId: vId,
				Process: "X",
				F4Type: f4type
			};

			if (["ID_PV_VERID", "ID_PV_STLAL"].includes(that.selectedField)) {
				oPayload.FieldNam1 = "MATNR";
				oPayload.Value1 = (/^\d+$/.test(Matnr)) ? ("000000000000000000" + Matnr).slice(-18) : Matnr;
				oPayload.FieldNam2 = "WERKS";
				oPayload.Value2 = Werks.toString().padStart(4, "0");
			} else if (["ID_PV_ELPRO", "ID_PV_ALORT", "ID_PV_PRVBE", "ID_PV_TSA_PRVBE"].includes(that.selectedField)) {
				oPayload.FieldNam1 = "WERKS";
				oPayload.Value1 = Werks.toString().padStart(4, "0");
			}

			oPayload.NavSerchResult = [];

			oModel.create("/SearchHelpSet", oPayload, {
				success: function(oData) {
					that.f4Cache[vId] = oData.NavSerchResult.results;
					if (fnCallback) {
						fnCallback(oData.NavSerchResult.results);
					}
				},
				error: function(oResponse) {
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});
		},

		fnNavBom: function() {
			this.finalCheck = false;
			this.fnPvValidation();
		},

		fnPvValidation: function() {

			var that = this,
				oView = this.getView(),
				oModel = this.getOwnerComponent().getModel(),
				oProductionModel = oView.getModel("JM_ProductionModel"),
				oKeyDataModel = oView.getModel("JM_KeydataModel"),
				oContextModel = this.getOwnerComponent().getModel("JM_ContextModel"),
				oGlobalBomModel = this.getOwnerComponent().getModel("JM_Bom"),
				MsgType = "I",
				Pnguid = oProductionModel.getProperty("/Pnguid");

			if (!this.fnCheckMandatoryFields()) {
				return;
			}

			if (this.finalCheck === false && this.aErrorIds && this.aErrorIds.length > 0) {
				var aAllowedIds = ["ID_PV_BSTMI", "ID_PV_BSTMA"];
				var bOnlyAllowed = this.aErrorIds.every(function(id) {
					return aAllowedIds.includes(id);
				});
				if (bOnlyAllowed) {
					this.fnSubmitPvData();
					this.fnResetInputStates();
					sap.ui.core.UIComponent.getRouterFor(that).navTo("bom_detail");
					return;
				}
			}

			var vErrorState = this.fnCheckErrorState();

			if (!vErrorState) {
				ErrorHandler.showCustomSnackbar(i18n.getText("CorrectHighLightedFieldsError"), "Error", that);
				busyDialog.close();
				return;
			}

			// --- Determine MsgType from Context Model ---
			if (oContextModel) {
				var oUwlData = oContextModel.getData();
				if (oUwlData && (Array.isArray(oUwlData) ? oUwlData.length > 0 : Object.keys(oUwlData).length > 0)) {
					var sState = oContextModel.getProperty("/Level");
					if (sState === "A" || sState === "R" || sState === "I" || oUwlData.Ind === "D" || oUwlData.Sendback === "X") {
						MsgType = "";
					}
					if (oUwlData.Ind === "T") {
						sap.ui.core.UIComponent.getRouterFor(that).navTo("bom_detail");
						return;
					}
				}
			}

			// --- Reset PNGUID ---
			if (Pnguid) {
				Pnguid = null;
				oView.byId("ID_PV_PNGUID").setValue(null);
			}

			// --- Extract BOM Header data ---
			var oBOMData = oGlobalBomModel.getData() || {};
			var BstmiBom = null,
				BstmaBom = null;

			if (oBOMData.NavBomHeader && oBOMData.NavBomHeader.length > 0) {
				BstmiBom = oBOMData.NavBomHeader[0].Losvn;
				BstmaBom = oBOMData.NavBomHeader[0].Losbs;
			}

			function setTimeTo0530(oDate) {
				if (!oDate) return null;
				oDate.setHours(5, 30, 0, 0);
				return new Date(oDate.getTime() - (oDate.getTimezoneOffset() * 60000));
			}

			var oAdatu = oView.byId("ID_PV_ADATU").getDateValue() || oProductionModel.getProperty("/Adatu") || null;
			var oBdatu = oView.byId("ID_PV_BDATU").getDateValue() || oProductionModel.getProperty("/Bdatu") || null;
			var adjustedAdatu = setTimeTo0530(oAdatu);
			var adjustedBdatu = setTimeTo0530(oBdatu);

			var sMksp = oView.byId("ID_PV_MKSP").getSelectedKey();

			if (sMksp === "0") {
				sMksp = "";
			}
			oProductionModel.setProperty("/Mksp", sMksp);

			// --- Payload Preparation ---
			var oPayload = {
				Ind: "V",
				Transid: TransId || "",
				MsgTyp: MsgType,
				AppId: this.AppId || "RC",
				Matnr: oKeyDataModel.getProperty("/Matnr") || "",
				Werks: oKeyDataModel.getProperty("/Werks") || "",
				NavPV_BasicFields: [{
					Bstmi: this.fnToEdmDecimal(oProductionModel.getProperty("/Bstmi"), 13, 3) || null,
					Bstma: this.fnToEdmDecimal(oProductionModel.getProperty("/Bstma"), 13, 3) || null,
					Plnnr: oProductionModel.getProperty("/Plnnr") || "",
					Alnal: oProductionModel.getProperty("/Alnal") || "",
					Stlal: oProductionModel.getProperty("/Stlal") || "",
					Stlan: oProductionModel.getProperty("/Stlan") || "",
					Csplt: oProductionModel.getProperty("/Csplt") || "",
					Mdv01: oProductionModel.getProperty("/Mdv01") || "",
					Mdv02: oProductionModel.getProperty("/Mdv02") || "",
					Pnguid: Pnguid || null,
					Verid: oProductionModel.getProperty("/Verid") || "",
					Adatu: adjustedAdatu || null,
					Bdatu: adjustedBdatu || null,
					Plnty: oView.byId("ID_PV_PLNTY").getSelectedKey() || oProductionModel.getProperty("/Plnty") || "",
					Mksp: oProductionModel.getProperty("/Mksp") || "",
					BstmiBom: BstmiBom || null,
					BstmaBom: BstmaBom || null,
					Serkz: oProductionModel.getProperty("/Serkz") || null,
					Elpro: oProductionModel.getProperty("/Elpro") || "",
					Prvbe: oProductionModel.getProperty("/Prvbe") || "",
					Alort: oProductionModel.getProperty("/Alort") || "",
					Verto: oProductionModel.getProperty("/Verto") || "",
				}],
				NavReturn_Msg: []
			};
			busyDialog.open();
			oModel.create("/Recipe_HeaderSet", oPayload, {
				success: function(oData) {
					busyDialog.close();
					that.fnhandleValidationResponse(oData, oView);
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});
		},

		fnhandleValidationResponse: function(oData, oView) {
			var that = this,
				aResults = oData.NavReturn_Msg.results || [],
				aErrorMsgs = aResults.filter(function(m) {
					return m.MsgType === "E";
				});

			this.aErrorIds = [];

			// --- Error case ---
			if (aErrorMsgs.length > 0) {
				aErrorMsgs.forEach(function(m) {
					var sId = "ID_PV_" + m.Fnm;
					that.aErrorIds.push(sId);
					var oField = oView.byId(sId);
					if (oField) {
						if (oField instanceof sap.m.CheckBox) {
							oField.removeStyleClass("cl_opr_checkbx");
							oField.addStyleClass("cl_checkboxError");
							oField.setTooltip(m.Message);
						} else {
							// Handle Input, DatePicker, etc.
							oField.setValueState("Error");
							oField.setValueStateText(m.Message);
							oField.focus();
						}
					}
					if (sId === "ID_PV_VERID") {
						ErrorHandler.showCustomSnackbar(m.Message, "Error", that);
					}
				});
				that.fnsetIndicator(oView, "ID_BOMIND", "ID_BOMIND_BTN", "Error");
				that.fnsetIndicator(oView, "ID_PVIND", "ID_PVIND_BTN", "Error");
				return;
			}
			that.aErrorIds = [];

			// --- Success case ---
			var Stlal = oView.byId("ID_PV_STLAL").getValue() || "",
				Stlan = oView.byId("ID_PV_STLAN").getValue() || "";

			that.fnSubmitPvData();

			var oWfparm = that.getOwnerComponent().getModel("JM_ProductionVrsn");
			var oWfparmData = oWfparm.getData();
			oWfparmData.Stlal = Stlal;
			oWfparmData.Stlan = Stlan;
			oWfparm.setData(oWfparmData);
			oWfparm.refresh(true);

			that.fnsetIndicator(oView, "ID_BOMIND", "ID_BOMIND_BTN", "Success");
			that.fnsetIndicator(oView, "ID_PVIND", "ID_PVIND_BTN", "Success");

			that.fnclearLocalModel();
			if (that.finalCheck === true) {
				that.finalCheck = false;
				sap.ui.core.UIComponent.getRouterFor(that).navTo("reci_initiator");
			} else {
				sap.ui.core.UIComponent.getRouterFor(that).navTo("bom_detail");
			}
		},

		fnsetIndicator: function(oView, sHBoxId, sBtnId, sStatus) {
			var oHBox = oView.byId(sHBoxId),
				oBtn = oView.byId(sBtnId);

			oHBox.setVisible(true);
			oBtn.removeStyleClass("cl_IndicatorS cl_IndicatorP cl_IndicatorR");

			if (sStatus === "Success") {
				oBtn.setIcon("Image/IndicatorS.svg");
				oBtn.setText("Success");
				oBtn.setType("Emphasized");
				oBtn.addStyleClass("cl_IndicatorS");
			} else if (sStatus === "Error") {
				oBtn.setIcon("Image/IndicatorR.svg");
				oBtn.setText("Error");
				oBtn.setType("Emphasized");
				oBtn.addStyleClass("cl_IndicatorR");
			} else if (sStatus === "Pending") {
				oBtn.setIcon("Image/IndicatorP.svg");
				oBtn.setText("Pending");
				oBtn.setType("Emphasized");
				oBtn.addStyleClass("cl_IndicatorP");
			}
		},

		fnSubmitPvData: function() {
			var that = this;
			var ProductionModel = this.getView().getModel("JM_ProductionModel");
			var KeyDataModel = this.getView().getModel("JM_KeydataModel");
			var opvModel = {};
			var sMksp = this.getView().byId("ID_PV_MKSP").getSelectedKey();
			if (sMksp === "0") {
				sMksp = "";
			}
			ProductionModel.setProperty("/Mksp", sMksp);

			opvModel.NavPV_BasicFields = [{
				Bstmi: this.fnToEdmDecimal(ProductionModel.getProperty("/Bstmi"), 13, 3),
				Bstma: this.fnToEdmDecimal(ProductionModel.getProperty("/Bstma"), 13, 3),
				Plnnr: ProductionModel.getProperty("/Plnnr") || "",
				Alnal: ProductionModel.getProperty("/Alnal") || "",
				Stlal: ProductionModel.getProperty("/Stlal") || "",
				Stlan: ProductionModel.getProperty("/Stlan") || "",
				Csplt: ProductionModel.getProperty("/Csplt") || "",
				Mdv01: ProductionModel.getProperty("/Mdv01") || "",
				Mdv02: ProductionModel.getProperty("/Mdv02") || "",
				Pnguid: ProductionModel.getProperty("/Pnguid") || null,
				Verid: ProductionModel.getProperty("/Verid") || "",
				Matnr: KeyDataModel.getProperty("/Matnr") || "",
				Werks: KeyDataModel.getProperty("/Werks") || "",
				Adatu: this.getView().byId("ID_PV_ADATU").getDateValue() || ProductionModel.getProperty("/Adatu") || null,
				Bdatu: this.getView().byId("ID_PV_BDATU").getDateValue() || ProductionModel.getProperty("/Bdatu") || null,
				Plnty: this.getView().byId("ID_PV_PLNTY").getSelectedKey() || ProductionModel.getProperty("/Plnty") || "",
				Mksp: ProductionModel.getProperty("/Mksp") || "",
				Text1: ProductionModel.getProperty("/Text1") || "",
				EwmLgnum: ProductionModel.getProperty("/EwmLgnum") || "",
				EwmLgpla: ProductionModel.getProperty("/EwmLgpla") || "",
				TsaPrvbe: ProductionModel.getProperty("/TsaPrvbe") || "",
				Verto: ProductionModel.getProperty("/Verto") || "",
				Alort: ProductionModel.getProperty("/Alort") || "",
				Ucmat: ProductionModel.getProperty("/Ucmat") || "",
				Elpro: ProductionModel.getProperty("/Elpro") || "",
				Matko: ProductionModel.getProperty("/Matko") || "",
				Prvbe: ProductionModel.getProperty("/Prvbe") || "",
				Serkz: ProductionModel.getProperty("/Serkz") || null
			}];

			var oTable = this.getView().byId("idMaterialComTable");
			var aTableRows = oTable.getRows();
			var materialComponents = [];

			aTableRows.forEach(function(oRow) {
				var oCells = oRow.getCells();
				materialComponents.push({
					Idnrk: oCells[0].getText(), // Component
					Vornr: oCells[1].getText(), // Activity
					Phflg: oCells[2].getSelected(), // IndPhase
					Pvznr: oCells[3].getText(), // SupOperation
					Ltxa1: oCells[4].getText(), // Operation Short Text
					Menge: that.fnToEdmDecimal(oCells[5].getText(), 13, 3),
					Meins: oCells[6].getText(), // UOM
					Rgekz: oCells[7].getSelected(), // Backflush
					Maktx: oCells[8].getText(), // Item Description
					Posnr: oCells[9].getText(), // Item Number
					Postp: oCells[10].getText(), // Item Category
					Matnr: oCells[11].getText() // Material
				});
			});
			opvModel.NavPV_MaterialCompData = materialComponents;
			opvModel.Text1 = ProductionModel.getProperty("/Text1") || "";
			var oModel = this.getView().getModel("JM_ProductionModel");
			oModel.setData(opvModel);
			oModel.refresh(true);

			var oModelData = oModel.getData();
			if (oModelData.NavPV_BasicFields && oModelData.NavPV_BasicFields.length > 0) {
				var basicData = oModelData.NavPV_BasicFields[0];

				Object.keys(basicData).forEach(function(key) {
					oModelData[key] = basicData[key];
				});
			}

			// Navigate initiator
			var oWfparm = this.getOwnerComponent().getModel("JM_ProductionVrsn");
			oWfparm.setData(oModelData); // replaces the data
			oWfparm.refresh(true); // updates the bindings

			var lchangeLogModel = this.getView().getModel("JM_ChangeLog");
			if (lchangeLogModel) {
				var lChangeData = lchangeLogModel.getData();
				var gchangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
				if (gchangeLogModel) {
					gchangeLogModel.setData(lChangeData);
					gchangeLogModel.refresh(true);
				}
			}
		},

		fnSaveBack: function() {
			if (!this.fnCheckMandatoryFields()) {
				return;
			}
			var vErrorState = this.fnCheckErrorState();
			if (vErrorState) {
				var pvModel = this.getView().getModel("JM_ProductionModel");
				if (pvModel) {
					var ComponentData = pvModel.getProperty("/NavPV_MaterialCompData");
					if (!Array.isArray(ComponentData) || ComponentData.length === 0) {
						ErrorHandler.showCustomSnackbar(i18n.getText("MaterialComponentEmptyError"), "Error", this);
						return;
					}
				}
				this.finalCheck = true;
				this.fnPvValidation();
			} else {
				ErrorHandler.showCustomSnackbar(i18n.getText("CorrectHighLightedFieldsError"), "Error", this);
				busyDialog.close();
			}

		},

		fnNavBack: function() {
			var that = this;
			var oPopupModel = new sap.ui.model.json.JSONModel({
				title: "Information",
				text: "Do you Want to exit this Process? once exit all data will be Refreshed",
				negativeButton: "Cancel",
				negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
				positiveButton: "Proceed",
				positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Apply.svg",
				Indicator: "PV_BACK"
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

		fnSubmitConfirmation: function() {
			var state = this.getView().getModel("JM_Popup").getProperty("/Indicator");
			if (state === "PV_BACK") {
				if (this.AppId === "RX") {
					this.fnclearMaterialAssign();
					this.fnClearChangeLog();
				}

				this.fnclearLocalModel();
				this.fnResetInputStates();
				this.getView().byId("ID_PV_TEXT1").setValue("");
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_initiator");
			} else if (state === "PV_DELETE") {
				this.fnDeleteRow();
				this.fnConfirmationFragmentClose();
			}
		},

		fnConfirmationFragmentClose: function() {
			if (this.oDialog) {
				this.oDialog.close();
				this.oDialog.destroy(); // if you want destroy after close
				this.oDialog = null;
			}
		},

		fnOperationDetails: function() {
			var oTable = this.byId("idMaterialComTable");
			var iSelectedIndex = oTable.getSelectedIndex();
			if (iSelectedIndex < 0) {
				ErrorHandler.showCustomSnackbar("Please select a material component", "Error", this);
				return;
			}
			var vTitle = "Choose Operation";

			if (!this.OperFrag) {
				this.OperFrag = sap.ui.xmlfragment(this.getView().getId(), "MANAGED_RECIPE.fragment.OperationList", this);
				this.getView().addDependent(this.OperFrag);
			}
			this.OperFrag.setTitle(vTitle);
			this.OperFrag.open();

		},

		fnOprItempress: function(oEvent) {
			var that = this;
			var oItem = oEvent.getSource();
			var oContext = oItem.getBindingContext("JM_OperationsData");
			if (!oContext) {
				return;
			}

			var Vornr = oContext.getProperty("Vornr");
			var Phflg = oContext.getProperty("Phflg");
			var Pvznr = oContext.getProperty("Pvznr");
			var Ltxa1 = oContext.getProperty("Ltxa1");

			var oTable = this.byId("idMaterialComTable");
			var aSelectedIndices = oTable.getSelectedIndices();

			if (!aSelectedIndices.length) {
				return; // No selection
			}

			var oModel = this.getView().getModel("JM_ProductionModel");
			if (this.AppId === "RX") {
				var gChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");

				if (!gChangeLogModel) {
					gChangeLogModel = new sap.ui.model.json.JSONModel([]);
					this.getOwnerComponent().setModel(gChangeLogModel, "JM_ChangeLog");
				}

				var aGlobalChangeLog = gChangeLogModel.getData() || [];

				aSelectedIndices.forEach(function(iIndex) {
					var oCompContext = oTable.getContextByIndex(iIndex);
					if (oCompContext) {
						var sPath = oCompContext.getPath();
						var sItemNo = oModel.getProperty(sPath + "/Posnr") || "";

						var aFiltered = aGlobalChangeLog.filter(function(item) {
							return item.ProcessInd === "P" && item.ItemNo !== "";
						});

						// Further filter by the specific ItemNo
						var aItemChanges = aFiltered.filter(function(item) {
							return item.ItemNo === sItemNo;
						});

						if (aItemChanges && aItemChanges.length > 0) {
							var oOldData = {
								Vornr: (function() {
									var oEntry = aItemChanges.find(function(i) {
										return i.FieldId === "ID_PV_VORNR";
									});
									return oEntry ? oEntry.OldValue : "";
								})(),

								Phflg: (function() {
									var oEntry = aItemChanges.find(function(i) {
										return i.FieldId === "ID_PV_PHFLG";
									});
									return oEntry && oEntry.OldValue === "X" ? "X" : "";
								})(),

								Pvznr: (function() {
									var oEntry = aItemChanges.find(function(i) {
										return i.FieldId === "ID_PV_PVZNR";
									});
									return oEntry ? oEntry.OldValue : "";
								})(),

								Ltxa1: (function() {
									var oEntry = aItemChanges.find(function(i) {
										return i.FieldId === "ID_PV_LTXA1";
									});
									return oEntry ? oEntry.OldValue : "";
								})()
							};

							aGlobalChangeLog = aGlobalChangeLog.filter(function(item) {
								return !(item.ItemNo === sItemNo && item.ProcessInd === "P");
							});

						} else {
							var oOldData = {
								Vornr: oModel.getProperty(sPath + "/Vornr"),
								Phflg: oModel.getProperty(sPath + "/Phflg") ? "X" : "",
								Pvznr: oModel.getProperty(sPath + "/Pvznr"),
								Ltxa1: oModel.getProperty(sPath + "/Ltxa1")
							};
						}

						// Update model with new values
						oModel.setProperty(sPath + "/Vornr", Vornr);
						oModel.setProperty(sPath + "/Phflg", Phflg);
						oModel.setProperty(sPath + "/Pvznr", Pvznr);
						oModel.setProperty(sPath + "/Ltxa1", Ltxa1);

						var oNewData = {
							Vornr: Vornr,
							Phflg: Phflg ? "X" : "",
							Pvznr: Pvznr,
							Ltxa1: Ltxa1
						};

						// --- Compare and Log Changes ---
						Object.keys(oNewData).forEach(function(key) {
							var oldVal = oOldData[key];
							var newVal = oNewData[key];

							if (oldVal !== newVal) {
								var sFieldId = "ID_PV_" + key.toUpperCase(); // FieldId mapping
								var oFieldName = that.fnGetColumnTooltip(key);
								var oEntry = {
									ProcessInd: "P",
									FieldId: sFieldId,
									ProcessDesc: "Production Version",
									FieldName: oFieldName + " - " + sItemNo,
									ItemNo: sItemNo,
									OldValue: oldVal || "",
									NewValue: newVal || "",
									ChangedBy: that.UserName,
									ChangedOn: new Date()
								};

								// --- Update or Insert in Global ChangeLog ---
								var iGlobalIndex = aGlobalChangeLog.findIndex(function(item) {
									return item.FieldId === sFieldId && item.ItemNo === sItemNo;
								});
								if (iGlobalIndex > -1) {
									aGlobalChangeLog[iGlobalIndex] = oEntry; // update existing
								} else {
									aGlobalChangeLog.push(oEntry); // add new
								}
							}
						});
					}
				});

				// --- Update Models ---
				gChangeLogModel.setData(aGlobalChangeLog);
				gChangeLogModel.refresh(true);

			} else {
				aSelectedIndices.forEach(function(iIndex) {
					var oCompContext = oTable.getContextByIndex(iIndex);
					if (oCompContext) {
						var sPath = oCompContext.getPath();
						oModel.setProperty(sPath + "/Vornr", Vornr);
						oModel.setProperty(sPath + "/Phflg", Phflg);
						oModel.setProperty(sPath + "/Pvznr", Pvznr);
						oModel.setProperty(sPath + "/Ltxa1", Ltxa1);
					}
				});
			}

			this.fnOperCancel();
		},

		fnOperCancel: function(oEvent) {
			this.OperFrag.close();
			this.OperFrag.destroy();
			this.OperFrag = null;
		},

		fnDeleteFrag: function() {
			var that = this;
			var oTable = this.byId("idMaterialComTable");
			var aSelectedIndices = oTable.getSelectedIndices();

			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("SelectMaterialComponentError"), "Error", this);
				return;
			}
			var oPopupModel = new sap.ui.model.json.JSONModel({
				title: "Information",
				text: "Do you want to delete selected rows ?",
				negativeButton: "Cancel",
				negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
				positiveButton: "Proceed",
				positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Apply.svg",
				Indicator: "PV_DELETE"
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

		fnDeleteRow: function() {
			var that = this;
			var oTable = this.byId("idMaterialComTable");
			var aSelectedIndices = oTable.getSelectedIndices();

			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("SelectMaterialComponentError"), "Error", this);
				return;
			}

			var oModel = this.getView().getModel("JM_ProductionModel");

			// --- If Change Log required ---
			if (this.AppId === "RX") {

				var gChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
				if (!gChangeLogModel) {
					gChangeLogModel = new sap.ui.model.json.JSONModel([]);
					this.getOwnerComponent().setModel(gChangeLogModel, "JM_ChangeLog");
				}

				var aGlobalChangeLog = gChangeLogModel.getData() || [];

				// --- For each selected row ---
				aSelectedIndices.forEach(function(iIndex) {
					var oContext = oTable.getContextByIndex(iIndex);
					if (oContext) {
						var sPath = oContext.getPath();

						// Old values before delete
						var oOldData = {
							Vornr: oModel.getProperty(sPath + "/Vornr") || "",
							Phflg: oModel.getProperty(sPath + "/Phflg") ? "X" : "",
							Pvznr: oModel.getProperty(sPath + "/Pvznr") || "",
							Ltxa1: oModel.getProperty(sPath + "/Ltxa1") || ""
						};

						// Clear values
						oModel.setProperty(sPath + "/Vornr", "");
						oModel.setProperty(sPath + "/Phflg", false);
						oModel.setProperty(sPath + "/Pvznr", "");
						oModel.setProperty(sPath + "/Arbpl", "");
						oModel.setProperty(sPath + "/Ltxa1", "");

						// New (cleared) values
						var oNewData = {
							Vornr: "",
							Phflg: "",
							Pvznr: "",
							Ltxa1: ""
						};

						// Compare and record in change log
						Object.keys(oOldData).forEach(function(key) {
							var oldVal = oOldData[key];
							var newVal = oNewData[key];

							if (oldVal !== newVal) {
								var sFieldId = "ID_PV_" + key.toUpperCase();
								var sItemNo = oModel.getProperty(sPath + "/Posnr") || "";

								// Remove any existing log for same field
								aGlobalChangeLog = aGlobalChangeLog.filter(function(item) {
									return item.FieldId !== sFieldId || item.ItemNo !== sItemNo;
								});

								var oFieldName = that.fnGetColumnTooltip(key);
								var oEntry = {
									ProcessInd: "P",
									FieldId: sFieldId,
									ProcessDesc: "Production Version",
									FieldName: "Deleted -  " + oFieldName + " - " + sItemNo,
									ItemNo: sItemNo,
									OldValue: oldVal || "",
									NewValue: newVal || "",
									ChangedBy: that.UserName,
									ChangedOn: new Date()
								};

								aGlobalChangeLog.push(oEntry);
							}
						});
					}
				});

				// --- Update both Change Log Models ---
				gChangeLogModel.setData(aGlobalChangeLog);
				gChangeLogModel.refresh(true);
			}

			// --- For non-RX app, just clear values ---
			else {
				aSelectedIndices.forEach(function(iIndex) {
					var oContext = oTable.getContextByIndex(iIndex);
					if (oContext) {
						var sPath = oContext.getPath();
						oModel.setProperty(sPath + "/Vornr", "");
						oModel.setProperty(sPath + "/Phflg", false);
						oModel.setProperty(sPath + "/Pvznr", "");
						oModel.setProperty(sPath + "/Arbpl", "");
						oModel.setProperty(sPath + "/Ltxa1", "");
					}
				});
			}

			ErrorHandler.showCustomSnackbar(i18n.getText("MaterialDataClearInfo"), "information", this);
		},

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

		fnUpdateChangelog: function(vId) {
			var that = this;
			var oControl = this.getView().byId(vId);
			var newValue;

			if (oControl.getValue) {
				newValue = oControl.getValue();
			} else if (oControl.getSelected) {
				newValue = oControl.getSelected();
			} else {
				newValue = null; // fallback
			}

			var trimmed = vId.replace(/^ID_PV_/, "");

			var parts = trimmed.toLowerCase().split("_");
			var ObjectId = parts.map(function(p) {
				return p.charAt(0).toUpperCase() + p.slice(1);
			}).join("");

			var oRecipeInitialDataModel = this.getView().getModel("JM_ProductionModel");
			if (!oRecipeInitialDataModel) return;

			var oRecipeData = this.oldValue;

			if (!oRecipeData.hasOwnProperty(ObjectId)) return;

			var oldValue = oRecipeData[ObjectId];

			var gChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			if (!gChangeLogModel) {
				gChangeLogModel = new sap.ui.model.json.JSONModel([]);
				this.getOwnerComponent().setModel(gChangeLogModel, "JM_ChangeLog");
			}

			var oChangeLogData = gChangeLogModel.getData();
			if (!Array.isArray(oChangeLogData)) {
				oChangeLogData = [];
			} else {
				var aFiltered = oChangeLogData.filter(function(item) {
					return item.ProcessInd === "P" && item.ItemNo === "" && item.FieldId === vId;
				});
				if (aFiltered.length > 0) {
					oldValue = aFiltered[0].OldValue || "";
					oRecipeData[ObjectId] = oldValue;
					this.oldValue = oRecipeData;
				}
			}

			var idx = oChangeLogData.findIndex(function(item) {
				return item.FieldId === vId;
			});

			oldValue = (typeof oldValue === "boolean") ? (oldValue ? "X" : "") : oldValue;
			newValue = (typeof newValue === "boolean") ? (newValue ? "X" : "") : newValue;

			if (oldValue !== newValue) {
				if (idx === -1) {
					oChangeLogData.push({
						ProcessInd: "P",
						FieldId: vId,
						ProcessDesc: "Production Version",
						FieldName: this.getView().byId(vId + "_TXT").getText(),
						ItemNo: "",
						OldValue: oldValue,
						NewValue: newValue,
						ChangedBy: that.UserName,
						ChangedOn: new Date()

					});
				} else {
					oChangeLogData[idx].NewValue = newValue;
				}

			} else {
				if (idx !== -1) {
					oChangeLogData.splice(idx, 1);
				}

			}
			gChangeLogModel.setData(oChangeLogData);
			gChangeLogModel.refresh(true);

		},

		fnGetColumnTooltip: function(ObjectId) {
			var oTable = this.byId("idMaterialComTable");
			var aColumns = oTable.getColumns();

			for (var i = 0; i < aColumns.length; i++) {
				var oTemplate = aColumns[i].getTemplate();
				if (!oTemplate) continue;

				var sBoundPath = "";

				if (oTemplate.isA("sap.m.VBox")) {
					var aItems = oTemplate.getItems();
					if (aItems && aItems.length > 0) {
						oTemplate = aItems[0]; // take inner control
					}
				}

				var aPossibleProps = ["text", "value", "selected", "state"];
				for (var j = 0; j < aPossibleProps.length; j++) {
					var sProp = aPossibleProps[j];
					var oBindInfo = oTemplate.getBindingInfo(sProp);
					if (oBindInfo && oBindInfo.parts && oBindInfo.parts.length > 0) {
						sBoundPath = oBindInfo.parts[0].path;
						break;
					}
				}

				if (sBoundPath === ObjectId) {
					var oLabel = aColumns[i].getLabel();
					return oLabel ? oLabel.getTooltip() : "";
				}
			}

			return "";
		},

		fnCloseChanLogDialog: function() {
			if (this.Changelog) {
				this.Changelog.close();
				this.Changelog.destroy();
				this.Changelog = null;
			}
		},

		fnExpandCollapse: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			var GridVisibleState = this.getView().byId(id + "_GRID").getVisible();
			var PannelHead = this.getView().byId(id + "_HEADER");
			if (GridVisibleState) {
				this.getView().byId(id + "_GRID").setVisible(false);
				this.getView().byId(id).addStyleClass("cl_search_rotateImage");
				PannelHead.removeStyleClass("cl_pannelHead");
				PannelHead.addStyleClass("cl_pannelHeadSS");
			} else {
				this.getView().byId(id + "_GRID").setVisible(true);
				PannelHead.removeStyleClass("cl_pannelHeadSS");
				this.getView().byId(id).removeStyleClass("cl_search_rotateImage");
				PannelHead.addStyleClass("cl_pannelHead");
			}
		},

		fnCheckMandatoryFields: function() {
			var that = this;
			var mandatoryFields = [{
				id: "ID_PV_VERID",
				name: "Product Version"
			}, {
				id: "ID_PV_STLAL",
				name: "Alternative BOM"
			}, {
				id: "ID_PV_STLAN",
				name: "BOM Usage"
			}, {
				id: "ID_PV_TEXT1",
				name: "Product Version Description"
			}];

			var emptyFields = [];
			for (var i = 0; i < mandatoryFields.length; i++) {
				var value = this.getView().byId(mandatoryFields[i].id).getValue();
				if (value === "") {
					emptyFields.push(mandatoryFields[i]);
					this.getView().byId(mandatoryFields[i].id).setValueState("Error");
					this.getView().byId(mandatoryFields[i].id).setValueStateText(mandatoryFields[i].name + " is Mandatory");
				} else {
					this.getView().byId(mandatoryFields[i].id).setValueState("None");
				}
			}

			if (emptyFields.length > 0) {
				if (emptyFields.length === 1) {
					for (var j = 0; j < emptyFields.length; j++) {
						ErrorHandler.showCustomSnackbar(i18n.getText("MandatoryFieldError", [emptyFields[j].name]), "Error", this);
					}
				} else {
					ErrorHandler.showCustomSnackbar(i18n.getText("PleaseEnterMandatoryFields"), "Error", this);
				}
				return false;
			}
			return true;
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

		fnCheckErrorState: function() {
			var retMsg = true;
			for (var i = 0; i < frontEndId.length; i++) {
				if (this.getView().byId(frontEndId[i]).getValueState() === "Error") {
					retMsg = false;
					break;
				}
			}
			return retMsg;
		},

		fnResetInputStates: function() {
			var that = this;
			frontEndId.forEach(function(sId) {
				var oInput = that.getView().byId(sId) || sap.ui.core.Fragment.byId("ID_ITEMLEVEL", sId);
				if (oInput) {
					// Handle CheckBox type
					if (oInput instanceof sap.m.CheckBox) {
						oInput.removeStyleClass("cl_checkboxError");
						oInput.addStyleClass("cl_opr_checkbx");
						oInput.setTooltip("");
					}
					// Handle Input type
					else if (oInput instanceof sap.m.Input) {
						oInput.setValueState("None");
						oInput.setTooltip("");
					} else if (oInput.setValueState) {
						oInput.setValueState("None");
					}
				}
			});

		},

		fnclearLocalModel: function() {
			TransId = "";
			var aModels = ["JM_ContextModel", "JM_LocChangeLog", "JM_DescriptionModel", "JM_ProductionModel", "JM_RecipeData",
				"JM_KeydataModel"
			];
			var that = this;
			aModels.forEach(function(sModelName) {
				var oModel = that.getView().getModel(sModelName);
				if (oModel) {
					that.getView().setModel(null, sModelName);
					that.getView().setModel(undefined, sModelName);
				}
			});

			var oTable = this.byId("idMaterialComTable");
			var oComponent = this.getOwnerComponent();
			var oChangeLogModel = oComponent.getModel("JM_ChangeLog");
			var aChangeLogData = oChangeLogModel ? oChangeLogModel.getData() : [];
			var oContextModel = oComponent.getModel("JM_ContextModel");
			var oUwlData = oContextModel.getData() || {};
			if (Array.isArray(aChangeLogData) && aChangeLogData.length > 0 && oUwlData.Appid === "RX") {

				var aChangedItems = oChangeLogModel.getData().filter(function(item) {
					return item.ProcessInd === "P";
				});

				oTable.setRowSettingsTemplate(
					new sap.ui.table.RowSettings({
						highlight: sap.ui.core.IndicationColor.None
					})
				);
				aChangedItems.forEach(function(oItem) {
					var sFieldId = oItem.FieldId;
					if (!sFieldId) return;

					var oControl = that.getView().byId(sFieldId);
					if (oControl) {
						oControl.removeStyleClass("cl_HighLightInput");
					}

				});
			}
			if (oTable) {
				oTable.clearSelection();
			}

		},

		fnClearChangeLog: function() {
			var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			if (!oChangeLogModel) {
				oChangeLogModel = new sap.ui.model.json.JSONModel();
				this.getOwnerComponent().setModel(oChangeLogModel, "JM_ChangeLog");
			}
			if (this.OrgChangeLog) {
				oChangeLogModel.setData(this.OrgChangeLog);
			}
		},

		fnclose: function() {
			if (this.AppId === "RX") {
				this.fnClearChangeLog();
			}
			this.fnclearMaterialAssign();
			this.fnclearLocalModel();
			sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_initiator");
		},

		fnclearMaterialAssign: function() {
			var oGlobalModel = this.getOwnerComponent().getModel("JM_ProductionVrsn");
			var oProdModel = this.getView().getModel("JM_ProductionModel");

			if (oGlobalModel && oProdModel) {
				var glb = oGlobalModel.getData();
				var pv = oProdModel.getData();

				if (glb.NavPV_MaterialCompData && pv.NavPV_MaterialCompData) {
					var aCleanedData = pv.NavPV_MaterialCompData.filter(function(pvItem) {
						var glbItem = glb.NavPV_MaterialCompData.find(function(g) {
							return g.Idnrk === pvItem.Idnrk;
						});

						return glbItem && glbItem.Vornr && glbItem.Vornr.trim() !== "";
					});

					pv.NavPV_MaterialCompData = aCleanedData;
					oProdModel.setData(pv);
					oProdModel.refresh(true);
				}
			}
		},

		fnSetProductVersionIndicator: function() {
			var oView = this.getView();
			var oModel = this.getOwnerComponent().getModel("JM_ProductionVrsn");
			var oProdModel = oView.getModel("JM_ProductionModel");
			var oGlobalBomModel = this.getOwnerComponent().getModel("JM_Bom");
			var that = this;

			// Get data arrays
			var aMatCompData = oProdModel.getProperty("/NavPV_MaterialCompData") || [];
			var aBomItemData = oGlobalBomModel.getProperty("/NavBomItem") || [];

			// Mandatory fields config
			var aMandatoryFields = [{
				key: "Verid",
				id: "ID_PV_VERID",
				name: "Product Version"
			}, {
				key: "Stlal",
				id: "ID_PV_STLAL",
				name: "Alternative BOM"
			}, {
				key: "Stlan",
				id: "ID_PV_STLAN",
				name: "BOM Usage"
			}, {
				key: "Text1",
				id: "ID_PV_TEXT1",
				name: "Product Version Description"
			}];

			// Determine empty fields
			var aEmptyFields = aMandatoryFields.filter(function(f) {
				var sValue = "";

				if (oModel && that.hasGlobalValue) {
					sValue = oModel.getProperty("/" + f.key);
				} else {
					var oInput = oView.byId(f.id);
					sValue = oInput ? oInput.getValue() : "";
				}
				return !sValue || sValue.toString().trim() === "";
			});

			// -------- Helper: set indicator --------
			function updateIndicator(hboxId, btnId, isSuccess) {
				var oHBox = oView.byId(hboxId);
				var oBtn = oView.byId(btnId);

				if (!oHBox || !oBtn) return;

				oHBox.setVisible(true);
				oBtn.removeStyleClass("cl_IndicatorS cl_IndicatorP cl_IndicatorR");

				if (isSuccess) {
					oBtn.setIcon("Image/IndicatorS.svg");
					oBtn.setText("Success");
					oBtn.setType("Accept");
					oBtn.addStyleClass("cl_IndicatorS");
				} else {
					oBtn.setIcon("Image/IndicatorP.svg");
					oBtn.setText("Pending");
					oBtn.setType("Emphasized");
					oBtn.addStyleClass("cl_IndicatorP");
				}
			}

			// Product Version indicator
			updateIndicator("ID_PVIND", "ID_PVIND_BTN", aEmptyFields.length === 0);

			// BOM indicator
			updateIndicator("ID_BOMIND", "ID_BOMIND_BTN", aMatCompData.length > 0 && aBomItemData.length > 0);
		}

	});

});