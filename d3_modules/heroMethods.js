var exports = module.exports = {};
var request = require("request");
var mongo = require("mongodb");
var gemMethods = require("../d3_modules/gemMethods.js");
var itemMethods = require("../d3_modules/itemMethods.js");
var async = require("async");
var MongoClient = mongo.MongoClient;

var databaseURL = process.env.DBURL || "mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders";
var apiKey = process.env.APIKEY || "y34m8hav4zpvrezvrs6xhgjh6uphqa5r";
var region = "us";
var apiURL = ".api.battle.net/d3/"
var locale = "en_US";


var itemDelayCounter = 0;
function itemDelay() {
	itemDelayCounter++;
	return (1000 * itemDelayCounter);
}


//localhost:3000/player/:battletag/hero/:heroID
//for a given heroID, it searches heroCollection, and renders hero's page.  if not in data base, make an API request
exports.getHeroDetails = function(heroID, req, res) {
	// console.log("https://" + region + apiURL + "/profile/" + battletag + "/?locale=" + locale + "&apikey=" + apiKey  );
	var heroRequestURL = "https://" + region + apiURL + "/profile/" +req.params.battletag+"/hero/"+heroID+"?locale="+locale+"&apikey="+apiKey;

	date = new Date();
	console.log(heroID + " Page before request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());

//Takes 200ms.  Only has information from DB.  Not always up to Date
	MongoClient.connect(databaseURL, function(err, db) {
		if (err) {
			return console.log("getHeroDetails error connecting to db")
		}
		else {
			heroCollection = db.collection("hero");
			heroCollection.find({"heroID" : parseInt(heroID)}).toArray(function(err, matchedHero) {
				if (matchedHero.length > 0) {
					var heroData = matchedHero[0];
					var heroItems = heroData.items;
					//add items to DB if extraItemData is undefined
					if (heroData.level == 70 && heroData.extraItemData == undefined) {
						exports.getItemIDsFromHero(heroItems,heroID,10);
					}
					res.render("hero.ejs", {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems, ejs_heroID : heroID})
					date = new Date();
					console.log(heroID + " Page after request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
				}
				//not in database.  must request data from Blizzard site.
				else {
					request(heroRequestURL, function (error, response, data) {
						var heroData = JSON.parse(data);
						var heroItems = heroData.items;
						if (heroData.level == 70) {
							exports.getItemIDsFromHero(heroItems,heroID,10);
						}
						res.render("hero.ejs", {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems, ejs_heroID : heroID})
						date = new Date();
						console.log(heroID + " Page after request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
					});
				}
			});
		}
	});
//Takes about same time.  Can crash if too many requests were 
}

//get all items from json heroItems, and call findItemInCollection for each.
exports.getItemIDsFromHero = function(heroItems, heroID, delay) {
	MongoClient.connect(databaseURL, function(err, db) {
		if (err) {
			return console.log("getHeroDetails error connecting to db")
			getItemIDsFromHero(heroItems, heroID, delay);
		}
		else {
			db.collection("item").find({}).toArray(function(err, results) {
				// console.log(results);
				// asdfas
			})
			var allItems = [];

			for (item in heroItems) {
				if (heroItems.hasOwnProperty(item)) {
					if (heroItems[item] != null) {
						allItems.push(heroItems[item]);
					}
				}
			}
			
			if (db != undefined) {

				findItemsInCollection(allItems, heroID, delay, db);

				// allItems.forEach(function(item, i) {
				// 	console.log(item.name + " " + i + " delay " + delay);
				// 	itemID = item.tooltipParams.replace("item/" , "");
				// 	findItemInCollection(itemID, heroID, delay ,db);
				// 	delay = delay + 100;
				// 	i++;
				// });
		// console.log("delay " + delay + " itemsLength: " + items.length)
		// findItemsInCollection(items, heroID, delay, db);

			}
			else {
				console.log("db was null");
				exports.getItemIDsFromHero(heroItems, heroID, delay);
				adfas
			}
		}
	});
}

function findItemsInCollection(allItems, heroID, delay, db){
	console.log("passed in delay "+ delay );
	
	async.series([ 

		function(addedExtraInfoCallback) {
			async.each(allItems, function (currentItem, foundItemCallback) {
			// allItems.forEach(function (currentItem) {
				//database error handling
				if (db == undefined) {
					MongoClient.connect(databaseURL, function(err, db) {
						if (err) {
							findItemInCollection(currentItem, heroID, delay, db);	
							return console.log("findItem error connecting to db", err)
						}
						console.log("db was undefined")
						findItemInCollection(currentItem, heroID, delay, db);	
					
					});
				}

				else {
					//wrap delay to preserve
					(function (delay) {
						itemID = currentItem.tooltipParams.replace("item/" , "");
						var itemCollection = db.collection("item");
						var itemRequestURL = "https://us.api.battle.net/d3/data/item/" + itemID + "?locale=" + locale + "&apikey=" + apiKey;
						//make Request
						setTimeout( function() {
							request(itemRequestURL, function (error, response, data) {
								if (data == undefined) {
									console.log("undefined, findItemInCOllection")
									findItemInCollection(itemID, heroID, delay+1000, foundItemCallback);	
								}
								else {
									requestedItem = JSON.parse(data);
									if (requestedItem.code == 403) {
										console.log("403 " + delay + " , findItemsInCollection " + currentItem.name + " " + heroID)
										findItemInCollection(itemID, heroID, delay+1000, foundItemCallback);
									}
									else{

										(function(requestedItem) {
											var requestedItemType = itemMethods.getItemType(requestedItem.type.id);
											console.log(delay + " findItems in request " +requestedItem.name + " " + heroID);
											//find if hero has an item in that spot.  if there is check for differences.
											itemCollection.find({"heroID": parseInt(heroID) , "type" :requestedItemType}).toArray(function(err, matchedItems) {
												if (matchedItems.length != 0) {

													//check to see if player has only one ring, and if its not the same as the ring in DB, add it
													if (itemMethods.isRing(requestedItemType)) {
														if (matchedItems.length == 1 && matchedItems[0].itemID != itemID) {
															console.log("Inserted 2nd ring");
															insertInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
														}
													}

													async.each(matchedItems, function (equippedItem, foundItemCallback) {
														if (equippedItem.itemID == undefined) {
															console.log(equippedItem[0]);
														}
														compareItems(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback);
													}, function(err) {
														if (err) {
															console.log("failed")
														} else {
															console.log("successfully found all Items")
														}
													});

												}//end if found a item in that spot

												//there no item in that spot, insert
												else {
													insertInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
												}//end insertion		
											});//end itemcollection find
										})(requestedItem);//end self-invoking function
									}//end else json had data	
								}//end else data was not undefined			
							});//end request
						},delay) ;//end settimeout
					})(delay);
					delay += 300;	
				}
			},	function(err) {
					if (err) {
						console.log("error")
					}
					else {
						console.log("succesfully checked all items in database for hero " + heroID + " getting important stats");
						getImportantStats(heroID, addedExtraInfoCallback);
					}
				}
			);//end async.each
		},

		function(redirectCallback) {
			console.log("importantstats added.  redirected");
			redirectCallback();
		}
		], function(err) {
			if (err) {
				return console.log("error");
			}
			else {	
				console.log("successfully redirected");
			}
		});
}
function getImportantStats(heroID, updatedStatsCallback) {
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
					console.log(currentItem.name)
					//get CDR from hat
					if (currentItem.type == "Head") {
						//if it has a diamond
						if ((currentItem.gems[0].item.name).indexOf("Diamond") != -1) {
							diamondText = currentItem.gems[0].attributes.primary[0].text;
							diamondCooldown = parseFloat(diamondText.substring(diamondText.indexOf("by ") + 3, diamondText.length-2));
						}

						if (currentItem.name == "Leoric's Crown") {
							currentItem.affixes.secondary.forEach(function (secondary) {
								if (secondary.color == "orange") {
									diamondCooldown = diamondCooldown * (1 + parseFloat(secondary.text.substring(secondary.text.indexOf("by ") + 3, secondary.text.length-2)/100));
								}
							});
						}
					}
					//get eliteDam from Furnace
					if (currentItem.name == "The Furnace") {
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
							"gRiftHero" : true,
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
					updatedStatsCallback();
				});
			});//end  finditem for hero
		}//end else
	});	//end connection
}

