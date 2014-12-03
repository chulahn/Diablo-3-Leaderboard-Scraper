var exports = module.exports = {

	sameGems : function (requestedGems, equippedGems) {
		return (JSON.stringify(requestedGems) === JSON.stringify(equippedGems));
	}, 

	isHatGemUtility : function (hatGem) {
		if (hatGem[0].item.id.indexOf("Amethyst") != -1 || hatGem[0].item.id.indexOf("Diamond")) {
			return true;
		}
		else {
			console.log("not a ame or diamond " + hatGem[0].item.id);
			return false;
		}
	}, 

	isGemBoon : function (jewelryGem) {
		return (jewelryGem.item.name === "Boon of the Hoarder");
	},

	requestedGemRankHigher : function(requestedGem, equippedGem) {
		return (requestedGem.jewelRank > equippedGem.jewelRank);
	},

	sameRank : function(requestedGem, equippedGem) {
		return (requestedGem.jewelRank === equippedGem.jewelRank);
	},

	isGemLegendary : function (jewelryGem) {
		return (jewelryGem.item.displayColor === "orange");
	}
};