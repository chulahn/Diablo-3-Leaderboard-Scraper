var exports = module.exports = {};
var request = require("request");
var mongo = require("mongodb");
var gemMethods = require("../d3_modules/gemMethods.js");
var itemMethods = require("../d3_modules/itemMethods.js");
var async = require("async");
var colors = require("colors");
var debug = require("../d3_modules/debugMethods.js");
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


/*
	heroItems: items property of the object received after making request for Hero to Blizzard.
	Get's all equipped items and passes it as an array to findItemsInCollection.
*/

exports.getItemIDsFromHero = function(hero, delay, foundGRiftHeroCallback) {
	MongoClient.connect(databaseURL, function(err, db) {
		if (err) {
			return console.log("getHeroDetails error connecting to db")
			getItemIDsFromHero(heroItems, heroID, delay, foundGRiftHeroCallback);
		}
		else {
			db.collection("item").find({}).toArray(function(err, results) {
				// console.log(results);
				// asdfas
			})
			var allItems = [];

			for (item in hero.items) {
				if (hero.items.hasOwnProperty(item)) {
					if (hero.items[item] != null) {
						allItems.push(hero.items[item]);
					}
				}
			}
			
			if (db != undefined) {
				hero.items = allItems;
				console.log(allItems[0]);
				findItemsInCollection(hero, delay, db, foundGRiftHeroCallback);

			}
			else {
				console.log("db was null");
				exports.getItemIDsFromHero(hero, delay, foundGRiftHeroCallback);
				adfas
			}
		}
	});
}

/*
	For the items hero currently has, findItemsInCollection it will compare the items in the database for that hero.
	If hero has an item in that position, compareItems will be called and the item with better stats will be equipped(only replaces gems)
	If no item in spot, insert.

	Working on when switching from 1h to 2h and dual wielding.
*/

