var exports = module.exports = {

	sameGems : function (currentGems, equippedGems) {
		if (JSON.stringify(currentGems) == JSON.stringify(equippedGems)) {
			// console.log("has the same gems");
			return true;
		}
		else {
			return false;
		}
	}, 

	isHatGemUtility : function (hatGem) {
		if (hatGem[0].item.id.indexOf("Amethyst") != -1 || hatGem[0].item.id.indexOf("Diamond")) {
			return true;
		}
		else {
			console.log("not a ame or diamond " + currenItem.gems[0].item.id);
			return false;
		}
	}, 

	isGemBoon : function (jewelryGem) {
		if (jewelryGem.item.name == "Boon of the Hoarder") {
			return true;
		}
		else {
			return false;
		}
	},

	currentRankHigher : function(currentGem, equippedGem) {
		if (currentGem.jewelRank > equippedGem.jewelRank) {
			return true;
		}
		else {
			return false;
		}
	},

	sameRank : function(currentGem, equippedGem) {
		if (currentGem.jewelRank == equippedGem.jewelRank) {
			return true;
		}
		else {
			return false;
		}
	},

	isGemLegendary : function (jewelryGem) {
		if (jewelryGem.item.displayColor == "orange") {
			return true;
		}
		else {
			return false;
		}
	}
};