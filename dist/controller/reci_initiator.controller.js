sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"MANAGED_RECIPE/controller/ErrorHandler",
	"MANAGED_RECIPE/Formatter/formatter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Filter",
	"sap/ui/model/resource/ResourceModel"
], function(Controller, ErrorHandler, formatter, FilterOperator, Filter, ResourceModel) {
	"use strict";

	var frontEndId = ["ID_RECI_LOSVN", "ID_RECI_LOSBS", "ID_RECI_PLNME", "ID_RECI_BMSCH", "ID_RECI_MEINH",
		"ID_RECI_UMREZ", "ID_RECI_UMREN", "ID_RECI_STATU", "ID_RECI_VERWE", "ID_RECI_VAGRP"
	];

	var i18n;
	var busyDialog = new sap.m.BusyDialog();

	return Controller.extend("MANAGED_RECIPE.controller.reci_initiator", {
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
			this.ChangeDataArray = [];
			this.oRouter = this.getOwnerComponent().getRouter(this);
			this.oRouter.getRoute("reci_initiator").attachPatternMatched(this.fnRouter, this);
		},

		fnRouter: function() {

			// added by sabarish 20.11.2025
			// var oVisModel = new sap.ui.model.json.JSONModel({
			// 	labelVisible: true
			// });
			// this.getView().setModel(oVisModel, "RoadMapUI");
			// sap.ui.Device.resize.attachHandler(this._onResize, this);
			// this._onResize();
			//eoc
			this._loadContextModelLocal();

			var oModel = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			oModel.read("/UsernameSet", {
				success: function(oData) {
					var oJsonModel = new sap.ui.model.json.JSONModel();
					oJsonModel.setData(oData.results);
					this.getView().setModel(oJsonModel, "JM_UserModel");
					this.UserName = oData.results[0].Uname;
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
			var oWfParmeter = this.getOwnerComponent().getModel("JM_WfParm");
			var oFromUwl = this.getOwnerComponent().getModel("JM_ContextModel");

			if (Object.keys(oKeyDataModel.getData() || {}).length > 0 && Object.keys(oWfParmeter.getData() || {}).length > 0) { // initiator
				this.AppId = "RC";
				var oTableModel1 = new sap.ui.model.json.JSONModel({
					List: []
				});
				this.getView().setModel(oTableModel1, "JM_DocTypeModel"); // local model for the Attachemnt 

				var oMainModel = new sap.ui.model.json.JSONModel({
					uploadedFileName: ""
				});
				this.getView().setModel(oMainModel); // local modle of attachement name

				// Reviwer and Approver Process
				var UwlData = oFromUwl.getData();
				var oUwlModel = new sap.ui.model.json.JSONModel(UwlData);

				this.getView().setModel(oUwlModel, "JM_ContextModel");
				this.fnInitializeScreen();
				var footerBtnModel = new sap.ui.model.json.JSONModel({
					sendBack: false,
					Reject: false,
					Draft: true,
					submit: true,
					CheckDup: true
				});
				this.getView().setModel(footerBtnModel, "JM_FooterBtnModel"); // local Model to set visble and unvisble the footer button

				var vKeyData = oKeyDataModel.getData();
				var lkeyDataModel = new sap.ui.model.json.JSONModel(vKeyData);
				this.getView().setModel(lkeyDataModel, "JM_KeydataModel"); // local model for the Key data 

				var recipeModel = this.getView().getModel("JM_InitiatorModel");
				if (!recipeModel) {
					var RecipeModel = {
						Statu: "",
						Verwe: "",
						Vagrp: "",
						Nname: "",
						Losvn: "",
						Plnme: "",
						Losbs: 9999999999.000,
						Bmsch: "1.00",
						Meinh: "",
						Umrez: 1,
						Umren: 1,
						Chrule: " "
					};
					var oRecipeModel = new sap.ui.model.json.JSONModel(RecipeModel);
					this.getView().setModel(oRecipeModel, "JM_InitiatorModel"); // local model of recipe Data

					//Call entity for Tskl Unit
					var oInitiator = this.getOwnerComponent().getModel();
					var oPayload = {
						Matnr: this.getView().getModel("JM_KeydataModel").getProperty("/Matnr"),
						Ind: "G"
					};
					oPayload.NavRecipeBasic = [];
					oPayload.NavRecipeComments = [];
					oPayload.NavRecipeAttachment = [];

					busyDialog.open();
					oInitiator.create("/Recipe_HeaderSet", oPayload, {
						success: function(oData) {
							if (oData && oData.NavRecipeBasic && oData.NavRecipeBasic.results && oData.NavRecipeBasic.results.length > 0) {
								var vValue = oData.NavRecipeBasic.results[0].Plnme;
								this.getView().getModel("JM_InitiatorModel").setProperty("/Plnme", vValue);
								this.selectedField = "ID_RECI_PLNME";
								var oPlnmePayload = {
									FieldId: "ID_RECI_PLNME",
									Process: "X",
									F4Type: "P"
								};
								oPlnmePayload.NavSerchResult = [];
								this.fnNewReadF4Cache(oPlnmePayload, vValue.toUpperCase());
								var ChangeRulePayload = {
									FieldId: "ID_RECI_CHRULE",
									Process: "X",
									F4Type: "F"
								};
								ChangeRulePayload.NavSerchResult = [];
								this.fnNewReadF4Cache(ChangeRulePayload, "", "F");
							}
							busyDialog.close();
						}.bind(this),
						error: function(oResponse) {
							busyDialog.close();
							var sMessage = ErrorHandler.parseODataError(oResponse);
							ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
						}.bind(this)
					});
				}
				busyDialog.close();
				return;
			}

			if (Object.keys(oFromUwl.getData() || {}).length > 0) {
				var Ind = this.getOwnerComponent().getModel("JM_ContextModel").getProperty("/Ind");
				this.AppId = this.getOwnerComponent().getModel("JM_KeyData").getProperty("/AppId");
				if (!this.AppId) {
					this.AppId = this.getOwnerComponent().getModel("JM_ContextModel").getProperty("/Appid");
				}
				if (this.AppId === "RX" && Ind !== "X" && Ind !== "D" && Ind !== "T") {

					// this.fnRecipeChangeProcess();
					var contextModel = this.getOwnerComponent().getModel("JM_ContextModel");
					contextModel.setProperty("/Appid", "RX");
					oPayload = {
						AppId: "RX",
						Ind: "P",
						Plnnr: contextModel.getProperty("/Plnnr"),
						Plnal: contextModel.getProperty("/Plnal")
					};
					oPayload.NavRecipeBasic = [];
					oPayload.NavDescription = [];
					oPayload.NavRecipeComments = [];
					oPayload.NavRecipeAttachment = [];
					oPayload.NavReturn_Msg = [];
					oPayload.NavRecipe_Operation = [];
					oPayload.NavBomHeader = [];
					oPayload.NavBomItem = [];
					oPayload.NavPV_BasicFields = [];
					oPayload.NavPV_MaterialCompData = [];
					oPayload.NavUserInput = [];
					this.fnInitializeScreen();
					var ChangeRulePayload = {
						FieldId: "ID_RECI_CHRULE",
						Process: "X",
						F4Type: "F"
					};
					ChangeRulePayload.NavSerchResult = [];
					this.fnNewReadF4Cache(ChangeRulePayload, "", "F");
					this.fnGetandSetData(this.flag, oPayload);
					footerBtnModel = new sap.ui.model.json.JSONModel({
						sendBack: false,
						Reject: false,
						Draft: true,
						submit: true,
						CheckDup: false
					});
					this.getView().setModel(footerBtnModel, "JM_FooterBtnModel");
				} else {
					UwlData = oFromUwl.getData();
					oUwlModel = new sap.ui.model.json.JSONModel(UwlData);

					this.getView().setModel(oUwlModel, "JM_ContextModel");
					this.workId = this.getView().getModel("JM_ContextModel").getProperty("/WiId");
					this.Transid = this.getView().getModel("JM_ContextModel").getProperty("/Transid");
					this.Level = this.getView().getModel("JM_ContextModel").getProperty("/Level");
					this.Ind = this.getView().getModel("JM_ContextModel").getProperty("/Ind");

					this.fnInitializeScreen();

					footerBtnModel = new sap.ui.model.json.JSONModel({
						sendBack: true,
						Reject: true,
						Draft: false,
						submit: true,
						CheckDup: false
					});
					this.getView().setModel(footerBtnModel, "JM_FooterBtnModel");

					if (this.Ind === "T") {
						footerBtnModel = new sap.ui.model.json.JSONModel({
							sendBack: false,
							Reject: false,
							Draft: false,
							CheckDup: false,
							submit: false
						});
						this.getView().setModel(footerBtnModel, "JM_FooterBtnModel");
					}
					if (this.Ind === "D") {
						footerBtnModel = new sap.ui.model.json.JSONModel({
							sendBack: false,
							Reject: false,
							Draft: false,
							submit: true,
							CheckDup: false
						});
						this.getView().setModel(footerBtnModel, "JM_FooterBtnModel");
					}

					var sendback = this.getView().getModel("JM_ContextModel").getProperty("/Sendback");
					if (sendback === "X") {
						this.getView().getModel("JM_FooterBtnModel").setProperty("/sendBack", false);
						this.getView().getModel("JM_FooterBtnModel").refresh(true);
					}

					oPayload = {
						Transid: this.getView().getModel("JM_ContextModel").getProperty("/Transid"),
						Ind: "G",
						AppId: this.AppId,
						WiId: this.getView().getModel("JM_ContextModel").getProperty("/WiId")
					};

					oPayload.NavRecipeBasic = [];
					oPayload.NavDescription = [];
					oPayload.NavRecipeComments = [];
					oPayload.NavRecipeAttachment = [];
					oPayload.NavReturn_Msg = [];
					oPayload.NavRecipe_Operation = [];
					oPayload.NavBomHeader = [];
					oPayload.NavBomItem = [];
					oPayload.NavPV_BasicFields = [];
					oPayload.NavPV_MaterialCompData = [];
					oPayload.NavUserInput = [];
					oPayload.NavRecipe_ChangeLog = [];

					this.fnGetandSetData(this.flag, oPayload);
				}
				busyDialog.close();
				return;
			} else {
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_search");
				busyDialog.close();
			}
		},

		fnsetIndicationforChangedData: function(ChangedData) {
			ChangedData = ChangedData.filter(function(item) {
				return item.ProcessInd === "R";
			});
			// Loop through filtered data and highlight the matching controls
			ChangedData.forEach(function(item) {
				var sFieldId = item.FieldId; // get FieldId from each object
				if (sFieldId) { // skip empty objects
					// Find the control using the FieldId
					var oControl = this.byId(sFieldId);

					// Add highlight class if control exists
					if (oControl) {
						oControl.addStyleClass("cl_HighLightInput");
					}
				}
			}.bind(this)); // keep controller context
		},

		fnClearIndicationforChangedData: function(ChangedData) {
			ChangedData = ChangedData.filter(function(item) {
				return item.ProcessInd === "R";
			});
			// Loop through filtered data and highlight the matching controls
			ChangedData.forEach(function(item) {
				var sFieldId = item.FieldId; // get FieldId from each object
				if (sFieldId) { // skip empty objects
					// Find the control using the FieldId
					var oControl = this.byId(sFieldId);

					// Add highlight class if control exists
					if (oControl) {
						oControl.removeStyleClass("cl_HighLightInput");
					}
				}
			}.bind(this)); // keep controller context
		},

		fnGetandSetData: function(flag, oPayload) {
			var oKeyDataModel;
			var oRecipeModel;
			var lkeyDataModel;
			var oServiceCall = this.getOwnerComponent().getModel();
			if (!this.flag || this.flag === undefined) {
				var oTableModel1 = new sap.ui.model.json.JSONModel({
					List: []
				});
				this.getView().setModel(oTableModel1, "JM_DocTypeModel"); // local model for the Attachemnt 

				var oMainModel = new sap.ui.model.json.JSONModel({
					uploadedFileName: ""
				});
				this.getView().setModel(oMainModel); // local modle of attachement name

				busyDialog.open();
				oServiceCall.create("/Recipe_HeaderSet", oPayload, {
					success: function(oData) {
						this.flag = true;

						var oOdata = this.getOwnerComponent().getModel("JM_InitialDatas");
						oOdata.setData(oData); // replaces the data
						oOdata.refresh(true); // updates the bindings

						// Description Model
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
						this.getView().setModel(oDescModel, "JM_DescriptionModel");
						sap.ui.getCore().setModel(oDescModel, "JM_DescriptionModel");

						this.fnBindDescriptionForRecipe();

						// Key Model for Global and Local
						var KeyDataModel = {
							AppId: this.AppId,
							Matnr: oData.Matnr,
							Maktx: oData.Maktx,
							Werks: oData.Werks,
							WerksDes: oData.Name1,
							Profile: oData.Profidnetz,
							ReciDes: oData.Ktext,
							Plnnr: oData.Plnnr,
							Plnal: oData.Plnal
						};

						oKeyDataModel = this.getOwnerComponent().getModel("JM_KeyData");
						oKeyDataModel.setData(KeyDataModel); // replaces the data
						oKeyDataModel.refresh(true); // updates the bindings

						// Recipe Data
						oRecipeModel = this.getOwnerComponent().getModel("JM_Recipe");
						oRecipeModel.setData(oData.NavRecipeBasic.results[0]); // replaces the data
						oRecipeModel.refresh(true); // updates the bindings

						var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
						oChangeLogModel.setData(oData.NavRecipe_ChangeLog.results); // replaces the data
						oRecipeModel.refresh(true); // updates the bindingsS

						lkeyDataModel = new sap.ui.model.json.JSONModel(KeyDataModel);
						this.getView().setModel(lkeyDataModel, "JM_KeydataModel"); // local model for the Key data 
						var oDataCopy = JSON.parse(JSON.stringify(oData.NavRecipeBasic.results[0]));
						var lkeyDataModel1 = new sap.ui.model.json.JSONModel(oData.NavRecipeBasic.results[0]);
						var lkeyDataModel2 = new sap.ui.model.json.JSONModel(oDataCopy);

						this.getView().setModel(lkeyDataModel1, "JM_InitiatorModel"); // local model for Recipe data
						this.getView().setModel(lkeyDataModel2, "JM_RecipeInitialData"); // local model for Recipe Data for cahnge process

						// Opeartion Screen 
						var oModel1 = {
							NavRecipe_Operation: oData.NavRecipe_Operation.results
						};

						var oOperationModel = this.getOwnerComponent().getModel("JM_Operation");
						oOperationModel.setData(oModel1); // replaces the data
						oOperationModel.refresh(true); // updates the bindings

						// Production Version data
						var model = {
							NavPV_BasicFields: oData.NavPV_BasicFields.results,
							NavPV_MaterialCompData: oData.NavPV_MaterialCompData.results
						};
						var oProductionVersion = this.getOwnerComponent().getModel("JM_ProductionVrsn");
						oProductionVersion.setData(model); // replaces the data
						oProductionVersion.refresh(true); // updates the bindings

						// BOM Model 
						model = {
							NavBomHeader: oData.NavBomHeader.results,
							NavBomItem: oData.NavBomItem.results
						};
						var oBomModel = this.getOwnerComponent().getModel("JM_Bom");
						oBomModel.setData(model); // replaces the data
						oBomModel.refresh(true); // updates the bindings

						//Comments 
						var oCommentBox = this.getView().byId("id_commentbox");
						this.fnBindComments(oData.NavRecipeComments.results, oCommentBox);

						//Attachments 
						this.fnBindAttachements(oData);

						//update change log for Reviwer and approver for the change process
						oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
						if (Object.keys(oChangeLogModel.getData() || {}).length > 0) {
							// Get data and create a deep copy
							var existingData = oChangeLogModel ? JSON.parse(JSON.stringify(oChangeLogModel.getData())) : [];
							// Check if model has some data and AppId === "RX"
							if (existingData && existingData.length > 0 && this.AppId === "RX") {
								this.fnsetIndicationforChangedData(existingData);
							}
						}
						var ChangeRulePayload = {
							FieldId: "ID_RECI_CHRULE",
							Process: "X",
							F4Type: "F"
						};
						ChangeRulePayload.NavSerchResult = [];
						this.fnNewReadF4Cache(ChangeRulePayload, "", "F");
						busyDialog.close();
					}.bind(this),
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
					}.bind(this)
				}); // Reviwer and Approver process
			}
		},

		fnBindComments: function(backendData, container) {
			for (var c = 0; c < backendData.length; c++) {
				// Create the dot indicator and line logic VBox
				var Pos1 = (backendData[c].Pos === "") ? true : false;
				var Pos2 = (backendData[c].Pos === "Last") ? true : false;
				var oDotVBox = new sap.m.VBox({
					alignContent: "Start",
					alignItems: "Center",
					justifyContent: "Start",
					items: [
						new sap.m.Image({
							src: "image/CommentDot.svg",
							width: "0.4rem"
						}),
						new sap.m.HBox({
							visible: Pos1
						}),
						new sap.m.HBox({
							visible: Pos2
						})
					]
				}).addStyleClass("sapUiTinyMarginBegin");
				// Create the right side (profile + comment)
				var oRightVBox = new sap.m.VBox({
					items: [
						new sap.m.HBox({
							items: [
								new sap.m.Image({
									src: "Image/profile.svg",
									width: "1.5rem"
								}).addStyleClass("sapUiTinyMarginBeginEnd"),
								new sap.m.Text({
									text: backendData[c].CreatedBy
								}).addStyleClass("cl_comm_nam"),
								new sap.m.Text({
									text: "Added A Comment"
								}).addStyleClass("sapUiTinyMarginBeginEnd cl_comm_subtx"),
								new sap.m.Image({
									src: "image/dot_c2.svg",
									width: "0.4rem"
								}),
								new sap.m.Text({
									text: backendData[c].CrtdDate + " - " + backendData[c].CrtdTime
								}).addStyleClass("sapUiTinyMarginBeginEnd cl_comm_date")
							]
						}),
						new sap.m.Panel({
							// width: "10%",
							content: [
								new sap.m.Text({
									text: backendData[c].Comments,
									wrapping: true,
									width: "100%"
								}).addStyleClass("cl_cmt_txt")
							]
						}).addStyleClass("cl_cmmt_bx sapUiTinyMarginBegin sapUiSmallMarginBottom")
					]
				});

				// Combine left and right side into HBox
				var oCommentCard = new sap.m.HBox({
					width: "45%",
					items: [oDotVBox, oRightVBox]
				}).addStyleClass("cl_commt_hbx sapUiSmallMarginTop");

				// Add to container
				container.addItem(oCommentCard);
			}
		},

		fnBindAttachements: function(oData) {
			var vAttachmentDataArray = [];
			for (var b = 0; b < oData.NavRecipeAttachment.results.length; b++) {
				var serial = Number(oData.NavRecipeAttachment.results[b].SerialNo);
				var vObj = {
					"AttachmentNo": serial,
					"TagName": oData.NavRecipeAttachment.results[b].FileName,
					"DocType": oData.NavRecipeAttachment.results[b].FileName.split('.')[1],
					"Xstring": oData.NavRecipeAttachment.results[b].Xstring,
					"MimeType": oData.NavRecipeAttachment.results[b].MimeType,
					"Size": oData.NavRecipeAttachment.results[b].FileSize
				};
				vAttachmentDataArray.push(vObj);
			}

			// var oJsonList2 = new sap.ui.model.json.JSONModel();
			var oJsonList2 = new sap.ui.model.json.JSONModel({
				List: vAttachmentDataArray
			});

			this.attachments = oData.NavRecipeAttachment.results;

			// oJsonList2.setData(vAttachmentDataArray);
			this.getView().setModel(oJsonList2, "JM_DocTypeModel");
		},

		// *-------------------------------------------------------------------------------------
		//		Function for Live Change (added by sabarish babu 07-10-2025)
		// *-------------------------------------------------------------------------------------

		fnLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oInput.getId().split("--")[1];
			var vValue = oInput.getValue().toUpperCase();

			// Convert input to uppercase (for text fields)
			oInput.setValue(vValue);

			this.selectedField = id;
			oInput.setValueState("None"); // reset previous error

			var oPayload = {
				FieldId: id,
				Process: "X",
				F4Type: "P"
			};
			oPayload.NavSerchResult = [];
			if (id === "ID_RECI_VAGRP" || id === "ID_RECI_NNAME") {
				oPayload.FieldNam1 = "WERKS";
				var KeyDataModel = this.getView().getModel("JM_KeydataModel");
				if (KeyDataModel) {
					oPayload.Value1 = KeyDataModel.getProperty("/Werks");
				}
			}
			if (id === "KID_RECI_MATNR") {
				this.fnNewReadF4Cache(oPayload, vValue.toUpperCase().replace(/^0+/, ""));
			} else {
				this.fnNewReadF4Cache(oPayload, vValue.toUpperCase());
			}
			if (this.AppId === "RX") {
				this.fnUpdateChangelog(id);
			}
		},

		fnNewReadF4Cache: function(oPayload, vValue) {
			var that = this;
			var vId = oPayload.FieldId;
			var f4type = oPayload.F4Type;
			var match;
			var descriptionField;

			var updateDesc = function(results) {
				if (f4type === "P") {
					match = results.find(function(item) {
						return item.Value1 === vValue.toUpperCase();
					});

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
				} else if (f4type === "F") {
					var changeRuledata = [];
					results.forEach(function(item) {
						var data = {
							key: item.DomvalueL,
							value: item.Ddtext
						};
						changeRuledata.push(data);
					});
					var changeRuleModel = new sap.ui.model.json.JSONModel(changeRuledata);
					that.getView().setModel(changeRuleModel, "JM_ChangeRule");
					return;
				}
				var length = that.fnCheckDatavalidation(that.selectedField, vValue);
				if (length === 0 && vValue !== "") {
					that.getView().byId(that.selectedField).setValueState("Error");
					that.getView().byId(that.selectedField).setValueStateText(i18n.getText("valueNotAvail", [vValue]));
				} else {
					that.getView().byId(that.selectedField).setValueState("None");
				}
			};
			if (this.f4Cache[vId]) {
				updateDesc(this.f4Cache[vId]);
			} else {
				this.f4NewdescriptionGet(oPayload, function(results) {
					that.f4Cache[vId] = results;
					updateDesc(results);
				});
			}
		},

		f4NewdescriptionGet: function(oPayload, fnCallback) {
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var vId = oPayload.FieldId;
			oModel.setUseBatch(false);
			oModel.create("/SearchHelpSet", oPayload, {
				success: function(oData) {
					this.f4Cache[vId] = oData.NavSerchResult.results;
					if (fnCallback) {
						fnCallback(oData.NavSerchResult.results);
					}
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
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

		fnUpdateChangelog: function(vId) {
			var newValue = this.getView().byId(vId).getValue();

			// Step 1: Remove prefix "ID_RECI_"
			var trimmed = vId.replace(/^ID_RECI_/, "");

			// Step 2: Convert to PascalCase (e.g. PROFILE_DES → ProfileDes)
			var parts = trimmed.toLowerCase().split("_");
			var ObjectId = parts.map(function(p) {
				return p.charAt(0).toUpperCase() + p.slice(1);
			}).join("");

			// Step 3: Get RecipeInitialData model
			var oRecipeInitialDataModel = this.getView().getModel("JM_RecipeInitialData");
			if (!oRecipeInitialDataModel) {
				return;
			}

			var oRecipeData = oRecipeInitialDataModel.getData();

			// Step 4: Check if field exists
			if (!oRecipeData.hasOwnProperty(ObjectId)) {
				return;
			}

			var oldValue = oRecipeData[ObjectId];

			// Step 5: Get or create ChangeLog model
			var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			if (!oChangeLogModel) {
				oChangeLogModel = new sap.ui.model.json.JSONModel([]);
				this.getOwnerComponent().setModel(oChangeLogModel, "JM_ChangeLog");
			}

			// Ensure we have an array
			var oChangeLogData = oChangeLogModel.getData();
			if (!Array.isArray(oChangeLogData)) {
				oChangeLogData = [];
			}

			// Step 6: Find if entry already exists
			var idx = oChangeLogData.findIndex(function(item) {
				return item.FieldId === vId;
			});

			// Step 7: Add, update, or remove entry
			if (oldValue !== newValue) {
				if (idx === -1) {
					oChangeLogData.push({
						FieldId: vId,
						ProcessInd: "R",
						ProcessDesc: "Recipe",
						ItemNo: "",
						FieldName: this.getView().byId(vId + "_TXT").getText(),
						OldValue: oldValue,
						NewValue: newValue,
						ChangedBy: this.UserName,
						ChangedOn: new Date()
					});
				} else {
					oChangeLogData[idx].NewValue = newValue;
				}
			} else {
				// Remove entry if reverted to old value
				if (idx !== -1) {
					oChangeLogData.splice(idx, 1);
				}
			}

			// Step 8: Update model
			oChangeLogModel.setData(oChangeLogData);
			oChangeLogModel.refresh(true);
		},

		fnUpdateChangelogforSelectBox: function(vId, key, Model) {
			var oModel = this.getView().getModel(Model);
			if (oModel) {
				if (key === "") {
					key = 0;
				}
				var newValue = oModel.getProperty("/" + key + "/value");
			}
			var oRecipeInitialDataModel = this.getView().getModel("JM_RecipeInitialData");
			if (oRecipeInitialDataModel) {
				var oIntialkeyValue = oRecipeInitialDataModel.getProperty("/Chrule");
				if (oIntialkeyValue === "") {
					oIntialkeyValue = 0;
				}
				var oldValue = oModel.getProperty("/" + oIntialkeyValue + "/value");
				// Step 5: Get or create ChangeLog model
				var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
				if (!oChangeLogModel) {
					oChangeLogModel = new sap.ui.model.json.JSONModel([]);
					this.getOwnerComponent().setModel(oChangeLogModel, "JM_ChangeLog");
				}

				// Ensure we have an array
				var oChangeLogData = oChangeLogModel.getData();
				if (!Array.isArray(oChangeLogData)) {
					oChangeLogData = [];
				}

				// Step 6: Find if entry already exists
				var idx = oChangeLogData.findIndex(function(item) {
					return item.FieldId === vId;
				});

				// Step 7: Add, update, or remove entry
				if (oldValue !== newValue) {
					if (idx === -1) {
						oChangeLogData.push({
							FieldId: vId,
							ProcessInd: "R",
							ProcessDesc: "Recipe",
							ItemNo: "",
							FieldName: this.getView().byId(vId + "_TXT").getText(),
							OldValue: oldValue,
							NewValue: newValue
						});
					} else {
						oChangeLogData[idx].NewValue = newValue;
					}
				} else {
					// Remove entry if reverted to old value
					if (idx !== -1) {
						oChangeLogData.splice(idx, 1);
					}
				}

				// Step 8: Update model
				oChangeLogModel.setData(oChangeLogData);
				oChangeLogModel.refresh(true);

			}

		},

		fnQuanDataElementValidation: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oInput.getId().split("--")[1];
			var vValue = oInput.getValue().toUpperCase();
			this.selectedField = id;
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
				this.fnUpdateChangelog(id);
			}
		},

		fnNumberFieldValidation: function(oEvent) {
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
				this.fnUpdateChangelog(id);
			}
		},

		//*-----------------------------------------------------------------------------------------
		//					 New F4 logic implement from config package (Added by sabarish 10.11.2025)
		// *----------------------------------------------------------------------------------------

		fnNewF4press: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedField = id;
			var oPayload = {
				FieldId: id,
				Process: "X",
				F4Type: "P"
			};
			oPayload.NavSerchResult = [];
			if (id === "ID_RECI_VAGRP" || id === "ID_RECI_NNAME") {
				oPayload.FieldNam1 = "WERKS";
				var KeyDataModel = this.getView().getModel("JM_KeydataModel");
				if (KeyDataModel) {
					oPayload.Value1 = KeyDataModel.getProperty("/Werks");
				}
			}
			this.fnBindF4ValuetoModel(oPayload);
		},

		fnBindF4ValuetoModel: function(oPayload, oEvent) {
			var oJsonModel;
			var vLength;
			var vTitle;
			var oLabels = {};
			var aFormattedRows = [];
			var omodel1 = this.getOwnerComponent().getModel("JMConfig");
			// busyDialog.open();
			var that = this;
			omodel1.create("/SearchHelpSet", oPayload, {
				success: function(oData) {
					if (oData.MsgType === "I") {
						ErrorHandler.showCustomSnackbar(oData.Message, "Error", that);
						return;
					}
					var aResults = oData.NavSerchResult.results;
					if (aResults.length > 0) {
						var oFirst = aResults[0];
						//check the first value is in the domain value or not 
						if (oFirst && (oFirst.DomvalueL || oFirst.Ddtext)) {
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
							this.getView().setModel(oJsonModel, "JM_F4Model");
							vTitle = sap.ui.getCore().byId(this.sitem + "_TXT").getText() + " (" + vLength + ")";
							this.fnF4fragopen(oEvent, vTitle).open();
						} else {
							vLength = aResults.length;
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
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});

		},

		// *-------------------------------------------------------------------------------------
		//		Function for F4 Event (added by sabarish babu 07-10-2025)
		// *-------------------------------------------------------------------------------------

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
			if (!oBinding) {
				return;
			}
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

		// *-------------------------------------------------------------------------------------
		//		Function for expand and collapse pannel (added by sabarish babu 07-10-2025)
		// *-------------------------------------------------------------------------------------

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

		fnCollpaseExpandAll: function(oEvent) {
			var vId = oEvent.getSource().getId().split("--")[1];
			var Button = this.getView().byId(vId);
			var vAllId = ["ID_RECI_ASSIGN", "ID_RECI_CQR", "ID_RECI_DEFAULT", "ID_RECI_CP"];
			var state = Button.getText();
			if (state === "Expand All") {
				vAllId.forEach(function(id) {
					var PannelHead = this.getView().byId(id + "_HEADER");
					// Expand
					this.getView().byId(id + "_GRID").setVisible(true);
					PannelHead.removeStyleClass("cl_pannelHeadSS");
					this.getView().byId(id).removeStyleClass("cl_search_rotateImage");
					PannelHead.addStyleClass("cl_pannelHead");
					Button.setText(i18n.getText("CollapseAll"));
				}.bind(this));
			} else {
				vAllId.forEach(function(id) {
					var PannelHead = this.getView().byId(id + "_HEADER");
					// Collapse
					this.getView().byId(id + "_GRID").setVisible(false);
					this.getView().byId(id).addStyleClass("cl_search_rotateImage");
					PannelHead.removeStyleClass("cl_pannelHead");
					PannelHead.addStyleClass("cl_pannelHeadSS");
					Button.setText(i18n.getText("ExpandAll"));
				}.bind(this));
			}
		},

		// *-------------------------------------------------------------------------------------
		//		Function for Attachments logic (added by sabarish babu 07-10-2025)
		// *-------------------------------------------------------------------------------------

		fnUploadButtonpres: function() {
			var oFileUploader = this.byId("hiddenUploader");
			if (oFileUploader) {
				var oDomRef = oFileUploader.getFocusDomRef();
				if (oDomRef) {
					oDomRef.click(); // Opens file dialog
				}
			}
		},

		fnFileSelected: function(oEvent) {
			var that = this;
			var oFileUploader = this.byId("hiddenUploader");
			var oFile = oEvent.getParameter("files")[0];
			if (oFile) {
				if (oFile.size > 2 * 1024 * 1024) {
					this.showCustomSnackbar("Each file must be less that 2 MB", "Information");
					oFileUploader.setValue(""); // Reset to allow re-selection
					return;
				}
				var reader = new FileReader();
				reader.onload = function(e) {
					var sBase64 = e.target.result.split(",")[1];
					var oTableModel = that.getView().getModel("JM_DocTypeModel");
					var aRows = oTableModel.getProperty("/List") || [];
					var bDuplicate = aRows.some(function(row) {
						return row.Xstring === sBase64;
					});
					if (oFileUploader) {
						oFileUploader.setValue("");
					}
					if (bDuplicate) {
						ErrorHandler.showCustomSnackbar(i18n.getText("fileAlreadyUploaded"), "Error", that);
						return;
					}
					// Store temporarily
					var oModel = that.getView().getModel();
					oModel.setProperty("/uploadedFileName", oFile.name);
					oModel.setProperty("/uploadedFileContent", sBase64);
					oModel.setProperty("/uploadedMimeType", oFile.type);
					oModel.setProperty("/uploadedFileSize", oFile.size);
				};
				reader.readAsDataURL(oFile);
			}
		},
		fnMassDownload: function() {
			var oTableModel = this.getView().getModel("JM_DocTypeModel");
			var aFiles = oTableModel.getProperty("/List") || [];

			if (aFiles.length === 0) {
				sap.m.MessageToast.show("No files to download.");
				return;
			}

			// Disable the button temporarily to prevent double click (optional)
			var oButton = this.getView().byId("id_massDownloadButton");
			if (oButton) {
				oButton.setEnabled(false);
			}

			var zip = new JSZip();

			aFiles.forEach(function(file) {
				if (file.Xstring && file.TagName) {
					var byteCharacters = atob(file.Xstring);
					var byteNumbers = new Array(byteCharacters.length);
					for (var i = 0; i < byteCharacters.length; i++) {
						byteNumbers[i] = byteCharacters.charCodeAt(i);
					}
					var byteArray = new Uint8Array(byteNumbers);

					zip.file(file.TagName, byteArray);
				}
			});

			// Create the ZIP file
			zip.generateAsync({
				type: "blob"
			}).then(function(content) {
				var zipName = "Attachments.zip";

				// Create temporary <a> element and trigger download
				var link = document.createElement("a");
				link.style.display = "none";
				link.href = URL.createObjectURL(content);
				link.download = zipName;

				document.body.appendChild(link);
				link.click();

				// Clean up
				setTimeout(function() {
					URL.revokeObjectURL(link.href);
					document.body.removeChild(link);

					if (oButton) {
						oButton.setEnabled(true); // Re-enable after download
					}
				}, 100);
			}).catch(function(err) {
				// console.error("ZIP creation failed: ", err);
				sap.m.MessageBox.error("Failed to generate ZIP file.");
				if (oButton) {
					oButton.setEnabled(true);
				}
			});
		},
		fnDownloadSingleFile: function(oEvent) {
			var oContext = oEvent.getSource().getBindingContext("JM_DocTypeModel");
			var oFile = oContext.getObject(); // contains Xstring and TagName

			if (!oFile || !oFile.Xstring || !oFile.TagName) {
				sap.m.MessageToast.show("File data is missing.");
				return;
			}

			try {
				var byteCharacters = atob(oFile.Xstring);
				var byteNumbers = new Array(byteCharacters.length);
				for (var i = 0; i < byteCharacters.length; i++) {
					byteNumbers[i] = byteCharacters.charCodeAt(i);
				}
				var byteArray = new Uint8Array(byteNumbers);
				var blob = new Blob([byteArray]);

				// Create temporary <a> element to trigger download
				var link = document.createElement("a");
				link.href = URL.createObjectURL(blob);
				link.download = oFile.TagName;
				document.body.appendChild(link);
				link.click();

				// Cleanup
				setTimeout(function() {
					URL.revokeObjectURL(link.href);
					document.body.removeChild(link);
				}, 100);
			} catch (e) {
				sap.m.MessageBox.error("Failed to download file.");
			}
		},

		fnAttachPress: function() {
			var oView = this.getView();
			var oMainModel = oView.getModel();
			var oTableModel = oView.getModel("JM_DocTypeModel");
			var aRows = oTableModel.getProperty("/List") || [];
			var sFileName = oMainModel.getProperty("/uploadedFileName");
			var sBase64 = oMainModel.getProperty("/uploadedFileContent");
			var sMimeType = oMainModel.getProperty("/uploadedMimeType");
			var iNewFileSize = oMainModel.getProperty("/uploadedFileSize") || 0;
			var sTagNameInput = oView.byId("id_tagInput").getValue().trim();
			var sDocTypeKey = oView.byId("id_varients").getSelectedKey();
			if (!sFileName || !sBase64) {
				sap.m.MessageToast.show("Please select a file.");
				return;
			}
			var bFileExists = aRows.some(function(row) {
				return row.TagName === sFileName || row.Xstring === sBase64;
			});
			if (bFileExists) {
				ErrorHandler.showCustomSnackbar(i18n.getText("fileAlreadyUploaded"), "Error", this);
				return;
			}
			var iTotalSize = iNewFileSize; // start with new file
			aRows.forEach(function(row) {
				if (row.Size) {
					iTotalSize += row.Size;
				}
			});
			if (iTotalSize > 10 * 1024 * 1024) {
				ErrorHandler.showCustomSnackbar(i18n.getText("totalFileSizeLimit"), "Error", this);
				return;
			}
			var fileSizeBytes = iNewFileSize;
			// Convert to readable size string
			var fileSizeDisplay = "";
			if (fileSizeBytes < 1024) {
				fileSizeDisplay = fileSizeBytes + " Bytes";
			} else if (fileSizeBytes < 1024 * 1024) {
				fileSizeDisplay = (fileSizeBytes / 1024).toFixed(2) + " KB";
			} else {
				fileSizeDisplay = (fileSizeBytes / (1024 * 1024)).toFixed(2) + " MB";
			}
			var aParts = sFileName.split(".");
			var sExtension = aParts.length > 1 ? aParts.pop() : "";
			var sNameWithoutExt = aParts.join(".");
			var sTagNameFinal = sTagNameInput || sNameWithoutExt || "untitled";
			var sFinalFilename = sTagNameFinal + (sExtension ? "." + sExtension : "");
			var bTagExists = aRows.some(function(row) {
				return row.TagName === sFinalFilename;
			});
			if (bTagExists) {
				ErrorHandler.showCustomSnackbar(i18n.getText("tagNameAlreadyUsed", [sTagNameFinal]), "Error", this);
				return;
			}
			var sDocTypeFinal = sDocTypeKey || "Default";
			aRows.push({
				AttachmentNo: aRows.length + 1,
				TagName: sFinalFilename,
				DocType: sDocTypeFinal,
				MimeType: sMimeType,
				Xstring: sBase64,
				Size: fileSizeDisplay
			});
			oTableModel.setProperty("/List", aRows);
			this.fnUpdateStateMassDownload();
			// Clear
			oMainModel.setProperty("/uploadedFileName", "");
			oMainModel.setProperty("/uploadedFileContent", "");
			oMainModel.setProperty("/uploadedMimeType", "");
			oMainModel.setProperty("/uploadedFileSize", 0);
			oView.byId("id_tagInput").setValue("");
			oView.byId("id_varients").setSelectedKey("");
		},

		fnUpdateStateMassDownload: function() {
			var oTableModel = this.getView().getModel("JM_DocTypeModel");
			var aFiles = oTableModel.getProperty("/List") || [];

			var oButton = this.getView().byId("id_massDownloadButton");
			if (oButton) {
				oButton.setEnabled(aFiles.length > 1);
			}
		},

		fnDeleteAttachRow: function(oEvent) {
			var oModel = this.getView().getModel("JM_DocTypeModel");
			var aData = oModel.getProperty("/List");
			var oContext = oEvent.getSource().getBindingContext("JM_DocTypeModel");
			var iIndex = oContext.getPath().split("/").pop();

			// Remove the selected item
			aData.splice(iIndex, 1);

			// Reassign AttachmentNo in order
			aData.forEach(function(item, idx) {
				item.AttachmentNo = idx + 1;
			});

			// Update the model
			oModel.setProperty("/List", aData);

			// Refresh UI state if needed
			this.fnUpdateStateMassDownload();
		},

		// *-------------------------------------------------------------------------------------
		//		Function for check when save press, operation, material (added by sabarish babu 07-10-2025)
		// *-------------------------------------------------------------------------------------

		fnCheckMandatoryOperFields: function() {
			var vStatus = this.getView().byId("ID_RECI_STATU").getValue();
			var vUsage = this.getView().byId("ID_RECI_VERWE").getValue();
			var vTsklUnit = this.getView().byId("ID_RECI_PLNME").getValue();
			var retMsg = true;
			if (vStatus !== "" && vUsage !== "" && vTsklUnit !== "") {
				retMsg = true;
			} else {
				if (vStatus === "") {
					retMsg = false;
					this.getView().byId("ID_RECI_STATU").setValueState("Error");
					this.getView().byId("ID_RECI_STATU").setValueStateText(i18n.getText("EnterStatus"));
					this.fnFocusErroField("ID_RECI_STATU");
				}
				if (vUsage === "") {
					retMsg = false;
					this.getView().byId("ID_RECI_VERWE").setValueState("Error");
					this.getView().byId("ID_RECI_VERWE").setValueStateText(i18n.getText("EnterUsage"));
					this.fnFocusErroField("ID_RECI_VERWE");
				}
				if (vTsklUnit === "") {
					retMsg = false;
					this.getView().byId("ID_RECI_PLNME").setValueState("Error");
					this.getView().byId("ID_RECI_PLNME").setValueStateText(i18n.getText("EnterTsklUnit"));
					this.fnFocusErroField("ID_RECI_PLNME");
				}
			}
			return retMsg;
		},

		fnFocusErroField: function(vId) {
			if (vId === "ID_RECI_STATU" || vId === "ID_RECI_VERWE") {
				var id = "ID_RECI_ASSIGN";
				var oPanelHead = this.getView().byId(id + "_HEADER");

				// Make sure the panel is visible
				this.getView().byId(id + "_GRID").setVisible(true);

				// Adjust styles
				oPanelHead.addStyleClass("cl_pannelHead");
				oPanelHead.removeStyleClass("cl_pannelHeadSS");
				this.getView().byId(id).removeStyleClass("cl_search_rotateImage");

				var oControl = this.getView().byId(vId);

				// Wait until it’s rendered
				setTimeout(function() {
					if (oControl && oControl.getDomRef()) {
						oControl.getDomRef().scrollIntoView({
							behavior: "smooth",
							block: "center"
						});
						// Add another small delay for focus
						setTimeout(function() {
							oControl.focus();
						}, 100);
					}
				}, 300);

			} else if (vId === "ID_RECI_PLNME") {

			}
		},

		fnCheckMandatoryFields: function() {
			var vStatus = this.getView().byId("ID_RECI_STATU").getValue();
			var vUsage = this.getView().byId("ID_RECI_VERWE").getValue();
			var retMsg = true;
			if (vStatus === "" && vUsage === "") {
				retMsg = false;
				this.fnFocusErroField("ID_RECI_STATU");
				ErrorHandler.showCustomSnackbar(i18n.getText("fillMandatoryField"), "Error", this);
				this.getView().byId("ID_RECI_STATU").setValueState("Error");
				this.getView().byId("ID_RECI_STATU").setValueStateText(i18n.getText("EnterStatus"));
				this.getView().byId("ID_RECI_VERWE").setValueState("Error");
				this.getView().byId("ID_RECI_VERWE").setValueState(i18n.getText("EnterUsage"));
			} else if (vStatus === "") {
				retMsg = false;
				this.fnFocusErroField("ID_RECI_STATU");
				ErrorHandler.showCustomSnackbar(i18n.getText("statusMandatory"), "Error", this);
				this.getView().byId("ID_RECI_STATU").setValueState("Error");
				this.getView().byId("ID_RECI_STATU").setValueStateText(i18n.getText("EnterStatus"));
			} else if (vUsage === "") {
				retMsg = false;
				this.fnFocusErroField("ID_RECI_VERWE");
				ErrorHandler.showCustomSnackbar(i18n.getText("usageMandatory"), "Error", this);
				this.getView().byId("ID_RECI_VERWE").setValueState("Error");
				this.getView().byId("ID_RECI_VERWE").setValueState(i18n.getText("EnterUsage"));
			}
			return retMsg;
		},

		// *-------------------------------------------------------------------------------------
		//		Function for other Screen Navigation (added by sabarish babu 07-10-2025)
		// *-------------------------------------------------------------------------------------

		fnNavBack: function() {
			var oFromUwl = this.getOwnerComponent().getModel("JM_ContextModel");
			if (Object.keys(oFromUwl.getData() || {}).length > 0) {
				this.fnClearallModel();
				// sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_uwl");
				this.fnDeqeueTrans().then(function(status) {
					if (status) {
						var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
						oCrossAppNav.toExternal({
							target: {
								semanticObject: "ZMDM_UWL_DB",
								action: "display"
							},
							appSpecificRoute: "uwl"
						});
						var oModel = this.getOwnerComponent().getModel("JM_KeyData");
						if (oModel) {
							oModel.setData({});
						}
					}
				});
			} else {
				this.fnClearallModel();
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_keydata");
			}
		},
		fnDeqeueTrans: function() {
			return new Promise(function(Resolve, Reject) {
				var oPayload = {
					Ind: "F",
					"Transid": this.Transid,
					"WiId": this.workId,
					"NavRecipeComments": []
				};
				var oModel = this.getOwnerComponent().getModel();
				oModel.create("/Recipe_HeaderSet", oPayload, {
					success: function(oData) {
						Resolve(true);
					},
					error: function(oResponse) {

					}
				});
			}.bind(this));
		},

		// *-------------------------------------------------------------------------------------
		//		Function for to clear all the Model and (added by sabarish babu 07-10-2025)
		// *-------------------------------------------------------------------------------------

		fnClearallModel: function() {
			this.getView().setModel(undefined, "JM_InitiatorModel");
			this.getView().setModel(undefined, "JM_ParmModel");
			this.Draft = false;

			this.getView().byId("id_textarea").setValue("");

			var oComponent = this.getOwnerComponent();
			var aGlobalModels = [
				"JM_Recipe",
				"JM_Operation",
				"JM_ProductionVrsn",
				"JM_Bom",
				"JM_ContextModel",
				"JM_InitialDatas"
			];
			this.flag = false;

			aGlobalModels.forEach(function(sModelName) {
				var oModel = oComponent.getModel(sModelName);
				if (oModel) {
					if (oModel.setData) {
						oModel.setData({});
					}
				}
			});
			var oTableModel = new sap.ui.model.json.JSONModel({
				List: []
			});
			this.getView().setModel(oTableModel, "JM_AttachmentModel");

			// Model for Table (initially empty, will be filled later)
			var oTableModel1 = new sap.ui.model.json.JSONModel({
				List: []
			});
			this.getView().setModel(oTableModel1, "JM_DocTypeModel");

			// Attachments To show the filename in the model 
			var oMainModel = new sap.ui.model.json.JSONModel({
				uploadedFileName: ""
			});
			this.getView().setModel(oMainModel);
			var oComment = this.getView().byId("id_commentbox");
			if (oComment) {
				oComment.destroyItems(); // This will destroy all controls inside the VBox
			}

			for (var i = 0; i < frontEndId.length; i++) {
				var data = this.getView().byId(frontEndId[i] + "_DES");
				if (data) {
					data.setValue("");
				}
			}
			var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			if (Object.keys(oChangeLogModel.getData() || {}).length > 0) {
				// Get data and create a deep copy
				var existingData = oChangeLogModel ? JSON.parse(JSON.stringify(oChangeLogModel.getData())) : [];
				// Check if model has some data and AppId === "RX"
				if (existingData && existingData.length > 0 && this.AppId === "RX") {
					this.fnClearIndicationforChangedData(existingData);
				}
			}
		},

		// *-----------------------------------------------------------------------
		//					Recipe Duplicate Dialog Open and Close
		// *-----------------------------------------------------------------------

		fnCheckDuplicate: function() {
			var oKeyDataEntity = this.getOwnerComponent().getModel();
			var KeyDataModel = this.getView().getModel("JM_KeydataModel").getData();
			var payLoad = {
				Matnr: KeyDataModel.Matnr,
				Werks: KeyDataModel.Werks,
				Ind: "D" // Validation and Duplicate pop Up
			};
			payLoad.Nav_Duplicate = [];
			busyDialog.open();
			oKeyDataEntity.create("/Recipe_Key_dataSet", payLoad, {
				success: function(oData) {
					var length = oData.Nav_Duplicate.results.length;
					var aData = {
						Duplicate: oData.Nav_Duplicate.results,
						length: "(" + length + ")"
					};
					var oModel = new sap.ui.model.json.JSONModel(aData);
					this.getView().setModel(oModel, "JM_ReciDuplicate");
					if (length === 0) {
						ErrorHandler.showCustomSnackbar("No Duplication found", "Information", this);
						busyDialog.close();
					} else {
						this.fnReciDuplicate();
						busyDialog.close();
					}
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		fnReciDuplicate: function() {
			if (!this.duplicateDialog) {
				this.duplicateDialog = sap.ui.xmlfragment(this.getView().getId(),
					"MANAGED_RECIPE.Fragment.reci_duplicate", // Fragment name
					this // Pass controller instance
				);
				this.getView().addDependent(this.duplicateDialog);
			}
			this.getView().byId("id_dupSubmit").setVisible(false);
			this.duplicateDialog.open();
		},

		fncloseDialog: function() {
			if (this.duplicateDialog) {
				this.duplicateDialog.close();
				this.duplicateDialog.destroy();
				this.duplicateDialog = null;
			}
		},

		// *-------------------------------------------------------------------------------------
		//		Function for to set the RoadMap and (added by sabarish babu 07-10-2025)
		// *-------------------------------------------------------------------------------------

		fnInitializeScreen: function() {
			var oView = this.getView();
			var oCtx = this.getOwnerComponent().getModel("JM_ContextModel");
			var ctxData = oCtx.getData() || {};
			var state = ctxData.Level;
			var tranid = ctxData.Transid;
			var AppId = ctxData.Appid;
			var SendBack = ctxData.Sendback;
			var Progress = ctxData.Progress;

			this.fnRefreshRoadMap();

			// -------------------------------------------------------------
			//  Helper function for building Page Title
			// -------------------------------------------------------------
			var getBaseTitle = function() {
				return AppId === "RC" ? "Recipe Creation " : "Recipe Change ";
			};

			var getStatusTitle = function() {
				if (state === "R" && SendBack !== "X") {
					return "- Reviewer - " + tranid;
				}
				if (state === "A" && SendBack !== "X") {
					return "- Approver - " + tranid;
				}
				if (SendBack === "X") {
					return "- Send Back Record - " + tranid;
				}
				return "";
			};

			var getInitiatorTitle = function() {
				if (state !== "I") {
					return "";
				}

				if (Progress === "Complete") {
					return "- Completed Record - " + tranid;
				}
				if (Progress === "Inprogress") {
					return "- Inprogress Record - " + tranid;
				}
				if (Progress === "Draft") {
					return "- Drafted Record - " + tranid;
				}
				if (Progress === "SendBack" || SendBack === "X") {
					return "- Send Back Record - " + tranid;
				}
				if (Progress === "Reject") {
					return "- Rejected Record - " + tranid;
				}

				return "- Initiator - " + tranid;
			};

			// -------------------------------------------------------------
			//  Initial Load (No ContextModel Data)
			// -------------------------------------------------------------
			if (!Object.keys(ctxData).length) {
				oView.byId("id_initiator").addItem(this.fnCreateRoadMapwithHighlight("Recipe Details"));
				oView.byId("id_reviewer").addItem(this.fnCreateRoadMapwihoutHighlight("Reviewer"));
				oView.byId("id_approver").addItem(this.fnCreateRoadMapwihoutHighlight("Approver"));

				oView.byId("id_submit").setText("Submit");
				oView.byId("id_title").setText("Recipe Creation - Initiator");
				return;
			}
			// } else {
			// 	oView.byId("id_initiator").addItem(this.fnCreateRoadMapwithHighlight("Recipe Details"));
			// 	oView.byId("id_reviewer").addItem(this.fnCreateRoadMapwihoutHighlight("Reviewer"));
			// 	oView.byId("id_approver").addItem(this.fnCreateRoadMapwihoutHighlight("Approver"));

			// 	oView.byId("id_submit").setText("Submit");
			// 	oView.byId("id_title").setText("Recipe Change - Initiator");
			// 	return;
			// }

			// -------------------------------------------------------------
			//  Common Roadmap Setup
			// -------------------------------------------------------------
			var isInitiator = state === "I";
			var isReviewer = state === "R";
			var isApprover = state === "A";

			oView.byId("id_initiator").addItem(
				isInitiator ? this.fnCreateRoadMapwithHighlight("Recipe Details") : this.fnCreateRoadMapwihoutHighlight("Recipe Details")
			);

			oView.byId("id_reviewer").addItem(
				isReviewer ? this.fnCreateRoadMapwithHighlight("Reviewer") : this.fnCreateRoadMapwihoutHighlight("Reviewer")
			);

			oView.byId("id_approver").addItem(
				isApprover ? this.fnCreateRoadMapwithHighlight("Approver") : this.fnCreateRoadMapwihoutHighlight("Approver")
			);

			// -------------------------------------------------------------
			//  Button Adjustments
			// -------------------------------------------------------------
			if (isApprover) {
				oView.byId("id_saveDraft").setVisible(false);
				oView.byId("id_submit").setText("Approve").setWidth("6rem");
			} else if (isReviewer) {
				oView.byId("id_saveDraft").setVisible(false);
				oView.byId("id_submit").setText("Submit");
			} else if (isInitiator) {
				oView.byId("id_submit").setText("Submit");

				// Footer button model for initiator
				var footerBtnModel = new sap.ui.model.json.JSONModel({
					sendBack: false,
					Reject: false,
					Draft: false
				});
				oView.setModel(footerBtnModel, "JM_FooterBtnModel");
			}

			// -------------------------------------------------------------
			//  Title Calculation
			// -------------------------------------------------------------
			var title = getBaseTitle();

			if (isInitiator) {
				title += getInitiatorTitle();
			} else {
				title += getStatusTitle();
			}

			// Fallback if no match
			if (!title) {
				title = "Recipe Change - Initiator";
			}

			oView.byId("id_title").setText(title);
		},

		fnCreateRoadMapwithHighlight: function(text) {
			var image = ((text === "Recipe Details") ? text.split(" ")[0] : text);
			var oImageModel = this.getView().getModel("JM_ImageModel");
			var sBasePath = oImageModel.getProperty("/path");
			var sImg = image;
			var sSrc = sBasePath + sImg + ".svg";
			var oHBox = new sap.m.HBox({
				alignItems: "Center",
				justifyContent: "Center",
				items: [
					new sap.m.HBox({
						id: "id_roadmapHighlighter", // added by sabarish 20.11.2025
						alignItems: "Center",
						justifyContent: "Center",
						items: [
							new sap.m.Image({
								src: sSrc,
								tooltip: text
							}).addStyleClass("cl_ImageTopAlign_roadMap sapUiTinyMarginEnd"),
							new sap.m.Label({
								text: text,
								visible: "{RoadMapUI>/labelVisible}"
							}).addStyleClass("cl_HighlightText_roadMap")
						]
					}).addStyleClass("cl_Highlightborder_roadMap")
				]
			});
			return oHBox;
		},

		fnCreateRoadMapwihoutHighlight: function(text) {
			var image = ((text === "Recipe Details") ? text.split(" ")[0] : text);
			var oImageModel = this.getView().getModel("JM_ImageModel");
			var sBasePath = oImageModel.getProperty("/path");
			var sImg = image;
			var sSrc = sBasePath + sImg + ".svg";
			var oHBox = new sap.m.HBox({
				alignItems: "Center",
				justifyContent: "Center",
				items: [
					new sap.m.Image({
						src: sSrc,
						tooltip: text
					}).addStyleClass("cl_ImageTopAlign_roadMap sapUiTinyMarginEnd"),
					new sap.m.Label({
						text: text,
						visible: "{RoadMapUI>/labelVisible}" // added by sabarish 20.11.2025
					}).addStyleClass("cl_textStyle_roadMap")
				]
			});
			return oHBox;
		},

		fnRefreshRoadMap: function() {
			var reviewerRoadmapBox = this.getView().byId("id_reviewer");
			if (reviewerRoadmapBox) {
				reviewerRoadmapBox.destroyItems();
			}
			var ApproverRoadMapBox = this.getView().byId("id_approver");
			if (ApproverRoadMapBox) {
				ApproverRoadMapBox.destroyItems();
			}
			var InitiatorRoadMapBox = this.getView().byId("id_initiator");
			if (InitiatorRoadMapBox) {
				InitiatorRoadMapBox.destroyItems();
			}
		},

		// *----------------------------------------------------------------------------------------------------
		//									Function for Reject functionalities
		// *----------------------------------------------------------------------------------------------------

		fnReject: function() {
			var that = this;
			var oTextArea = this.byId("id_textarea");
			var sValue = oTextArea.getValue().trim();
			if (sValue === "") {
				ErrorHandler.showCustomSnackbar(i18n.getText("enterComments"), "Information", this);
				return; // stop further process
			} else {
				// Example Popup model data
				var oPopupModel = new sap.ui.model.json.JSONModel({
					title: "Information",
					text: i18n.getText("assignedCRDDeletedAutomatically"),
					negativeButton: "Cancel",
					negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
					positiveButton: "Proceed",
					positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Apply.svg",
					Indicator: "REJECT"
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
			}
		},

		fnrejectfunc: function() {
			var oPayload = {
				"AppId": "RC",
				"Ind": "R",
				"WiId": this.workId,
				"Transid": this.Transid
			};
			oPayload.NavRecipeComments = [];
			oPayload.NavAgent = [];
			var commentsValue = this.getView().byId("id_textarea").getValue();
			oPayload.NavRecipeComments.push({
				"Comments": commentsValue
			});
			var that = this;

			var oRejectModel = this.getOwnerComponent().getModel();
			busyDialog.open();
			oRejectModel.create("/Recipe_HeaderSet", oPayload, {
				success: function(odata) {
					if (odata.MsgTyp === "E") {
						ErrorHandler.showCustomSnackbar(odata.MsgLine, "Error", that);
						busyDialog.close();
					} else {
						ErrorHandler.showCustomSnackbar(odata.MsgLine, "success", that);
						that.fnClearallModel();
						// Wait for 2 seconds, then remove busy & navigate
						setTimeout(function() {
							// sap.ui.core.UIComponent.getRouterFor(that).navTo("reci_uwl");
							var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
							oCrossAppNav.toExternal({
								target: {
									semanticObject: "ZMDM_UWL_DB",
									action: "display"
								},
								appSpecificRoute: "uwl"
							});
							busyDialog.close();
						}, 2000);
					}
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});

		},

		//*-----------------------------------------------------------------------------------------
		//					 Sendback functionalities
		// *----------------------------------------------------------------------------------------
		fnSendBackDialog: function() {
			var that = this;
			var oTextArea = this.byId("id_textarea");
			var sValue = oTextArea.getValue().trim();
			if (sValue === "") {
				ErrorHandler.showCustomSnackbar(i18n.getText("enterComments"), "Information", that);
				return;
			} else {
				var olevelDetailsSet = this.getOwnerComponent().getModel("JMConfig");
				busyDialog.open();
				olevelDetailsSet.read("/Level_DetailsSet", {
					filters: [
						new sap.ui.model.Filter("Transid", sap.ui.model.FilterOperator.EQ, this.Transid)
					],
					success: function(oData) {
						// 1. Build unique Level list
						var aLevels = [];
						var oLevelMap = {};
						var oMinApproverMap = {};
						for (var i = 0; i < oData.results.length; i++) {
							var sLvl = oData.results[i].Lvl;
							var sMinApprover = oData.results[i].MinApprover;
							if (!oLevelMap[sLvl]) {
								oLevelMap[sLvl] = true;
								aLevels.push({
									Level: sLvl
								});
								oMinApproverMap[sLvl] = sMinApprover;
							}
						}

						// 2. Set Level Model
						var oLevelModel = new sap.ui.model.json.JSONModel({
							LevelData: aLevels
						});
						that.getView().setModel(oLevelModel, "JM_LevelModel");
						// 3. Set MinApprover Model
						var oMinApproverModel = new sap.ui.model.json.JSONModel({
							MinApproverMap: oMinApproverMap
						});
						that.getView().setModel(oMinApproverModel, "JM_MinApproverModel");

						// 3. Set Agent Model (empty first)
						var oAgentModel = new sap.ui.model.json.JSONModel({
							Agents: [] // empty initially
						});
						that.getView().setModel(oAgentModel, "JM_AgentModel");

						// keep full data in view for filtering
						that._allAgentData = oData.results;

						that.fnOpenSendBackDialog();

						var oLevelTable = sap.ui.getCore().byId("idLevelTable"); // adjust ID if needed
						if (oLevelTable && aLevels.length > 0) {
							for (var j = 0; j < aLevels.length; j++) {
								if (aLevels[j].Level === "L0") {
									oLevelTable.setSelectedIndex(j);
									that._currentLevel = "L0";
									that._currentLevelIndex = j;
									that._loadAgentsForLevel("L0"); // load agents for L0
									break;
								}
							}
						}
						busyDialog.close();
					},
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
					}
				});
			}
		},

		fnOpenSendBackDialog: function() {
			// Open dialog
			if (!this.sendBackDialog) {
				this.sendBackDialog = sap.ui.xmlfragment("MANAGED_RECIPE.Fragment.SendBack", this);
				this.getView().addDependent(this.sendBackDialog);
			}
			this.sendBackDialog.open();
		},

		onLevelSelect: function(oEvent) {
			var that = this;
			var oTable = oEvent.getSource();
			var iIndex = oTable.getSelectedIndex();
			var oAgentModel = this.getView().getModel("JM_AgentModel");

			// nothing selected â†’ clear table
			if (iIndex === -1) {
				oAgentModel.setProperty("/Agents", []);
				this._currentLevelIndex = -1;
				this._currentLevel = null;
				return;
			}

			var oContext = oTable.getContextByIndex(iIndex);
			var sSelectedLevel = oContext.getObject().Level;

			// 1. Check if any checkbox is edited
			var aAgents = oAgentModel.getData().Agents;
			var editedFlag = false;
			for (var i = 0; i < aAgents.length; i++) {
				if (aAgents[i].checkboxstate === false) {
					editedFlag = true;
					break;
				}
			}

			if (editedFlag && this._currentLevel !== null && this._currentLevel !== sSelectedLevel) {
				// store the level the user wants to switch to
				this._pendingLevel = sSelectedLevel;
				this._pendingLevelIndex = iIndex;
				// revert selection temporarily to previous level
				oTable.setSelectedIndex(this._currentLevelIndex);
				// open discard confirmation fragment

				// Example Popup model data
				var oPopupModel = new sap.ui.model.json.JSONModel({
					title: "Confirmation",
					text: i18n.getText("confirmLevelChange"),
					negativeButton: "No",
					negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
					positiveButton: "Yes",
					positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Continue.svg",
					Indicator: "SendBack"
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

			} else {
				// --- fetch MinApprover from model ---
				var oMinApproverModel = this.getView().getModel("JM_MinApproverModel");
				var sMinApprover = oMinApproverModel.getProperty("/MinApproverMap/" + sSelectedLevel);

				// --- set label text via model ---
				if (sSelectedLevel === "L0") {
					oMinApproverModel.setProperty("/LabelText", "");
				} else {
					if (sMinApprover) {
						oMinApproverModel.setProperty("/LabelText", i18n.getText("minSendBackCount", [sMinApprover]));
					} else {
						oMinApproverModel.setProperty("/LabelText", "");
					}
				}
				// normal load
				this._loadAgentsForLevel(sSelectedLevel);
				this._currentLevel = sSelectedLevel;
				this._currentLevelIndex = iIndex;
			}
		},

		fnLevelChange: function() {
			var oAgentModel = this.getView().getModel("JM_AgentModel");
			var aAgents = oAgentModel.getData().Agents;

			// 1. reset all checkboxes
			for (var i = 0; i < aAgents.length; i++) {
				aAgents[i].checkboxstate = false;
			}
			oAgentModel.setProperty("/Agents", aAgents);

			// 2. load agents for the pending level
			if (this._pendingLevel) {
				this._loadAgentsForLevel(this._pendingLevel);

				// update the level table selection
				var oLevelTable = sap.ui.getCore().byId("idLevelTable");
				if (this._pendingLevelIndex !== undefined && this._pendingLevelIndex !== null) {
					oLevelTable.setSelectedIndex(this._pendingLevelIndex);
				}

				// update current level trackers
				this._currentLevel = this._pendingLevel;
				this._currentLevelIndex = this._pendingLevelIndex;

				// clear pending variables
				this._pendingLevel = null;
				this._pendingLevelIndex = null;

				if (this.oDialog) {
					this.oDialog.close();
					this.oDialog.destroy(); // if you want destroy after close
					this.oDialog = null;
				}
			}
		},

		// Helper: load agents for a level
		_loadAgentsForLevel: function(sLevel) {
			var aFilteredAgents = [];
			for (var i = 0; i < this._allAgentData.length; i++) {
				if (this._allAgentData[i].Lvl === sLevel) {
					aFilteredAgents.push({
						indicator: this.changeidicatortoImage(this._allAgentData[i].Submit),
						Agent: this._allAgentData[i].Agent,
						AgentName: this._allAgentData[i].Name,
						checkboxstate: true, // default unchecked
						checkboxEditable: true
					});
				}
			}
			this.getView().getModel("JM_AgentModel").setProperty("/Agents", aFilteredAgents);

			// store current level
			this._currentLevel = sLevel;
		},

		changeidicatortoImage: function(value) {
			if (value === "X") {
				return "Image/NodesGrn.svg"; // your green icon
			} else {
				return "Image/NodesOrg.svg"; // your red icon
			}
		},

		fnsendBack: function() {
			busyDialog.open();
			var oLevelModel = this.getView().getModel("JM_LevelModel");
			var oAgentModel = this.getView().getModel("JM_AgentModel");

			// 1. Get currently selected level
			var aLevels = oLevelModel.getProperty("/LevelData");
			var sCurrentLevel = null;
			for (var i = 0; i < aLevels.length; i++) {
				if (i === this._currentLevelIndex) {
					sCurrentLevel = aLevels[i].Level;
					break;
				}
			}

			if (!sCurrentLevel) {
				ErrorHandler.showCustomSnackbar(i18n.getText("selectLevelBeforeSubmit"), "Warning", this);
				busyDialog.close();
				return;
			}

			// 2. Filter agents with checkboxstate = true
			var aAllAgents = oAgentModel.getProperty("/Agents");
			var aSelectedAgents = [];
			for (var j = 0; j < aAllAgents.length; j++) {
				if (aAllAgents[j].checkboxstate === true) {
					aSelectedAgents.push({
						Agents: aAllAgents[j].Agent
					});
				}
			}

			if (aSelectedAgents.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("agentSelectionRequired"), "Warning", this);
				busyDialog.close();
				return;
			}
			var that = this;

			// 3. Build payload
			var payload = {
				"Ind": "S",
				"Transid": this.Transid,
				"WiId": this.workId,
				"Lvl": sCurrentLevel,
				"NavAgent": aSelectedAgents,
				"AppId": this.AppId
			};
			payload.NavRecipeComments = [];

			var commentsValue = this.getView().byId("id_textarea").getValue();

			payload.NavRecipeComments.push({
				"Comments": commentsValue
			});

			var oSendBackService = this.getOwnerComponent().getModel();
			busyDialog.open();
			oSendBackService.create("/Recipe_HeaderSet", payload, {
				success: function(oData) {
					if (oData.MsgType === "E") {
						ErrorHandler.showCustomSnackbar(oData.MsgLine, "Error", that); // Changed by srikanth message to MsgLine
						busyDialog.close();
					} else {
						// Show snackbar
						that.fnClearallModel();
						ErrorHandler.showCustomSnackbar(oData.MsgLine, "success", that); // Changed by srikanth message to MsgLine
						that.onSendBackClose();
						// Wait for 2 seconds, then remove busy & navigate
						setTimeout(function() {
							busyDialog.close();
							// sap.ui.core.UIComponent.getRouterFor(that).navTo("reci_uwl");
							var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
							oCrossAppNav.toExternal({
								target: {
									semanticObject: "ZMDM_UWL_DB",
									action: "display"
								},
								appSpecificRoute: "uwl"
							});
						}, 1000);
					}

				},
				error: function(oResponse) {
					busyDialog.close();
				}
			});
		},

		onSendBackClose: function(oEvent) {
			if (this.sendBackDialog) {
				this.sendBackDialog.close();
				this.sendBackDialog.destroy();
				this.sendBackDialog = null;
			}
			// Clear Level and Agent models
			var oLevelModel = this.getView().getModel("JM_LevelModel");
			var oAgentModel = this.getView().getModel("JM_AgentModel");

			if (oLevelModel) {
				oLevelModel.setProperty("/LevelData", []);
			}
			if (oAgentModel) {
				oAgentModel.setProperty("/Agents", []);
			}
		},

		//*-----------------------------------------------------------------------------------------
		//					 confirmation close and submit button functionlaties
		// *----------------------------------------------------------------------------------------

		fnConfirmationFragmentClose: function() {
			var state = this.getView().getModel("JM_Popup").getProperty("/Indicator");
			if (state === "SendBack") {
				// reselect previous level row if needed
				var oTable = sap.ui.getCore().byId("idLevelTable");
				var aLevels = oTable.getBinding("rows").getModel().getProperty("/LevelData");
				for (var i = 0; i < aLevels.length; i++) {
					if (aLevels[i].Level === this._currentLevel) {
						oTable.setSelectedIndex(i);
						break;
					}
				}
			}
			if (this.oDialog) {
				this.oDialog.close();
				this.oDialog.destroy(); // if you want destroy after close
				this.oDialog = null;
				var oModel = this.getView().getModel("JM_Popup");
				oModel.setData({});
				oModel.refresh(true);
			}
		},

		fnSubmitConfirmation: function() {
			var state = this.getView().getModel("JM_Popup").getProperty("/Indicator");
			if (state === "REJECT") {
				this.fnConfirmationFragmentClose();
				this.fnrejectfunc();
				this.getOwnerComponent().getModel("JM_KeyData").setData({}); // Added by srikanth
				this.getOwnerComponent().getModel("JM_WfParm").setData({}); // Added by srikanth
			}
			if (state === "SendBack") {
				this.fnLevelChange();
				this.getOwnerComponent().getModel("JM_KeyData").setData({}); // Added by srikanth
				this.getOwnerComponent().getModel("JM_WfParm").setData({}); // Added by srikanth
			}
			if (state === "SAVE") {
				this.fnConfirmationFragmentClose();
				var payload = this.fnpayLoadBind();

				if (this.AppId === "RX") {
					this.fnSetGetParmforChange("RX").then(function(flag) {
						if (flag) {
							var parmModel1 = this.getOwnerComponent().getModel("JM_WfParm");
							if (parmModel1) {
								var parmData = parmModel1.getData();
								for (var key in parmData) {
									if (parmData.hasOwnProperty(key)) {
										payload[key] = parmData[key];
									}
								}
							}
							var oGlobalPam = this.getOwnerComponent().getModel("JM_WfParm");
							oGlobalPam.setData({}); // clear
							oGlobalPam.refresh(true);
							var changelog = this.fnAlignChangelog();
							payload.NavRecipe_ChangeLog = changelog;
							this.fnSendDatatoBackend(payload);
						}
					}.bind(this));

				} else {
					this.fnSendDatatoBackend(payload);
				}
			}
			if (state === "DRAFT") {
				this.fnConfirmationFragmentClose();
				this.Draft = true;
				payload = this.fnpayLoadBind();
				if (this.AppId === "RX") {
					this.fnSetGetParmforChange("RX").then(function(flag) {
						if (flag) {
							var parmModel1 = this.getOwnerComponent().getModel("JM_WfParm");
							if (parmModel1) {
								var parmData = parmModel1.getData();
								for (var key in parmData) {
									if (parmData.hasOwnProperty(key)) {
										payload[key] = parmData[key];
									}
								}
							}
							var oGlobalPam = this.getOwnerComponent().getModel("JM_WfParm");
							oGlobalPam.setData({}); // clear
							oGlobalPam.refresh(true);
							var changelog = this.fnAlignChangelog();
							payload.NavRecipe_ChangeLog = changelog;
							this.fnSendDatatoBackend(payload);
						}
					}.bind(this));

				} else {
					this.fnSendDatatoBackend(payload);
				}
			}
		},

		fnAlignChangelog: function() {
			var retPaylod = [];
			var vMatnr = this.getView().getModel("JM_KeydataModel").getProperty("/Matnr");
			var vWerks = this.getView().getModel("JM_KeydataModel").getProperty("/Werks");
			var oModel = this.getOwnerComponent().getModel("JM_ChangeLog");
			if (Object.keys(oModel.getData() || {}).length > 0) {
				var data = JSON.parse(JSON.stringify(oModel.getData()));
				data.forEach(function(oItem) {
					["ChangedOn"].forEach(function(field) {
						var value = oItem[field];
						if (typeof value === "string" && value.endsWith("Z")) {
							oItem[field] = new Date(value);
						}
					});
				});
				for (var i = 0; i < data.length; i++) {
					var result = data[i];
					retPaylod.push({
						Transid: this.Transid,
						ItemNo: result.ItemNo,
						Matnr: vMatnr,
						Werks: vWerks,
						ProcessDesc: result.ProcessDesc,
						ProcessInd: result.ProcessInd,
						FieldId: result.FieldId,
						FieldName: result.FieldName,
						OldValue: result.OldValue,
						NewValue: result.NewValue,
						ChangedBy: result.ChangedBy, // added by srikanth
						ChangedOn: result.ChangedOn // added by srikanth
					});
				}
			}
			return retPaylod;
		},

		fnBindDescriptionForRecipe: function() {
			var oModel = this.getView().getModel("JM_DescriptionModel");
			if (!oModel) return;
			var oData = oModel.getData();
			Object.keys(oData).forEach(function(key) {
				if (["VERWE", "QPART", "VAGRP", "PLNME", "STATU"].includes(key.toUpperCase())) {
					var desId = "ID_RECI_" + key.toUpperCase() + "_DES";
					var oInput = this.getView().byId(desId);
					if (oInput) {
						if (!oInput.getBinding("value")) {
							oInput.setValue(oData[key].desc);
						}
					}
				}
			}, this);
		},

		// *-------------------------------------------------------------------------------------
		//		Function for Paylod binding and Send Data to Backend (added by sabarish babu 07-10-2025)
		// *-------------------------------------------------------------------------------------

		removeMetadata: function(oPayload) {
			function clean(obj) {
				if (Array.isArray(obj)) {
					obj.forEach(clean);
				} else if (typeof obj === "object" && obj !== null) {
					delete obj.__metadata;
					Object.keys(obj).forEach(function(key) {
						clean(obj[key]);
					});
				}
			}
			clean(oPayload); // recursively clean
			return oPayload; // return the cleaned payload
		},

		fnDraft: function() {
			var that = this;
			if (!this.oDialog) {
				var oPopupModel = new sap.ui.model.json.JSONModel({
					title: "Confirmation",
					text: i18n.getText("confirmSaveDraft"),
					negativeButton: "No",
					negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
					positiveButton: "Yes",
					positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Continue.svg",
					Indicator: "DRAFT"
				});
				// Set model with name
				this.getView().setModel(oPopupModel, "JM_Popup");
				this.oDialog = sap.ui.xmlfragment("MANAGED_RECIPE.Fragment.ConfirmationExit", this);
				this.getView().addDependent(this.oDialog);
			}
			this.oDialog.open();
		},

		fnpayLoadBind: function() {
			var oPayload = {};
			// var vCheckMandatoryState;
			if (!this.Draft) {
				// vCheckMandatoryState = this.fnCheckMandatoryFields();
				var Ind = this.getOwnerComponent().getModel("JM_ContextModel").getProperty("/Ind");
				if (Ind === "X") {
					oPayload.Ind = "A";
				} else {
					oPayload.Ind = "I";
				}
			} else {
				// vCheckMandatoryState = true;/
				oPayload.Ind = "D";
			}
			// if (vCheckMandatoryState) {
			var data;
			// Production Version Data
			var production = this.getOwnerComponent().getModel("JM_ProductionVrsn");
			// Opeations data
			var operation = this.getOwnerComponent().getModel("JM_Operation");
			// recipe data
			var recipeData = this.getView().getModel("JM_InitiatorModel").getData();
			// BOM Data
			var BOMData = this.getOwnerComponent().getModel("JM_Bom");

			var vMatnr = this.getView().getModel("JM_KeydataModel").getProperty("/Matnr");
			var vProfile = this.getView().getModel("JM_KeydataModel").getProperty("/Profile");
			var vKtext = this.getView().getModel("JM_KeydataModel").getProperty("/ReciDes");
			var vWerks = this.getView().getModel("JM_KeydataModel").getProperty("/Werks");
			var parmModel = this.getOwnerComponent().getModel("JM_WfParm");
			//Inititor
			if (Object.keys(parmModel.getData() || {}).length > 0) {
				var parmModel1 = this.getView().getModel("JM_WfParm");
				var oGlobalPam = {};

				if (parmModel1) {

					parmModel1 = this.getOwnerComponent().getModel("JM_WfParm").getData();
					var cleanedParamData = {};
					Object.keys(parmModel1).forEach(function(key) {
						if (key.endsWith("Id")) {
							var newKey = key.slice(0, -2);
							var field = this.byId(parmModel1[key]);
							var fieldValue = "";
							if (field && field.getValue) {
								fieldValue = field.getValue();
								cleanedParamData[newKey] = fieldValue;
							}
						}else{
							cleanedParamData[key] = parmModel1[key];
						}
					}, this);
					oGlobalPam = cleanedParamData;

					var parmData = cleanedParamData;
					for (var key in parmData) {
						if (parmData.hasOwnProperty(key)) {
							oPayload[key] = parmData[key];
						}
					}
				}
				oPayload.AppId = this.AppId;
				oPayload.Matnr = vMatnr;
				oPayload.Profidnetz = vProfile;
				oPayload.Werks = vWerks;
				oPayload.Ktext = vKtext;
				oPayload.Plnnr = this.getView().getModel("JM_KeydataModel").getProperty("/Plnnr");
				oPayload.Plnal = this.getView().getModel("JM_KeydataModel").getProperty("/Plnal");
			} else { // Reviwer process
				oPayload.AppId = this.AppId;
				oPayload.Transid = this.Transid;
				oPayload.WiId = this.workId;
				oPayload.Matnr = vMatnr;
				oPayload.Werks = vWerks;
				oPayload.Ktext = vKtext;
				oPayload.Profidnetz = vProfile;
				oPayload.Plnnr = this.getView().getModel("JM_KeydataModel").getProperty("/Plnnr");
				oPayload.Plnal = this.getView().getModel("JM_KeydataModel").getProperty("/Plnal");
			}

			oPayload.NavRecipeBasic = [];
			oPayload.NavRecipeBasic.push(recipeData);
			oPayload.NavRecipeComments = [];
			oPayload.NavReturn_Msg = [];
			oPayload.Ind = (this.Draft) ? "D" : oPayload.Ind;

			if (Object.keys(production.getData() || {}).length > 0) {
				data = production.getData();
				oPayload.NavPV_BasicFields = data.NavPV_BasicFields;
				oPayload.NavPV_MaterialCompData = data.NavPV_MaterialCompData;
			}
			if (Object.keys(operation.getData() || {}).length > 0) {
				data = operation.getData();
				oPayload.NavRecipe_Operation = data.NavRecipe_Operation;
			}
			if (Object.keys(BOMData.getData() || {}).length > 0) {
				data = BOMData.getData();
				oPayload.NavBomHeader = data.NavBomHeader;
				oPayload.NavBomItem = data.NavBomItem.filter(function(item) {
					return item.Idnrk && item.Postp;
				});
			}
			// Change Data type compatable to the Backend
			oPayload.NavRecipeBasic[0].Losbs = this.fnToEdmDecimal(oPayload.NavRecipeBasic[0].Losbs, 13, 3);
			oPayload.NavRecipeBasic[0].Losvn = this.fnToEdmDecimal(oPayload.NavRecipeBasic[0].Losvn, 13, 3);
			oPayload.NavRecipeBasic[0].Bmsch = this.fnToEdmDecimal(oPayload.NavRecipeBasic[0].Bmsch, 13, 3);
			oPayload.NavRecipeBasic[0].Umrez = this.fnToEdmDecimal(oPayload.NavRecipeBasic[0].Umrez, 5, 0);
			oPayload.NavRecipeBasic[0].Umren = this.fnToEdmDecimal(oPayload.NavRecipeBasic[0].Umren, 5, 0);

			// Comments
			var commentsValue = this.getView().byId("id_textarea").getValue();
			oPayload.NavRecipeComments.push({
				"Comments": commentsValue
			});

			// Attachments
			oPayload.NavRecipeAttachment = [];
			var oTableModel = this.getView().getModel("JM_DocTypeModel");
			var aTableRows = oTableModel.getProperty("/List") || [];
			aTableRows.forEach(function(row) {
				oPayload.NavRecipeAttachment.push({
					SerialNo: row.AttachmentNo.toString().padStart(10, "0"),
					DocType: row.DocType || "",
					FileName: row.TagName || "",
					MimeType: row.MimeType || "",
					Xstring: row.Xstring || "",
					FileSize: row.Size
				});
			});

			oPayload = this.removeMetadata(oPayload);
			this.Draft = null;
			return oPayload;
		},

		fnSetGetParmforChange: function(Appid) {
			var that = this;
			return new Promise(function(Resolve, Reject) {
				var KeyDataId = [
					"KID_RECI_MATNR", "KID_RECI_WERKS", "KID_RECI_PROFID_STD", "KID_RECI_RECIDES"
				];
				var oWFParmSet = this.getOwnerComponent().getModel("JMConfig");
				busyDialog.open();
				oWFParmSet.read("/WFParmSet", {
					filters: [
						new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, Appid)
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

						var oWFparamData = oMatchedParams;
						var cleanedParamData = {};
						Object.keys(oWFparamData).forEach(function(key) {
							if (key.endsWith("Id")) {
								var newKey = key.slice(0, -2);
								var fieldId = oWFparamData[key].split("_")[2];
								fieldId = fieldId.charAt(0).toUpperCase() + fieldId.slice(1).toLowerCase();
								var keyData = this.getView().getModel("JM_KeydataModel");
								if (keyData) {
									var fieldValue = keyData.getProperty("/" + fieldId);
								}
								cleanedParamData[newKey] = fieldValue;
							}
						}, this);
						var oGlobalPam = this.getOwnerComponent().getModel("JM_WfParm");
						oGlobalPam.setData(cleanedParamData); // clear
						oGlobalPam.refresh(true);
						Resolve(true);
						if (aInvalidParams.length > 0) {
							ErrorHandler.showCustomSnackbar(i18n.getText("workflowParamNotMaintained"), "Error", that);
							Resolve(false);
							busyDialog.close();
						} else if (Object.keys(oMatchedParams).length > 0) {
							busyDialog.close();

						}
						busyDialog.close();
					}.bind(this),
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
					}

				});
			}.bind(this));
		},

		fnsaveRecipe: function() {
			var that = this;
			this.fnVBackendValidateFields("S").then(function(state) {
				if (state) {

					if (!this.oDialog) {
						var oPopupModel = new sap.ui.model.json.JSONModel({
							title: "Confirmation",
							text: i18n.getText("confirmSaveRecipe"),
							negativeButton: "No",
							negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
							positiveButton: "Yes",
							positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Continue.svg",
							Indicator: "SAVE"
						});
						// Set model with name
						this.getView().setModel(oPopupModel, "JM_Popup");

						this.oDialog = sap.ui.xmlfragment("MANAGED_RECIPE.Fragment.ConfirmationExit", this);
						this.getView().addDependent(this.oDialog);
					}
					this.oDialog.open();

				}
			}.bind(this));
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

		fnSendDatatoBackend: function(oPayload) {
			delete oPayload.Nav_Duplicate;
			oPayload.Plnty = "2";
			var that = this;

			var oModel = this.getOwnerComponent().getModel();
			busyDialog.open();
			var vErrorState = this.fnCheckErrorState();
			if (vErrorState) {
				busyDialog.open();
				oModel.create("/Recipe_HeaderSet", oPayload, {
					success: function(oData) {
						busyDialog.close();
						if (oData.MsgTyp !== "E") {

							var oChangeLogModel = this.getOwnerComponent().getModel("JM_ChangeLog");
							if (Object.keys(oChangeLogModel.getData() || {}).length > 0 && this.AppId === "RX") {
								// Get data and create a deep copy
								var existingData = oChangeLogModel ? JSON.parse(JSON.stringify(oChangeLogModel.getData())) : [];
								// Check if model has some data and AppId === "RX"
								if (existingData && existingData.length > 0 && this.AppId === "RX") {
									this.fnClearIndicationforChangedData(existingData);
								}
							}

							// ErrorHandler.showCustomSnackbar(oData.MsgLine, "success");
							busyDialog.close();
							var oFromUwl = this.getOwnerComponent().getModel("JM_ContextModel");
							if (Object.keys(oFromUwl.getData() || {}).length > 0) {
								var oPopupModel = new sap.ui.model.json.JSONModel({
									title: "Confirmation",
									text: oData.MsgLine,
									positiveButton: "Ok",
									positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Continue.svg",
									Indicator: "UWL"
								});

								// Set model with name
								this.getView().setModel(oPopupModel, "JM_Popup");
								if (!this.oSuccessdialog) {
									this.oSuccessdialog = sap.ui.xmlfragment(this.getView().getId(),
										"MANAGED_RECIPE.Fragment.SucessDialog", // Fragment path
										this
									);
									this.getView().addDependent(this.oSuccessdialog);
								}
								this.oSuccessdialog.open();
							} else {
								var oPopupModel = new sap.ui.model.json.JSONModel({
									title: "Confirmation",
									text: oData.MsgLine,
									positiveButton: "Ok",
									positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Continue.svg",
									Indicator: "UWL"
								});

								// Set model with name
								this.getView().setModel(oPopupModel, "JM_Popup");
								if (!this.oSuccessdialog) {
									this.oSuccessdialog = sap.ui.xmlfragment(this.getView().getId(),
										"MANAGED_RECIPE.Fragment.SucessDialog", // Fragment path
										this
									);
									this.getView().addDependent(this.oSuccessdialog);
								}
								this.oSuccessdialog.open();
							}

						} else {
							var message = "";

							for (var i = 0; i < oData.NavReturn_Msg.results.length; i++) {
								var msg = oData.NavReturn_Msg.results[i];
								if (msg.MsgType !== "S") {
									message = msg.Message;
									break;
								}
							}
							this.fnValidationErrorMsgSet(oData.NavReturn_Msg.results);
							ErrorHandler.showCustomSnackbar(message, "Error", this);

							busyDialog.close();
						}
					}.bind(this),
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);

					}.bind(this)
				});
			} else {
				ErrorHandler.showCustomSnackbar(i18n.getText("correctHighlightedFields"), "Error");
				busyDialog.close();
			}
		},

		fnRefresh: function() {
			var state = this.getView().getModel("JM_Popup").getProperty("/Indicator");
			if (state === "UWL") {
				this.fnClearallModel();
				var oWfparm = this.getOwnerComponent().getModel("JM_KeyData");
				oWfparm.setData({}); // replaces the data
				oWfparm.refresh(true); // updates the bindings
				var oWfparm1 = this.getOwnerComponent().getModel("JM_WfParm");
				oWfparm1.setData({}); // replaces the data
				oWfparm1.refresh(true); // updates the bindings
				var oModel = this.getOwnerComponent().getModel("JM_KeyData");
				if (oModel) {
					oModel.setData({});
				}
				// sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_uwl");
				var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
				oCrossAppNav.toExternal({
					target: {
						semanticObject: "ZMDM_UWL_DB",
						action: "display"
					},
					appSpecificRoute: "uwl"
				});

			}
			if (state === "SEARCH") {
				this.fnClearallModel();
				oWfparm = this.getOwnerComponent().getModel("JM_KeyData");
				oWfparm.setData({}); // replaces the data
				oWfparm.refresh(true); // updates the bindings
				oWfparm1 = this.getOwnerComponent().getModel("JM_WfParm");
				oWfparm1.setData({}); // replaces the data
				oWfparm1.refresh(true); // updates the bindings
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_search"); // clear & navigate
				busyDialog.close();
			}
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

		fnValidationErrorMsgSet: function(result) {
			for (var i = 0; i < result.length; i++) {
				var data = result[i];
				var id = "ID_RECI_" + data.Fnm.toUpperCase();
				var field = this.getView().byId(id);
				if (field) {
					this.getView().byId(id).setValueState("Error");
					this.getView().byId(id).setValueStateText(data.Message);
				}
			}
		},

		//*-----------------------------------------------------------------------------------------
		//					         Backend Validation navigtion and save
		// *----------------------------------------------------------------------------------------

		fnNavOperation: function() {
			this.fnVBackendValidateFields("F").then(function(state) {
				if (state) {
					var RecipeMasterDetails = this.getView().getModel("JM_InitiatorModel").getData();
					var oRecipeData = this.getOwnerComponent().getModel("JM_Recipe");
					oRecipeData.setData(RecipeMasterDetails); // replaces the data
					oRecipeData.refresh(true); // updates the bindings
					sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_operations");
				}
			}.bind(this));
		},

		fnNavProductionVersion: function() {
			this.fnVBackendValidateFields("F").then(function(state) {
				if (state) {
					var RecipeMasterDetails = this.getView().getModel("JM_InitiatorModel").getData();
					var oRecipeData = this.getOwnerComponent().getModel("JM_Recipe");
					oRecipeData.setData(RecipeMasterDetails); // replaces the data
					oRecipeData.refresh(true); // updates the bindings
					sap.ui.core.UIComponent.getRouterFor(this).navTo("pv_detail");
				}
			}.bind(this));
		},

		fnVBackendValidateFields: function(Ind) {
			var that = this;
			return new Promise(function(Resolve, Reject) {
				var payload = this.fnpayLoadBind();
				if (Ind) {
					payload.MsgTyp = "O";
				}
				payload.Ind = "C";
				var serviceCall = this.getOwnerComponent().getModel();
				serviceCall.create("/Recipe_HeaderSet", payload, {
					success: function(oData) {
						var result = oData.NavReturn_Msg.results;
						var message = "";
						for (var i = 0; i < oData.NavReturn_Msg.results.length; i++) {
							var msg = oData.NavReturn_Msg.results[i];
							if (oData.MsgTyp !== "S") {
								message = msg.Message;
								break;
							}
						}
						if (message !== "") {
							ErrorHandler.showCustomSnackbar(message, "Error", that);
						}
						if (oData.MsgTyp === "E") {
							this.fnValidationErrorMsgSet(result);
							Resolve(false);
						} else {

							Resolve(true);
						}
					}.bind(this),
					error: function(oResponse) {
						Reject(oResponse);
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
					}
				});
			}.bind(this));
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

		fnSelectedLivechange: function(oEvent) {
			var sSelectedKey = oEvent.getSource().getSelectedKey();
			this.fnUpdateChangelogforSelectBox("ID_RECI_CHRULE", sSelectedKey, "JM_ChangeRule");
		},
		_loadContextModelLocal: function() {
			var oCtxModel = sap.ui.getCore().getModel("JM_ContextModel");
			var oCtxData = oCtxModel ? oCtxModel.getData() : null;

			if (oCtxData) {
				// Store in Component Model
				this.getOwnerComponent().setModel(
					new sap.ui.model.json.JSONModel(oCtxData),
					"JM_ContextModel"
				);
			}
		}

		// added by sabarish 20.11.2025
		// fnMobileViewChanges: function() {
		// 	this.getView().getModel("RoadMapUI").setProperty("/labelVisible", false);
		// 	this.getView().byId("id_roadmap").removeStyleClass("cl_init_roadmap");
		// 	this.getView().byId("id_roadmap").addStyleClass("cl_init_roadmapSS");
		// 	// this.getView().byId("id_roadmapHighlighter").removeStyleClass("cl_Highlightborder_roadMap");
		// 	// this.getView().byId("id_roadmapHighlighter").addStyleClass("cl_Highlightborder_roadMapSS");
		// },
		// fnTabDesktopViewChanges: function() {
		// 	this.getView().getModel("RoadMapUI").setProperty("/labelVisible", true);
		// 	this.getView().byId("id_roadmap").removeStyleClass("cl_init_roadmapSS");
		// 	this.getView().byId("id_roadmap").addStyleClass("cl_init_roadmap");
		// 	// this.getView().byId("id_roadmapHighlighter").removeStyleClass("cl_Highlightborder_roadMapSS");
		// 	// this.getView().byId("id_roadmapHighlighter").addStyleClass("cl_Highlightborder_roadMap");
		// },
		// _onResize: function() {
		// 	var oRange = sap.ui.Device.media.getCurrentRange(sap.ui.Device.media.RANGESETS.SAP_STANDARD);

		// 	if (oRange.name === "Phone") {
		// 		this.fnMobileViewChanges();
		// 	} else {
		// 		this.fnTabDesktopViewChanges();
		// 	}
		// }
		//EOC
	});

});