function findItemsInCollection(hero, delay, db, foundGRiftHeroCallback){
	var heroID = hero.heroID;
	var allItems = hero.items;
	console.log("findItemsInCollection passed in delay "+ delay +" for hero " + heroID);
	console.log(colors.red(hero.class));
	 
	async.series([ 

		function(addedExtraInfoCallback) {
			//for every all of heroes items passed in, find the item inside itemCollection
			async.eachSeries(allItems, function (currentItem, foundItemCallback) {
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

						setTimeout( function() {
							request(itemRequestURL, function (error, response, data) {
								if (data == undefined) {
									console.log("undefined, findItemInCOllection")
									findItemInCollection(itemID, heroID, delay+1000, db, foundItemCallback);	
								}
								else {
									requestedItem = JSON.parse(data);
									if (requestedItem.code == 403) {
										console.log(colors.red("403 too many requests" + delay + " , findItemsInCollection " + currentItem.name + " " + heroID));
										console.log(requestedItem);
										findItemInCollection(itemID, heroID, delay+1000, db, foundItemCallback);
									}
									if (requestedItem == undefined) {
										console.log(data + " undefined");
										findItemInCollection(itemID, heroID, delay+1000, db, foundItemCallback);	
									}
									else{

										(function(requestedItem) {
											var requestedItemType = itemMethods.getItemType(requestedItem);
											console.log("findItems in request for " +requestedItem.name + " " + heroID + " delay " +delay);

											//if itemtype is 1h,
												//if class is dh, barb, monk
													//DH check 2h
														//results replace
														//else check 1h
															//results replace
													//BARB check 2h
														//results ree
														//
											//

											//find if hero has an item in that spot.  if there is check for differences.
											itemCollection.find({"heroID": parseInt(heroID) , "type": requestedItemType , "equipped": true}).toArray(function(err, matchedItems) {


												//if itemtype is 2h, and there were no matches, check 1hand and off
												if (requestedItemType === "2 Hand" && matchedItems.length === 0) {
													
													console.log("2hands".yellow)

													//check 1hand,  If there is a 1hand, unequip.
													//Then, if not crusader, remove equipped offHand 
													itemCollection.find({"heroID": parseInt(heroID) , "type": "1 Hand" , "equipped": true}).toArray(function(err, matched1Handers) {
														
														if (matched1Handers.length > 0) {

															console.log(colors.red(matched1Handers[0]));

															unequipItem(itemCollection, matched1Handers[0], heroID);
	asdfsaa
															//assumes all crusaders will have the 2h + shield passive
															if (hero.class !== "crusader") {
																console.log("hero is not a crusader, finding offHand");
																itemCollection.find({"heroID": parseInt(heroID), "type": "offHand", "equipped" : true}).toArray(function(err, matchedOffHands) {
																	if (matchedOffHands.length > 0) {
																		console.log("unequipping offhand");
																		unequipItem(itemCollection, matchedOffHands[0], heroID);
																	}
																});
															}

														}
														insertInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
													});
												}


												//only 1hander, check for 2hands.
												else if (requestedItemType === "1 Hand" && matchedItems.length === 0) {
													console.log("only 1 hand, chekcing for 2 hands, insert".yellow)
													itemCollection.find({"heroID": parseInt(heroID) , "type" :"2 Hand" , "equipped": true}).toArray(function(err, matched2Handers) {
														if (matched2Handers.length > 0) {
															console.log("removed 2hander")
															unequipItem(itemCollection, matched2Handers[0], heroID);
														}

														insertInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
													});
												}

												//if only offhand, remove any 2h's and then insert
												else if (requestedItemType === "offHand" && matchedItems.length === 0) {
													console.log("only offhand, chekcing for 2 hands, insert".yellow)
													itemCollection.find({"heroID": parseInt(heroID) , "type" :"2 Hand" , "equipped": true}).toArray(function(err, matched2Handers) {
														if (matched2Handers.length > 0) {
															unequipItem(itemCollection, matched2Handers[0], heroID);
														}

														insertInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
													});
												}


												//if there were matched items.
												else if (matchedItems.length !== 0) {

													//check to see if player has only one ring, and if its not the same as the ring in DB, add it
													if (itemMethods.isRing(requestedItemType) && matchedItems.length === 1 && matchedItems[0].itemID !== itemID) {
														console.log("Inserted 2nd ring");
														insertInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
													}


													// if (requestedItemType === "1 Hand") {
													// 											console.log("hereaaaa".blue)

													// }




													//compare each item.

													
													else {
														
														async.eachSeries(matchedItems, function (equippedItem, foundItemCallback) {
	//error handling
															if (equippedItem.itemID == undefined) {
																console.log("undefined for " + equippedItem , matchedItems);
															}
															console.log("-----comparing " + equippedItem.name + " " + requestedItem.name + matchedItems.length +  " " + allItems.length);
															compareItems(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback);
														 }, function(err) {
															if (err) {
																console.log("failed");
															} else {
																console.log("-x-x-x-x-x-x-xcompared all items for " + heroID + " " + requestedItem.name)
																foundItemCallback();

															}
														});

													}
												}//end if found a item in that spot

												//there no item in that spot, insert
												else {
													if (requestedItemType == "1 Hand") {
														console.log("1 hand, insert".yellow)

													}
													if (requestedItemType == "2 Hand") {
																console.log("2hands insert".yellow)
													}
													insertInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
												}//end insertion		
											});//end itemcollection find
										})(requestedItem);//end self-invoking function
									}//end else json had data	
								}//end else data was not undefined			
							});//end request
						},delay) ;//end settimeout
					})(delay);  //end self-invoking
					delay += 100;	
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
			console.log("importantstats added for  " + heroID + " redirected");
			redirectCallback();
		}
		], function(err) {
			if (err) {
				return console.log("error");
			}
			else {	
				console.log("successfully redirected");
				foundGRiftHeroCallback();
			}
		});
}

