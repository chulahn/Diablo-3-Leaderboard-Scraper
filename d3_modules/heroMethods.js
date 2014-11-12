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


//localhost:3000/player/:battletag/hero/:heroID
//for a given heroID, it searches heroCollection, and renders hero's page.  if not in data base, make an API request
exports.getHeroDetails = function(heroID, req, res) {
	// console.log("https://" + region + apiURL + "/profile/" + battletag + "/?locale=" + locale + "&apikey=" + apiKey  );
	var heroRequestURL = "https://" + region + apiURL + "/profile/" +req.params.battletag+"/hero/"+heroID+"?locale="+locale+"&apikey="+apiKey;

	debug.timeString(heroID + " Page before request ");

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
						// exports.getItemIDsFromHero(heroItems,heroID,10);
					}
					res.render("hero.ejs", {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems, ejs_heroID : heroID})
					debug.timeString(heroID + " Page after request ");
				}
				//not in database.  must request data from Blizzard site.
				else {
					request(heroRequestURL, function (error, response, data) {
						var heroData = JSON.parse(data);
						var heroItems = heroData.items;
						if (heroData.level == 70) {
							// exports.getItemIDsFromHero(heroItems,heroID,10);
						}
						res.render("hero.ejs", {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems, ejs_heroID : heroID})
						debug.timeString(heroID + " Page after request ");
					});
				}
			});
		}
	});
//Takes about same time.  Can crash if too many requests were 
}

//get all items from json heroItems, and call findItemInCollection for each.
exports.getItemIDsFromHero = function(heroItems, heroID, delay, foundGRiftHeroCallback) {
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

			for (item in heroItems) {
				if (heroItems.hasOwnProperty(item)) {
					if (heroItems[item] != null) {
						allItems.push(heroItems[item]);
					}
				}
			}
			
			if (db != undefined) {

				findItemsInCollection(allItems, heroID, delay, db, foundGRiftHeroCallback);

			}
			else {
				console.log("db was null");
				exports.getItemIDsFromHero(heroItems, heroID, delay);
				adfas
			}
		}
	});
}

