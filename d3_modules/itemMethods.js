var exports = module.exports = {

	//returns the itemType that will be used when searching collection
	getItemType : function (itemType) {
		itemType = itemType.toLowerCase();
		if (itemType.indexOf("helm") != -1 || itemType.indexOf("mask") != -1 || itemType.indexOf("spiritstone") != -1) {
			return "Head";
		}
		else if (itemType.indexOf("shoulders") != -1) {
			return "Shoulders";
		}
		else if (itemType.indexOf("hand") != -1 || itemType.indexOf("fist") != -1 || itemType.indexOf("mace") != -1 || itemType.indexOf("1h") != -1 || itemType.indexOf("axe") != -1 || itemType.indexOf("wand") != -1 || itemType.indexOf("dagger") != -1) {
			return "1 Hand";
		}
		else if (itemType.indexOf("2h") != -1 || itemType.indexOf("staff") != -1) {
			return "2 Hand";
		}	
		else if (itemType.indexOf("boots") != -1) {
			return "Feet";
		}
		else if (itemType.indexOf("chest") != -1) {
			return "Chest";
		}
		else if (itemType.indexOf("bracers") != -1) {
			return "Bracers";
		}
		else if (itemType.indexOf("legs") != -1) {
			return "Legs";
		}
		else if (itemType.indexOf("amulet") != -1) {
			return "Neck";
		}
		else if (itemType.indexOf("belt") != -1) {
			return "Belt";
		}
		else if (itemType.indexOf("gloves") != -1) {
			return "Hands";
		}
		else if (itemType.indexOf("mojo") != -1 || itemType.indexOf("quiver") != -1 || itemType.indexOf("orb") != -1 || itemType.indexOf("shield") != -1) {
			return "offHand";
		}
		else if (itemType.indexOf("ring") != -1) {
			return "Ring";
		}
	},

	isJewlery : function (itemType) {
		if (itemType == "Ring" || itemType == "Neck") {
			return true;
		}
		else {
			return false;
		}
	},

	isRing : function (itemType) {
		if (itemType == "Ring") {
			return true;
		}
		else {
			return false;
		}
	},

	isHat : function (itemType) {
		if (itemType == "Head") {
			return true;
		}
		else {
			return false;
		}
	},

	isSocketable : function (itemType) {
		if (itemType == "Ring" || itemType == "Neck" || itemType == "1 Hand" || itemType == "2 Hand" || itemType == "Chest" || itemType == "Legs" || itemType == "Head") {
			// console.log("is Socketable");
			return true;
		}
		else {
			return false;
		}
	},

	//currentItem is Requested from API.  equippedItem is item currently in Collection.
	doesRequestedHaveMoreGems : function (requestedItem, equippedItem) {
		if (requestedItem.gems.length > equippedItem.gems.length) {
			// console.log("has more gems");
			return true;
		}
		else {
			// console.log("doesnt have more gems");
			return false;
		}
	},

	isGemCountZero : function (requestedItem) {
		if (requestedItem.gems.length == 0) {
			return true;
		}
		else {
			// console.log("has gems");
			return false;
		}
	},

	sameGemCount : function (requestedItem, equippedItem) {
		if (requestedItem.gems.length == requestedItem.gems.length) {
			return true;
		}
		else {
			console.log("different gem counts requested:" + requestedItem + " equipped:" + equippedItem );
			return false;
		}
	},

	hasNewEnchant : function (requestedItem, equippedItem) {
		if (JSON.stringify(requestedItem.attributes) != JSON.stringify(equippedItem.affixes)) {
			// console.log("----------has new enchant");
			return true;
		}
		else {
			// console.log("--------had same attributes");
			return false;
		}
	}

}