/*
	For all items that are currently equipped(in database) for a hero,
	sum Cooldown reduction, elemental damage, elite damage and
	save that information to the hero in database.
*/

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
			var gems = [];

			//fire,light,cold,arcane,poison,phys
			var elementalDam = [
			["Fire", 0], ["Lightning", 0], ["Cold", 0], ["Arcane", 0], ["Poison", 0], ["Physical", 0], ["Holy", 0]
			];
			var meleeDamRed = 0;
			var rangeDamRed = 0;
			var eliteDamRed = 0;

			var myRe = new RegExp("[0-9]+\.?[0-9]?");

			console.log("getImportantStats " + heroID);
			itemCollection.find({"heroID" : heroID, "equipped" : true}).toArray(function(error, heroItems) {

				heroItems.forEach(function(currentItem) {
					console.log(currentItem.name)
					//get CDR from hat
					if (currentItem.type == "Head") {
						//if it has gem and it is a diamond a diamond
						if (currentItem.gems[0] != undefined ) {
						
							if ((currentItem.gems[0].item.name).indexOf("Diamond") != -1) {
								var diamondText = currentItem.gems[0].attributes.primary[0].text;
								var searchData = myRe.exec(diamondText);
								diamondCooldown = parseFloat(searchData[0]);
							}

							if (currentItem.name == "Leoric's Crown") {
								currentItem.affixes.secondary.forEach(function (secondary) {
									if (secondary.color == "orange") {

										var leoricText = secondary.text;
										var searchData = myRe.exec(leoricText);

										diamondCooldown = diamondCooldown * (1 + parseFloat(searchData[0])/100);
									}
								});
							}

						}
					}
					//get eliteDam from Furnace
					if (currentItem.name == "The Furnace") {
						var furnaceElite = currentItem.affixes.passive[0].text;
						var searchData = myRe.exec(furnaceElite);

						furnaceElite = parseFloat(searchData[0]);
						// furnaceElite = parseFloat(furnaceElite.substring(furnaceElite.indexOf("by ")+3, furnaceElite.length-2));
						eliteDam += furnaceElite;
					}
					//get CDR and elementalDam
					for (j=0; j<currentItem.affixes.primary.length; j++) {
						//get cooldown reduction from every item
						if (currentItem.affixes.primary[j].text.indexOf("cooldown") != -1) {
							var cooldownString = currentItem.affixes.primary[j].text;
							var searchData = myRe.exec(cooldownString);

							// console.log(currentItem.Name + " " + cooldownString.substring(cooldownString.lastIndexOf(" ")+1,cooldownString.length-2 )+"%");
							cooldown += parseFloat(searchData[0]);
						}
						//get element damage from every item
						if (currentItem.affixes.primary[j].text.indexOf("skills deal") != -1) {

							var skillsString = currentItem.affixes.primary[j].text;
							console.log(skillsString)
							var searchData = myRe.exec(skillsString);
							console.log(searchData)
							var number = parseFloat(searchData[0]);
							var element = skillsString.substring(0, skillsString.indexOf(" skills"));

							switch (element) {
								case "Fire" :
									elementalDam[0][1] += number;
									break;
								case "Lightning" :
									elementalDam[1][1] += number;
									break;
								case "Cold" :
									elementalDam[2][1] += number;
									break;
								case "Arcane" :
									elementalDam[3][1] += number;
									break;
								case "Poison" :
									elementalDam[4][1] += number;
									break;
								case "Physical" :
									elementalDam[5][1] += number;
									break;
								case "Holy" :
									elementalDam[6][1] += number;
									break;
							}
						}
						//get elite damage
						if (currentItem.affixes.primary[j].text.indexOf("Increases damage against elites by") != -1) {
							eliteString = currentItem.affixes.primary[j].text;

							var searchData = myRe.exec(eliteString);

							eliteString = parseFloat(searchData[0]);
							eliteDam += eliteString;
						}
					}//end for affixes

					if (currentItem.type === "Ring" || currentItem.type === "Neck") {
						var currentGem = currentItem.gems[0];
						if (currentGem !== undefined) {
							if (currentGem.item.displayColor === "orange") {
								gems.push(currentGem.item.name);
							}
						}
						console.log(colors.red(currentItem.gems[0]));
					}

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
								"eliteDam" : eliteDam,
								"gems" : gems
							}
						}//end of extraItemData
					}//end of set 
				, function(err, results) {
					if (err) {
						return console.log(err);
					}
					console.log(gems);
					console.log("------------added extraItemData for " + heroID);
					updatedStatsCallback();
				});
			});//end  finditem for hero
		}//end else
	});	//end connection
}

