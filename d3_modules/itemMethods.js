var exports = module.exports = {

	isJewlery : function(itemType) {
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
	doesCurrentHaveMoreGems : function (currentItem, equippedItem) {
		if (currentItem.gems.length > equippedItem.Gems.length) {
			// console.log("has more gems");
			return true;
		}
		else {
			// console.log("doesnt have more gems");
			return false;
		}
	},

	isGemCountZero : function (currentItem) {
		if (currentItem.gems.length == 0) {
			return true;
		}
		else {
			// console.log("has gems");
			return false;
		}
	},

	sameGemCount : function (currentItem, equippedItem) {
		if (currentItem.gems.length == currentItem.gems.length) {
			return true;
		}
		else {
			console.log("different gem counts current:" + currentItem + " equipped:" + equippedItem );
			return false;
		}
	}
	
}