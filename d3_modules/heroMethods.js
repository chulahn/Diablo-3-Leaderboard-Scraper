var exports = module.exports = {};
var request = require("request");
var mongo = require('mongodb');

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
	console.log(heroID + " Page before request"+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());

	request(heroRequestURL, function (error, response, data) {
		//string to json
		var heroData = JSON.parse(data);
		var heroItems = heroData.items;
		if (heroData.level == 70) {
			getItemIDsFromHero(heroItems,heroID,10);
		}
		res.render('hero.ejs', {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems})
		date = new Date();
		console.log(heroID + " Page after request"+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
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
		console.log(item.name + " " + i);
		console.log(delay);
		itemID = item.tooltipParams.replace("item/" , "");
		updateItemDB(itemID, heroID, delay);
		delay = delay + 100;
		i++;
	});
}

//returns the itemType that will be used when searching collection
function getItemType(itemType) {
	itemType = itemType.toLowerCase();
	if (itemType.indexOf("helm") != -1 || itemType.indexOf("mask") != -1 || itemType.indexOf("spiritstone") != -1) {
		return "Head";
	}
	else if (itemType.indexOf("shoulders") != -1) {
		return "Shoulders";
	}
	else if (itemType.indexOf("hand") != -1 || itemType.indexOf("fist") != -1 || itemType.indexOf("mace") != -1 || itemType.indexOf("1h") != -1 || itemType.indexOf("axe") != -1 || itemType.indexOf("wand") != -1) {
		return "1 Hand";
	}
	else if (itemType.indexOf("2h") != -1) {
		return "2 Hand";
	}	
	else if (itemType.indexOf("boots") != -1) {
		return "Feet";
	}
	else if (itemType.indexOf("chest") != -1) {
		return "Chest";
	}
	else if (itemType.indexOf("bracers") != -1) {
		return "Bracers";
	}
	else if (itemType.indexOf("legs") != -1) {
		return "Legs";
	}
	else if (itemType.indexOf("amulet") != -1) {
		return "Neck";
	}
	else if (itemType.indexOf("belt") != -1) {
		return "Belt";
	}
	else if (itemType.indexOf("gloves") != -1) {
		return "Hands";
	}
	else if (itemType.indexOf("mojo") != -1 || itemType.indexOf("quiver") != -1 || itemType.indexOf("orb") != -1 || itemType.indexOf("shield") != -1) {
		return "offHand";
	}
	else if (itemType.indexOf("ring") != -1) {
		return "Ring";
	}

}

function updateItemDB(itemID, heroID, delay){
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		if (err) {
			return console.log("updateItemDB error connecting to db")
		}
		else {
			var itemCollection = db.collection("item");
			var itemRequestURL = "https://us.api.battle.net/d3/data/item/" + itemID + "?locale=" + locale + "&apikey=" + apiKey;
			setTimeout( function() {
				request(itemRequestURL, function (error, response, data) {
					currentItem = JSON.parse(data);
					if (currentItem.code == 403) {
						updateItemDB(itemID,heroID,delay+1000);
					}
					else{
						console.log(delay + " updateItemDB inrequest " +currentItem.name);
						(function(currentItem) {
							// console.log(heroID + " " + currentItem.Hero);
							console.log( getItemType(currentItem.type.id));
							//find if hero has an item in that spot.
							itemCollection.find({"Hero": parseInt(heroID) , "Type" :getItemType(currentItem.type.id)}).toArray(function(err, result) {
								//if there is item in spot, check if that itemID is same as item to be updated.
								if (result.length != 0) {
									//for each matched item
									for (i=0; i<result.length; i++) {
										//if item is the same
										if (result[i].itemID == itemID) {
											
											//check if item has more gems.  if jewelry check rank of gems.

											//if item is a mainhand, chest, legs, hat
											if(getItemType(currentItem.type.id) == "1 Hand" || getItemType(currentItem.type.id) == "2 Hand" || getItemType(currentItem.type.id) == "Head" || getItemType(currentItem.type.id) == "Chest" || getItemType(currentItem.type.id) == "Legs") {
												//if there are more gems or equal, check if overall dps, will increase, then update
												if (currentItem.gems.length >= result[i].Gems.length) {

													if (getItemType(currentItem.type.id) == "Head") {
														//if currently wearing topaz in helm and replacement gem is not a topaz, update
														if (result[i].Gems[0].item.name.indexOf("Topaz") != -1 && currentItem.gems[0].item.name.indexOf("Topaz") != -1) {
															//update DB
														}
													}//end if a hat

													//if not a helm, update.  assumes not replacing with a lwoer gem
													else {
														//UPDATE DB
													}//end if not a hat

												}//end if same number of gems
											}//end if item is mainhand,chest,legs or hat


											//if jewelry
											else if (getItemType(currentItem.type.id) == "Ring" || getItemType(currentItem.type.id) == "Neck") {
												var currentGem = currentItem.gems[0];
												var equippedGem = result[i].Gems[0];
												//if gems are same, check rank
												if (currentGem.item.name == equippedGem.item.name) {
													//check if gem is legendary.
													if (currentGem.item.displayColor == "orange") {
														//if current gem has higher rank replace
														if (currentGem.jewelRank > equippedGem.jewelRank) {
															//UPDATE DB
															console.log("jewel rank upgraded");
														}
													}
												}//end if gems have same name
												
												//if gem names are not same
												else {
													//if currently equipped is boon
													if (equippedGem.item.name == "Boon of the Hoarder") {
														//REPLACE IN DB
														console.log("Switching from boon to " + currentGem.item.name);
													}
													else {
														//if replacement gem has a higher rank update DB and note boon
														if (currentGem.jewelRank > equippedGem.jewelRank && currentGem.item.name != "Boon of the Hoarder") {
															//UPDATE DB
														}
													}
												}//end if gem names are not same
											}//end if jewelry
										}//end if items are the same


										//item is not the same.  check stats, and jewelry
										else {
											// if {}
										}

									}//end for loop of each item
								}//end if found a item in that spot

								//there no item in that spot, update
								else {
									//UPDATE
								}
							});


///update collection
							itemCollection.find({"itemID" : currentItem.tooltipParams.replace("item/","")}).toArray(function(err, result) {
								// console.log("finding " + currentItem.tooltipParams.replace("item/","").substring(0,5) + " " + currentItem.name)
								if (result.length != 1) {
									itemCollection.insert({"itemID" : currentItem.tooltipParams.replace("item/",""), "Name" : currentItem.name, "Type" : getItemType(currentItem.type.id), "Affixes" : currentItem.attributes, "Random Affixes" : currentItem.randomAffixes, "Gems" : currentItem.gems, "Socket Effects" : currentItem.socketEffects, "Hero" : parseInt(heroID)}, function(err, result) {
										// console.log("updateItemDB successfully inserted " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5));
									});
								}
								else {
									// console.log("updateItemDB already in database " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5) + " " + i);
								}
							});//end find in colleciton


						})(currentItem);//end self-invoking function
					}				
				});//end request
			},delay);//end settimeout
		}//end if successfully in db
	});
}
