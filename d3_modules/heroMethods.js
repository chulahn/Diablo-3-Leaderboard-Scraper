var exports = module.exports = {};
var request = require("request");
var mongo = require('mongodb');
var gemMethods = require('../d3_modules/gemMethods.js');
var itemMethods = require('../d3_modules/itemMethods.js');

var MongoClient = mongo.MongoClient;

var apiKey = "y34m8hav4zpvrezvrs6xhgjh6uphqa5r";
var region = "us";
var apiURL = ".api.battle.net/d3/"
var locale = "en_US";


//localhost:3000/player/:battletag/hero/:heroID
//for a given heroID, it searches heroCollection, and renders hero's page.  if not in data base, make an API request
exports.getHeroDetails = function(heroID, req, res) {
	// console.log("https://" + region + apiURL + "/profile/" + battletag + "/?locale=" + locale + "&apikey=" + apiKey  );
	var heroRequestURL = "https://" + region + apiURL + "/profile/" +req.params.battletag+"/hero/"+heroID+"?locale="+locale+"&apikey="+apiKey;

	date = new Date();
	console.log(heroID + " Page before request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());

//Takes 200ms.  Only has information from DB.  Not always up to Date
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		if (err) {
			return console.log("getHeroDetails error connecting to db")
		}
		else {
			console.log("connected")
			heroCollection = db.collection('hero');
			heroCollection.find({"heroID" : parseInt(heroID)}).toArray(function(err, matchedHero) {
				if (matchedHero.length > 0) {
					var heroData = matchedHero[0];
					var heroItems = heroData.items;
					if (heroData.level == 70) {
						exports.getItemIDsFromHero(heroItems,heroID,10);
					}
					res.render('hero.ejs', {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems, ejs_heroID : heroID})
					date = new Date();
					console.log(heroID + " Page after request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
				}
				//not in database.  must request data from Blizzard site.
				else {
					request(heroRequestURL, function (error, response, data) {
						console.log(data);
						console.log(heroRequestURL);
						var heroData = JSON.parse(data);
						var heroItems = heroData.items;
						if (heroData.level == 70) {
							exports.getItemIDsFromHero(heroItems,heroID,10);
						}
						res.render('hero.ejs', {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems, ejs_heroID : heroID})
						date = new Date();
						console.log(heroID + " Page after request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
					});
				}
			});
		}
	});
//Takes about same time.  Can crash if too many requests were 
/*
	request(heroRequestURL, function (error, response, data) {
		//string to json
		var heroData = JSON.parse(data);
		var heroItems = heroData.items;
		if (heroData.level == 70) {
			exports.getItemIDsFromHero(heroItems,heroID,10);
		}
		res.render('hero.ejs', {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems})
		date = new Date();
		console.log(heroID + " Page after request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
	});
*/
}

//get all items from heroItems, and call findItemInCollection for each.
exports.getItemIDsFromHero = function(heroItems, heroID, delay) {
	var allItems = [];
	if (heroItems.rightFinger != null) {
		allItems.push(heroItems.rightFinger);
	}
	if (heroItems.leftFinger != null) {
		allItems.push(heroItems.leftFinger);
	}
	if (heroItems.head != null) {
		allItems.push(heroItems.head);
	}
	if (heroItems.torso != null) {
		allItems.push(heroItems.torso);
	}
	if (heroItems.feet != null) {
		allItems.push(heroItems.feet);
	}
	if (heroItems.hands != null) {
		allItems.push(heroItems.hands);
	}
	if (heroItems.shoulders != null) {
		allItems.push(heroItems.shoulders);
	}
	if (heroItems.legs != null) {
		allItems.push(heroItems.legs);
	}
	if (heroItems.bracers != null) {
		allItems.push(heroItems.bracers);
	}
	if (heroItems.waist != null) {
		allItems.push(heroItems.waist);
	}
	if (heroItems.neck != null) {
		allItems.push(heroItems.neck);
	}
	if (heroItems.mainHand != null) {
		allItems.push(heroItems.mainHand);
	}
	if (heroItems.offHand != null) {
		allItems.push(heroItems.offHand);
	}
	allItems.forEach(function(item, i) {
		// console.log(item.name + " " + i + " delay " + delay);
		itemID = item.tooltipParams.replace("item/" , "");
		findItemInCollection(itemID, heroID, delay);
		delay = delay + 100;
		i++;
	});
}

//Looks for an itemID, make an API request, and compare that itemType(ring, chest, feet, etc.) to the itemType in database.
//if they are different, equip requested, unequip DB.  If they are same, check for difference(gems, enchants)
//If item is not found in collection, add it.
//Need to Fix dual-wielding, and 1h + offhand and 2H
	//if onehanded weapon
	//if class is DH, if no quiver, add second bow.
	//if class is barb or monk, check offhand
function findItemInCollection(itemID, heroID, delay){
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		if (err) {
			return console.log("findItem error connecting to db")
		}
		else {
			var itemCollection = db.collection("item");
			var itemRequestURL = "https://us.api.battle.net/d3/data/item/" + itemID + "?locale=" + locale + "&apikey=" + apiKey;
			setTimeout( function() {
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
							var requestedItemType = itemMethods.getItemType(requestedItem.type.id);
							// console.log(delay + " findItem in request " +requestedItem.name + " " + requestedItemType);

							(function(requestedItem) {
								//find if hero has an item in that spot.  if there is check for differences.
								itemCollection.find({"heroID": parseInt(heroID) , "type" :requestedItemType}).toArray(function(err, matchedItems) {
									if (matchedItems.length != 0) {

										//check to see if player has only one ring, and if its not the same as the ring in DB, add it
										if (itemMethods.isRing(requestedItemType)) {
											if (matchedItems.length == 1 && matchedItems[0].itemID != itemID) {
												console.log("Inserted 2nd ring");
												insertInItemCollection(itemCollection, requestedItem, heroID);
											}
										}

										matchedItems.forEach(function (equippedItem) {
											//this check was put here because some items did not have itemID after being updated.
											if (equippedItem.itemID == undefined) {
												console.log(equippedItem[0]);
											}
											
											//if equippedItem and requestItem have same ID, check for differences.
											//If no new enchants, check if it is socketable to check gems.
											if (equippedItem.itemID == itemID) {
												if (!itemMethods.hasNewEnchant(requestedItem, equippedItem)) {											
													//If replacement has more gems update it
													if (itemMethods.isSocketable(requestedItemType)) {
														if(itemMethods.doesRequestedHaveMoreGems(requestedItem, equippedItem)) {
															updateInItemCollection(itemCollection, requestedItem, heroID);
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
																			updateInItemCollection(itemCollection, requestedItem, heroID);
																		}
																	}//end if item was hat

																	//if Ring or Amulet, first check if both jewels are legendary.
																	//then check if currently using Boon of Hoarder.
																	if (itemMethods.isJewlery(requestedItemType)) {
																		if (gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {
																			//If gem was boon, update if requested has a higher rank or not boon
																			if (gemMethods.isGemBoon(equippedGems[0])) {
																				if (gemMethods.requestedRankHigher(requestedGems[0], equippedGems[0]) || !gemMethods.isGemBoon(requestedGems[0])) {
																					updateInItemCollection(itemCollection, requestedItem, heroID);
																				}
																			}
																			//If Gem was not boon, update if request has higher rank
																			else {
																				//if rank was higher, update
																				if (gemMethods.requestedRankHigher(requestedGems[0], equippedGems[0])) {
																					updateInItemCollection(itemCollection, requestedItem, heroID);
																				}
																			}
																		}
																		//If equipped gem is not legendary but requested is, update
																		else if (!gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {
																			updateInItemCollection(itemCollection, requestedItem, heroID);
																		}
																	}//end if item was ring or neck
																	//if item is a weapon,
																}//end if had gems and gems were same
															}//end if item had gems and had same gemcount
														}//end if item did not have more gems
													}//end if item is socketable
												}//end if item did not have new enchant

												//Updating because item had a new enchant
												else {
													updateInItemCollection(itemCollection, requestedItem, heroID);
												}
											}//end if items are the same


											//Item is not the same, update+unequip socketable items if there are more gems in request.
											else {
												if (itemMethods.isSocketable(requestedItemType)) {
													if(itemMethods.doesRequestedHaveMoreGems(requestedItem, equippedItem)) {
														updateInItemCollection(itemCollection, requestedItem, heroID);
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
																		updateInItemCollection(itemCollection, requestedItem, heroID);
																		unequipItem(itemCollection, equippedItem, heroID);
																	}
																}//end if item was hat

																//If Jewelry, compare gems
																if (itemMethods.isJewlery(requestedItemType)) {
																	if (gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {
																		if (gemMethods.isGemBoon(equippedGems[0])) {
																			//if replacement is not boon or has a higher rank, replace  
																			if (gemMethods.requestedRankHigher(requestedGems[0], equippedGems[0]) || !gemMethods.isGemBoon(requestedGems[0])) {
																				updateInItemCollection(itemCollection, requestedItem, heroID);
																				unequipItem(itemCollection, equippedItem, heroID);
																			}
																		}
																		//If equipped was not Boon, compare.
																		else {
																			//gets called before finishes updating
																			if (itemMethods.isRing(requestedItemType)) {
																				delay += 1000;
																				setTimeout( function() {
																					//COMPARE STATS, for now update+unequip
																					itemCollection.find( {"itemID" :equippedItem.itemID} ).toArray(function(err, matchedRings) {
																						if (matchedRings.length == 2) {
																							console.log("two matching rings "+ equippedItem.Name + "  equipping " + requestedItem.name);
																							updateInItemCollection(itemCollection, requestedItem, heroID);
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
																					updateInItemCollection(itemCollection, requestedItem, heroID);
																					unequipItem(itemCollection, equippedItem, heroID);
																				}
																			}
																		}
																	}
																	//Update+unequip if equipped is nonLeg and requested is
																	else if (!gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {
																		updateInItemCollection(itemCollection, requestedItem, heroID);
																		unequipItem(itemCollection, equippedItem, heroID);
																	}
																}//end if item was ring or neck
																//ADD if item is a weapon,
															}//end if gems were not same

															//!!!!!!TO DOgems were same compare itemstats
															else {
																updateInItemCollection(itemCollection, requestedItem, heroID);
																unequipItem(itemCollection, equippedItem, heroID);
															}
														}//end if item had gems, and had same gemcount
													}//end if item did not have more gems
												}//end if item is socketable

												//!!!not a socketable item
												//!!!TO DOcompare stats
												else {
													updateInItemCollection(itemCollection, requestedItem, heroID);
													unequipItem(itemCollection, equippedItem, heroID);
												}
											}//end if item was not the same
										});//end forEach item
									}//end if found a item in that spot

									//there no item in that spot, update
									else {
										insertInItemCollection(itemCollection, requestedItem, heroID);
									}//end insertion		
								});//end itemcollection find
							})(requestedItem);//end self-invoking function
						}//end else json had data	
					}//end else data was not undefined			
				});//end request
			},delay);//end settimeout
		}//end if successfully in db
	});
}

