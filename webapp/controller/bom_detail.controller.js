sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"MANAGED_RECIPE/controller/ErrorHandler",
	"MANAGED_RECIPE/Formatter/formatter",
	"sap/ui/core/Fragment",
	"sap/ui/model/resource/ResourceModel"
], function(Controller, Filter, FilterOperator, ErrorHandler, formatter, Fragment, ResourceModel) {
	"use strict";

	var i18n;
	var frontEndId = [
		"ID_BOM_AVOAU", "ID_BOM_AUSCH", "ID_BOM_ALPGR", "ID_BOM_RFPNT",
		"ID_BOM_NLFZT", "ID_BOM_NLFZV", "ID_BOM_NLFMV", "ID_BOM_VERTI",
		"ID_BOM_DSPST", "ID_BOM_ITSOB", "ID_BOM_POTX1", "ID_BOM_POTX2",
		"ID_BOM_ERSKZ", "ID_BOM_RVREL", "ID_BOM_BEIKZ", "ID_BOM_LGORT",
		"ID_BOM_KZKUP", "ID_BOM_PRVBE", "ID_BOM_SANKO", "ID_BOM_SANIN",
		"ID_BOM_SANFE", "ID_BOM_SCHGT", "ID_BOM_SCHKZ", "ID_BOM_SANKA",
		"ID_BOM_EXSTL", "ID_BOM_ZTEXT", "ID_BOM_STKTX", "ID_BOM_BMENG",
		"ID_BOM_STLST", "ID_BOM_STLBE", "ID_BOM_ADATU", "ID_BOM_LOSVN",
		"ID_BOM_LOSBS", "ID_BOM_LABOR", "ID_BOM_AENRA", "ID_BOM_AENNR",
		"ID_BOM_FMENG", "ID_BOM_NETAU", "ID_BOM_REKRS", "ID_BOM_REKRI"
	];

	return Controller.extend("MANAGED_RECIPE.controller.bom_detail", {
		formatter: formatter,

		onInit: function() {
			this.oRouter = this.getOwnerComponent().getRouter(this);
			this.oRouter.getRoute("bom_detail").attachPatternMatched(this.fnRouter, this);
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
			// ********************* Visible MODEL ************************
			var oVisibleModel = new sap.ui.model.json.JSONModel({
				visible: true,
				rowCount: 5,
				BasicVisible: true
			});
			this.getView().setModel(oVisibleModel, "JM_Visible");
			// **********************************************************

			var oKeyDataModel = this.getOwnerComponent().getModel("JM_KeyData");
			var oGobalProductionmodel = this.getOwnerComponent().getModel("JM_ProductionVrsn");
			var oRecipeModel = this.getOwnerComponent().getModel("JM_Recipe");
			var oGlobalBomModel = this.getOwnerComponent().getModel("JM_Bom");
			var that = this;

			this.AppId = oKeyDataModel.getProperty("/AppId");

			var oModel = this.getOwnerComponent().getModel('JMConfig');
			oModel.read("/UsernameSet", {
				success: function(oData) {
					var oJsonModel = new sap.ui.model.json.JSONModel();
					oJsonModel.setData(oData.results);
					that.getView().setModel(oJsonModel, "JM_UserModel");
					that.UserName = oData.results[0].Uname;
				}.bind(this),
				error: function(oResponse) {
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});

			this.fninitLocalModels(oKeyDataModel, oRecipeModel, oGobalProductionmodel);

			var oFromUwl = this.getOwnerComponent().getModel("JM_ContextModel");
			var oUwlData = oFromUwl.getData();

			if (oUwlData && Object.keys(oUwlData).length > 0) {
				this.fnhandleUWLScenario(oUwlData, oKeyDataModel, oGobalProductionmodel, oGlobalBomModel);
			} else {
				this.fnhandleNoUWLScenario();
			}
			this.fnInitializeScreen();
			// this.fnChangeLogHighlighter(oUwlData);

		},

		fninitLocalModels: function(oKeyDataModel, oRecipeModel, oGobalProductionmodel) {
			if (Object.keys(oKeyDataModel.getData() || {}).length > 0 && Object.keys(oRecipeModel.getData() || {}).length > 0) {

				var lkeyDataModel = new sap.ui.model.json.JSONModel(oKeyDataModel.getData());
				this.getView().setModel(lkeyDataModel, "JM_KeydataModel");

				var lRecipeModel = new sap.ui.model.json.JSONModel(oRecipeModel.getData());
				this.getView().setModel(lRecipeModel, "JM_RecipeData");

				var lProductionDataModel = new sap.ui.model.json.JSONModel(oGobalProductionmodel.getData());
				this.getView().setModel(lProductionDataModel, "JM_PVContextModel");

			} else {
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_search");
			}
		},

		fnhandleUWLScenario: function(oUwlData, oKeyDataModel, oGobalProductionmodel, oGlobalBomModel) {

			var oUwlModel = new sap.ui.model.json.JSONModel(oUwlData);
			this.getView().setModel(oUwlModel, "JM_ContextModel");

			var oDescModel = sap.ui.getCore().getModel("JM_DescriptionModel");

			if (oKeyDataModel && oGobalProductionmodel && oGlobalBomModel && oDescModel) {

				var KeyData = oKeyDataModel.getData();
				var ProductionVersionData = oGobalProductionmodel.getData();
				var oReciBomData = oGlobalBomModel.getData();
				var aDescData = oDescModel.getData();

				this.getView().setModel(new sap.ui.model.json.JSONModel(KeyData), "JM_KeydataModel");

				this.getView().setModel(new sap.ui.model.json.JSONModel(aDescData), "JM_LocalDescriptionModel");
				this.getView().getModel("JM_LocalDescriptionModel").refresh(true);

				var basicData = ProductionVersionData.NavPV_BasicFields[0];
				for (var key in basicData) {
					ProductionVersionData[key] = basicData[key];
				}
				this.getView().setModel(new sap.ui.model.json.JSONModel(ProductionVersionData), "JM_PVContextModel");

				if (oReciBomData &&
					Array.isArray(oReciBomData.NavBomHeader) && oReciBomData.NavBomHeader.length > 0 ||
					Array.isArray(oReciBomData.NavBomItem) && oReciBomData.NavBomItem.length > 0) {
					this.fnsetBOMModels(oReciBomData);
					this.fnChangeLogHighlighter(oUwlData);
				} else {
					this.fnGetBomDetails(oUwlData);
				}
			}
		},

		fnhandleNoUWLScenario: function() {
			this.fnGetBomDetails();
		},

		fnChangeLogHighlighter: function(oUwlData) {
			var oView = this.getView();
			var oTable = this.byId("id_bomTable");

			if (this.AppId === "RX") {
				var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
				var aChangeLogData = (oChangeLogModel && Array.isArray(oChangeLogModel.getData())) ? oChangeLogModel.getData() : [];

				if (Array.isArray(aChangeLogData) && aChangeLogData.length > 0 && oUwlData.Appid === "RX") {

					this.OrgChangeLog = JSON.parse(JSON.stringify(aChangeLogData));

					var aChangedItems = aChangeLogData.filter(function(item) {
						return item.ProcessInd === "B";
					});

					var aChangedItemNos = aChangedItems.filter(function(oItem) {
						return oItem.ItemNo;
					}).map(function(oItem) {
						return oItem.ItemNo;
					});

					oTable.setRowSettingsTemplate(
						new sap.ui.table.RowSettings({
							highlight: {
								path: "JM_BOMTable>Posnr",
								formatter: function(sPosnr) {
									if (aChangedItemNos.includes(sPosnr)) {
										return sap.ui.core.IndicationColor.Indication06;
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
				var BOMTableModel = this.getView().getModel("JM_BOMTable");
				var BOMHeaderModel = this.getView().getModel("JM_BOMModel");
				if (BOMTableModel || BOMHeaderModel) {
					this.oldHeaderValue = JSON.parse(JSON.stringify(BOMHeaderModel.getData()));
					this.oldItemValue = JSON.parse(JSON.stringify(BOMTableModel.getProperty("/BOMList")));
				} else {
					this.oldHeaderValue = {};
					this.oldItemValue = [];
				}
			}
		},

		fnsetBOMModels: function(oReciBomData) {
			if (oReciBomData.NavBomHeader && oReciBomData.NavBomHeader.length > 0) {

				var oHeaderData = jQuery.extend(true, {}, (oReciBomData.NavBomHeader[0]));
				this.getView().setModel(new sap.ui.model.json.JSONModel(oHeaderData), "JM_BOMModel");
				var oHeaderModel = this.getView().getModel("JM_BOMModel");
				oHeaderModel.setProperty("/Losme", oHeaderModel.getProperty("/Bmein"));
			}

			if (oReciBomData.NavBomItem && oReciBomData.NavBomItem.length > 0) {
				var aItems = jQuery.extend(true, [], (oReciBomData.NavBomItem));

				var oDescData = this.getView().getModel("JM_LocalDescriptionModel").getData();

				for (var i = 0; i < aItems.length; i++) {

					aItems[i].SgtCmkz = aItems[i].SgtCmkz === "X";
					aItems[i].Stlkz = aItems[i].Stlkz === "X";
					aItems[i].Ltxpo = aItems[i].Ltxpo === "X";
					var sPosnr = aItems[i].Posnr;
					var sIdnrk = aItems[i].Idnrk;

					var aDescList = oDescData[sPosnr]; // get description array for that posnr

					if (Array.isArray(aDescList)) {
						var oIdnrkEntry = aDescList.find(function(entry) {
							return entry.FieldName === "IDNRK";
						});

						if (oIdnrkEntry) {
							var descIdnrk = oIdnrkEntry.value.replace(/^0+/, ""); // If IDNRK matches → update KTEXT
							if (descIdnrk === sIdnrk) {
								aItems[i].Ktext = oIdnrkEntry.desc;
							}
						}
					}
				}

				var iStartNo = 10;
				var iIncrement = 10;
				var TotalItems = 10;
				var aBOMList = [];
				if (Array.isArray(aItems) && aItems.length > 0) {
					// Existing BOM Items
					for (var i = 0; i < aItems.length; i++) {
						var item = aItems[i];
						var sPosnr = String(iStartNo).padStart(4, "0");
						iStartNo += iIncrement;

						var oBOMItem = {
							Posnr: item.Posnr || sPosnr,
							Postp: item.Postp || "",
							Idnrk: item.Idnrk || "",
							Ktext: item.Ktext || "",
							Ident: item.Ident || "",
							Aenra: item.Aenra || "",
							Alpgr: item.Alpgr || "",
							SgtCmkz: item.SgtCmkz === "X",
							Stlkz: item.Stlkz === "X",
							// Cadpo: item.Cadpo || null,
							// Alekz: item.Alekz || null,
							SgtCatv: item.SgtCatv || "",
							Menge: item.Menge || null,
							Meins: item.Meins || "",
							Upskz: item.Upskz || null,
							Sanka: item.Sanka || "",
							Obtsp: item.Obtsp || "",
							Sanin: item.Sanin === "X",
							Datuv: item.Datuv || null,
							Datub: item.Datub || null,
							Andat: item.Andat || null,
							Aedat: item.Aedat || null,
							Sortf: item.Sortf || "",
							Annam: item.Annam || "",
							Aenam: item.Aenam || "",
							Itmid: item.Itmid || "",
							Aennr: item.Aennr || "",
							Rfpnt: item.Rfpnt || "",
							Fmeng: item.Fmeng || false,
							Ltxpo: item.Ltxpo === "X",
							Verti: item.Verti || "",
							Avoau: item.Avoau || null,
							Ausch: item.Ausch || null,
							Netau: item.Netau || null,
							Rekrs: item.Rekrs || null,
							Rekri: item.Rekri || null,
							Kzkup: item.Kzkup || null,
							Nlfzt: item.Nlfzt || null,
							Nlfzv: item.Nlfzv || null,
							Nlfmv: item.Nlfmv || "",
							Dspst: item.Dspst || "",
							Itsob: item.Itsob || "",
							Dumps: item.Dumps || null,
							Potx1: item.Potx1 || "",
							Potx2: item.Potx2 || "",
							Erskz: item.Erskz || "",
							Rvrel: item.Rvrel || "",
							Sanko: item.Sanko || null,
							Sanfe: item.Sanfe || null,
							Beikz: item.Beikz || "",
							Lgort: item.Lgort || "",
							Prvbe: item.Prvbe || "",
							Schgt: item.Schgt || null,
							Schkz: item.Schkz || null
						};

						aBOMList.push(oBOMItem);
					}

					for (var j = 0; j < TotalItems - aItems.length; j++) {
						var sLastPosnr = aBOMList.length > 0 ? aBOMList[aBOMList.length - 1].Posnr : "0000";
						var iNewItem = (parseInt(sLastPosnr, 10) || 0) + 10;
						var sNewPosnr = iNewItem.toString().padStart(4, "0");
						aBOMList.push(this.fncreateEmptyBOMItem(sNewPosnr));
					}
				} else {
					for (var k = 0; k < 10; k++) {
						var sPosnr = String(iStartNo).padStart(4, "0");
						iStartNo += iIncrement;
						aBOMList.push(this.fncreateEmptyBOMItem(sPosnr));
					}
				}

				var oItemData = {
					BOMList: aBOMList
				};
				var aItemDetails = jQuery.extend(true, [], (oItemData));
				this.getView().setModel(new sap.ui.model.json.JSONModel(aItemDetails), "JM_BOMTable");
				this.getView().getModel("JM_BOMTable").refresh(true);
			}
		},

		fnGetBomDetails: function(oUwlData) {

			var BomModel = this.getOwnerComponent().getModel("JM_Bom");
			var oBomData = BomModel.getData();
			if (
				(oBomData && Object.keys(oBomData).length === 0) ||
				(oBomData &&
					Array.isArray(oBomData.NavBomHeader) && oBomData.NavBomHeader.length === 0 &&
					Array.isArray(oBomData.NavBomItem) && oBomData.NavBomItem.length === 0)
			) {

				var aOdataModel = this.getOwnerComponent().getModel();
				var that = this;

				var oPayload = {
					Matnr: this.getView().byId("ID_BOM_MATNR").getValue(),
					Profidnetz: "",
					Plnal: "",
					Maktx: "",
					Plnnr: "",
					Transid: "",
					Werks: this.getView().byId("ID_BOM_WERKS").getValue(),
					WiId: "",
					AppId: "RC",
					Ktext: "",
					MsgTyp: "",
					MsgLine: "",
					Ind: "B",
					WfParm1: "",
					WfParm2: "",
					WfParm3: "",
					WfParm4: "",
					Name1: "",
					NavBomHeader: [{
						Stlan: this.getView().byId("ID_BOM_STLAN").getValue(),
						Stlal: this.getView().byId("ID_BOM_STLAL").getValue(),
						Tetyp: "",
						Exstl: "",
						Ztext: "",
						Stktx: "",
						Bmeng: null,
						Bmein: "",
						Losvn: null,
						Losbs: null,
						Stlst: "",
						Stlbe: "",
						Labor: "",
						Groes: ""
					}],
					NavBomItem: [],
					NavDescription: []
				};

				aOdataModel.create("/Recipe_HeaderSet", oPayload, {
					success: function(oData) {
						if (oData.Msgtype === "E") {
							ErrorHandler.showCustomSnackbar(oData.Message, "Error", that);
							return;
						}
						if (oData.Msgtype === "S") {
							that.Tetyp = oData.Tetyp;
						}
						var descModel = {};
						var descData = oData.NavDescription.results;
						for (var i = 0; i < descData.length; i++) {
							var item = descData[i];
							if (item.Itemno !== "") {
								if (!descModel[item.Itemno]) {
									descModel[item.Itemno] = [];
								}
								var data = {
									value: item.Fieldvalue,
									desc: item.Fielddesc,
									FieldName: item.Fieldname
								};
								descModel[item.Itemno].push(data);
							} else {
								if (!descModel[item.Fieldname]) {
									descModel[item.Fieldname] = {
										value: item.Fieldvalue,
										desc: item.Fielddesc
									};
								}
							}
						}

						var oDescModel = new sap.ui.model.json.JSONModel(descModel);
						that.getView().setModel(oDescModel, "JM_LocalDescriptionModel");
						sap.ui.getCore().setModel(oDescModel, "JM_DescriptionModel");

						that.fnBindBomDetails(oData, oUwlData);
					},
					error: function() {
						ErrorHandler.showCustomSnackbar(i18n.getText("HTTPReqFailedError"), "Error", that);
					}
				});
			} else {
				if (oBomData.NavBomHeader && oBomData.NavBomHeader.length > 0) {
					var oHeaderData = oBomData.NavBomHeader[0];
					var oBOMHeaderModel = new sap.ui.model.json.JSONModel(oHeaderData);
					this.getView().setModel(oBOMHeaderModel, "JM_BOMModel");
				}

				if (oBomData.NavBomItem && oBomData.NavBomItem.length > 0) {
					var aItems = JSON.parse(JSON.stringify(oBomData.NavBomItem));
					aItems.forEach(function(item) {
						item.SgtCmkz = item.SgtCmkz === "X";
						item.Stlkz = item.Stlkz === "X";
						item.Ltxpo = item.Ltxpo === "X";
					});
					var oItemData = {
						BOMList: aItems
					};
					var oBOMTableModel = new sap.ui.model.json.JSONModel(oItemData);
					this.getView().setModel(oBOMTableModel, "JM_BOMTable");
					oBOMTableModel.refresh(true);
				}

				var oDescModel = sap.ui.getCore().getModel("JM_DescriptionModel");
				if (oDescModel) {
					var oDescData = oDescModel.getData();
					oDescModel = new sap.ui.model.json.JSONModel(oDescData);
					this.getView().setModel(oDescModel, "JM_LocalDescriptionModel");
				}
			}
		},

		fnBindBomDetails: function(oData, oUwlData) {
			this.fngetComponent().then(function(status) { // added by sabarish 14-01-2025
				if (status) {
					var navHeaderResults = oData.NavBomHeader && oData.NavBomHeader.results;
					var oHeader = (navHeaderResults && navHeaderResults.length > 0) ? navHeaderResults[0] : {};
					var aODataItems = (oData.NavBomItem && oData.NavBomItem.results) ? oData.NavBomItem.results : [];

					this.fnbuildBOMHeaderModel(oHeader);

					this.fnbuildBOMItemsModel(oHeader, aODataItems);

					if (oUwlData) {
						this.fnChangeLogHighlighter(oUwlData);
					}
				}
			}.bind(this)); // added by sabarish 14-01-2025

		},

		fnbuildBOMHeaderModel: function(oHeader) {
			var view = this.getView();
			var oBOMModel;

			if (oHeader && Object.keys(oHeader).length > 0) {
				oBOMModel = new sap.ui.model.json.JSONModel({
					Matnr: view.byId("ID_BOM_MATNR").getValue(),
					Werks: view.byId("ID_BOM_WERKS").getValue(),
					Maktx: view.byId("ID_BOM_MAKTX").getValue(),
					WerksDesc: view.byId("ID_BOM_WERKS_DES").getValue(),
					BomUsage: view.byId("ID_BOM_STLAN").getValue(),
					BoMUsageDesc: view.byId("ID_BOM_STLAN_DES").getValue(),
					AltBom: view.byId("ID_BOM_STLAL").getValue(),
					Tetyp: "M",
					Ztext: oHeader.Ztext,
					Bmeng: oHeader.Bmeng,
					Stktx: oHeader.Stktx,
					Exstl: oHeader.Exstl,
					Bmein: oHeader.Bmein,
					Losvn: oHeader.Losvn,
					Losbs: oHeader.Losbs,
					Losme: oHeader.Losme || oHeader.Bmein,
					Stlst: oHeader.Stlst,
					Stlbe: oHeader.Stlbe,
					Labor: oHeader.Labor,
					Groes: oHeader.Groes,
					Datub: oHeader.Datub,
					Datuv: oHeader.Datuv,
					DeleteInd: oHeader.DeleteInd
				});
			} else {
				oBOMModel = new sap.ui.model.json.JSONModel({
					Matnr: view.byId("ID_BOM_MATNR").getValue(),
					Werks: view.byId("ID_BOM_WERKS").getValue(),
					Maktx: view.byId("ID_BOM_MAKTX").getValue(),
					WerksDesc: view.byId("ID_BOM_WERKS_DES").getValue(),
					BomUsage: view.byId("ID_BOM_STLAN").getValue(),
					BoMUsageDesc: view.byId("ID_BOM_STLAN_DES").getValue(),
					AltBom: view.byId("ID_BOM_STLAL").getValue(),
					Tetyp: "M",
					Ztext: "",
					Bmeng: 1,
					Stktx: "",
					Exstl: "",
					Bmein: "",
					Losvn: null,
					Losbs: null,
					Losme: "",
					Stlst: "01",
					Stlbe: "",
					Labor: "",
					Groes: "",
					Datuv: new Date()
				});
			}

			view.setModel(oBOMModel, "JM_BOMModel");
		},

		fnbuildBOMItemsModel: function(oHeader, aODataItems) {
			var aBOMList = [];
			var aPromises = [];
			var view = this.getView();
			var that = this;
			var iStartNo = 10;
			var iIncrement = 10;
			var TotalItems = 10;

			if (Array.isArray(aODataItems) && aODataItems.length > 0) {
				// Existing BOM Items
				for (var i = 0; i < aODataItems.length; i++) {
					var item = aODataItems[i];
					var sPosnr = String(iStartNo).padStart(4, "0");
					iStartNo += iIncrement;

					var oBOMItem = {
						Posnr: item.Posnr || sPosnr,
						Postp: item.Postp || "",
						Idnrk: item.Idnrk || "",
						Ktext: item.Ktext || "",
						Ident: item.Ident || "",
						Aenra: item.Aenra || "",
						Alpgr: item.Alpgr || "",
						SgtCmkz: item.SgtCmkz === "X",
						Stlkz: item.Stlkz === "X",
						// Cadpo: item.Cadpo || null,
						// Alekz: item.Alekz || null,
						SgtCatv: item.SgtCatv || "",
						Menge: item.Menge || null,
						Meins: item.Meins || "",
						Upskz: item.Upskz || null,
						Sanka: item.Sanka || "",
						Obtsp: item.Obtsp || "",
						Sanin: item.Sanin === "X",
						Datuv: item.Datuv || null,
						Datub: item.Datub || null,
						Andat: item.Andat || null,
						Aedat: item.Aedat || null,
						Sortf: item.Sortf || "",
						Annam: item.Annam || "",
						Aenam: item.Aenam || "",
						Itmid: item.Itmid || "",
						Aennr: item.Aennr || "",
						Rfpnt: item.Rfpnt || "",
						Fmeng: item.Fmeng || false,
						Ltxpo: item.Ltxpo === "X",
						Verti: item.Verti || "",
						Avoau: item.Avoau || null,
						Ausch: item.Ausch || null,
						Netau: item.Netau || null,
						Rekrs: item.Rekrs || null,
						Rekri: item.Rekri || null,
						Kzkup: item.Kzkup || null,
						Nlfzt: item.Nlfzt || null,
						Nlfzv: item.Nlfzv || null,
						Nlfmv: item.Nlfmv || "",
						Dspst: item.Dspst || "",
						Itsob: item.Itsob || "",
						Dumps: item.Dumps || null,
						Potx1: item.Potx1 || "",
						Potx2: item.Potx2 || "",
						Erskz: item.Erskz || "",
						Rvrel: item.Rvrel || "",
						Sanko: item.Sanko || null,
						Sanfe: item.Sanfe || null,
						Beikz: item.Beikz || "",
						Lgort: item.Lgort || "",
						Prvbe: item.Prvbe || "",
						Schgt: item.Schgt || null,
						Schkz: item.Schkz || null
					};

					aBOMList.push(oBOMItem);
					// To set the description for component in BOM items
					// if (item.Idnrk) {
					// 	(function(bomItem, compValue) {
					// 		aPromises.push(
					// 			new Promise(function(resolve) {
					// 				that.fnReadf4Cache("ID_BOM_IDNRK", compValue, "X", function(match) {
					// 					if (match && match.Value2) {
					// 						bomItem.Ktext = match.Value2;
					// 					}
					// 					resolve();
					// 				});
					// 			})
					// 		);
					// 	})(oBOMItem, item.Idnrk);
					// }
				}

				for (var j = 0; j < TotalItems - aODataItems.length; j++) {
					var sLastPosnr = aBOMList.length > 0 ? aBOMList[aBOMList.length - 1].Posnr : "0000";
					var iNewItem = (parseInt(sLastPosnr, 10) || 0) + 10;
					var sNewPosnr = iNewItem.toString().padStart(4, "0");
					aBOMList.push(this.fncreateEmptyBOMItem(sNewPosnr));
				}
			} else {

				for (var k = 0; k < 10; k++) {
					var sPosnr = String(iStartNo).padStart(4, "0");
					iStartNo += iIncrement;
					aBOMList.push(this.fncreateEmptyBOMItem(sPosnr));
				}
			}

			// Promise.all(aPromises).then(function() { 14-012026
			var oBOMTableModel = view.getModel("JM_BOMTable");
			if (!oBOMTableModel) {
				oBOMTableModel = new sap.ui.model.json.JSONModel();
				view.setModel(oBOMTableModel, "JM_BOMTable");
			}

			oBOMTableModel.setData({
				BOMList: aBOMList
			});

			if (oHeader.Labor) {
				that.fnReadf4Cache("ID_BOM_LABOR", oHeader.Labor, "P");
				that.selectedField = "ID_BOM_LABOR";
			} else {
				var sStlanValue = view.byId("ID_BOM_STLAN").getValue();
				that.fnReadf4Cache("ID_BOM_STLAN", sStlanValue, "P");
				that.selectedField = "ID_BOM_STLAN";
			}
			// }); // bt sabarish 14-01-20205
		},

		fncreateEmptyBOMItem: function(sPosnr) {
			return {
				Posnr: sPosnr,
				Postp: "",
				Idnrk: "",
				Ktext: "",
				Menge: "",
				Meins: "",
				Ident: "",
				Aenra: "",
				Alpgr: "",
				Sanka: "",
				Sanin: null,
				SgtCatv: "",
				SgtCmkz: false,
				Datuv: new Date(),
				Andat: new Date(),
				Datub: new Date("9999-12-31T00:00:00Z"),
				Upskz: null,
				Stlkz: false,
				Sortf: "",
				// Alekz: false,
				// Cadpo: false,
				Aennr: "",
				Fmeng: false,
				Ltxpo: false,
				Verti: "",
				Avoau: null,
				Ausch: null,
				Netau: null,
				Rekrs: null,
				Rekri: null,
				Kzkup: null,
				Nlfzt: null,
				Nlfzv: null,
				Nlfmv: "",
				Dspst: "",
				Itsob: "",
				Dumps: false,
				Potx1: "",
				Potx2: "",
				Erskz: "",
				Rvrel: "",
				Sanko: null,
				Sanfe: this.getView().byId("ID_BOM_STLAN").getValue() === "1" || null,
				Beikz: "",
				Lgort: "",
				Prvbe: "",
				Schgt: null,
				Schkz: null
			};
		},

		fnAddRow: function() {
			var oTable = this.byId("id_bomTable");
			var oModel = oTable.getModel("JM_BOMTable");
			var aData = oModel.getProperty("/BOMList") || [];

			// Determine the next item number
			var iNewItem = 10;
			if (aData.length > 0) {
				var sLastPosnr = aData[aData.length - 1].Posnr || "0000";
				var iLastItem = parseInt(sLastPosnr, 10) || 0;
				iNewItem = iLastItem + 10;
			}
			var sNewPosnr = iNewItem.toString().padStart(4, "0");
			var oNewRow = this.fncreateEmptyBOMItem(sNewPosnr);

			aData.push(oNewRow);
			oModel.setProperty("/BOMList", aData);
			oModel.refresh(true);

			// Scroll to the newly added row
			var iLastIndex = aData.length - 1;
			oTable.setFirstVisibleRow(iLastIndex);
		},

		fnDeleteFrag: function() {

			var oTable = this.byId("id_bomTable");

			var aSelectedIndices = oTable.getSelectedIndices();
			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("SelectOneRowToDelete"), "Error", this);
				return;
			}
			var oPopupModel = new sap.ui.model.json.JSONModel({
				title: "Information",
				text: "Do you want to delete this row ?",
				negativeButton: "Cancel",
				negativeIcon: "Image/Cancel.svg",
				positiveButton: "Proceed",
				positiveIcon: "Image/Apply.svg",
				Indicator: "BOM_DELETE"
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

			var oTable = this.byId("id_bomTable");
			var oModel = oTable.getModel("JM_BOMTable");
			var aData = oModel.getProperty("/BOMList");
			var that = this;

			var aSelectedIndices = oTable.getSelectedIndices();

			aSelectedIndices.sort(function(a, b) {
				return b - a;
			});

			var aSelectedRows = aSelectedIndices.map(function(iIndex) {
				var oContext = oTable.getContextByIndex(iIndex);
				return oContext ? oContext.getObject() : null;
			}).filter(Boolean);

			// === Initialize Global and Local Change Logs ===
			if (this.AppId === "RX") {

				var gChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
				if (!gChangeLogModel) {
					gChangeLogModel = new sap.ui.model.json.JSONModel([]);
					this.getOwnerComponent().setModel(gChangeLogModel, "JM_ChangeLog");
				}

				var oChangeLogData = gChangeLogModel.getData();
				if (!Array.isArray(oChangeLogData)) {
					oChangeLogData = [];
				}

				var ItemNo = that.oldItemValue.map(function(item) {
					return item.Posnr;
				});

				// === Process Each Selected Row ===
				aSelectedRows.forEach(function(oRow) {
					var oPosnr = oRow.Posnr || "";
					var oIdnrk = oRow.Idnrk || "";
					var oUnit = oRow.Meins || "";
					var oQty = oRow.Menge || null;
					var oMatnr = oIdnrk || "";

					if (ItemNo.includes(oPosnr)) {
						var baseLabel = "Deleted Item - " + oPosnr;

						if (oMatnr) {
							var entryMat = {
								ProcessInd: "B",
								FieldId: "ID_BOM_IDNRK",
								ProcessDesc: "BOM",
								ItemNo: oPosnr || "",
								FieldName: baseLabel || "",
								OldValue: oMatnr || "",
								NewValue: "DELETED",
								ChangedBy: that.UserName,
								ChangedOn: new Date()
							};
							oChangeLogData.push(entryMat);
						}

						if (oUnit) {
							var entryUnit = {
								ProcessInd: "B",
								FieldId: "ID_BOM_MEINS",
								ProcessDesc: "BOM",
								ItemNo: oPosnr || "",
								FieldName: baseLabel || "",
								OldValue: oUnit || "",
								NewValue: "DELETED",
								ChangedBy: that.UserName,
								ChangedOn: new Date()
							};
							oChangeLogData.push(entryUnit);
						}

						if (oQty) {
							var entryQty = {
								ScrInd: "B",
								FieldId: "ID_BOM_MENGE",
								ProcessDesc: "BOM",
								ItemNo: oPosnr || "",
								FieldName: baseLabel || "",
								OldValue: oQty || "",
								ProcessInd: "B",
								NewValue: "DELETED",
								ChangedBy: that.UserName,
								ChangedOn: new Date()
							};
							oChangeLogData.push(entryQty);
						}
					} else {
						oChangeLogData = oChangeLogData.filter(function(item) {
							return !(item.ItemNo === oPosnr && item.ProcessInd === "B");
						});
					}
				});

				gChangeLogModel.setData(oChangeLogData);
				gChangeLogModel.refresh(true);
			}

			aSelectedIndices.forEach(function(iIndex) {
				aData.splice(iIndex, 1);
			});

			oModel.setProperty("/BOMList", aData);
			oTable.clearSelection();

			ErrorHandler.showCustomSnackbar(i18n.getText("RowsDeletedSuccess"), "success");
		},

		fnRowSelectionChange: function(oEvent) {
			var oTable = oEvent.getSource();
			var oModel = this.getView().getModel("JM_BOMTable");
			if (oModel) {
				var aData = oModel.getProperty("/BOMList");

				var aSelectedIndices = oTable.getSelectedIndices();
				var aDeselect = [];

				aSelectedIndices.forEach(function(idx) {
					var oRow = aData[idx];
					if (
						(!oRow.Idnrk || oRow.Idnrk.trim() === "") ||
						(!oRow.Posnr || oRow.Posnr.trim() === "") ||
						(!oRow.Postp || oRow.Postp.trim() === "" || oRow.POSTP === "Error")
					) {
						aDeselect.push(idx);
					}
				});
				// Deselect invalid rows
				aDeselect.forEach(function(idx) {
					oTable.removeSelectionInterval(idx, idx);
				});
			}
		},

		// F4 Functionalities
		fnF4press: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedField = id;
			this.bindTextF4model("P", id, "X", oEvent);
		},

		fnF4TableInput: function(oEvent) {
			var oInput = oEvent.getSource();
			var idClone = oInput.getId().split("--")[1];
			var id = idClone.split("-")[0];
			this.selectedField = oInput.getId();
			this.selectedContext = oInput.getBindingContext("JM_BOMTable");
			this.bindTextF4model("P", id, "A", oEvent);
		},

		bindTextF4model: function(SearchHelp, sitem, process, oEvent) {
			var oJsonModel;
			var vTitle;
			var oLabels = {};
			var vLength;
			var that = this;
			that.sitem = sitem;
			var KeyModel = that.getView().getModel("JM_KeydataModel");
			if (KeyModel) {
				var Werks = KeyModel.getProperty("/Werks");
			}

			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var oPayload = {
				FieldId: sitem,
				Process: process,
				F4Type: SearchHelp
			};

			if (["ID_BOM_LGORT", "ID_BOM_PRVBE", "ID_BOM_VERTI", "ID_BOM_ITSOB"].includes(that.selectedField)) {
				oPayload.FieldNam1 = "WERKS";
				oPayload.Value1 = Werks.toString().padStart(4, "0");
			}
			if (["ID_BOM_IDNRK"].includes(sitem)) {
				oPayload.FieldNam1 = "WERKS";
				oPayload.Value1 = Werks.toString().padStart(4, "0");
				oPayload.Process = "X";
			}
			oPayload.NavSerchResult = [];

			oModel.create("/SearchHelpSet", oPayload, {

				success: function(odata, Response) {

					if (odata.MsgType === "E") {
						ErrorHandler.showCustomSnackbar(odata.Message, "Error", that);
						return;
					}

					var aResults = odata.NavSerchResult.results;
					if (!aResults.length) return;
					var aFormattedRows = [];

					if (aResults.length > 0) {
						var oFirst = aResults[0];

						if (oFirst && (oFirst.DomvalueL || oFirst.Ddtext)) {
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								ErrorHandler.showCustomSnackbar(oFirst.Message, "Error", that);
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
							that.getView().setModel(oJsonModel, "JM_F4Model");
							vTitle = sap.ui.getCore().byId(that.sitem + "_TXT").getText() + " (" + vLength + ")";
							that.fnF4fragopen(oEvent, vTitle).open();
						} else {
							vLength = aResults.length;
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								ErrorHandler.showCustomSnackbar(oFirst.Message, "Error", that);
								return;
							}
							if (oFirst.Label1) oLabels.col1 = oFirst.Label1;
							if (oFirst.Label2) oLabels.col2 = oFirst.Label2;
							if (oFirst.Label3) oLabels.col3 = oFirst.Label3;
							if (oFirst.Label4) oLabels.col4 = oFirst.Label4;
							// Validate

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
					// MessageToast.show("HTTP Respond Failed");
				}
			});

		},

		fnF4Itempress: function(oEvent) {
			var oItem = oEvent.getSource();

			var that = this;

			var oContext = oItem.getBindingContext("JM_F4Model");
			if (!oContext) return;

			var item = oContext.getProperty("col1"); // main value
			var item1 = oContext.getProperty("col2"); // description (if applicable)

			// Get the input that triggered F4
			var sSelectedFieldId = this.selectedField;
			var oSelectedInput = this.getView().byId(sSelectedFieldId) || sap.ui.getCore().byId(sSelectedFieldId) || Fragment.byId(
				"ID_ITEMLEVEL", sSelectedFieldId);
			if (!oSelectedInput) return;

			// Set main value
			oSelectedInput.setValue(item);
			oSelectedInput.setValueState("None");

			var oCtx = null;

			if (oSelectedInput.getBindingContext && oSelectedInput.getBindingContext("JM_BOMTable")) {
				oCtx = oSelectedInput.getBindingContext("JM_BOMTable");
			}

			// Determine if this is Component field (table or normal input)
			var bIsComponentField = sSelectedFieldId.includes("ID_BOM_IDNRK") || sSelectedFieldId.includes("ID_BOM_LABOR");

			if (bIsComponentField) {
				// Compute description field ID
				var sDesFieldId = sSelectedFieldId.includes("ID_BOM_IDNRK") ? sSelectedFieldId.replace("ID_BOM_IDNRK", "ID_BOM_IDNRK_DES") :
					sSelectedFieldId.replace("ID_BOM_LABOR", "ID_BOM_LABOR_DES");

				var oDesField = this.getView().byId(sDesFieldId) || sap.ui.getCore().byId(sDesFieldId);
				if (oDesField) {
					oDesField.setValue(item1);
				}
			}

			var Desc = sSelectedFieldId + "_DES";
			var FrgDecs = Fragment.byId("ID_ITEMLEVEL", Desc);
			if (FrgDecs) {
				FrgDecs.setValue(item1);
			}

			// Table row update logic
			if (this.selectedContext && sSelectedFieldId !== "ID_BOM_LABOR") {
				var oModel = this.selectedContext.getModel();
				var sPath = this.selectedContext.getPath();

				if (bIsComponentField) {
					oModel.setProperty(sPath + "/Idnrk", item);
					oModel.setProperty(sPath + "/Ktext", item1);
				} else if (sSelectedFieldId.includes("ID_BOM_POSTP")) {
					oModel.setProperty(sPath + "/Postp", item);
				} else if (sSelectedFieldId.includes("ID_BOM_MEINS")) {
					oModel.setProperty(sPath + "/Meins", item);
				} else {
					try {
						var sProperty = oSelectedInput.getBindingInfo("value").parts[0].path;
						oModel.setProperty(sPath + "/" + sProperty, item);
					} catch (e) {
						// silently ignore
					}
				}
			}

			if (this.AppId === "RX") {
				this.fnUpdateChangelog(this.selectedField, oCtx);
			}

			this.fnBomValidation({
				getSource: function() {
					return oSelectedInput;
				}
			});

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
			var oCtx = oCheckBox.getBindingContext("JM_BOMTable");
			oCheckBox.setValueState("None");

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

			this.fnLiveChange(oFakeEvent);
		},

		fnLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var fieldId = oInput.getId();
			var vId = fieldId.split("--").pop();
			var shortId = vId.split("-")[0];

			var vValue = "";
			if (typeof oInput.getValue === "function") {
				vValue = oInput.getValue();
				if (shortId !== "ID_BOM_ZTEXT" && shortId !== "ID_BOM_STKTX") {
					vValue = vValue.toUpperCase();
				}
				oInput.setValue(vValue);
			} else if (typeof oInput.getSelectedKey === "function") {
				vValue = oInput.getSelectedKey().toUpperCase();
			} else if (typeof oInput.getSelected === "function") {
				vValue = oInput.getSelected() ? "X" : "";
			} else {
				vValue = "";
			}
			var oCtx = oInput.getBindingContext("JM_BOMTable");

			// Field length validation
			var oFieldLengthMap = {
				"ID_BOM_ZTEXT": 40,
				"ID_BOM_STKTX": 40,
				"ID_BOM_BMENG": 13,
				"ID_BOM_LOSVN": 13,
				"ID_BOM_LOSBS": 13,
				"ID_BOM_MEINS": 3,
				"ID_BOM_STLST": 2,
				"ID_BOM_EXSTL": 4,
				"ID_BOM_LABOR": 3,
				"ID_BOM_GROES": 32,
				"ID_BOM_AVOAU": 3,
				"ID_BOM_AUSCH": 3,
				"ID_BOM_RFPNT": 20,
				"ID_BOM_NLFZT": 3,
				"ID_BOM_NLFZV": 3,
				"ID_BOM_NLFMV": 3,
				"ID_BOM_VERTI": 4,
				"ID_BOM_DSPST": 2,
				"ID_BOM_ITSOB": 2,
				"ID_BOM_POTX1": 40,
				"ID_BOM_POTX2": 40,
				"ID_BOM_LGORT": 4,
				"ID_BOM_PRVBE": 10,
				"ID_BOM_IDNRK": 40,
				"ID_BOM_POSTP": 1,
				"ID_BOM_POSNR": 4,
				"ID_BOM_MENGE": 13,
				"ID_BOM_AENNR": 12,
				"ID_BOM_SORTF": 10,
				"ID_BOM_IDENT": 8,
				"ID_BOM_AENRA": 12,
				"ID_BOM_ALPGR": 2,
				"ID_BOM_SGT_CATV": 40,
				"ID_BOM_ERSKZ": 1,
				"ID_BOM_STLBE": 1
			};

			if (oFieldLengthMap[shortId] && vValue.length > oFieldLengthMap[shortId]) {
				var iMax = oFieldLengthMap[shortId];
				oInput.setValue(vValue.substring(0, iMax));
				return;
			} else {
				oInput.setValueState("None");
			}

			// Clear description field if exists
			var descriptionField = this.getView().byId(shortId + "_DES") || Fragment.byId("ID_ITEMLEVEL", shortId + "_DES");
			if (descriptionField) {
				descriptionField.setValue("");
			}

			var that = this;

			that.fnBomValidation({
				getSource: function() {
					return oInput;
				}
			});

			if (oCtx) {
				var oModel = oCtx.getModel();
				var sPath = oCtx.getPath();
				var F4Input = Fragment.byId("ID_ITEMLEVEL", shortId);
				var fnMatchHandler = function(match) {
					if (shortId.indexOf("ID_BOM_IDNRK") !== -1) {
						oModel.setProperty(sPath + "/Ktext", match ? (match.Value2 || "") : "");
						var vKtext = oModel.getProperty(sPath + "/Ktext");

						if (!vKtext) {
							// Clear Meins
							var oData = oModel.getProperty(sPath);
							if (oData && typeof oData === "object") {
								var aSkipFields = ["Datub", "Datuv", "Posnr", "Postp", "Idnrk"];

								var oNewData = Object.assign({}, oData);

								Object.keys(oNewData).forEach(function(key) {
									// Skip metadata and excluded fields
									if (key === "__metadata" || aSkipFields.includes(key)) {
										return;
									}
									var value = oNewData[key];

									if (["IDNRK", "MENGE", "MEINS", "POSTP"].includes(key)) {
										oNewData[key] = "None"; // Reset ValueState correctly
										return;
									}

									if (typeof value === "boolean") {
										oNewData[key] = null;
									} else if (typeof value === "string") {
										oNewData[key] = "";
									} else if (typeof value === "number") {
										oNewData[key] = "";
									}
								});

								oModel.setProperty(sPath, oNewData);
								oModel.refresh(true);

								var oDescModel = that.getView().getModel("JM_LocalDescriptionModel");
								var oDescData = oDescModel.getData();
								var sPosnr = oNewData.Posnr;
								var aRows = oDescData[sPosnr];

								if (Array.isArray(aRows)) {
									var aNewDataKeys = Object.keys(oNewData).map(function(k) {
										return k.toLowerCase();
									});

									var aFiltered = aRows.filter(function(oRow) {
										var sField = oRow.FieldName ? oRow.FieldName.toLowerCase() : "";
										return !aNewDataKeys.includes(sField);
									});
									oDescData[sPosnr] = aFiltered;

									oDescModel.setData(oDescData);
								}
							}

						}
					}
				};

				if (F4Input instanceof sap.m.Input && F4Input.getShowValueHelp()) {
					this.fnReadf4Cache(shortId, vValue, "P", fnMatchHandler, oCtx);
				} else {
					var oCtrl = this.getView().byId(shortId);
					if (oCtrl instanceof sap.m.Input && oCtrl.getShowValueHelp()) {
						this.fnReadf4Cache(shortId, vValue, "P", fnMatchHandler, oCtx);
					}
				}
			} else {
				var oCtrl = this.getView().byId(shortId);
				if (oCtrl instanceof sap.m.Input && oCtrl.getShowValueHelp()) {
					this.fnReadf4Cache(shortId, vValue, "P");
				}
			}
			if (this.AppId === "RX") {
				this.fnUpdateChangelog(shortId, oCtx);
			}
		},

		fnReadf4Cache: function(vId, vValue, f4type, callback, oCtx) {
			var that = this;
			var match;

			var updateDesc = function(results) {
				if ((f4type !== "P" || !results || results.length === 0) && vValue) return;
				var foundMatch = null;
				var cleanValue = String(vValue).toUpperCase().replace(/^0+/, "");
				cleanValue = cleanValue.replace(/^0+/, "");

				foundMatch = results.find(function(item) {
					var val1 = item.Value1.replace(/^0+/, "");
					return val1 === cleanValue;
				});

				var descField = that.getView().byId(vId + "_DES");
				var Desc = vId + "_DES";
				var FrgDecs = Fragment.byId("ID_ITEMLEVEL", Desc);
				if (FrgDecs) {
					FrgDecs.setValue(foundMatch ? foundMatch.Value2 : "");
				}
				var field = that.getView().byId(vId) || Fragment.byId("ID_ITEMLEVEL", vId);

				// Set description if field exists
				if (descField) {
					descField.setValue(foundMatch ? foundMatch.Value2 : "");
				}

				var sKey = vId.replace("ID_BOM_", "");

				var oModel = that.getView().getModel("JM_LocalDescriptionModel");
				if (oModel) {
					var oData = oModel.getData();

					if (!oData[sKey]) {
						oData[sKey] = {
							value: "",
							desc: ""
						};
					}

					oData[sKey].value = vValue || "";
					oData[sKey].desc = foundMatch ? foundMatch.Value2 : "";
					oModel.refresh(true);
				}

				if (vValue === "" || foundMatch) {
					field.setValueState("None");
				} else {
					field.setValueState("Error");
					field.setValueStateText(vValue + " value is not Avalible");
					if (oCtx) {
						var oModel = oCtx.getModel();
						var sPath = oCtx.getPath();
						if (vId === "ID_BOM_MEINS") {
							oModel.setProperty(sPath + "/MEINS", "Error");
							oModel.setProperty(sPath + "/MEINS_TXT", vValue + " value is not Avalible");
						}
						if (vId === "ID_BOM_IDNRK") {
							oModel.setProperty(sPath + "/IDNRK", "Error");
							oModel.setProperty(sPath + "/IDNRK_TXT", vValue + " value is not Avalible");
						}
						if (vId === "ID_BOM_POSTP") {
							oModel.setProperty(sPath + "/POSTP", "Error");
							oModel.setProperty(sPath + "/POSTP_TXT", vValue + " value is not Avalible");
						}
					}
				}

				if (callback && typeof callback === "function") {
					callback(foundMatch);
					return;
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

		f4descriptionGet: function(vId, value, f4type, fnCallback) {
			var that = this;

			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var KeyModel = this.getView().getModel("JM_KeydataModel");
			if (KeyModel) {
				var Werks = KeyModel.getProperty("/Werks");
			}
			var oPayload = {
				FieldId: vId,
				Process: "X",
				F4Type: f4type
			};

			if (["ID_BOM_LGORT", "ID_BOM_PRVBE", "ID_BOM_VERTI", "ID_BOM_ITSOB"].includes(that.selectedField)) {
				oPayload.FieldNam1 = "WERKS";
				oPayload.Value1 = Werks.toString().padStart(4, "0");
			}

			if (vId === "ID_BOM_IDNRK") {
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

		fnNavBack: function() {
			var oPopupModel = new sap.ui.model.json.JSONModel({
				title: "Information",
				text: "Do you Want to exit this Process? once exit all data will be Refreshed",
				negativeButton: "Cancel",
				negativeIcon: "Image/Cancel.svg",
				positiveButton: "Proceed",
				positiveIcon: "Image/Apply.svg",
				Indicator: "BOM_BACK"
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

		fnSaveBack: function() {
			var that = this;
			this.fnBomValidation(null, function() {
				var oBOMPayload = that.fnSaveBomModels();
				var oBomModel = that.getOwnerComponent().getModel("JM_Bom");
				oBomModel.setData(oBOMPayload);
				oBomModel.refresh(true);
				that.fnclearLocalModel();
				sap.ui.core.UIComponent.getRouterFor(that).navTo("pv_detail");
			});
		},

		fnBomValidation: function(oEvent, fnSuccessCallback) {
			this.NoError = false;

			var that = this;

			var oPayload = this.fnPreparePayload();

			// Header fields
			var oBomStatusField = this.byId("ID_BOM_STLST");
			var oBaseQtyField = this.byId("ID_BOM_BMENG");

			[oBomStatusField, oBaseQtyField].forEach(function(f) {
				f.setValueState("None");
			});

			var aFilteredItems = oPayload.NavBomItem.filter(function(oItem) {
				return oItem.Postp && oItem.Postp.trim() !== "";
			});

			if (aFilteredItems.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("EnterComponentDetails"), "Error", that);
				return;
			}

			// OData Create
			var oModel = this.getOwnerComponent().getModel();
			oModel.create("/Recipe_HeaderSet", oPayload, {
				success: function(oData) {
					var aErrorMsgs = oData.NavReturn_Msg.results.filter(function(e) {
						return e.MsgType === "E";
					});

					// ********************************************
					if (oEvent) {
						that.fnSubmitComponent(oEvent);
					}
					// ********************************************

					if (aErrorMsgs.length === 0) {
						that.NoError = true;
						that.fnResetInputStates();
						if (typeof fnSuccessCallback === "function") {
							fnSuccessCallback();
						}
						return;
					}

					// Table rows
					that.NoError = false;
					var oTable = that.byId("id_bomTable");
					var aRows = oTable ? oTable.getRows() : [];
					var oTableModel = oTable.getModel("JM_BOMTable");
					aErrorMsgs.forEach(function(item) {
						if (item.ItemNo) {
							// Table-row level errors
							var sErrorItemNo = item.ItemNo.slice(-4);

							for (var i = 0; i < aRows.length; i++) {
								var oCtx = aRows[i].getBindingContext("JM_BOMTable");
								if (!oCtx) continue;
								var oRowData = oCtx.getObject();

								if (oRowData.Posnr === sErrorItemNo) {

									var sField = item.Fnm ? item.Fnm.toUpperCase() : "";
									if (!sField) continue;

									oTableModel.setProperty(oCtx.getPath() + "/" + sField, "Error");
									oTableModel.setProperty(oCtx.getPath() + "/" + sField + "_TXT", item.Message);

									var oInput = that.fngetTableCellInput(aRows[i], item.Fnm);
									if (oInput) {
										// oInput.focus();
									} else {
										var oTable = that.byId("id_bomTable");
										var iRowCount = oTable.getBinding("rows").getLength();

										// oTable.clearSelection(); 
										oTable.addSelectionInterval(0, iRowCount - 1);
										that.fnItemDetails({
											getSource: function() {
												return aRows[i];
											}
										});
										var sId = "ID_BOM_" + item.Fnm;
										var oFragInput = Fragment.byId("ID_ITEMLEVEL", sId);
										if (oFragInput) {
											if (oFragInput instanceof sap.m.CheckBox) {
												oFragInput.removeStyleClass("cl_opr_checkbx");
												oFragInput.addStyleClass("cl_checkboxError");
												oFragInput.setTooltip(item.Message);
												oFragInput.setValueState("Error");
											} else {
												oFragInput.setValueState("Error");
												oFragInput.setValueStateText(item.Message);
											}
										}
									}
									break;
								}
							}
						} else {
							// Normal header input
							that.fnmarkErrorOnField(item.Fnm, item.Message);
						}
					});
				},
				error: function() {
					that.NoError = false;
					ErrorHandler.showCustomSnackbar(i18n.getText("ErrorSavingBom"), "Error", that);
				}
			});
		},

		fnSubmitComponent: function(oEvent) {
			if (oEvent) {
				var oInput = oEvent.getSource();
				if (oInput && typeof oInput.getValue === "function") {
					var InputId = oInput.getId().split("--")[1].split("-")[0];
					if (InputId === "ID_BOM_IDNRK") {
						var Matnr = oInput.getValue();
					}
				}

			}
			if (Matnr) {
				var oPayload = {
					"AppId": "BC",
					"Matnr": Matnr,
					"Werks": this.getView().byId("ID_BOM_WERKS").getValue(),
					"Ind": "B",
					"MsgTyp": "U",
					"NavBomHeader": [],
					"NavBomItem": []
				};
				var aOdataModel = this.getOwnerComponent().getModel();
				var that = this;
				aOdataModel.create("/Recipe_HeaderSet", oPayload, {
					success: function(oData) {
						if (oData.NavBomItem && oData.NavBomItem.results && oData.NavBomItem.results.length !== 0) {
							if (oInput && typeof oInput.getValue === "function") {
								if (oInput.getValue() === "") {
									return;
								}
							}
							var oTable = that.getView().byId("id_bomTable");
							var aRows = oTable.getRows();
							var oMengeInput = null;
							var oUOM = null;
							var oAsm = null;
							var oModel = oTable.getModel("JM_BOMTable");
							var oCtx = oInput.getBindingContext("JM_BOMTable");
							if (!oCtx) return;

							for (var i = 0; i < aRows.length; i++) {
								var oRowCtx = aRows[i].getBindingContext("JM_BOMTable");
								if (oRowCtx && oRowCtx.getPath() === oCtx.getPath()) {
									oMengeInput = aRows[i].getCells()[4];
									oUOM = aRows[i].getCells()[5];
									oAsm = aRows[i].getCells()[6];
									break;
								}
							}

							if (oUOM) {
								var oInputInsideVBox = oUOM.getItems()[0]; // VBox -> Input
								if (oInputInsideVBox) {
									oInputInsideVBox.setValue(oData.NavBomItem.results[0].Meins);
								}
							}

							if (oAsm) {
								var oInputInsideVBox = oAsm.getItems()[0]; // VBox -> CheckBox
								if (oInputInsideVBox) {
									if (oData.NavBomItem.results[0].Stlkz === 'X') {
										oInputInsideVBox.setSelected(true);
									} else {
										oInputInsideVBox.setSelected(false);
									}
								}
							}
							if (that.getView().byId("ID_BOM_STLAN").getValue() === "1") {
								oModel.getProperty(oCtx.getPath()).Sanfe = true;
							} else {
								oModel.getProperty(oCtx.getPath()).Sanfe = false;
							}
						}
					},
					error: function(oError) {
						ErrorHandler.showCustomSnackbar(i18n.getText("HTTPReqFailedError"), "Error");
					}
				});
			}
		},

		fngetComponent: function() {
			return new Promise(function(Resolve, Reject) {
				var aMatnr = this.getView().byId("ID_BOM_MATNR");
				var oPayload = {
					"AppId": "BC",
					"Matnr": this.getView().byId("ID_BOM_MATNR").getValue(),
					"Maktx": this.getView().byId("ID_BOM_MAKTX").getValue(),
					"Werks": this.getView().byId("ID_BOM_WERKS").getValue(),
					"Ind": "B",
					"MsgTyp": "U",
					"NavBomHeader": [],
					"NavBomItem": []
				};
				var aOdataModel = this.getOwnerComponent().getModel();
				var that = this;
				aOdataModel.create("/Recipe_HeaderSet", oPayload, {
					success: function(oData) {
						if (aMatnr.getValue() === "") {
							return;
						}
						var oBOMModel = that.getView().getModel("JM_BOMModel");
						if (oBOMModel && oData.NavBomItem.results.length > 0) {
							var baseQty = oData.NavBomItem.results[0].Meins;
							oBOMModel.setProperty("/Bmein", baseQty);
							oBOMModel.setProperty("/Losme", baseQty); // there no value from backend so set the same unit for lot size
						}
						Resolve(true);
					},
					error: function(oError) {
						ErrorHandler.showCustomSnackbar(i18n.getText("HTTPReqFailedError"), "Error", that);
					}
				});
			}.bind(this));

		},

		fngetTableCellInput: function(oRow, sFnm) {
			var columnMapping = {
				"POSNR": 0, // Item (Link)
				"POSTP": 1, // ICt
				"IDNRK": 2, // Component
				"KTEXT": 3, // Component Desc
				"MENGE": 4, // Quantity
				"MEINS": 5, // UOM
				"STLKZ": 6, // Assembly indicator
				"UPSKZ": 7, // Sub-item indicator
				"DATUV": 8, // Valid From
				"DATUB": 9, // Valid To
				// "AENNR": 10, // Change No.
				// "DUMPS": 11, // Phantom Item
				"SORTF": 12, // Sort String
				"IDENT": 13, // Item ID
				"AENRA": 14, // Change No.To
				// "ALPGR": 15, // Group
				// "FMENG": 16, // Fixed Quantity
				"LTXPO": 17, // Long Text
				"SGTCMKZ": 18, // Segmented Maintained
				"SGTCATV": 19, // Seg Value
				"OBTSP": 20 // Object Type
			};
			var iIndex = columnMapping[sFnm];
			if (iIndex === undefined) return null;

			var oCell = oRow.getCells()[iIndex];
			if (oCell instanceof sap.m.Input) return oCell;

			if (oCell.getItems) {
				var aItems = oCell.getItems();
				for (var i = 0; i < aItems.length; i++) {
					if (aItems[i] instanceof sap.m.Input) return aItems[i];
				}
			}
			return null;
		},

		fnmarkErrorOnField: function(sFnm, sMessage) {
			var sId = "ID_BOM_" + sFnm;
			var oCtrl = this.byId(sId);

			if (!oCtrl) {
				try {
					oCtrl = Fragment.byId("ID_ITEMLEVEL", sId);
				} catch (e) {
					oCtrl = null;
				}
			}

			if (oCtrl) {
				if (oCtrl instanceof sap.m.CheckBox) {
					this.fnSetCheckBoxError(oCtrl, sMessage);
					return;
				}

				oCtrl.setValueState("Error");
				oCtrl.setValueStateText(sMessage);
				setTimeout(function() {
					// oCtrl.focus();
				}, 100);
			}
		},

		fnSetCheckBoxError: function(oCheckBox, sMessage) {
			if (oCheckBox) {
				oCheckBox.addStyleClass("cl_checkboxError");
				oCheckBox.setTooltip(sMessage);
			}
		},

		fnItemDetails: function(oEvent) {

			var oTable = this.byId("id_bomTable");
			var aSelectedIndices = oTable.getSelectedIndices();

			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("PleaseSelectLineItem"), "Information", this);
				return;
			}

			var aSelectedPaths = [];
			for (var i = 0; i < aSelectedIndices.length; i++) {
				var oContext = oTable.getContextByIndex(aSelectedIndices[i]);
				if (oContext) {
					aSelectedPaths.push(oContext.getPath());
				}
			}
			this._aSelectedPaths = aSelectedPaths;

			var oRowContext = oEvent.getSource().getBindingContext("JM_BOMTable");
			var sClickedPath = oRowContext.getPath();
			var iClickedRowIndex = sClickedPath.split("/")[2];

			var iSelectedIndex = -1;
			for (var i = 0; i < this._aSelectedPaths.length; i++) {
				var sPath = this._aSelectedPaths[i];
				if (sPath === oTable.getContextByIndex(iClickedRowIndex).getPath()) {
					iSelectedIndex = i;
					break;
				}
			}

			if (iSelectedIndex === -1) {
				ErrorHandler.showCustomSnackbar(i18n.getText("PleaseClickSelectedItem"), "Information", this);
				return;
			}

			this._iCurrentIndex = iSelectedIndex;

			// --- Fragment binding ---
			if (!this.clrAllfrag) {
				this.clrAllfrag = sap.ui.xmlfragment("ID_ITEMLEVEL", "MANAGED_RECIPE.Fragment.Itemlevel", this);
				this.getView().addDependent(this.clrAllfrag);
			}

			var oFromUwl = this.getOwnerComponent().getModel("JM_ContextModel");
			var oUwlData = oFromUwl.getData();
			var that = this;

			var oModel = this.getView().getModel("JM_BOMTable");
			var sPath = this._aSelectedPaths[this._iCurrentIndex];
			this.clrAllfrag.setBindingContext(oModel.createBindingContext(sPath), "JM_BOMTable");

			var oData = oModel.getProperty(sPath);
			Fragment.byId("ID_ITEMLEVEL", "id_itemNumber")
				.setText("Item Number : " + oData.Posnr + " Component : " + oData.Idnrk + " - " + oData.Ktext);

			var sPosnr = oData.Posnr;

			var oDescModel = this.getView().getModel("JM_LocalDescriptionModel");
			var oBomModel = this.getView().getModel("JM_BOMTable");

			if (oDescModel && oBomModel) {
				var oDescData = oDescModel.getData();
				var oBomData = oBomModel.getData();

				if (oDescData[sPosnr] && Array.isArray(oDescData[sPosnr])) {
					var aFields = oDescData[sPosnr];
					var aBomList = oBomData.BOMList;

					for (var i = 0; i < aBomList.length; i++) {
						if (aBomList[i].Posnr === sPosnr) {

							for (var j = 0; j < aFields.length; j++) {
								var oField = aFields[j];
								var sNewField = oField.FieldName.charAt(0).toUpperCase() +
									oField.FieldName.slice(1).toLowerCase() + "Des";
								aBomList[i][sNewField] = oField.desc;
							}
						}
					}
					oBomModel.setData(oBomData);
					oBomModel.refresh(true);
				}
			}

			if (this.AppId === "RX" && oUwlData.Appid === "RX") {
				var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
				var aChangeLogData = oChangeLogModel ? oChangeLogModel.getData() : [];

				if (Array.isArray(aChangeLogData) && aChangeLogData.length > 0) {

					var aChangedItems = aChangeLogData.filter(function(oItem) {
						return oItem.ProcessInd === "B" && oItem.ItemNo === sPosnr;
					});

					aChangedItems.forEach(function(oItem) {
						var sFieldId = oItem.FieldId;
						if (sFieldId) {
							var oControl = that.getView().byId(sFieldId) || sap.ui.core.Fragment.byId("ID_ITEMLEVEL", sFieldId);
							if (oControl) {
								oControl.addStyleClass("cl_HighLightInput");
							}
						}
					});
				}
			}

			this.clrAllfrag.open();
		},

		fnItemSubmit: function() {
			var oView = this.getView();

			var vErrorState = this.fnCheckErrorState();

			if (!vErrorState) {
				ErrorHandler.showCustomSnackbar(i18n.getText("CorrectHighLightedFieldsError"), "Error", this);
				return;
			}

			var oDescModel = oView.getModel("JM_LocalDescriptionModel");
			var oBomModel = oView.getModel("JM_BOMTable");

			// Create Description model if not existing
			if (!oDescModel) {
				oDescModel = new sap.ui.model.json.JSONModel({});
				oView.setModel(oDescModel, "JM_LocalDescriptionModel");
			}

			if (oBomModel) {
				var oBomData = oBomModel.getData();
				var aBomList = oBomData.BOMList;

				if (Array.isArray(aBomList)) {
					// Existing data from model
					var oExistingDescData = oDescModel.getData() || {};
					var oNewDescData = {};

					// --- Build new data based on BOM items ---
					for (var i = 0; i < aBomList.length; i++) {
						var oItem = aBomList[i];
						var sPosnr = oItem.Posnr;

						// Preserve existing entry for that item
						oNewDescData[sPosnr] = oExistingDescData[sPosnr] ? oExistingDescData[sPosnr].slice() : [];

						// Extract all *Des fields
						for (var sField in oItem) {
							if (Object.prototype.hasOwnProperty.call(oItem, sField) && sField.endsWith("Des")) {
								var sBaseField = sField.slice(0, -3);
								var sFieldName = sBaseField.toUpperCase();
								var sValue = oItem[sBaseField] || "";
								var sDesc = oItem[sField] || "";

								// Avoid duplicates
								var bExists = oNewDescData[sPosnr].some(function(obj) {
									return obj.FieldName === sFieldName;
								});

								if (!bExists) {
									oNewDescData[sPosnr].push({
										value: sValue,
										desc: sDesc,
										FieldName: sFieldName
									});
								}
							}
						}
					}

					for (var sKey in oExistingDescData) {
						if (Object.prototype.hasOwnProperty.call(oExistingDescData, sKey)) {
							if (isNaN(Number(sKey))) {
								oNewDescData[sKey] = oExistingDescData[sKey];
							}
						}
					}

					var oUpdatedDescModel = new sap.ui.model.json.JSONModel(oNewDescData);
					oView.setModel(oUpdatedDescModel, "JM_LocalDescriptionModel");

				}
			}

			this.fnItemFragClose();
		},

		fnItemFragClose: function() {
			if (this.clrAllfrag) {
				this.clrAllfrag.close();
				this.clrAllfrag.destroy();
				this.clrAllfrag = null;
			}
		},

		fnSaveBomModels: function() {
			var that = this;
			var oView = this.getView();

			// Description Save functionality 
			var oLocalDecsModel = this.getView().getModel("JM_LocalDescriptionModel");
			if (oLocalDecsModel) {
				sap.ui.getCore().setModel(oLocalDecsModel, "JM_DescriptionModel");
			}
			// Eoc

			var BomHeaderModel = this.getView().getModel("JM_BOMModel");
			var BomItemModel = this.getView().getModel("JM_BOMTable");
			if (BomHeaderModel || BomItemModel) {
				var BOMData = BomItemModel.getProperty("/BOMList");
				var BOMHeaderData = BomHeaderModel.getData();
				[BOMHeaderData].forEach(function(oItem) {
					["Datuv"].forEach(function(field) {
						var value = oItem[field];
						if (typeof value === "string" && value.endsWith("Z")) {
							oItem[field] = new Date(value);
						}
					});
				});
				var oPayload = {};
				oPayload.NavBomItem = [];

				var oBmeng = BomHeaderModel.getProperty("/Bmeng") || oView.byId("ID_BOM_BMENG").getValue() || null;
				var oLosvn = BomHeaderModel.getProperty("/Losvn") || oView.byId("ID_BOM_LOSVN").getValue() || null;
				var oLosbs = BomHeaderModel.getProperty("/Losbs") || oView.byId("ID_BOM_LOSBS").getValue() || null;

				oPayload.NavBomHeader = [{
					Bmeng: that.fnToEdmDecimal(oBmeng, 13, 3) || null,
					Ztext: BomHeaderModel.getProperty("/Ztext") || oView.byId("ID_BOM_ZTEXT").getValue() || "",
					Bmein: BomHeaderModel.getProperty("/Bmein") || oView.byId("ID_BOM_BMEIN").getValue() || "",
					Stktx: BomHeaderModel.getProperty("/Stktx") || oView.byId("ID_BOM_STKTX").getValue() || "",
					Losvn: that.fnToEdmDecimal(oLosvn, 13, 3) || null,
					Losbs: that.fnToEdmDecimal(oLosbs, 13, 3) || null,
					Losme: BomHeaderModel.getProperty("/Losme") || oView.byId("ID_BOM_LOSME").getValue() || "",
					Stlst: BomHeaderModel.getProperty("/Stlst") || oView.byId("ID_BOM_STLST").getValue() || "",
					Stlbe: BomHeaderModel.getProperty("/Stlbe") || oView.byId("ID_BOM_STLBE").getValue() || "",
					Labor: (function() {
						var sLabor = BomHeaderModel.getProperty("/Labor") || oView.byId("ID_BOM_LABOR").getValue() || "";
						sLabor = sLabor.trim();
						if (sLabor !== "" && sLabor !== "0") {
							sLabor = sLabor.padStart(3, "0");
						}
						return sLabor;
					})(),
					Groes: BomHeaderModel.getProperty("/Groes") || oView.byId("ID_BOM_GROES").getValue() || "",
					Stlal: BomHeaderModel.getProperty("/Stlal") || oView.byId("ID_BOM_STLAL").getValue() || "",
					Stlan: BomHeaderModel.getProperty("/Stlan") || oView.byId("ID_BOM_STLAN").getValue() || "",
					Tetyp: BomHeaderModel.getProperty("/Tetyp") || oView.byId("ID_BOM_TETYP").getValue() || "",
					Exstl: BomHeaderModel.getProperty("/Exstl") || oView.byId("ID_BOM_EXSTL").getValue() || "",
					Datuv: BomHeaderModel.getProperty("/Datuv") || oView.byId("ID_BOM_ADATU").getDateValue() || null
				}];

				BOMData.forEach(function(oItem) {
					["Andat", "Datub", "Datuv", "Aedat"].forEach(function(field) {
						var value = oItem[field];
						if (typeof value === "string" && value.endsWith("Z")) {
							oItem[field] = new Date(value);
						}
					});
				});

				BOMData.forEach(function(item) {
					// if (item.Postp !== "") {
					oPayload.NavBomItem.push({
						Postp: item.Postp || "",
						Posnr: item.Posnr || "",
						Idnrk: item.Idnrk || "",
						Ktext: item.Ktext || "",
						Menge: that.fnToEdmDecimal(item.Menge, 13, 3) || null,
						Meins: item.Meins || "",
						Sanin: item.Sanin || null,
						Upskz: item.Upskz || null,
						Datuv: item.Datuv || null,
						Datub: item.Datub || null,
						Andat: item.Andat || null,
						Aedat: item.Aedat || null,
						Sortf: item.Sortf || "",
						Ident: item.Ident || "",
						Aennr: item.Aennr || "",
						Aenra: item.Aenra || "",
						Alpgr: item.Alpgr || "",
						SgtCatv: item.SgtCatv || "",
						Rfpnt: item.Rfpnt || "",
						Sanka: item.Sanka || "",
						Annam: item.Annam || "",
						Aenam: item.Aenam || "",
						Fmeng: item.Fmeng || null,
						Ltxpo: item.Ltxpo ? "X" : "",
						SgtCmkz: item.SgtCmkz ? "X" : "",
						Stlkz: item.Stlkz ? "X" : "",
						// Cadpo: item.Cadpo || null,
						// Alekz: item.Alekz || null,
						Sanko: item.Sanko || null,
						Verti: item.Verti || "",
						Avoau: that.fnToEdmDecimal(item.Avoau, 5, 2) || null,
						Ausch: that.fnToEdmDecimal(item.Ausch, 5, 2) || null,
						Netau: item.Netau || null,
						Rekrs: item.Rekrs || null,
						Rekri: item.Rekri || null,
						Kzkup: item.Kzkup || null,
						Nlfzt: item.Nlfzt || null,
						Nlfzv: item.Nlfzv || null,
						Obtsp: item.Obtsp || "",
						Nlfmv: item.Nlfmv || "",
						Dspst: item.Dspst || "",
						Itsob: item.Itsob || "",
						Dumps: item.Dumps || null,
						Potx1: item.Potx1 || "",
						Potx2: item.Potx2 || "",
						Erskz: item.Erskz || "",
						Rvrel: item.Rvrel || "",
						Sanfe: item.Sanfe || null,
						Beikz: item.Beikz || "",
						Lgort: item.Lgort || "",
						Prvbe: item.Prvbe || "",
						Schgt: item.Schgt || null,
						Schkz: item.Schkz || null
					});
					// }
				}.bind(this));

				var oModel = this.getOwnerComponent().getModel("JM_ProductionVrsn");
				var aExisting = oModel.getProperty("/NavPV_MaterialCompData") || [];
				var aNew = oPayload.NavBomItem || [];

				var aExistingValid = aExisting.filter(function(item) {
					return item.Posnr && item.Posnr.trim() !== "";
				});
				if (aExistingValid.length > 0 && aNew.length > 0) {

					var oNewMap = {};
					aNew.forEach(function(item) {
						var key = item.Idnrk + "|" + item.Posnr;
						oNewMap[key] = item;
					});

					var aUpdated = aExistingValid.filter(function(item) {
						var key = item.Idnrk + "|" + item.Posnr;
						return oNewMap.hasOwnProperty(key);
					});

					aNew.forEach(function(item) {

						var key = item.Idnrk + "|" + item.Posnr;

						var exists = aUpdated.some(function(existing) {
							return (existing.Idnrk + "|" + existing.Posnr) === key;
						});

						if (!exists) {
							aUpdated.push({
								Posnr: item.Posnr || "",
								Postp: item.Postp || "",
								Idnrk: item.Idnrk || "",
								Menge: item.Menge || "",
								Meins: item.Meins || "",
								Maktx: item.Ktext || "",
								Matnr: that.getView().byId("ID_BOM_MATNR").getValue(),
							});
						}
					});

					aUpdated = aUpdated.filter(function(item) {
						return item.Idnrk && item.Idnrk.trim() !== "";
					});

					oModel.setProperty("/NavPV_MaterialCompData", aUpdated);
				} else {
					var aUpdated = [];
					aNew.forEach(function(item) {
						aUpdated.push({
							Posnr: item.Posnr || "",
							Postp: item.Postp || "",
							Idnrk: item.Idnrk || "",
							Menge: item.Menge || "",
							Meins: item.Meins || "",
							Maktx: item.Ktext || "",
							Matnr: that.getView().byId("ID_BOM_MATNR").getValue()
						});
					});
					aUpdated = aUpdated.filter(function(item) {
						return item.Idnrk && item.Idnrk.trim() !== "";
					});
					oModel.setProperty("/NavPV_MaterialCompData", aUpdated);
				}

				return oPayload;
			}
		},

		fnPreparePayload: function() {
			var oView = this.getView();
			var that = this;
			var BomHeaderModel = this.getView().getModel("JM_BOMModel");
			var BomItemModel = this.getView().getModel("JM_BOMTable");
			if (BomHeaderModel || BomItemModel) {
				var aTableData = BomItemModel.getProperty("/BOMList") || [];
				// Prepare BOM item data
				var aFilteredTableData = aTableData.map(function(item) {
					return {
						Postp: item.Postp || "",
						Posnr: item.Posnr || "",
						Idnrk: item.Idnrk || "",
						Ktext: item.Ktext || "",
						Menge: item.Menge || null,
						Meins: item.Meins || "",
						Sanin: item.Sanin || null,
						Upskz: item.Upskz || null,
						Sortf: item.Sortf || "",
						Ident: item.Ident || "",
						Aennr: item.Aennr || "",
						Aenra: item.Aenra || "",
						Alpgr: item.Alpgr || "",
						SgtCatv: item.SgtCatv || "",
						Rfpnt: item.Rfpnt || "",
						Annam: item.Annam || "",
						Aenam: item.Aenam || "",
						Sanka: item.Sanka || "",
						Fmeng: item.Fmeng || null,
						Ltxpo: item.Ltxpo ? "X" : "",
						SgtCmkz: item.SgtCmkz ? "X" : "",
						Stlkz: item.Stlkz ? "X" : "",
						// Cadpo: item.Cadpo || null,
						// Alekz: item.Alekz || null,
						Sanko: item.Sanko || null,
						Verti: item.Verti || "",
						Avoau: item.Avoau || null,
						Ausch: item.Ausch || null,
						Netau: item.Netau || null,
						Rekrs: item.Rekrs || null,
						Rekri: item.Rekri || null,
						Kzkup: item.Kzkup || null,
						Nlfzt: item.Nlfzt || null,
						Nlfzv: item.Nlfzv || null,
						Nlfmv: item.Nlfmv || "",
						Dspst: item.Dspst || "",
						Itsob: item.Itsob || "",
						Dumps: item.Dumps || null,
						Potx1: item.Potx1 || "",
						Potx2: item.Potx2 || "",
						Erskz: item.Erskz || "",
						Obtsp: item.Obtsp || "",
						Rvrel: item.Rvrel || "",
						Sanfe: item.Sanfe || null,
						Beikz: item.Beikz || "",
						Lgort: item.Lgort || "",
						Prvbe: item.Prvbe || "",
						Schgt: item.Schgt || null,
						Schkz: item.Schkz || null
					};
				});

				var oBmeng = BomHeaderModel.getProperty("/Bmeng") || oView.byId("ID_BOM_BMENG").getValue() || null;
				var oLosvn = BomHeaderModel.getProperty("/Losvn") || oView.byId("ID_BOM_LOSVN").getValue() || null;
				var oLosbs = BomHeaderModel.getProperty("/Losbs") || oView.byId("ID_BOM_LOSBS").getValue() || null;

				var BOMHeaderData = BomHeaderModel.getData();
				[BOMHeaderData].forEach(function(oItem) {
					["Datuv"].forEach(function(field) {
						var value = oItem[field];
						if (typeof value === "string" && value.endsWith("Z")) {
							oItem[field] = new Date(value);
						}
					});
				});

				// Prepare BOM header data
				var aNavBomHeader = [{
					Bmeng: that.fnToEdmDecimal(oBmeng, 13, 3) || null,
					Ztext: BomHeaderModel.getProperty("/Ztext") || oView.byId("ID_BOM_ZTEXT").getValue() || "",
					Bmein: BomHeaderModel.getProperty("/Bmein") || oView.byId("ID_BOM_BMEIN").getValue() || "",
					Stktx: BomHeaderModel.getProperty("/Stktx") || oView.byId("ID_BOM_STKTX").getValue() || "",
					Losvn: that.fnToEdmDecimal(oLosvn, 13, 3) || null,
					Losbs: that.fnToEdmDecimal(oLosbs, 13, 3) || null,
					Losme: BomHeaderModel.getProperty("/Losme") || oView.byId("ID_BOM_LOSME").getValue() || "",
					Stlst: BomHeaderModel.getProperty("/Stlst") || oView.byId("ID_BOM_STLST").getValue() || "",
					Stlbe: BomHeaderModel.getProperty("/Stlbe") || oView.byId("ID_BOM_STLBE").getValue() || "",
					Labor: (function() {
						var sLabor = BomHeaderModel.getProperty("/Labor") || oView.byId("ID_BOM_LABOR").getValue() || "";
						sLabor = sLabor.trim();
						if (sLabor !== "" && sLabor !== "0") {
							sLabor = sLabor.padStart(3, "0");
						}
						return sLabor;
					})(),
					Groes: BomHeaderModel.getProperty("/Groes") || oView.byId("ID_BOM_GROES").getValue() || "",
					Stlal: BomHeaderModel.getProperty("/Stlal") || oView.byId("ID_BOM_STLAL").getValue() || "",
					Stlan: BomHeaderModel.getProperty("/Stlan") || oView.byId("ID_BOM_STLAN").getValue() || "",
					Tetyp: BomHeaderModel.getProperty("/Tetyp") || oView.byId("ID_BOM_TETYP").getValue() || "",
					Exstl: BomHeaderModel.getProperty("/Exstl") || oView.byId("ID_BOM_EXSTL").getValue() || "",
					Datuv: BomHeaderModel.getProperty("/Datuv") || oView.byId("ID_BOM_ADATU").getDateValue() || null
				}];

				// Build Final Payload
				var oPayload = {
					Matnr: oView.byId("ID_BOM_MATNR").getValue(),
					Werks: oView.byId("ID_BOM_WERKS").getValue(),
					AppId: "RC",
					Ind: "X",
					NavBomHeader: aNavBomHeader,
					NavBomItem: aFilteredTableData,
					NavReturn_Msg: []
				};
				return oPayload;
			}
		},

		fnNextItem: function() {
			if (this._iCurrentIndex < this._aSelectedPaths.length - 1) {
				this._iCurrentIndex++;
				this.fnupdateFragmentContext();
			} else {
				ErrorHandler.showCustomSnackbar(i18n.getText("LastLineItemInfo"), "Information", this);
			}
		},

		fnPreviousItem: function() {
			if (this._iCurrentIndex > 0) {
				this._iCurrentIndex--;
				this.fnupdateFragmentContext();
			} else {
				ErrorHandler.showCustomSnackbar(i18n.getText("FirstLineItemInfo"), "Information", this);
			}
		},

		fnupdateFragmentContext: function() {
			var oModel = this.getView().getModel("JM_BOMTable");
			var sPath = this._aSelectedPaths[this._iCurrentIndex];
			var oData = oModel.getProperty(sPath);

			this.clrAllfrag.setBindingContext(oModel.createBindingContext(sPath), "JM_BOMTable");

			Fragment.byId("ID_ITEMLEVEL", "id_itemNumber").setText("Item Number : " + oData.Posnr + " Component : " + oData.Idnrk +
				" - " + oData.Ktext);
		},

		fnDeselectAll: function() {
			var oTable = this.getView().byId("id_bomTable");
			if (oTable.getSelectedIndices().length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("NoRowSelected"), "Information", this);
			}
			oTable.clearSelection();
		},

		// fnPressExpand: function() {

		// 	var oView = this.getView();
		// 	var oButton = oView.byId("id_ExpandButton");
		// 	var oTable = oView.byId("id_bomTable");
		// 	var oVisibleModel = oView.getModel("JMVboxVisibilityModel");
		// 	var bExpandMode = oVisibleModel.getProperty("/visible");
		// 	oVisibleModel.setProperty("/visible", !bExpandMode);
		// 	if (bExpandMode) {
		// 		oTable.setVisibleRowCount(11);
		// 		oButton.setIcon("Image/collapse.svg");
		// 	} else {
		// 		// oTable.setVisibleRowCount(5);
		// 		if (this.Expandflag) {
		// 			oTable.setVisibleRowCount(10);
		// 		} else {
		// 			oTable.setVisibleRowCount(5);
		// 		}
		// 		oButton.setIcon("Image/expand.svg");
		// 	}
		// },

		fnExpand: function() {
			this.getView().getModel("JM_Visible").setProperty("/visible", false);
			this.getView().getModel("JM_Visible").setProperty("/rowCount", 10);
		},

		fnCollapse: function() {
			this.getView().getModel("JM_Visible").setProperty("/rowCount", 5);
			this.getView().getModel("JM_Visible").setProperty("/visible", true);
		},

		fnExpandCollapse: function(oEvent) {

			var oSrc = oEvent.getSource();
			var id = oSrc.getId().split("--")[1];
			var oVisibleModel = this.getView().getModel("JM_Visible");

			if (oVisibleModel) {
				var bCurrent = oVisibleModel.getProperty("/BasicVisible");
				var bNew = !bCurrent;

				oVisibleModel.setProperty("/BasicVisible", bNew);
				oVisibleModel.setProperty("/rowCount", bNew ? 5 : 9);

				var oButton = this.getView().byId(id);
				if (bNew) {
					oButton.removeStyleClass("cl_search_rotateImage");

				} else {
					oButton.addStyleClass("cl_search_rotateImage");
				}
			}
		},

		fnSubmitConfirmation: function() {
			var state = this.getView().getModel("JM_Popup").getProperty("/Indicator");
			if (state === "BOM_BACK") {
				if (this.AppId === "RX") {
					this.fnClearChangeLog();
				}
				this.fnclearLocalModel();
				this.fnResetInputStates();
				sap.ui.core.UIComponent.getRouterFor(this).navTo("pv_detail");
			} else if (state === "BOM_DELETE") {
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

		fnBomclose: function() {
			if (this.AppId === "RX") {
				this.fnClearChangeLog();
			}
			this.fnclearLocalModel();
			sap.ui.core.UIComponent.getRouterFor(this).navTo("pv_detail");
		},

		fnUpdateChangelog: function(oId, oCtx) {
			var that = this;
			var oShortId = oId.split("--").pop();
			var vId = oShortId.split("-")[0];

			var oControl = this.getView().byId(vId) || Fragment.byId("ID_ITEMLEVEL", vId);
			var newValue;

			if (oControl.getValue) {
				newValue = oControl.getValue();
			} else if (oControl.getSelected) {
				newValue = oControl.getSelected();
			} else {
				newValue = null; // fallback
			}

			var trimmed = vId.replace(/^ID_BOM_/, "");

			var parts = trimmed.toLowerCase().split("_");
			var ObjectId = parts.map(function(p) {
				return p.charAt(0).toUpperCase() + p.slice(1);
			}).join("");

			var oBOMModel = this.getView().getModel("JM_BOMModel");
			var oBOMTableModel = this.getView().getModel("JM_BOMTable");
			if (!oBOMModel && !oBOMTableModel) return;

			if (oCtx) {
				var oModel = oCtx.getModel();
				var oNewData = oModel.getProperty("/BOMList") || [];
				var sPath = oCtx.getPath();
				var index = parseInt(sPath.split('/')[2]);
				var oBOMItemData = this.oldItemValue || [];
				oBOMItemData = oBOMItemData.filter(function(item) {
					return item.Idnrk !== "";
				});

				newValue = oModel.getProperty(sPath + "/" + ObjectId);

				var bHasOldData = oBOMItemData.length > index;

				if (bHasOldData) {
					var oldValue = oBOMItemData[index] ? oBOMItemData[index][ObjectId] : "";
					var oPosnr = oBOMItemData[index] ? oBOMItemData[index].Posnr : "";
				} else {
					var oldValue = "";
					var oPosnr = oNewData[index] ? oNewData[index].Posnr : "";
				}

				var HeaderName = this.fnGetColumnTooltip(ObjectId);
				if (!HeaderName) {
					var oText = Fragment.byId("ID_ITEMLEVEL", vId + "_TXT");
					HeaderName = oText ? oText.getText() : ObjectId;
				}

				var FieldName = HeaderName + " - " + (oPosnr || "");

			} else {
				var oBOMHeaderData = this.oldHeaderValue || {};
				if (!oBOMHeaderData.hasOwnProperty(ObjectId)) {
					return;
				}
				var oldValue = oBOMHeaderData[ObjectId];
				var oText = this.getView().byId(vId + "_TXT");
				var FieldName = oText ? oText.getText() : ObjectId;
				var oPosnr = "";
			}

			var gChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			if (!gChangeLogModel) {
				gChangeLogModel = new sap.ui.model.json.JSONModel([]);
				this.getOwnerComponent().setModel(gChangeLogModel, "JM_ChangeLog");
			}

			var oChangeLogData = gChangeLogModel.getData();

			if (!Array.isArray(oChangeLogData)) {
				oChangeLogData = [];
			} else {
				if (!oCtx) {
					var aFiltered = oChangeLogData.filter(function(item) {
						return item.ProcessInd === "B" && item.ItemNo === "" && item.FieldId === vId;
					});
					if (aFiltered.length > 0) {
						oldValue = aFiltered[0].OldValue || "";
						oBOMHeaderData[ObjectId] = oldValue;
						this.oldHeaderValue = oBOMHeaderData;
					}
				} else {
					var aFiltered = oChangeLogData.filter(function(item) {
						return item.ProcessInd === "B" && item.ItemNo === oPosnr && item.FieldId === vId;
					});
					if (aFiltered.length > 0) {
						oldValue = aFiltered[0].OldValue || "";
						if (oBOMItemData[index]) {
							oBOMItemData[index][ObjectId] = oldValue;
							this.oldHeaderValue = oBOMItemData;
						}
					}
				}
			}

			if (!oCtx) {
				var idx = oChangeLogData.findIndex(function(item) {
					return item.FieldId === vId;
				});

			} else {
				var idx = oChangeLogData.findIndex(function(item) {
					return item.FieldId === vId && item.ItemNo === oPosnr;
				});

			}
			oldValue = (typeof oldValue === "boolean") ? (oldValue ? "X" : "") : oldValue;
			newValue = (typeof newValue === "boolean") ? (newValue ? "X" : "") : newValue;

			if (oldValue !== newValue) {

				if (idx !== -1) {
					oChangeLogData[idx].NewValue = newValue;
					oChangeLogData[idx].OldValue = oldValue;
				} else {
					oChangeLogData.push({
						// ScrInd: "B",
						FieldId: vId || "",
						ProcessDesc: "BOM",
						ItemNo: oPosnr || "",
						FieldName: FieldName || "",
						OldValue: oldValue || "",
						ProcessInd: "B",
						NewValue: newValue || "",
						ChangedBy: that.UserName,
						ChangedOn: new Date()
					});
				}

			} else {

				if (idx !== -1) {
					oChangeLogData.splice(idx, 1);
				}
			}
			gChangeLogModel.setData(oChangeLogData);
			gChangeLogModel.refresh(true);

		},

		fnChangelog: function() {
			if (!this.Changelog) {
				this.Changelog = sap.ui.xmlfragment(this.getView().getId(), "MANAGED_RECIPE.Fragment.ChangeLog", this);
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

		fnInitializeScreen: function() {
			var contextModel = this.getOwnerComponent().getModel("JM_ContextModel");

			if (!Object.keys(contextModel.getData() || {}).length) {
				this.getView().byId("id_title").setText("Recipe BOM Creation - Initiator");
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
					string = "Recipe BOM Creation ";
				} else if (AppId === "RX") {
					string = "Recipe BOM Change ";
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
					string = "Recipe BOM Creation ";
				} else if (AppId === "RX") {
					string = "Recipe BOM Change ";
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
					string = "Recipe BOM Creation ";
				} else if (AppId === "RX") {
					string = "Recipe BOM Change ";
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
				string = "Recipe BOM Change ";
				this.getView().byId("id_title").setText(string + " - Initiator");
			}
		},

		fnGetColumnTooltip: function(ObjectId) {
			var oTable = this.byId("id_bomTable");
			var aColumns = oTable.getColumns();

			for (var i = 0; i < aColumns.length; i++) {
				var oTemplate = aColumns[i].getTemplate();
				if (!oTemplate) continue;

				var oInner;
				if (oTemplate.isA("sap.m.VBox")) {
					var aItems = oTemplate.getItems();
					if (aItems && aItems.length > 0) {
						oInner = aItems[0];
					}
				}

				if (oInner) {
					var oBindInfoText = oInner.getBindingInfo("text");
					var oBindInfoValue = oInner.getBindingInfo("value");

					var sBoundPath = "";
					if (oBindInfoText && oBindInfoText.parts && oBindInfoText.parts.length > 0) {
						sBoundPath = oBindInfoText.parts[0].path;
					} else if (oBindInfoValue && oBindInfoValue.parts && oBindInfoValue.parts.length > 0) {
						sBoundPath = oBindInfoValue.parts[0].path;
					}

					if (sBoundPath === ObjectId) {
						var oLabel = aColumns[i].getLabel();
						return oLabel ? oLabel.getTooltip() : "";
					}
				}
			}

			return "";
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

		fnclearLocalModel: function() {
			var aModels = [
				"JM_Visible",
				"JM_ContextModel",
				"JM_LocalDescriptionModel",
				"JM_BOMModel",
				"JM_BOMTable",
				"JM_RecipeData",
				"JM_LocChangeLog"
			];
			var that = this;
			aModels.forEach(function(sModelName) {
				var oModel = that.getView().getModel(sModelName);
				if (oModel) {
					that.getView().setModel(null, sModelName);
					that.getView().setModel(undefined, sModelName);
				}
			});
			var oTable = this.byId("id_bomTable");

			var oComponent = this.getOwnerComponent();
			var oChangeLogModel = oComponent.getModel("JM_ChangeLog");
			var aChangeLogData = oChangeLogModel ? oChangeLogModel.getData() : [];

			var oContextModel = oComponent.getModel("JM_ContextModel");
			var oUwlData = oContextModel.getData() || {};

			if (Array.isArray(aChangeLogData) && aChangeLogData.length > 0 && oUwlData.Appid === "RX") {
				var aChangedItems = aChangeLogData.filter(function(item) {
					return item.ProcessInd === "B";
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
					} else {
						var oFragControl = Fragment.byId("ID_ITEMLEVEL", sFieldId);
						if (oFragControl) {
							oFragControl.removeStyleClass("cl_HighLightInput");
						}
					}
				});
			}

			if (oTable) {
				oTable.clearSelection();
			}
		},

		fnResetInputStates: function() {
			var oTable = this.byId("id_bomTable");
			if (!oTable) {
				return;
			}
			var aRows = oTable.getRows();
			aRows.forEach(function(oRow) {
				var aCells = oRow.getCells();
				aCells.forEach(function(oCell) {
					if (oCell instanceof sap.m.VBox) {
						oCell.getItems().forEach(function(oItem) {
							if (oItem instanceof sap.m.Input) {
								oItem.setValueState("None");
							}
						});
					}
					// Direct input (not wrapped)
					else if (oCell instanceof sap.m.Input) {
						oCell.setValueState("None");
					}
				});
			});

			var that = this;

			frontEndId.forEach(function(sId) {
				var oInput = that.getView().byId(sId) || sap.ui.core.Fragment.byId("ID_ITEMLEVEL", sId);

				if (oInput) {
					// Handle CheckBox type
					if (oInput instanceof sap.m.CheckBox) {
						// Reset to normal style
						oInput.removeStyleClass("cl_checkboxError");
						oInput.addStyleClass("cl_opr_checkbx");
						oInput.setTooltip("");
					} else if (oInput instanceof sap.m.Input) {
						oInput.setValueState("None");
						// oInput.setTooltip(""); 
					} else if (oInput.setValueState) {
						oInput.setValueState("None");
					}
				}
			});

		},

		fnCheckErrorState: function() {
			var retMsg = true;
			var oView = this.getView();

			for (var i = 0; i < frontEndId.length; i++) {
				var oCtrl = Fragment.byId("ID_ITEMLEVEL", frontEndId[i]) || oView.byId(frontEndId[i]);

				if (!oCtrl) continue;

				if (oCtrl.getValueState && oCtrl.getValueState() === "Error") {
					retMsg = false;
					break;
				}

				if (oCtrl instanceof sap.m.CheckBox) {
					if (oCtrl.getValueState && oCtrl.getValueState() === "Error") {
						retMsg = false;
						break;
					}
				}
			}

			return retMsg;
		}

	});

});