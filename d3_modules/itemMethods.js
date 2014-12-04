var exports = module.exports = {

	//returns the itemType that will be used when searching collection
	getItemType : function (item) {
		var itemType = item.type;

		if (itemType.twoHanded === true) {
			return "2 Hand";
		}

		else {
			itemType = itemType.id;
			console.log('-----' + itemType);
			if (itemType === "VoodooMask" || (itemType.indexOf("Helm") !== -1) || itemType === "SpiritStone_Monk") {
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
			else if (itemType.indexOf("Bracers") !== -1) {
				return "Wrists";
			}
			else if (itemType.indexOf("Gloves") !== -1) {
				return "Hands";
			}
			else if (itemType.indexOf("ChestArmor") !== -1) {
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
			//Boots_crusader
			else if (itemType.indexOf("Boots") !== -1) {
				return "Feet";
			}
			//return legs, shoulders
			else if (itemType.indexOf("Shoulders") !== -1) {
				return "Shoulders";
			}
			else if (itemType.indexOf("Legs") !== -1) {
				return "Legs";
			}
		}
	},

	isJewlery : function (itemType) {
		return (itemType === "Finger" || itemType === "Neck");
	},

	isRing : function (itemType) {
		return (itemType === "Finger");
	},

	isHat : function (itemType) {
		return (itemType === "Head");
	},

	isSocketable : function (itemType) {
		return (itemType === "Finger" || itemType === "Neck" || itemType === "1 Hand" || itemType === "2 Hand" || itemType === "Chest" || itemType === "Legs" || itemType === "Head");
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