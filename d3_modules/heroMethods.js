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

	request(heroRequestURL, function (error, response, data) {
		//string to json
		var heroData = JSON.parse(data);
		var heroItems = heroData.items;
		if (heroData.level == 70) {
			getItemIDsFromHero(heroItems,heroID,10);
		}
		res.render('hero.ejs', {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems})
		date = new Date();
		console.log(heroID + " Page after request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
	});
}

function getItemIDsFromHero(heroItems, heroID, delay) {
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
		console.log(item.name + " " + i + " delay " + delay);
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
					currentItem = JSON.parse(data);
					if (currentItem.code == 403) {
						findItemInCollection(itemID,heroID,delay+1000);
					}
					else{
						var currentItemType = item.getItemType(currentItem.type.id);
						console.log(delay + " findItem in request " +currentItem.name + " " + currentItemType);
						(function(currentItem) {
							//find if hero has an item in that spot.
							itemCollection.find({"Hero": parseInt(heroID) , "Type" :currentItemType}).toArray(function(err, result) {
								//if there is item in spot, check if that itemID is same as item to be updated.
								if (result.length != 0) {
									//check if its a ring.  if ring, and length is 1, add 2nd ring.  else 
									//for each matched item
									for (i=0; i<result.length; i++) {

										//check to see if player has only one ring
										if (item.isRing(currentItemType)) {
											//and length is 1, add ring
											if (result[i].itemID != itemID && result.length == 1) {
												console.log("Inserted 2nd ring");
												insertInItemCollection(itemCollection, currentItem, heroID);
											}
										}
										//!!!!!!!!!!!
										//if onehanded weapon
										//if class is DH, if no quiver, add second bow.
										//if class is barb or monk, check offhand

										//this check was put here because some items did not have itemID after being updated.
										if (result[i].itemID == undefined) {
											console.log(result[i]);
										}
										// console.log(result[i].itemID  , " ",  itemID);
										//if item is the same, check enchants first.
										if (result[i].itemID == itemID) {
											if (!item.hasNewEnchant(currentItem, result[i])) {											
												//if item has a socket, and the replacement has more gems replace it
												if (item.isSocketable(currentItemType)) {
													if(item.doesCurrentHaveMoreGems(currentItem, result[i])) {
														updateInItemCollection(itemCollection, currentItem, heroID);
													}

													//did not have more gems so, check if # of gems is 0.
													else { 
														//if item actually has gems, and have same gemCount, check if they have different gems 
														if (!item.isGemCountZero(currentItem) && item.sameGemCount(currentItem, result[i])) {

															var currentGems = currentItem.gems;
															var equippedGems = result[i].Gems;
															//if Gems are not same, check item type
															if (!gem.sameGems(currentGems, equippedGems)) {

																//if item is hat, if equipped gem is not a diamond or ame and current is, update
																if (item.isHat(currentItemType)) {
																	if (!gem.isHatGemUtility(equippedGems) && gem.isHatGemUtility(currentGems)) {
																		updateInItemCollection(itemCollection, currentItem, heroID);
																	}
																}//end if item was hat

																//if jewelery, first check if both jewels are legendary.
																//then check if currently using boon.  
																if (item.isJewlery(currentItemType)) {
																	if (gem.isGemLegendary(equippedGems[0]) && gem.isGemLegendary(currentGems[0])) {
																		if (gem.isGemBoon(equippedGems[0])) {
																			//if replacement is not boon or has a higher rank, replace  
																			if (gem.currentRankHigher(currentGems[0], equippedGems[0]) || !gem.isGemBoon(currentGems[0])) {
																				updateInItemCollection(itemCollection, currentItem, heroID);
																			}
																		}

																		//gem was not boon
																		else {
																			//if rank was higher, update
																			if (gem.currentRankHigher(currentGems[0], equippedGems[0])) {
																				updateInItemCollection(itemCollection, currentItem, heroID);
																			}
																		}
																	}
																	//equipped gem is not legendary but current is, update
																	else if (!gem.isGemLegendary(equippedGems[0]) && gem.isGemLegendary(currentGems[0])) {
																		updateInItemCollection(itemCollection, currentItem, heroID);
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
												updateInItemCollection(itemCollection, currentItem, heroID);
											}
										}//end if items are the same


										//item is not the same.  check stats, and jewelry
										else {

											//if item has a socket, and the replacement has more gems replace it
											if (item.isSocketable(currentItemType)) {
												if(item.doesCurrentHaveMoreGems(currentItem, result[i])) {
													updateInItemCollection(itemCollection, currentItem, heroID);
													unequipItem(itemCollection, result[i], heroID);
												}

												//did not have more gems so, check if # of gems is 0.
												else { 
													//if item actually has gems, and have same gemCount  
													if (!item.isGemCountZero(currentItem) && item.sameGemCount(currentItem, result[i])) {

														var currentGems = currentItem.gems;
														var equippedGems = result[i].Gems;
														//if Gems are not same, check item type
														if (!gem.sameGems(currentGems, equippedGems)) {
															//if item is hat, if equipped gem is not a diamond or ame and current is, update
															if (item.isHat(currentItemType)) {
																if (!gem.isHatGemUtility(equippedGems) && gem.isHatGemUtility(currentGems)) {
																	updateInItemCollection(itemCollection, currentItem, heroID);
																	console.log(result[i]);
																	unequipItem(itemCollection, result[i], heroID);
																}
															}//end if item was hat

															//if jewelery, first check if both jewels are legendary.
															//then check if currently using boon.  
															if (item.isJewlery(currentItemType)) {
																if (gem.isGemLegendary(equippedGems[0]) && gem.isGemLegendary(currentGems[0])) {
																	if (gem.isGemBoon(equippedGems[0])) {
																		//if replacement is not boon or has a higher rank, replace  
																		if (gem.currentRankHigher(currentGems[0], equippedGems[0]) || !gem.isGemBoon(currentGems[0])) {
																	console.log(result[i]);
																			updateInItemCollection(itemCollection, currentItem, heroID);
																			unequipItem(itemCollection, result[i], heroID);

																		}
																	}
																	//gem was not boon
																	else {
																		//if rank was higher, update
																		if (gem.currentRankHigher(currentGems[0], equippedGems[0])) {
																	console.log(result[i]);
																			updateInItemCollection(itemCollection, currentItem, heroID);
																			unequipItem(itemCollection, result[i], heroID);
																		}
																	}
																}
																//equipped gem is not legendary but current is, update
																else if (!gem.isGemLegendary(equippedGems[0]) && gem.isGemLegendary(currentGems[0])) {
																	updateInItemCollection(itemCollection, currentItem, heroID);
																	console.log(result[i]);
																	unequipItem(itemCollection, result[i], heroID);

																}
															}//end if item was ring or neck
															//if item is a weapon,
														}//end if gems were not same

														//!!!!!
														//gems were same compare itemstats
														else {
																	console.log(result[i]);
															updateInItemCollection(itemCollection, currentItem, heroID);
														unequipItem(itemCollection, result[i], heroID);
														}
													}//end if item had gems, and had same gemcount
												}//end if item did not have more gems
											}//end if item is socketable

											//!!!not a socketable item
											//compare stats
											else {
												updateInItemCollection(itemCollection, currentItem, heroID);
												unequipItem(itemCollection, result[i], heroID);
											}

										}//end if item was not the same

									}//end for loop of each item
								}//end if found a item in that spot

								//there no item in that spot, update
								else {
									insertInItemCollection(itemCollection, currentItem, heroID);
								}//end insertion		
							});//end itemcollection find
						})(currentItem);//end self-invoking function
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