//Looks for an itemID, make an API request, and compare that itemType(ring, chest, feet, etc.) to the itemType in database.
//if they are different, equip requested, unequip DB.  If they are same, check for difference(gems, enchants)
//If item is not found in collection, add it.
//Need to Fix dual-wielding, and 1h + offhand and 2H
	//if onehanded weapon
	//if class is DH, if no quiver, add second bow.
	//if class is barb or monk, check offhand
function findItemInCollection(itemID, heroID, delay, db, foundItemCallback){
	if (db == undefined) {
		MongoClient.connect(databaseURL, function(err, db) {
			if (err) {
				findItemInCollection(itemID, heroID, delay, db, foundItemCallback);	
				return console.log("findItem error connecting to db", err)
			}

			findItemInCollection(itemID, heroID, delay, db, foundItemCallback);	
		
		});
	}
	else {
		var itemCollection = db.collection("item");
		var itemRequestURL = "https://us.api.battle.net/d3/data/item/" + itemID + "?locale=" + locale + "&apikey=" + apiKey;
		// var itemRequestURL = "https://"+region+".api.battle.net/d3/data/item/" + itemID + "?locale=" + locale + "&apikey=" + apiKey;

		setTimeout( function() {
		console.log(itemID)
			request(itemRequestURL, function (error, response, data) {
				if (data == undefined) {
					findItemInCollection(itemID,heroID,delay+1000);	
				}
				else {
					requestedItem = JSON.parse(data);
					if (requestedItem.code == 403) {
						findItemInCollection(itemID,heroID,delay+1000);
					}
					else{

						(function(requestedItem) {
							var requestedItemType = itemMethods.getItemType(requestedItem.type.id);
							console.log(delay + " findItem in request " +requestedItem.name + " " + requestedItemType);
							//find if hero has an item in that spot.  if there is check for differences.
							itemCollection.find({"heroID": parseInt(heroID) , "type" :requestedItemType}).toArray(function(err, matchedItems) {
								if (matchedItems.length != 0) {

									//check to see if player has only one ring, and if its not the same as the ring in DB, add it
									if (itemMethods.isRing(requestedItemType)) {
										if (matchedItems.length == 1 && matchedItems[0].itemID != itemID) {
											console.log("Inserted 2nd ring");
											insertInItemCollection(itemCollection, currentItem, heroID, callback);
										}
									}

									async.each(matchedItems, function (equippedItem, foundItemCallback) {
										if (equippedItem.itemID == undefined) {
											console.log(equippedItem[0]);
										}
										compareItems(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback);
									}, function(err) {
										if (err) {
											console.log("failed")
										} else {
											console.log("successfully found all Items")
										}
									});
								}//end if found a item in that spot
								//there no item in that spot, update
								else {
									insertInItemCollection(itemCollection, currentItem, heroID, callback);
								}//end insertion		
							});//end itemcollection find
						})(requestedItem);//end self-invoking function
					}//end else json had data	
				}//end else data was not undefined			
			});//end request
		},delay);//end settimeout

	}
}

