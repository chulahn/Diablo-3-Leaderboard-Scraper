var exports = module.exports = {};
var request = require("request");
var mongo = require('mongodb');
var gem = require('../d3_modules/gemMethods.js');
var item = require('../d3_modules/itemMethods.js');

var MongoClient = mongo.MongoClient;

var apiKey = "y34m8hav4zpvrezvrs6xhgjh6uphqa5r";
var region = "us";
var apiURL = ".api.battle.net/d3/"
var locale = "en_US";
// var gRiftCategory= "era/1/rift-";
// var collectionCategory = "normal";

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

//localhost:3000/player/:battletag/hero/:heroID
//for a given heroID, it gets hero's stats, skills and items
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
					// if (heroData.level == 70) {
					// 		exports.getItemIDsFromHero(heroItems,heroID,10);
					// }
					res.render('hero.ejs', {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems})
					date = new Date();
					console.log(heroID + " Page after request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
				}
				//not in database.  must request data from Blizzard site.
				else {
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
					requestedItem = JSON.parse(data);
					if (requestedItem.code == 403) {
						findItemInCollection(itemID,heroID,delay+1000);
					}
					else{
						var requestedItemType = item.getItemType(requestedItem.type.id);
						// console.log(delay + " findItem in request " +requestedItem.name + " " + requestedItemType);
						(function(requestedItem) {
							//find if hero has an item in that spot.
							itemCollection.find({"Hero": parseInt(heroID) , "Type" :requestedItemType}).toArray(function(err, matchedItems) {
								//if there is item in spot, check if that itemID is same as item to be updated.

								if (matchedItems.length != 0) {
									//check to see if player has only one ring
									if (item.isRing(requestedItemType)) {
										//and length is 1, add ring
										if (matchedItems.length == 1 && matchedItems[0].itemID != itemID) {
											console.log("Inserted 2nd ring");
											insertInItemCollection(itemCollection, requestedItem, heroID);
										}
									}
									//for each matched item
									matchedItems.forEach(function (equippedItem) {
										//!!!!!!!!!!!
										//if onehanded weapon
										//if class is DH, if no quiver, add second bow.
										//if class is barb or monk, check offhand

										//this check was put here because some items did not have itemID after being updated.
										if (equippedItem.itemID == undefined) {
											console.log(equippedItem[0]);
										}
										// console.log(requestedItem.name)
										// if (requestedItem.name.indexOf("Natalya's Reflection") != -1) {
										// 	console.log(requestedItem.name + ' called');
										// }
										// console.log(equippedItem.itemID  , " ",  itemID);
										//if item is the same, check enchants first.
										if (equippedItem.itemID == itemID) {
											//doesnt have a enchant
											if (!item.hasNewEnchant(requestedItem, equippedItem)) {											
												//if item has a socket, and the replacement has more gems replace it
												if (item.isSocketable(requestedItemType)) {
													if(item.doesRequestedHaveMoreGems(requestedItem, equippedItem)) {
														updateInItemCollection(itemCollection, requestedItem, heroID);
													}

													//did not have more gems so, check if # of gems is 0.
													else { 
														//if item actually has gems, and have same gemCount, check if they have different gems 
														if (!item.isGemCountZero(requestedItem) && item.sameGemCount(requestedItem, equippedItem)) {

															var requestedGems = requestedItem.gems;
															var equippedGems = equippedItem.Gems;
															//if Gems are not same, check item type
															if (!gem.sameGems(requestedGems, equippedGems)) {

																//if item is hat, if equipped gem is not a diamond or ame and requested is, update
																if (item.isHat(requestedItemType)) {
																	if (!gem.isHatGemUtility(equippedGems) && gem.isHatGemUtility(requestedGems)) {
																		updateInItemCollection(itemCollection, requestedItem, heroID);
																	}
																}//end if item was hat

																//if jewelery, first check if both jewels are legendary.
																//then check if currently using boon.  
																if (item.isJewlery(requestedItemType)) {
																	if (gem.isGemLegendary(equippedGems[0]) && gem.isGemLegendary(requestedGems[0])) {
																		if (gem.isGemBoon(equippedGems[0])) {
																			//if replacement is not boon or has a higher rank, replace  
																			if (gem.requestedRankHigher(requestedGems[0], equippedGems[0]) || !gem.isGemBoon(requestedGems[0])) {
																				updateInItemCollection(itemCollection, requestedItem, heroID);
																			}
																		}

																		//gem was not boon
																		else {
																			//if rank was higher, update
																			if (gem.requestedRankHigher(requestedGems[0], equippedGems[0])) {
																				updateInItemCollection(itemCollection, requestedItem, heroID);
																			}
																		}
																	}
																	//equipped gem is not legendary but requested is, update
																	else if (!gem.isGemLegendary(equippedGems[0]) && gem.isGemLegendary(requestedGems[0])) {
																		updateInItemCollection(itemCollection, requestedItem, heroID);
																	}
																}//end if item was ring or neck
																//if item is a weapon,
															}//end if had gems and gems were same
														}//end if item had gems and had same gemcount
													}//end if item did not have more gems
												}//end if item is socketable
											}//end if item did not have new enchant

											//item had a new enchant
											else {
												updateInItemCollection(itemCollection, requestedItem, heroID);
											}
										}//end if items are the same


										//item is not the same.  check stats, and jewelry
										else {

											//if item has a socket, and the replacement has more gems replace it
											if (item.isSocketable(requestedItemType)) {
												if(item.doesRequestedHaveMoreGems(requestedItem, equippedItem)) {
													updateInItemCollection(itemCollection, requestedItem, heroID);
													unequipItem(itemCollection, equippedItem, heroID);
												}

												//did not have more gems so, check if # of gems is 0.
												else { 
													//if item actually has gems, and have same gemCount  
													if (!item.isGemCountZero(requestedItem) && item.sameGemCount(requestedItem, equippedItem)) {

														var requestedGems = requestedItem.gems;
														var equippedGems = equippedItem.Gems;
														//if Gems are not same, check item type
														if (!gem.sameGems(requestedGems, equippedGems)) {
															//if item is hat, if equipped gem is not a diamond or ame and requested is, update
															if (item.isHat(requestedItemType)) {
																if (!gem.isHatGemUtility(equippedGems) && gem.isHatGemUtility(requestedGems)) {
																	updateInItemCollection(itemCollection, requestedItem, heroID);
																	unequipItem(itemCollection, equippedItem, heroID);
																}
															}//end if item was hat

															//if jewelery, first check if both jewels are legendary.
															//then check if currently using boon.  
															if (item.isJewlery(requestedItemType)) {


																if (gem.isGemLegendary(equippedGems[0]) && gem.isGemLegendary(requestedGems[0])) {
																	if (gem.isGemBoon(equippedGems[0])) {
																		//if replacement is not boon or has a higher rank, replace  
																		if (gem.requestedRankHigher(requestedGems[0], equippedGems[0]) || !gem.isGemBoon(requestedGems[0])) {
																			updateInItemCollection(itemCollection, requestedItem, heroID);
																			unequipItem(itemCollection, equippedItem, heroID);

																		}
																	}
																	//gem was not boon
																	else {
// console.log("here " + matchedItems.length);             
																		//gets called before finishes updating
																		if (item.isRing(requestedItemType)) {
																			delay += 1000;
																			// console.log(delay);
																			setTimeout( function() {

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
																			//if rank was higher, update
																			if (gem.requestedRankHigher(requestedGems[0], equippedGems[0])) {
																				console.log("---here " + delay);
																				updateInItemCollection(itemCollection, requestedItem, heroID);
																				unequipItem(itemCollection, equippedItem, heroID);
																			}
																		}
																	}
																}
																//equipped gem is not legendary but current is, update
																else if (!gem.isGemLegendary(equippedGems[0]) && gem.isGemLegendary(requestedGems[0])) {
																	updateInItemCollection(itemCollection, requestedItem, heroID);
																	unequipItem(itemCollection, equippedItem, heroID);

																}
															}//end if item was ring or neck
															//if item is a weapon,
														}//end if gems were not same

														//!!!!!
														//gems were same compare itemstats
														else {
															updateInItemCollection(itemCollection, requestedItem, heroID);
														unequipItem(itemCollection, equippedItem, heroID);
														}
													}//end if item had gems, and had same gemcount
												}//end if item did not have more gems
											}//end if item is socketable

											//!!!not a socketable item
											//compare stats
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
				});//end request
			},delay);//end settimeout
		}//end if successfully in db
	});
}

function updateInItemCollection(itemCollection, currentItem, heroID) {
	itemCollection.update({"Hero": parseInt(heroID) , "Type" :item.getItemType(currentItem.type.id)}, {"itemID" : currentItem.tooltipParams.replace("item/",""), "Name" : currentItem.name, "Type" : item.getItemType(currentItem.type.id), "Affixes" : currentItem.attributes, "Random Affixes" : currentItem.randomAffixes, "Gems" : currentItem.gems, "Socket Effects" : currentItem.socketEffects, "Hero" : parseInt(heroID), "Equipped" : true}, function(err, result) {
		console.log("Successfully updated " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5));
	});
}

function insertInItemCollection(itemCollection, currentItem, heroID) {
	itemCollection.insert({"itemID" : currentItem.tooltipParams.replace("item/",""), "Name" : currentItem.name, "Type" : item.getItemType(currentItem.type.id), "Affixes" : currentItem.attributes, "Random Affixes" : currentItem.randomAffixes, "Gems" : currentItem.gems, "Socket Effects" : currentItem.socketEffects, "Hero" : parseInt(heroID), "Equipped" : true}, function(err, result) {
		console.log("Successfully inserted " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5));
	});
}

function unequipItem(itemCollection, itemToUnequip, heroID) {
		itemCollection.update({"Hero": parseInt(heroID) , "itemID" : itemToUnequip.itemID },  {$set : {"Equipped" : false}}, function(err, result) {
		console.log("Successfully unequipped " + itemToUnequip.Name + " " + itemToUnequip.itemID.substring(0,5));
	});
}