function updateInItemCollection(itemCollection, currentItem, heroID) {
	itemCollection.update({"heroID": parseInt(heroID) , "type" :itemMethods.getItemType(currentItem.type.id)}, {"itemID" : currentItem.tooltipParams.replace("item/",""), "name" : currentItem.name, "displayColor" : currentItem.displayColor, "type" : itemMethods.getItemType(currentItem.type.id), "affixes" : currentItem.attributes, "randomAffixes" : currentItem.randomAffixes, "gems" : currentItem.gems, "socketEffects" : currentItem.socketEffects, "heroID" : parseInt(heroID), "equipped" : true}, function(err, result) {
		console.log("Successfully updated " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5));
	});
}

function insertInItemCollection(itemCollection, currentItem, heroID) {
	itemCollection.insert({"itemID" : currentItem.tooltipParams.replace("item/",""), "name" : currentItem.name, "displayColor" : currentItem.displayColor, "type" : itemMethods.getItemType(currentItem.type.id), "affixes" : currentItem.attributes, "randomAffixes" : currentItem.randomAffixes, "gems" : currentItem.gems, "socketEffects" : currentItem.socketEffects, "heroID" : parseInt(heroID), "equipped" : true}, function(err, result) {
		console.log("Successfully inserted " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5));
	});
}

function unequipItem(itemCollection, itemToUnequip, heroID) {
		itemCollection.update({"heroID": parseInt(heroID) , "itemID" : itemToUnequip.itemID },  {$set : {"Equipped" : false}}, function(err, result) {
		console.log("Successfully unequipped " + itemToUnequip.Name + " " + itemToUnequip.itemID.substring(0,5));
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