function findItemsInCollection(allItems, heroID, delay, db, foundGRiftHeroCallback){
	console.log("findItemsInCollection passed in delay "+ delay +" for hero " + heroID);
	 
	async.series([ 

		function(addedExtraInfoCallback) {
			//for every all of heroes items passed in, find the item inside itemCollection
			async.eachSeries(allItems, function (currentItem, foundItemCallback) {
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
									findItemInCollection(itemID, heroID, delay+1000, db, foundItemCallback);	
								}
								else {
									requestedItem = JSON.parse(data);
									if (requestedItem.code == 403) {
										console.log("403 too many requests" + delay + " , findItemsInCollection " + currentItem.name + " " + heroID.red);
										console.log(requestedItem);
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
														//results replace
														//
											//

											//find if hero has an item in that spot.  if there is check for differences.
											itemCollection.find({"heroID": parseInt(heroID) , "type" :requestedItemType , "equipped": true}).toArray(function(err, matchedItems) {


												//if itemtype is 2h, and there were no matches, check 1hand and off
												if (requestedItemType == "2 Hand" && matchedItems.length == 0) {

													//check 1hand,  If there is a 1hand, unequip.
													//Then, if not crusader, remove equipped offHand 
													itemCollection.find({"heroID": parseInt(heroID) , "type" :requestedItemType , "equipped": true}).toArray(function(err, matched1Handers) {
														
														if (matched1Handers.length > 0) {

															unequipItem(itemCollection, matched1Handers[0], heroID);

															itemCollection.find({"heroID": parseInt(heroID), "type": "offHand", "equipped" : true}).toArray(function(err, matchedOffHands) {
																if (matchedOffHands.length > 0) {
																	unequipItem(itemCollection, matchedOffHands[0], heroID);
																}
															});
														}

															//unequip1h equip 2h.
														insertInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
													});
												}


												//1hand and no 1handers equipped, check for 2hands.
												if (requestedItemType == "1 Hand" && matchedItems.length == 0) {
													itemCollection.find({"heroID": parseInt(heroID) , "type" :"2 Hand" , "equipped": true}).toArray(function(err, matched2Handers) {
														if (matched2Handers.length > 0) {
															unequipItem(itemCollection, matched2Handers[0], heroID);
														}
														insertInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
													});
												}



												if (matchedItems.length != 0) {

													//check to see if player has only one ring, and if its not the same as the ring in DB, add it
													if (itemMethods.isRing(requestedItemType) && matchedItems.length == 1 && matchedItems[0].itemID != itemID) {
														console.log("Inserted 2nd ring");
														insertInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
													}



													//compare each item.
													// matchedItems.forEach(function (equippedItem) {
													// 	if (equippedItem.itemID == undefined) {
													// 		console.log(equippedItem[0]);
													// 	}
													// 	console.log("-----comparing " + equippedItem.name + " " + requestedItem.name + matchedItems.length)
													// 	compareItems(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback);														
													// })
													
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

										diamondCooldown = diamondCooldown * (1 + parseFloat(searchData[0]));
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
					console.log("------------added extraItemData for " + heroID);
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

function compareItems(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback) {
	var requestedItemType = itemMethods.getItemType(requestedItem);

	console.log("comparing items " + equippedItem.name + " " + requestedItem.name);

	//if equippedItem and requestItem have same ID, check for differences.
	//If no new enchants, check if it is socketable to check gems.
	/*
		For same item, update under following conditions :
		--new enchant
		--more gems
		--if gem in hat before was not a amethyst or diamond but current is
		--if gem was boon before, and current is not or a higher level
		--if gem rank before is less than gem rank after
		--if gem before was not leg, but current is
	*/ 
	function sameItemCompare(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback) {
		console.log ("Items were same".red)
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
									console.log("sameItem: gem was ame or diamond.");
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
											console.log("sameItem: jewelery gem was same level boon");
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
											console.log("sameItem: jewelery gem was not Boon, gem was same rank");
											foundItemCallback();
										}
									}
								}
								//If equipped gem is not legendary but requested is, update
								else if (!gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {
									updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
								}
								else {
									console.log("sameItem: jewelery (both werent legendary) and not (previous leg, next leg)");
									foundItemCallback();
								}
							}//end if item was ring or neck
							
							//if item is a weapon, or chest, or pants
							else {
								console.log("sameItem: weapon/chest/pants had same enchant but different gems");
								foundItemCallback();
							}
						}//end if had gems and gems were same
						else {
							console.log("foundItemCallback called 539");
							foundItemCallback();
						}
					}//end if item had gems and had same gemcount
					
					//did not have more gems, either did not have sameGemCount or gemCount was 0).
					else {
						console.log("did not have sameGemCount or gemCount for current was less");
						foundItemCallback();
					}
				}//end else item did not have more gems
			}//end if item is socketable
			else {
				console.log("sameItem: item is not socketable and no new enchants");
				foundItemCallback();
			}
		}//end if item did not have new enchant

		//Updating because item had a new enchant
		else {
			updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
		}
	}
	if (equippedItem.itemID == requestedItem.tooltipParams.replace("item/" , "")) {
		sameItemCompare(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback);
	}//end if items are the same


	//Item is not the same, update+unequip socketable items if there are more gems in request.
	else {
	/*
		Items were different so first check if item has sockets.  Update if:
		--current has more gems than previous
		--previous hat did not have ame/dia but current does




		If it has sockets, check if there are more gems.  If so update,
		Else check if it actually have gems
	*/
	function diffItemCompare(itemCollection, heroID, equippedItem, requestedItem, foundItemCallback) {
		console.log("diffItemCompare".green);
		if (itemMethods.isSocketable(requestedItemType)) {
			console.log("item socketable")
			if(itemMethods.doesRequestedHaveMoreGems(requestedItem, equippedItem)) {
				updateAndUnequip(itemCollection, heroID, requestedItem, equippedItem, foundItemCallback);
			}

			else { 
				console.log("item had gems")
				//if item actually has gems, and have same gemCount
					//check if gems are not same
						//for a hat
							//check if gem before wasnt ame/diamon and current is  
							//check if better stats
						//if jewelry
							//if cuurent boon, check current is higher rank or not boon
							//if current not boon, check if higher rank.  check STATS
				if (!itemMethods.isGemCountZero(requestedItem) && itemMethods.sameGemCount(requestedItem, equippedItem)) {
					console.log("not 0 and same count")
					var requestedGems = requestedItem.gems;
					var equippedGems = equippedItem.gems;
					if (!gemMethods.sameGems(requestedGems, equippedGems)) {
						console.log("not same gems")
						
						if (itemMethods.isHat(requestedItemType)) {
							if (!gemMethods.isHatGemUtility(equippedGems) && gemMethods.isHatGemUtility(requestedGems)) {
								updateAndUnequip(itemCollection, heroID, requestedItem, equippedItem, foundItemCallback);
							}
							else {
								console.log("diffItem: hat gems had utility gem before.  shouuld check stats");
							}
						}//end if item was hat

						//If Jewelry, compare gems.
							//if equipped is boon, update if higher rank or diff gem.  or better stats.
							//if not boon, update if higher rank.  or better stats
						if (itemMethods.isJewlery(requestedItemType)) {
							if (gemMethods.isGemLegendary(equippedGems[0]) && gemMethods.isGemLegendary(requestedGems[0])) {
								if (gemMethods.isGemBoon(equippedGems[0])) {
									//if replacement is not boon or has a higher rank, replace  
									if (gemMethods.requestedRankHigher(requestedGems[0], equippedGems[0]) || !gemMethods.isGemBoon(requestedGems[0])) {
										updateAndUnequip(itemCollection, heroID, requestedItem, equippedItem, foundItemCallback);
									}
									else {
										console.log("diffItems: equipped gem was boon, and current was not higher rank or boon.  CHECK STATS")
										foundItemCallback();
									}
								}

								//If equipped was not Boon, check if higher rank
								else {
									if (gemMethods.requestedRankHigher(requestedGems[0], equippedGems[0])) {
										updateInItemCollection(itemCollection, requestedItem, heroID, foundItemCallback);
									}

									//not higher rank
										//if ring, compare both rings,
										//else compare just ammy
									else {
										if (itemMethods.isRing(requestedItemType)) {
											//COMPARE STATS, for now update+unequip
											itemCollection.find( {"itemID" :equippedItem.itemID} ).toArray(function(err, matchedRings) {
												if (matchedRings.length == 2) {
													console.log("diffItem: ring not boon, comparing stats two matching rings "+ equippedItem.name + "  equipping " + requestedItem.name + "".red);
													updateAndUnequip(itemCollection, heroID, requestedItem, equippedItem, foundItemCallback);
												}
												else {
													console.log("diffItem: rings and length wasnt 2" + matchedRings + "".red)
													foundItemCallback();
												}
											});
										}
									}
								}
							}

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
	}//end if item was not the same

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