function compareItems(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback) {
	var requestedItemType = itemMethods.getItemType(requestedItem.type.id);

	console.log("comparing items " + equippedItem.name + " " + requestedItem.name);

	//if equippedItem and requestItem have same ID, check for differences.
	//If no new enchants, check if it is socketable to check gems.
	if (equippedItem.itemID == requestedItem.tooltipParams.replace("item/" , "")) {
		if (!itemMethods.hasNewEnchant(requestedItem, equippedItem)) {											
			//If replacement has more gems update it
			if (itemMethods.isSocketable(requestedItemType)) {
				if(itemMethods.doesRequestedHaveMoreGems(requestedItem, equippedItem)) {
					updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
				}

				//did not have more Gems, so it could have less or same.  Check if same count and not 0.
				else { 
					if (!itemMethods.isGemCountZero(requestedItem) && itemMethods.sameGemCount(requestedItem, equippedItem)) {
						var requestedGems = requestedItem.gems;
						var equippedGems = equippedItem.gems;
						//Had gems so compare them based on item type.
						if (!gemMethods.sameGems(requestedGems, equippedGems)) {

							//if item is hat, if equipped gem is not a diamond or amethyst and requested is, update
							if (itemMethods.isHat(requestedItemType)) {
								if (!gemMethods.isHatGemUtility(equippedGems) && gemMethods.isHatGemUtility(requestedGems)) {
									updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
								}
								else {
									console.log("foundItemCallback called 490");
									foundItemCallback();
								}
								
							}//end if item was hat

							//if Ring or Amulet, first check if both jewels are legendary.
							//then check if currently using Boon of Hoarder.
							else if (itemMethods.isJewlery(requestedItemType)) {
								if (gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {
									//If gem was boon, update if requested has a higher rank or not boon
									if (gemMethods.isGemBoon(equippedGems[0])) {
										if (gemMethods.requestedRankHigher(requestedGems[0], equippedGems[0]) || !gemMethods.isGemBoon(requestedGems[0])) {
											updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
										}
										else {
											console.log("foundItemCallback called 506");
											foundItemCallback();
										}
									}
									//If Gem was not boon, update if request has higher rank
									else {
										//if rank was higher, update
										if (gemMethods.requestedRankHigher(requestedGems[0], equippedGems[0])) {
											updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
										}
										else {
											console.log("foundItemCallback called 517");
											foundItemCallback();
										}
									}
								}
								//If equipped gem is not legendary but requested is, update
								else if (!gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {
									updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
								}
								else {
									console.log("foundItemCallback called 527");
									foundItemCallback();
								}
							}//end if item was ring or neck
							
							//if item is a weapon,
							else {
								console.log("foundItemCallback called 534");
								foundItemCallback();
							}
						}//end if had gems and gems were same
						else {
							console.log("foundItemCallback called 539");
							foundItemCallback();
						}

					}//end if item had gems and had same gemcount
					
					else {
						console.log("foundItemCallback called 546");
						foundItemCallback();
					}
				}//end else item did not have more gems
			}//end if item is socketable
			else {
				console.log("foundItemCallback called 552");
				foundItemCallback();
			}
		}//end if item did not have new enchant

		//Updating because item had a new enchant
		else {
			updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
		}
	}//end if items are the same


	//Item is not the same, update+unequip socketable items if there are more gems in request.
	else {
		if (itemMethods.isSocketable(requestedItemType)) {
			if(itemMethods.doesRequestedHaveMoreGems(requestedItem, equippedItem)) {
				updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
				unequipItem(itemCollection, equippedItem, heroID);
			}

			//Update+unequip itemif gem in request has better stats
			else { 
				//if item actually has gems, and have same gemCount  
				if (!itemMethods.isGemCountZero(requestedItem) && itemMethods.sameGemCount(requestedItem, equippedItem)) {
					var requestedGems = requestedItem.gems;
					var equippedGems = equippedItem.gems;
					if (!gemMethods.sameGems(requestedGems, equippedGems)) {
						
						if (itemMethods.isHat(requestedItemType)) {
							if (!gemMethods.isHatGemUtility(equippedGems) && gemMethods.isHatGemUtility(requestedGems)) {
								updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
								unequipItem(itemCollection, equippedItem, heroID);
							}
						}//end if item was hat

						//If Jewelry, compare gems
						if (itemMethods.isJewlery(requestedItemType)) {
							if (gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {
								if (gemMethods.isGemBoon(equippedGems[0])) {
									//if replacement is not boon or has a higher rank, replace  
									if (gemMethods.requestedRankHigher(requestedGems[0], equippedGems[0]) || !gemMethods.isGemBoon(requestedGems[0])) {
										updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
										unequipItem(itemCollection, equippedItem, heroID);
									}
								}
								//If equipped was not Boon, compare.
								else {
									//gets called before finishes updating
									if (itemMethods.isRing(requestedItemType)) {
										delay = 1000;
										setTimeout( function() {
											//COMPARE STATS, for now update+unequip
											itemCollection.find( {"itemID" :equippedItem.itemID} ).toArray(function(err, matchedRings) {
												if (matchedRings.length == 2) {
													console.log("two matching rings "+ equippedItem.name + "  equipping " + requestedItem.name);
													updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
													unequipItem(itemCollection, equippedItem, heroID);
												}
											});
										},delay);


									}
									//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!not a ring
									else { //CHANGE THIS LATER.  RING WILL NOT UPDATE IF THERE WAS HIGHER RANK
										//Update if rank was higher.  !!!!ADD if same rank, compare stats
										if (gemMethods.requestedRankHigher(requestedGems[0], equippedGems[0])) {
											console.log("---here " + delay);
											updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
											unequipItem(itemCollection, equippedItem, heroID);
										}
									}
								}
							}
							//Update+unequip if equipped is nonLeg and requested is
							else if (!gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {
								updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
								unequipItem(itemCollection, equippedItem, heroID);
							}
						}//end if item was ring or neck
						//ADD if item is a weapon,
					}//end if gems were not same

					//!!!!!!TO DOgems were same compare itemstats
					else {
						updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
						unequipItem(itemCollection, equippedItem, heroID);
					}
				}//end if item had gems, and had same gemcount
			}//end if item did not have more gems
		}//end if item is socketable

		//!!!not a socketable item
		//!!!TO DOcompare stats
		else {
			updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
			unequipItem(itemCollection, equippedItem, heroID);
		}
	}//end if item was not the same

}

function updateInItemCollection(itemCollection, currentItem, heroID, callback) {
	itemCollection.update({"heroID": parseInt(heroID) , "type" :itemMethods.getItemType(currentItem.type.id)}, {"itemID" : currentItem.tooltipParams.replace("item/",""), "name" : currentItem.name, "displayColor" : currentItem.displayColor, "type" : itemMethods.getItemType(currentItem.type.id), "affixes" : currentItem.attributes, "randomAffixes" : currentItem.randomAffixes, "gems" : currentItem.gems, "socketEffects" : currentItem.socketEffects, "heroID" : parseInt(heroID), "equipped" : true}, function(err, result) {
		console.log("Successfully updated/equipped " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5));
		console.log("callback called");
		callback();
	});
}

function insertInItemCollection(itemCollection, currentItem, heroID, callback) {
	itemCollection.insert({"itemID" : currentItem.tooltipParams.replace("item/",""), "name" : currentItem.name, "displayColor" : currentItem.displayColor, "type" : itemMethods.getItemType(currentItem.type.id), "affixes" : currentItem.attributes, "randomAffixes" : currentItem.randomAffixes, "gems" : currentItem.gems, "socketEffects" : currentItem.socketEffects, "heroID" : parseInt(heroID), "equipped" : true}, function(err, result) {
		console.log("Successfully inserted " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5));
		console.log("callback called");
		callback();
	});
}

function unequipItem(itemCollection, itemToUnequip, heroID) {
		itemCollection.update({"heroID": parseInt(heroID) , "itemID" : itemToUnequip.itemID },  {$set : {"Equipped" : false}}, function(err, result) {
		console.log("Successfully unequipped " + itemToUnequip.name + " " + itemToUnequip.itemID.substring(0,5));
	});
}

//sets the Region for requests.  used when adding to DB
function getRegion(region) {
	switch (region) {
		case "us":
			locale = "en_US";
			region = "us";
		case "eu":
			locale = "en_GB";
			region = "eu";
		case "tw":
			locale = "zh_TW";
			region = "tw";
		case "kr":
			locale = "ko_KR";
			region = "kr";
	}
}