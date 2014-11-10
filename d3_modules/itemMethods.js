var exports = module.exports = {

	//returns the itemType that will be used when searching collection
	getItemType : function (itemType) {
		var itemType = item.type;

		if (itemType.twoHanded === true) {
			return "2 Hand";
		}

		else {
			itemType = itemType.id;
			if (itemType === "VoodooMask" || itemType === "Helm" || itemType === "SpiritStone_Monk") {
				return "Head";
			}
			//shield or crusader shield
			else if (itemType.indexOf("Shield") !== -1 || itemType === "Mojo" || itemType === "Quiver" || itemType === "Orb") {
				return "offHand";
			}
			//dagger and ceremonial
			else if (itemType === "Mace" || itemType.indexOf("Dagger") !== -1 || itemType === "Mace" || itemType === "Flail1H" || itemType === "FistWeapon" || itemType === "Wand" || itemType === "Sword" || itemType === "HandXbow" || itemType === "Axe" || itemType === "Spear") {
				return "1 Hand";
			}
			else if (itemType === "Bracers") {
				return "Wrists";
			}
			else if (itemType === "Gloves") {
				return "Hands";
			}
			else if (itemType === "ChestArmor") {
				return "Chest";
			}
			//belt and mighty belt
			else if (itemType.indexOf("Belt") !== -1) {
				return "Waist";
			}
			else if (itemType === "Ring") {
				return "Finger";
			}
			else if (itemType === "Amulet") {
				return "Neck";
			}
			else if (itemType === "Boots") {
				return "Feet";
			}
			//return legs, shoulders
			else {
				return itemType;
			}
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