jQuery.sap.declare("MANAGED_RECIPE.Formatter.formatter");

MANAGED_RECIPE.Formatter.formatter = {
		
	// *-------------------------------------
	//		Dashboard Formater
	// *------------------------------------
	fnDateFormater: function(sDate) {
		if (!sDate) {
			return "";
		}
		// Ensure it's a valid Date object
		var oDate = new Date(sDate);
		// Handle invalid or timezone-shifted dates
		if (isNaN(oDate.getTime())) {
			return sDate; // fallback
		}
		var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
			pattern: "dd.MM.yyyy",
			UTC: true // prevent timezone offset
		});
		return oDateFormat.format(oDate);
	},
	
	formatLevelText: function(sLevel) {
		if (!sLevel) {
			return "";
		}
		// Check if value starts with "L" followed by a number
		if (sLevel.startsWith("L")) {
			return "Level " + sLevel.substring(1);
		}

		// Fallback if not in expected format
		return sLevel;
	},

	fnGetSateForOperaTbl: function(sVornr, oEditableModelData, sField) {
		try {
			var oEditableModel = this.getView().getModel("JM_EditableModel");
			if (!oEditableModel) return "nonEdit";

			var sPath = "/" + sVornr + "/" + sField;
			var sValue = oEditableModel.getProperty(sPath);

			// Return "Edit" or "NonEdit" based on the value
			if (sValue === "Edit" || sValue === "nonEdit" || sValue === "Error") {
				return sValue;
			}
			return "NonEdit"; // default fallback
		} catch (e) {}
	},
	fnEditableState: function(sVornr, oEditableModelData, sField) {
		try {
			var oEditableModel = this.getView().getModel("JM_EditableModel");
			if (!oEditableModel) return "nonEdit";

			var sPath = "/" + sVornr + "/" + sField;
			var sValue = oEditableModel.getProperty(sPath);

			var state = (sValue === "Edit" || sValue === "Error" || sValue === "nonError") ? true : false;
			return state;

		} catch (e) {}
	},

	fnZerosValue: function(value) {
		if (parseFloat(value) === 0) {
			return ""; // return empty string for 0 values
		} else {
			return value; // else return original value
		}
	},
	fnDBformatODataTime: function(oTime) {
		if (!oTime || typeof oTime.ms !== "number") return "";

		var oDate = new Date(null);
		oDate.setMilliseconds(oTime.ms);

		var oFormat = sap.ui.core.format.DateFormat.getTimeInstance({
			pattern: "HH:mm:ss"
		});
		return oFormat.format(oDate);
	},
	fnDBgetStatusIcon: function(sStatus) {

		if (sStatus === "Completed" || sStatus === "Complete") {
			return "Image/CompletedStatus.svg";
		} else if (sStatus === "Requested / Inprogress") { //|| sStatus === "00" || sStatus === "" || sStatus === "01" || sStatus === "04") { 
			// return "Image/InprogressStatus.svg"; 
			return "Image/Drafted.svg";
		} else if (sStatus === "Saved as draft") {
			return "Image/SaveAsDraft.svg";
		} else if (sStatus === "Rejected" || sStatus === "Reject") {
			return "Image/RejectStatus.svg";
		} else if (sStatus === "Sendback") {
			return "Image/sendbackTable.svg";
		}
	},
	fnDBgetLevelStatusIcon: function(sStatus) {

		if (sStatus === "Completed" || sStatus === "Complete") {
			return "Image/CompletedDot.svg";
		} else if (sStatus === "Requested / Inprogress") {
			return "Image/InprogressDot.svg";
		} else if (sStatus === "Saved as draft") {
			return "Image/draftDot.svg";
		} else if (sStatus === "Rejected" || sStatus === "Reject") {
			return "Image/RejectedDot.svg";
		} else if (sStatus === "Sendback") {
			return "Image/senbackDot.svg";
		} else if (sStatus === "Initiated") {
			return "Image/InitiatedDot.svg";
		}
	},
	getStatusClass: function(status) {
		switch (status) {
			case "Completed":
				return "cl_CompletedStatus";
			case "Requested / Inprogress":
				return "cl_statusInprogress";
			case "Rejected":
				return "cl_Rejectstatus";
			case "Complete":
				return "cl_CompletedStatus";
			case "Saved as draft":
				return "cl_draftstatus";
			case "Reject":
				return "cl_Rejectstatus";
			case "Sendback":
				return "cl_sendBack";
			case "Initiated":
				return "cl_initiated";
			default:
				return "statusDefault";
		}
	},
	getRowHighlightClass: function(status) {
		switch (status) {
			case "Completed":
				return "rowGreen";
			case "Requested / Inprogress":
				return "rowRed";
			case "Pending":
				return "rowOrange";
			default:
				return "rowDefault";
		}
	},
	fnremoveLeadingZeros: function(value) {
		if (!value) {
			return value;
		}

		return value.toString().replace(/^0+/, '');
	},
	formatStatusValue: function(sDdtext) {
		// Show only the description (Ddtext) in the ComboBox input
		return sDdtext || "";
	},

	isRXVisible: function() {
		return this.AppId === "RX";
	}.bind(this),

	fnConverStatusToIcon: function (sStatus) {
    var sBasePath = this.getView()
        .getModel("JM_ImageModel")
        .getProperty("/path");

    if (sStatus === "C") {
        return sBasePath + "NodesGrn.svg";
    }

    if (sStatus === "I" || sStatus === "D" || sStatus === "S" || sStatus === "01" || sStatus === "04") {
        return sBasePath + "NodesOrg.svg";
    }

    if (sStatus === "R" || sStatus === "6") {
        return sBasePath + "NodesRed.svg";
    }

    return "";
},
	
	fnConverStatustoTooltip:function(sStatus){
		if (sStatus === "I" ) {
			return "In-progress";
		}else if (sStatus === "D" ) {
			return "Draft";
		}else if (sStatus === "S" ) {
			return "Send Back";
		}else if (sStatus === "C" ) {
			return "Completed";
		}else if (sStatus === "R" ) {
			return "Rejected";
		}
	},
	fnRemoveLeaddingZeros: function(value) {
		if (!value) return "";
		return value.replace(/^0+/, "");
	}

};