sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"MANAGED_RECIPE/controller/ErrorHandler",
	"MANAGED_RECIPE/Formatter/formatter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Filter",
	"sap/ui/model/resource/ResourceModel"
], function(Controller, ErrorHandler, formatter, FilterOperator, Filter, ResourceModel) {
	"use strict";

	var busyDialog = new sap.m.BusyDialog();
	var i18n;

	return Controller.extend("MANAGED_RECIPE.controller.reci_keydata", {
		formatter: formatter,

		// on Intial Load of page/view	
		onInit: function() {
			this.f4Cache = {};

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

			this.oRouter = this.getOwnerComponent().getRouter(this);
			this.oRouter.getRoute("reci_keydata").attachPatternMatched(this.fnRouter, this);
		},

		// on Every time load of page/view
		fnRouter: function() {

			// var oVisModel = new sap.ui.model.json.JSONModel({
			// 	labelVisible: true
			// });
			// this.getView().setModel(oVisModel, "RoadMapUI");
			// sap.ui.Device.resize.attachHandler(this._onResize, this);
			// this._onResize();

			// css change for navigation bar
			// this.getView().byId("id_dashBoard_h").removeStyleClass("cl_listhighlight");
			// this.getView().byId("id_dashBoard_h").addStyleClass("cl_list_con");
			// this.getView().byId("id_appList_h").addStyleClass("cl_listhighlight");
			// this.getView().byId("id_appList_h").removeStyleClass("cl_list_con");

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

			var oParmModel = this.getOwnerComponent().getModel("JM_WfParm"); // getting data from global model
			var oKeyDataModel = this.getOwnerComponent().getModel("JM_KeyData"); // getting data from global model
			this.Appid = this.getOwnerComponent().getModel("JM_KeyData").getProperty("/AppId");
			if (!this.Appid) {
				this.Appid = "RC";
			}
			if (Object.keys(oParmModel.getData() || {}).length > 0 || this.Appid === "RX") {
				this.fnSetParmdata(this.Appid).then(function(status) {
					if (status) {
						if (this.Appid === "RX") {
							// change title
							this.getView().byId("id_title").setText(i18n.getText("RXKeyData"));
						} else {
							this.getView().byId("id_title").setText(i18n.getText("RCKeyData"));
						}

						this.getView().setModel(oParmModel, "JM_ParmModel"); // local model values
						if (!Object.keys(oKeyDataModel.getData() || {}).length > 0) {
							var KeyDataModel = {
								Matnr: "",
								Maktx: "",
								Werks: "",
								WerksDes: "",
								Profile: "",
								ProfileDes: "",
								ReciDes: "",
								AppId: this.Appid
							};
							var oWfparm = this.getOwnerComponent().getModel("JM_KeyData");
							oWfparm.setData(KeyDataModel); // replaces the data
							oWfparm.refresh(true); // updates the bindings
						}
					}
				}.bind(this));

			} else {
				sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_search");
			}
		},

		// *---------------------------------------------------------------------------
		//					Continue button press in key data
		// *---------------------------------------------------------------------------

		fnContinue: function(oEvent) {
			var vMaterial = this.getView().byId("KID_RECI_MATNR").getValue();
			var vPlant = this.getView().byId("KID_RECI_WERKS").getValue();
			var vProfile = this.getView().byId("KID_RECI_PROFID_STD").getValue();
			var vReciDes = this.getView().byId("KID_RECI_RECIDES").getValue();
			var retMsg = true;
			if (vMaterial === "" && vPlant === "" && vProfile === "" && vReciDes === "") {
				retMsg = false;
				ErrorHandler.showCustomSnackbar("Please Enter Mandatory Fields", "Error", this);
				this.getView().byId("KID_RECI_PROFID_STD").setValueState("Error");
				this.getView().byId("KID_RECI_MATNR").setValueState("Error");
				this.getView().byId("KID_RECI_WERKS").setValueState("Error");
				this.getView().byId("KID_RECI_RECIDES").setValueState("Error");
			}
			if (vPlant === "" || this.getView().byId("KID_RECI_WERKS").getValueState() === "Error") {
				retMsg = false;
				if (this.getView().byId("KID_RECI_WERKS").getValueState() === "Error") {
					var valueStateMessage = this.getView().byId("KID_RECI_WERKS").getValueStateText();
					ErrorHandler.showCustomSnackbar(valueStateMessage, "Error", this);
				} else {
					this.getView().byId("KID_RECI_WERKS").setValueState("Error");
					this.getView().byId("KID_RECI_WERKS").setValueStateText("Enter Plant");
				}
			}
			if (vProfile === "" || this.getView().byId("KID_RECI_PROFID_STD").getValueState() === "Error") {
				retMsg = false;
				if (this.getView().byId("KID_RECI_PROFID_STD").getValueState() === "Error") {
					ErrorHandler.showCustomSnackbar("Please Enter Mandatory Fields", "Error");
					this.getView().byId("KID_RECI_PROFID_STD").setValueState("Error");
					this.getView().byId("KID_RECI_PROFID_STD").setValueStateText("Enter Valid Profile");
				} else {
					this.getView().byId("KID_RECI_PROFID_STD").setValueState("Error");
					this.getView().byId("KID_RECI_PROFID_STD").setValueStateText("Enter Profile");
				}
			}
			if (vMaterial === "" || this.getView().byId("KID_RECI_MATNR").getValueState() === "Error") {
				retMsg = false;
				if (this.getView().byId("KID_RECI_MATNR").getValueState() === "Error") {
					ErrorHandler.showCustomSnackbar("Please Enter Mandatory Fields", "Error", this);
					this.getView().byId("KID_RECI_MATNR").setValueState("Error");
					this.getView().byId("KID_RECI_MATNR").setValueStateText("Enter Valid Material Number");
				} else {
					this.getView().byId("KID_RECI_MATNR").setValueState("Error");
					this.getView().byId("KID_RECI_MATNR").setValueStateText("Enter Material Number");
				}
			}
			if (vReciDes === "" || this.getView().byId("KID_RECI_RECIDES").getValueState() === "Error") {
				retMsg = false;
				if (this.getView().byId("KID_RECI_RECIDES").getValueState() === "Error") {
					ErrorHandler.showCustomSnackbar("Please Enter Mandatory Fields", "Error", this);
					this.getView().byId("KID_RECI_RECIDES").setValueState("Error");
					this.getView().byId("KID_RECI_RECIDES").setValueStateText("Enter Valid Recipe Decription");
				} else {
					this.getView().byId("KID_RECI_RECIDES").setValueState("Error");
					this.getView().byId("KID_RECI_RECIDES").setValueStateText("Enter Recipe Decription");
				}
			}
			if (retMsg) {
				this.fnSetParmdata(this.Appid).then(function(Status) {
					if (Status) {
						var oGlobalPam = {};
						var oWFparamData = this.getOwnerComponent().getModel("JM_WfParm").getData();
						var cleanedParamData = {};
						Object.keys(oWFparamData).forEach(function(key) {
							if (key.endsWith("Id")) {
								var newKey = key.slice(0, -2);
								var field = this.byId(oWFparamData[key]);
								var fieldValue = "";
								if (field && field.getValue) {
									fieldValue = field.getValue();
									cleanedParamData[newKey] = fieldValue;
								}
							}
						}, this);
						oGlobalPam = cleanedParamData;
						if (this.Appid !== "RX") {
							this.fnCheckDuplicate();
						} else {
							this.fnCheckParmChangeProcess().then(function(flag) {
								if (flag) {
									oGlobalPam = this.getOwnerComponent().getModel("JM_WfParm");
									oGlobalPam.setData({}); // clear
									oGlobalPam.refresh(true);
									sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_initiator");
								} else {
									ErrorHandler.showCustomSnackbar("WorkFlow not maintained", "Error", this);
								}
							}.bind(this));
						}
					}

				}.bind(this));

			}
		},

		fnCheckParmChangeProcess: function() {
			return new Promise(function(Resolve, Reject) {
				var oKeyDataEntity = this.getOwnerComponent().getModel();
				var KeyDataModel = this.getOwnerComponent().getModel("JM_KeyData").getData();

				// var oGlobalparmData = this.getOwnerComponent().getModel("JM_WfParm").getData();
				// var Parmmodel = JSON.parse(JSON.stringify(oGlobalparmData)); // Deep copy
				var Parmmodel;

				var oWFparamData = this.getOwnerComponent().getModel("JM_WfParm").getData();
				var cleanedParamData = {};
				Object.keys(oWFparamData).forEach(function(key) {
					if (key.endsWith("Id")) {
						var newKey = key.slice(0, -2);
						var field = this.byId(oWFparamData[key]);
						var fieldValue = "";
						if (field && field.getValue) {
							fieldValue = field.getValue();
							cleanedParamData[newKey] = fieldValue;
						}
					}
				}, this);
				Parmmodel = cleanedParamData;

				Parmmodel.Matnr = KeyDataModel.Matnr;
				Parmmodel.Werks = KeyDataModel.Werks;
				Parmmodel.Ind = "V";
				Parmmodel.Nav_Duplicate = [];
				Parmmodel.AppId = "RX";

				busyDialog.open();
				oKeyDataEntity.create("/Recipe_Key_dataSet", Parmmodel, {
					success: function(oData) {
						if (oData.MsgTyp === "S") {
							Resolve(true);
							busyDialog.close();
						} else {
							Resolve(false);
							busyDialog.close();
						}
					}.bind(this),
					error: function(oResponse) {
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
					}.bind(this)
				});
			}.bind(this));
		},

		// *-----------------------------------------------------------------------
		//					Live Change Actions
		// *-----------------------------------------------------------------------

		// live change process for all fields
		fnLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var id = oEvent.getSource().getId().split("--")[1];
			var vValue = oEvent.getSource().getValue();
			this.selectedField = id;
			this.getView().byId(id).setValueState("None");

			if (id === "KID_RECI_RECIDES") {
				oInput.setValue(vValue);
			} else {
				oInput.setValue(vValue.toUpperCase());
				if (id === "KID_RECI_MATNR") {
					this.fnReadf4Cache(id, vValue.toUpperCase().replace(/^0+/, ""), "P");
				} else {
					this.fnReadf4Cache(id, vValue.toUpperCase(), "P");
				}
			}
		},

		// Validate the material plant and field
		fnValidateMaterialPlant: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedField = id;
			this.getView().byId(id).setValueState("None");
			this.getView().byId(this.selectedField).setValueState("None");
			if (id === "KID_RECI_MATNR" && !this.Error) {
				var vPlant = this.getView().byId("KID_RECI_WERKS").getValue();
				this.fnValidatePlant(vPlant);
			}
		},

		// validate the plant field
		fnValidatePlant: function(plant) {
			var KeyDataModel = this.getOwnerComponent().getModel("JM_KeyData").getData();
			this.fnSetParmdata(this.Appid).then(function(Status) {
				if (Status) {
					var Parmmodel = {};
					var oWFparamData = this.getOwnerComponent().getModel("JM_WfParm").getData();
					var cleanedParamData = {};
					Object.keys(oWFparamData).forEach(function(key) {
						if (key.endsWith("Id")) {
							var newKey = key.slice(0, -2);
							// var fieldId = oWFparamData[key].split("_")[1];
							// fieldId = "KID_RECI_" + fieldId;
							var field = this.byId(oWFparamData[key]);
							var fieldValue = "";
							if (field && field.getValue) {
								fieldValue = field.getValue();
								cleanedParamData[newKey] = fieldValue;
							}
						}
					}, this);
					Parmmodel = cleanedParamData;
					Parmmodel.AppId = this.Appid;
					Parmmodel.Matnr = KeyDataModel.Matnr;
					Parmmodel.Werks = KeyDataModel.Werks;
					Parmmodel.Ind = "V";
					Parmmodel.Nav_Duplicate = [];
					var serviceCall = this.getOwnerComponent().getModel();
					serviceCall.create("/Recipe_Key_dataSet", Parmmodel, {
						success: function(oData) {
							if (oData.MsgTyp === "E") {
								this.getView().byId("KID_RECI_WERKS").setValueState("Error");
								this.getView().byId("KID_RECI_WERKS").setValueStateText(oData.MsgLine);
							} else {
								this.getView().byId("KID_RECI_WERKS").setValueState("None");
							}
						}.bind(this),
						error: function(oResponse) {
							var sMessage = ErrorHandler.parseODataError(oResponse);
							ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
						}.bind(this)
					});
				}
			}.bind(this));
			// var oWFparamModel = this.getView().getModel("JM_ParmModel");
			// var oWFparamData = JSON.parse(JSON.stringify(oWFparamModel.getData()));
			// var cleanedParamData = {};
			// Object.keys(oWFparamData).forEach(function(key) {
			// 	if (key.endsWith("Id")) {
			// 		var newKey = key.slice(0, -2);
			// 		var fieldId = oWFparamData[key].split("_")[1];
			// 		fieldId = "KID_RECI_" + fieldId;
			// 		var field = this.byId(fieldId);
			// 		var fieldValue = "";
			// 		if (field && field.getValue) {
			// 			fieldValue = field.getValue();
			// 			cleanedParamData[newKey] = fieldValue;
			// 		}
			// 	}
			// }, this);

			// if (Object.keys(cleanedParamData).length === 0) {
			// this.fnSetParmdata(this.Appid).then(function(Status) {
			// 	// Parmmodel = 
			// 	if (Status) {
			// 		var oWFparamData = this.getOwnerComponent().getModel("JM_WfParm").getData();
			// 		var cleanedParamData = {};
			// 		Object.keys(oWFparamData).forEach(function(key) {
			// 			if (key.endsWith("Id")) {
			// 				var newKey = key.slice(0, -2);
			// 				var fieldId = oWFparamData[key].split("_")[1];
			// 				fieldId = "KID_RECI_" + fieldId;
			// 				var field = this.byId(fieldId);
			// 				var fieldValue = "";
			// 				if (field && field.getValue) {
			// 					fieldValue = field.getValue();
			// 					cleanedParamData[newKey] = fieldValue;
			// 				}
			// 			}
			// 		}, this);

			// 	}
			// }.bind(this));

		},

		// to check the date wheather is avalible in F4 or not
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

		// the and match the description from the F4Cahce
		fnReadf4Cache: function(vId, vValue, f4type) {
			var that = this;
			var match;
			var descriptionField;
			var updateDesc = function(results) {
				if (f4type === "P" || f4type === "X") {
					var aResults = results[0];
					if (aResults.DomvalueL !== "") {
						match = results.find(function(item) {
							return item.DomvalueL === vValue.toUpperCase();
						});
						if (match) {
							that.fnUpdateF4fields(vId, vValue, match.Ddtext);
						} else {
							that.fnUpdateF4fields(vId, vValue, "");
						}
					} else {
						// Default: match Value1/Value2 as usual
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
				}
				var length = that.fnCheckDatavalidation(that.selectedField, vValue);
				if (length === 0 && vValue !== "") {
					that.getView().byId(that.selectedField).setValueState("Error");
					that.getView().byId(that.selectedField).setValueStateText(vValue + " value is not Avalible");
					that.Error = true;
				} else {
					that.getView().byId(that.selectedField).setValueState("None");
					that.Error = false;
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

		// to get the f4 Description field
		f4descriptionGet: function(vId, value, f4type, fnCallback) {
			var that = this;
			// var filter;
			var oPayload = {
				FieldId: vId,
				F4Type: f4type,
				Process: "K"
			};
			oPayload.NavSerchResult = [];
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			oModel.create("/SearchHelpSet", oPayload, {
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

		// *-----------------------------------------------------------------------
		//					f4 function logic
		// *-----------------------------------------------------------------------

		// when plant f4 press
		fnPlantF4press: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedField = id;
			var vMaterial = this.getView().byId("KID_RECI_MATNR").getValue();
			if (vMaterial === "") {
				ErrorHandler.showCustomSnackbar(i18n.getText("EnterMatError"), "Error");
			} else {
				// var Matnr = this.getView().byId("KID_BOM_MATNR").getValue();
				vMaterial = isNaN(vMaterial) ? vMaterial : vMaterial.padStart(18, "0");
				this.fnBindFilterTextF4model("P", "KID_RECI_WERKS_MAT", "K", vMaterial, oEvent);
			}
		},

		// bind the plant filtered data
		fnBindFilterTextF4model: function(SearchHelp, sitem, process, material, oEvent) {
			var oLabels = {};
			var oJsonModel;
			var vTitle;
			var vLength;
			this.sitem = sitem;
			var aFormattedRows = [];
			var oPayload = {
				FieldId: sitem,
				Process: process,
				F4Type: SearchHelp,
				FieldNam1: "MATNR",
				Value1: material
			};
			oPayload.NavSerchResult = [];
			var serviceCall = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			serviceCall.create("/SearchHelpSet", oPayload, {
				success: function(oData) {
					var aResults = oData.NavSerchResult.results;
					if (aResults.length > 0) {
						var oFirst = aResults[0];
						if (oFirst && (oFirst.DomvalueL || oFirst.Ddtext)) {
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								ErrorHandler.showCustomSnackbar(oFirst.Message, "Error", this);
								busyDialog.close();
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
							this.getView().setModel(oJsonModel, "JM_F4Model");
							vTitle = sap.ui.getCore().byId(this.sitem + "_TXT").getText() + " (" + vLength + ")";
							busyDialog.close();
							this.fnF4fragopen(oEvent, vTitle).open();
						} else {
							vLength = oData.NavSerchResult.results.length;
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
							if (this.selectedField === "KID_RECI_PROFID_STD") {
								aResults
									.filter(function(item) {
										return item.Value3 === "C"; // only keep items where Value3 is "C"
									})
									.forEach(function(item) {
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
							} else {
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
							}
							oJsonModel = new sap.ui.model.json.JSONModel({
								labels: oLabels,
								rows: aFormattedRows
							});
							this.getView().setModel(oJsonModel, "JM_F4Model");
							this.getView().getModel("JM_F4Model");
							vTitle = this.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";
							this.fnF4fragopen(oEvent, vTitle).open();
							busyDialog.close();
						}
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

		// common f4 press for all fields
		fnF4press: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedField = id;
			this.bindTextF4model("P", id, "K", oEvent);
		},

		// common f4 bind the data to the JM_F4model
		bindTextF4model: function(SearchHelp, sitem, process, oEvent) {
			var oJsonModel;
			var vTitle;
			var oLabels = {};
			var vLength;
			var aFormattedRows = [];
			var that = this;
			var oPayload = {
				FieldId: sitem,
				Process: process,
				F4Type: SearchHelp
			};
			oPayload.NavSerchResult = [];
			busyDialog.open();
			var omodel1 = that.getOwnerComponent().getModel("JMConfig");
			omodel1.create("/SearchHelpSet", oPayload, {
				// filters: filter,
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
							busyDialog.close();
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

							if (that.selectedField === "KID_RECI_PROFID_STD") {
								aResults
									.filter(function(item) {
										return item.Value3 === "C"; // only keep items where Value3 is "C"
									})
									.forEach(function(item) {
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
							} else {
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
							}
							oJsonModel = new sap.ui.model.json.JSONModel({
								labels: oLabels,
								rows: aFormattedRows
							});
							that.getView().setModel(oJsonModel, "JM_F4Model");
							that.getView().getModel("JM_F4Model");
							vTitle = that.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";
							busyDialog.close();
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

		// data press from F4 dialog
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
			this.getView().byId(this.selectedField + "_DES").setValue(item1);
			if (this.selectedField === "KID_RECI_WERKS") {
				this.fnValidatePlant(this.getView().byId("KID_RECI_WERKS").getValue());
			}
			this.fnAfterCloseFragment();
		},

		// to open the fragment 
		fnF4fragopen: function(oEvent, vTitle) {
			if (!this.f4HelpFrag) {
				this.f4HelpFrag = sap.ui.xmlfragment(this.getView().getId(), "MANAGED_RECIPE.fragment.F4Help", this);
				this.getView().addDependent(this.f4HelpFrag);
			}
			this.f4HelpFrag.setTitle(vTitle);
			return this.f4HelpFrag;
		},

		// to close the fragment 
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

		// Value hel in the f4 dialog
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

		// *-----------------------------------------------------------------------
		//					Recipe Duplicate Dialog Open and Close
		// *-----------------------------------------------------------------------

		// check duplicate recipe in the funtion logic
		fnCheckDuplicate: function() {
			var oKeyDataEntity = this.getOwnerComponent().getModel();
			var KeyDataModel = this.getOwnerComponent().getModel("JM_KeyData").getData();

			// var oGlobalparmData = this.getOwnerComponent().getModel("JM_WfParm").getData();
			var cleanedParamData = {};
			var oGlobalparmData = this.getOwnerComponent().getModel("JM_WfParm").getData();
			Object.keys(oGlobalparmData).forEach(function(key) {
				if (key.endsWith("Id")) {
					var newKey = key.slice(0, -2);
					var field = this.byId(oGlobalparmData[key]);
					var fieldValue = "";
					if (field && field.getValue) {
						fieldValue = field.getValue();
						cleanedParamData[newKey] = fieldValue;
					}
				}
			}, this);

			var Parmmodel = cleanedParamData;
			Parmmodel.AppId = this.Appid;
			Parmmodel.Matnr = KeyDataModel.Matnr;
			Parmmodel.Werks = KeyDataModel.Werks;
			Parmmodel.Ind = "V";
			Parmmodel.Nav_Duplicate = [];

			busyDialog.open();
			oKeyDataEntity.create("/Recipe_Key_dataSet", Parmmodel, {
				success: function(oData) {
					if (oData.MsgTyp === "S") {
						var length = oData.Nav_Duplicate.results.length;
						var aData = {
							Duplicate: oData.Nav_Duplicate.results,
							length: "(" + length + ")"
						};
						var oModel = new sap.ui.model.json.JSONModel(aData);
						this.getView().setModel(oModel, "JM_ReciDuplicate");
						if (length === 0) {
							sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_initiator");
							busyDialog.close();
						} else {
							this.fnReciDuplicate();
							busyDialog.close();
						}
					} else {
						this.getView().byId("KID_RECI_WERKS").setValueState("Error");
						this.getView().byId("KID_RECI_WERKS").setValueStateText(oData.MsgLine);
						ErrorHandler.showCustomSnackbar(oData.MsgLine, "Error", this);
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

		// to open recipe duplicate fragment
		fnReciDuplicate: function() {
			if (!this.duplicateDialog) {
				this.duplicateDialog = sap.ui.xmlfragment(this.getView().getId(),
					"MANAGED_RECIPE.Fragment.reci_duplicate", // Fragment name
					this // Pass controller instance
				);
				this.getView().addDependent(this.duplicateDialog);
			}
			this.getView().byId("id_dupSubmit").setVisible(true);
			this.duplicateDialog.open();
		},

		// to close the recipe duplicate fragment
		fncloseDialog: function() {
			if (this.duplicateDialog) {
				this.duplicateDialog.close();
				this.duplicateDialog.destroy();
				this.duplicateDialog = null;
			}
		},

		// to clear all the field in the keydata
		fnClearallFields: function() {
			this.getView().byId("KID_RECI_MATNR").setValue("");
			this.getView().byId("KID_RECI_MATNR_DES").setValue("");
			this.getView().byId("KID_RECI_MATNR").setValueState("None");
			this.getView().byId("KID_RECI_WERKS").setValue("");
			this.getView().byId("KID_RECI_WERKS_DES").setValue("");
			this.getView().byId("KID_RECI_WERKS").setValueState("None");
			this.getView().byId("KID_RECI_PROFID_STD").setValue("");
			this.getView().byId("KID_RECI_PROFID_STD_DES").setValue("");
			this.getView().byId("KID_RECI_PROFID_STD").setValueState("None");
			this.getView().byId("KID_RECI_RECIDES").setValue("");
			this.getView().byId("KID_RECI_RECIDES").setValueState("None");
			var oWfparm = this.getOwnerComponent().getModel("JM_WfParm");
			oWfparm.setData({}); // replaces the data
			oWfparm.refresh(true); // updates the bindings
			oWfparm = this.getOwnerComponent().getModel("JM_KeyData");
			oWfparm.setData({}); // replaces the data
			oWfparm.refresh(true); // updates the bindings
		},

		// after close duplicate fragment navigate to the initiator
		fnNavInitiator: function() {
			if (this.duplicateDialog) {
				this.duplicateDialog.close();
				this.duplicateDialog.destroy();
				this.duplicateDialog = null;
			}

			var cleanedParamData = {};
			var oGlobalparmData = this.getOwnerComponent().getModel("JM_WfParm").getData();
			Object.keys(oGlobalparmData).forEach(function(key) {
				if (key.endsWith("Id")) {
					var newKey = key.slice(0, -2);
					var field = this.byId(oGlobalparmData[key]);
					var fieldValue = "";
					if (field && field.getValue) {
						fieldValue = field.getValue();
						cleanedParamData[newKey] = fieldValue;
					}
				}
			}, this);
			var oWfparm = this.getOwnerComponent().getModel("JM_WfParm");
			oWfparm.setData(cleanedParamData); // replaces the data
			oWfparm.refresh(true); // updates the bindings
			sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_initiator");
		},

		// when cancel press function logics
		fnCancel: function() {
			this.fnClearallFields();
			sap.ui.core.UIComponent.getRouterFor(this).navTo("reci_search");
		},

		// to set the parm value in the JM_Wfparm model
		fnSetParmdata: function(appid) {
			return new Promise(function(Resolve, Reject) {
				var oWFParmSet = this.getOwnerComponent().getModel("JMConfig");
				busyDialog.open();
				oWFParmSet.read("/WFParmSet", {
					filters: [
						new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, appid)
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
									oMatchedParams[sKey] = sVal.trim();
								}
							}
						});
						// oMatchedParams.AppId = oEntry.AppId;

						// bind the model for the next view
						var oWfparm = this.getOwnerComponent().getModel("JM_WfParm");
						oWfparm.setData(oMatchedParams); // replaces the data
						oWfparm.refresh(true); // updates the bindings
						Resolve(true);
						busyDialog.close();
					}.bind(this),
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
					}.bind(this)
				});
			}.bind(this));

		},
		// fnMobileViewChanges: function() {
		// 	this.getView().getModel("RoadMapUI").setProperty("/labelVisible", false);
		// 	this.getView().byId("id_roadmap").removeStyleClass("cl_roadmap");
		// 	this.getView().byId("id_roadmap").addStyleClass("cl_roadmapSS");
		// 	this.getView().byId("id_roadmapHighlighter").removeStyleClass("cl_Highlightborder_roadMap");
		// 	this.getView().byId("id_roadmapHighlighter").addStyleClass("cl_Highlightborder_roadMapSS");
		// },
		// fnTabDesktopViewChanges: function() {
		// 	this.getView().getModel("RoadMapUI").setProperty("/labelVisible", true);
		// 	this.getView().byId("id_roadmap").removeStyleClass("cl_roadmapSS");
		// 	this.getView().byId("id_roadmap").addStyleClass("cl_roadmap");
		// 	this.getView().byId("id_roadmapHighlighter").removeStyleClass("cl_Highlightborder_roadMapSS");
		// 	this.getView().byId("id_roadmapHighlighter").addStyleClass("cl_Highlightborder_roadMap");
		// },
		// _onResize: function() {
		// 	var oRange = sap.ui.Device.media.getCurrentRange(sap.ui.Device.media.RANGESETS.SAP_STANDARD);

		// 	if (oRange.name === "Phone") {
		// 		this.fnMobileViewChanges();
		// 	} else {
		// 		this.fnTabDesktopViewChanges();
		// 	}
		// }
	});
});