/*
	Same as findItemsInCollection but for a single item.
*/
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
					findItemInCollection(itemID,heroID,delay+1000,db,foundItemCallback);	
				}
				else {
					requestedItem = JSON.parse(data);
					if (requestedItem.code == 403) {
						findItemInCollection(itemID,heroID,delay+1000,db,foundItemCallback);
					}
					else{
						//check if the there is an item in spot.
						(function itemCheck(requestedItem) {
							var requestedItemType = itemMethods.getItemType(requestedItem);
							console.log(delay + " findItem in request " +requestedItem.name + " " + requestedItemType);
							//find if hero has an item in that spot.  if there is check for differences.
							itemCollection.find({"heroID": parseInt(heroID) , "type" :requestedItemType}).toArray(function(err, matchedItems) {
								if (matchedItems.length != 0) {

									//if ring was searched, and there was only one result and is not requestedItem, insert
									if (itemMethods.isRing(requestedItemType) && matchedItems.length == 1 && matchedItems[0].itemID != itemID) {
										console.log("Inserted 2nd ring");
										insertInItemCollection(itemCollection, currentItem, heroID, callback);
									}

									else {
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
									}
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


/*

	Checks whether or not to update the item in database(equippedItem) with item that was requested(requestedItem).

*/
function compareItems(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback) {
	var requestedItemType = itemMethods.getItemType(requestedItem);

	console.log("comparing items " + equippedItem.name + " " + requestedItem.name);


	/*
		If items are the same (have same tooltipParam or ID), update under following conditions :
		--new enchant(this assumes player replaced with a better enchant)
		--requestedItem has more gems
		--if gem in hat before was not a amethyst or diamond but current is
		--if gem was boon before, and current is not or a higher level
		--if gem rank before is less than gem rank after
		--if gem before was not leg, but current is
	*/ 
	function sameItemCompare(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback) {
		console.log ("Items were same".red)
		if (!itemMethods.hasNewEnchant(requestedItem, equippedItem)) {	

			//if item is socketable, check for gems.
			if (itemMethods.isSocketable(requestedItemType)) {

				if(itemMethods.doesRequestedHaveMoreGems(requestedItem, equippedItem)) {
					updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
				}

				//did not have more Gems, so it could have less or same.  Check if same count and not 0.
				else { 

					if (!itemMethods.isGemCountZero(requestedItem) && itemMethods.sameGemCount(requestedItem, equippedItem)) {
						var requestedGems = requestedItem.gems;
						var equippedGems = equippedItem.gems;

						if (!gemMethods.sameGems(requestedGems, equippedGems)) {

							//if item is hat, if equipped gem is not a diamond or amethyst and requested is, update
							if (itemMethods.isHat(requestedItemType)) {
								if (!gemMethods.isHatGemUtility(equippedGems) && gemMethods.isHatGemUtility(requestedGems)) {
									updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
								}
								else {
									console.log("sameItem: gem was ame or diamond.");
									foundItemCallback();
								}
								
							}//end if item was hat

							//Ring/Amulet Check
							else if (itemMethods.isJewlery(requestedItemType)) {

								if (gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {

									//If gem was boon, update if requested has a higher rank or not boon
									if (gemMethods.isGemBoon(equippedGems[0])) {
										if (gemMethods.requestedGemRankHigher(requestedGems[0], equippedGems[0]) || !gemMethods.isGemBoon(requestedGems[0])) {
											updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
										}
										else {
											console.log("sameItem: jewelery gem was same level or both boon");
											foundItemCallback();
										}
									}

									//If Gem was not boon, update if request has higher rank
									else {
										if (gemMethods.requestedGemRankHigher(requestedGems[0], equippedGems[0])) {
											updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
										}
										else {
											console.log("sameItem: jewelery gem was not Boon, gem was same rank");
											foundItemCallback();
										}
									}
								}

								else if (!gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {
									updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
								}

								else {
									console.log("sameItem: jewelery (both werent legendary) and not (previous leg, next leg)");
									foundItemCallback();
								}
							}//end if item was ring or neck
							
							//probably wont get called but
							//if item is a weapon, or chest/leg do nothing, b/c same item has same stats(no new enchants).
							//#of gems were the same but actual gems diff.  Should compare gems
							else {
								console.log("sameItem: weapon/chest/pants had same enchant but different gems");
								foundItemCallback();
							}
						}//end if had gems and gems were not same

						else {
							console.log("sameItem: no new enchants + had sameGems");
							foundItemCallback();
						}
					}//end if item had gems and had same gemcount
					
					//did not have more gems, either did not have sameGemCount or gemCount was 0).
					else {
						console.log("sameItem: did not have sameGemCount or gemCount for current was less");
						foundItemCallback();
					}
				}//end else item did not have more gems

			}//end if item is socketable

			else {
				console.log("sameItem: item is not socketable and no new enchants");
				foundItemCallback();
			}
		}//end if item did not have new enchant

		//Updating because item had a new enchant and assumes player would only enchant to make an item better
		else {
			updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
		}
	}

	//If items are same, call sameItemCompare
	if (equippedItem.itemID == requestedItem.tooltipParams.replace("item/" , "")) {
		sameItemCompare(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback);
	}


	//not same, call diffItemCompare
	else {
	/*
		Items were different so first check if item has sockets.  
		Update if:
		--current has more gems than previous
		--previous hat did not have ame/dia but current does
		--previous jewelry had boon, and current has higher level boon or a different gem
		--previous was not boon, and current had better stats




		If it has sockets, check if there are more gems.  If so update,
		Else check if it actually have gems
	*/
	function diffItemCompare(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback) {

		console.log("diffItemCompare".green);
		if (itemMethods.isSocketable(requestedItemType)) {
			console.log("diffItemCompare: requestedItem is socketable");

			if(itemMethods.doesRequestedHaveMoreGems(requestedItem, equippedItem)) {
				updateAndUnequip(itemCollection, heroID, requestedItem, equippedItem, foundItemCallback);
			}

			else { 
				console.log("diffItemCompare: item had gems")

				if (!itemMethods.isGemCountZero(requestedItem) && itemMethods.sameGemCount(requestedItem, equippedItem)) {
					console.log("diffItemCompare: gemsCounts are same and not 0.  comparing gems")
					var requestedGems = requestedItem.gems;
					var equippedGems = equippedItem.gems;
					if (!gemMethods.sameGems(requestedGems, equippedGems)) {
						console.log("diffItemCompare: not same gems")
						
						if (itemMethods.isHat(requestedItemType)) {
							if (!gemMethods.isHatGemUtility(equippedGems) && gemMethods.isHatGemUtility(requestedGems)) {
								updateAndUnequip(itemCollection, heroID, requestedItem, equippedItem, foundItemCallback);
							}
							else {
								console.log("diffItem: both hats were either diamond/ame.  compare stats");
								//for now callback
								foundItemCallback();
							}
						}


						if (itemMethods.isJewlery(requestedItemType)) {

							if (gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {
								
								if (gemMethods.isGemBoon(equippedGems[0])) {

									if (gemMethods.requestedGemRankHigher(requestedGems[0], equippedGems[0]) || !gemMethods.isGemBoon(requestedGems[0])) {
										updateAndUnequip(itemCollection, heroID, requestedItem, equippedItem, foundItemCallback);
									}
									else {
										console.log("diffItems: equipped gem was boon, and current was not higher rank boon or another gem.  CHECK STATS")
										foundItemCallback();
									}
								}

								else {
									if (gemMethods.requestedGemRankHigher(requestedGems[0], equippedGems[0])) {
										updateAndUnequip(itemCollection, heroID, requestedItem, equippedItem, foundItemCallback);
									}

									//equipped jewelry was not boon and  request did not have a higher rank. CHECK check if same rank
									else {
										if (itemMethods.isRing(requestedItemType)) {
											//COMPARE STATS, for now update+unequip
											//unequip the ring that was updated
											// itemCollection.find( {"type" : requestedItemType}).sort({"lastupdated":1}).toArray(function(err, matchedRings) {
											// 	if (matchedRings.length == 2) {
													console.log("diffItem: ring not boon nor higher rank, comparing stats two matching rings "+ equippedItem.name + "  equipping " + requestedItem.name + "".red);
													updateAndUnequip(itemCollection, heroID, requestedItem, equippedItem, foundItemCallback);
												// }
												// else {
												// 	console.log("diffItem: rings and length wasnt 2" + matchedRings + "".red)
												// 	foundItemCallback();
												// }
											// });
										}
										//amulet
										else {
											updateAndUnequip(itemCollection, heroID, requestedItem, equippedItem, foundItemCallback);
										}
									}
								}//end if both gems Legendary
							}//end if item was jewlery

							//Update+unequip if equipped is nonLeg and requested is
							else if (!gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {
								updateAndUnequip(itemCollection, heroID, requestedItem, equippedItem, foundItemCallback);
							}
						}//end if item was ring or neck

						//item is weapon/chest/legs and gems are different.  check if diamond/emerald, then update.
						//if not check stats
						else {
							console.log("weapon CHECK stats");
							foundItemCallback();
							//CHECK STATS.  WEAPON/CHEST/LEGS had same # of gems, but gems not same
						}
					}//end if gems were not same

					//!!!!!!TO DOgems were same compare itemstats
					else {
						updateAndUnequip(itemCollection, heroID, requestedItem, equippedItem, foundItemCallback);
					}
				}//end if item had gems, and had same gemcount


				//item either had no gems, or different gem counts.  COMPARE STATS.  for now just callback
				else {
					foundItemCallback();
					console.log("diffItem: requestedItem had 0 gems, or less")
				}
			}//end if item did not have more gems
		}//end if item is socketable

		//!!!not a socketable item
		//!!!TO DOcompare stats
		else {
			console.log("item not socketable")
			updateAndUnequip(itemCollection, heroID, requestedItem, equippedItem, foundItemCallback);
		}
	}//diffItemCompare

	diffItemCompare(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback);
	}

}

function updateAndUnequip(itemCollection, heroID, currentItem, itemToUnequip, callback) {
	unequipItem(itemCollection, itemToUnequip, heroID);
	updateInItemCollection(itemCollection, currentItem, heroID, callback);
}

function updateInItemCollection(itemCollection, currentItem, heroID, callback) {
	itemCollection.update(
		{"heroID": parseInt(heroID) , "type" :itemMethods.getItemType(currentItem)},
		{$set :
			{"itemID" : currentItem.tooltipParams.replace("item/",""), 
			"name" : currentItem.name, "displayColor" : currentItem.displayColor, 
			"type" : itemMethods.getItemType(currentItem), 
			"affixes" : currentItem.attributes, 
			"randomAffixes" : currentItem.randomAffixes, 
			"gems" : currentItem.gems, 
			"socketEffects" : currentItem.socketEffects,
			"heroID" : parseInt(heroID), 
			"equipped" : true, 
			"lastupdated" : new Date()}
		}, function(err, result) {
			console.log("Successfully updated/equipped " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5));
			callback();
	});
}

function insertInItemCollection(itemCollection, currentItem, heroID, callback) {
	itemCollection.insert(
		{"itemID" : currentItem.tooltipParams.replace("item/",""), 
			"name" : currentItem.name, 
			"displayColor" : currentItem.displayColor, 
			"type" : itemMethods.getItemType(currentItem), 
			"affixes" : currentItem.attributes, 
			"randomAffixes" : currentItem.randomAffixes, 
			"gems" : currentItem.gems, 
			"socketEffects" : currentItem.socketEffects, 
			"heroID" : parseInt(heroID), 
			"equipped" : true,
			"lastupdated" : new Date()},
		function(err, result) {
			console.log("Successfully inserted " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5));
			callback();
	});
}

function unequipItem(itemCollection, itemToUnequip, heroID) {
		itemCollection.update(
			{"heroID": parseInt(heroID) , "itemID" : itemToUnequip.itemID },
			{$set : {"Equipped" : false}}, 
				function(err, result) {
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