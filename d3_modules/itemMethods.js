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
		else if (itemType.indexOf("2h") != -1 || itemType.indexOf("staff") != -1) {
			return "2 Hand";
		}	
		else if (itemType.indexOf("hand") != -1 || itemType.indexOf("fist") != -1 || itemType.indexOf("mace") != -1 || itemType.indexOf("1h") != -1 || itemType.indexOf("axe") != -1 || itemType.indexOf("wand") != -1 || itemType.indexOf("dagger") != -1) {
			return "1 Hand";
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
		return (itemType === "Ring" || itemType === "Neck");
	},

	isRing : function (itemType) {
		return (itemType === "Ring");
	},

	isHat : function (itemType) {
		return (itemType === "Head");
	},

	isSocketable : function (itemType) {
		return (itemType === "Ring" || itemType === "Neck" || itemType === "1 Hand" || itemType === "2 Hand" || itemType === "Chest" || itemType === "Legs" || itemType === "Head");
	},

	//currentItem is Requested from API.  equippedItem is item currently in Collection.
	doesRequestedHaveMoreGems : function (requestedItem, equippedItem) {

		var requestedGems = 0;
		var equippedGems = 0;

		requestedItem.gems.forEach(function(gem) {
			if (gem !== undefined) {
				requestedGems += 1;
			}
		});
		equippedItem.gems.forEach(function(gem) {
			if (gem !== undefined) {
				equippedGems += 1;
			}
		});

		return (requestedGems > equippedGems);

	},

	isGemCountZero : function (requestedItem) {
		requestedItem.gems.every(function (gem) {
			return (gem === undefined);
		});
	},

	sameGemCount : function (requestedItem, equippedItem) {
		var requestedGems = 0;
		var equippedGems = 0;

		requestedItem.gems.forEach(function(gem) {
			if (gem !== undefined) {
				requestedGems += 1;
			}
		});
		equippedItem.gems.forEach(function(gem) {
			if (gem !== undefined) {
				equippedGems += 1;
			}
		});

		return (requestedGems === equippedGems);

	},

	hasNewEnchant : function (requestedItem, equippedItem) {
		return (JSON.stringify(requestedItem.attributes) !== JSON.stringify(equippedItem.affixes));
	}

}