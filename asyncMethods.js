var heroMethods = require('./d3_modules/heroMethods.js');
var exports = module.exports = {};
var async = require('async')
var mongo = require("mongodb");
var MongoClient = mongo.MongoClient;
var databaseURL = databaseURL || "mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders";

function getImportantStats(heroID) {
	MongoClient.connect(databaseURL, function(err, db) {
		if (err) {
			return console.log("getImportantStats error connecting to db")
		}
		else {
			var itemCollection = db.collection("item");
			var heroCollection = db.collection("hero");
			var eliteDam = 0;
			var cooldown = 0;
			var diamondCooldown = 0;
			//fire,light,cold,arcane,poison,phys
			var elementalDam = [
			["Fire", 0], ["Lightning", 0], ["Cold", 0], ["Arcane", 0], ["Poison", 0], ["Physical", 0]
			];
			var meleeDamRed = 0;
			var rangeDamRed = 0;
			var eliteDamRed = 0;
			console.log("getImportantStats " + heroID);
			itemCollection.find({"heroID" : heroID, "equipped" : true}).toArray(function(error, heroItems) {

				heroItems.forEach(function(currentItem) {
					//get CDR from hat
					if (currentItem.Type == "Head") {
						//if it has a diamond
						if ((currentItem.gems[0].item.name).indexOf("Diamond") != -1) {
							diamondText = currentItem.gems[0].attributes.primary[0].text;
							diamondCooldown = parseFloat(diamondText.substring(diamondText.indexOf("by ") + 3, diamondText.length-2));
						}

						if (currentItem.Name == "Leoric's Crown") {
							currentItem.affixes.secondary.forEach(function (secondary) {
								if (secondary.color == "orange") {
									diamondCooldown = diamondCooldown * (1 + parseFloat(secondary.text.substring(secondary.text.indexOf("by ") + 3, secondary.text.length-2)/100));
								}
							});
						}
					}
					//get eliteDam from Furnace
					if (currentItem.Name == "The Furnace") {
						furnaceElite = currentItem.affixes.passive[0].text;
						furnaceElite = parseFloat(furnaceElite.substring(furnaceElite.indexOf("by ")+3, furnaceElite.length-2));
						console.log(furnaceElite);
						eliteDam += furnaceElite;
					}
					//get CDR and elementalDam
					for (j=0; j<currentItem.affixes.primary.length; j++) {
						//get cooldown reduction from every item
						if (currentItem.affixes.primary[j].text.indexOf("cooldown") != -1) {
							cooldownString = currentItem.affixes.primary[j].text;
							// console.log(currentItem.Name + " " + cooldownString.substring(cooldownString.lastIndexOf(" ")+1,cooldownString.length-2 )+"%");
							cooldown += parseFloat(cooldownString.substring(cooldownString.lastIndexOf(" ")+1,cooldownString.length-2 ));
						}
						//get element damage from every item
						if (currentItem.affixes.primary[j].text.indexOf("skills deal") != -1) {

							skillsString = currentItem.affixes.primary[j].text;
							number = parseInt(skillsString.substring(skillsString.indexOf("deal ")+5, skillsString.indexOf("%")));
							element = skillsString.substring(0, skillsString.indexOf(" skills"));

							switch (element) {
								case "Fire" :
									elementalDam[0][1] += number;
									break;
								case "Cold" :
									elementalDam[1][1] += number;
									break;
								case "Lightning" :
									elementalDam[2][1] += number;
									break;
								case "Poison" :
									elementalDam[3][1] += number;
									break;
								case "Arcane" :
									elementalDam[4][1] += number;
									break;
								case "Physical" :
									elementalDam[5][1] += number;
									break;
							}
						}
						//get elite damage
						if (currentItem.affixes.primary[j].text.indexOf("Increases damage against elites by") != -1) {
							eliteString = currentItem.affixes.primary[j].text;
							eliteString = parseFloat(eliteString.substring(eliteString.indexOf("Increases damage against elites by")+35, eliteString.length-1));
							eliteDam += eliteString;
						}

					}//end for affixes
				});//end for each

				//sorts elemental damages from highest to lowest
				elementalDam.sort(function(a,b) {
					return b[1]-a[1];
				});
				console.log(elementalDam);
				totalCooldown = cooldown + diamondCooldown;
				console.log("total cooldown " + cooldown + " cooldown from hat " + diamondCooldown + " = " + totalCooldown);
				console.log("elite Damage " + eliteDam);
				heroCollection.find({"heroID" : heroID}, function(err, results) {
				})
				heroCollection.update(
					{"heroID" : heroID}, 
					{$set :
						{
							"extraItemData": {
								"cooldown" : totalCooldown,
								"elementalDam" : JSON.parse(JSON.stringify(elementalDam)),
								"eliteDam" : eliteDam
							}
						}//end of extraItemData
					}//end of set 
				, function(err, results) {
					if (err) {
						return console.log(err);
					}
					console.log("added extraItemData");
				});
			});//end  finditem for hero
		}//end else
	});	//end connection
}

exports.getItemsAndExtraData = function(heroID) {

	async.waterfall([

		function getHeroItemsFromDB(callback) {

			MongoClient.connect(databaseURL, function(err, db) {
				if (err) {
					return console.log("getImportantStats error connecting to db")
					exports.getItemAndExtraData(heroID);
				}
				else {
					db.collection("hero").find({"heroID" : heroID}).toArray(function (err, results) {
						callback(null, results[0])	
					});
				}
			});

		},

		//getItemIDS for requests
		function (hero, callback) {

			heroMethods.getItemIDsFromHero(hero.items, hero.heroID, 1000, callback);
			//getItemIDs then calls findItem in collection
			//once all items have been found, callback
			
		},

		//get important data
		function(itemLength, callback) {
			itemCount = 0;
			if (itemCount == itemLength) {
				console.log("finished getItems")
				getImportantStats(heroID);
				callback(null,"done");
			}
			// callback(null, "done");
		}
	],

	function(err, results) {
		console.log("finished");
	});


}