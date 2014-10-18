var request = require("request");
var express = require("express");
var fs = require("fs");
var leaderboardMethods = require('./d3_modules/leaderboardMethods');

var app = express();
// var db = require('./db');

var mongo = require('mongodb');
// var Server = mongo.Server;
var Db = mongo.Db;
var MongoClient = mongo.MongoClient;

var date;

var apiKey = "y34m8hav4zpvrezvrs6xhgjh6uphqa5r";
var region = "us";
var apiURL = ".api.battle.net/d3/"
var locale = "en_US";

var gRiftCategory= "era/1/rift-";
var collectionCategory = "normal";
var diabloClasses = ["crusader", "barbarian", "dh", "wizard", "wd", "monk"];

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

//used when searching a collection for a class.  used in getLeaderboard  the diabloclass passed in is req.params.diabloclass
function getClassName(diabloClass) {
	if (diabloClass == "dh") {
		return "demon-hunter";
	}
	else if (diabloClass == "wd" ) {
		console.log("here");
		return "witch-doctor";
	}
	else {
		return diabloClass;
	}
}

//add heroesdata to hero collection.
function addHeroData(battletag, heroID, delay) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		if(err) {
			return console.log("addHeroData error");
		}
		else {
			console.log("inside addHeroData for " + battletag + " " + heroID + "delay is " + delay);
			var requestURL = "https://" + region + apiURL + "profile/" + battletag.replace("#", "-") + "/hero/" + heroID + "?locale=" + locale + "&apikey=" + apiKey;
			console.log(requestURL);
			// var requestURL = "https://us.api.battle.net/d3/profile/" + battletag.replace("#","-") + "/hero/" + heroID +"?locale=en_US&apikey=" + apiKey
			// console.log(requestURL);
			setTimeout( function() {
				request(requestURL, function (error, response, data) {
					if (data == undefined) {
						console.log("addHeroData data was undefined");
						//error handling, call again
						addHeroData(battletag, heroID, 1000);
					}
					else {
						var jsonData = JSON.parse(data);
						var items = jsonData.items;
						//check if data is not null
						if (items == null) {
							console.log("addHeroData items was null for " + battletag + " " + heroID);
							//error handling, call again
							addHeroData(battletag, heroID,1000);
						}					
						else {
							if (db == null) {
								console.log("addHeroData database was null for " + battletag + " " + heroID);
								//error handling, call again
								addHeroData(battletag, heroID, 1000);							
							}
							else {
								if (jsonData.level == 70) {
									var heroCollection = db.collection("hero");
									heroCollection.find({"heroID" : jsonData.id}).toArray(function(err, results) {
										//found, just update.  otherwise insert.
										if (results.length == 1) {
											heroCollection.update({"heroID" : jsonData.id}, {"heroID" : jsonData.id , "Battletag": battletag,  "Name" : jsonData.name, "Class" : jsonData.class , "Level" : jsonData.level, "Paragon" : jsonData.paragonLevel, "Hardcore" : jsonData.hardcore, "Seasonal" : jsonData.seasonal, "Skills" : jsonData.skills, "Items" : jsonData.items, "Stats" : jsonData.stats}, function(err, results) {
												console.log("addHeroData found, updating "+ battletag + " " + jsonData.id);
											});//end update.
										}
										else {
											heroCollection.insert({"heroID" : jsonData.id , "Battletag": battletag,  "Name" : jsonData.name, "Class" : jsonData.class , "Level" : jsonData.level, "Paragon" : jsonData.paragonLevel, "Hardcore" : jsonData.hardcore, "Seasonal" : jsonData.seasonal, "Skills" : jsonData.skills, "Items" : jsonData.items, "Stats" : jsonData.stats}, function(err, results) {
												console.log("addHeroData not found, inserting "+ battletag + " " + jsonData.id);
											});//end insertion.
										}
									});//end update/insert 
								}
							}
						}//end else for when data was not null
					}
				});//end api request for heroID
			},delay);//end setTimeout
		}//end no error when connecting to DB
	});//end mongoclien connect
}

//localhost:3000/player/BATTLETAG
//for a given Battletag, it makes a request to get all heroes for that tag.  After getting heroes, create the page for that Battletag
function getHeroes(battletag, req, res) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		var heroCollection = db.collection("hero");
	});

	var requestURL = "https://" + region + apiURL + "/profile/" + battletag + "/?locale=" + locale + "&apikey=" + apiKey;
	date = new Date();
	console.log(battletag + " Page before request"+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
	request(requestURL, function (error, response, data) {
		var jsonData = JSON.parse(data);
		if (jsonData.code == "NOTFOUND") {
			res.send("Invalid Battletag");
			//request the tag again.
		}
		var heroes = jsonData.heroes;
		for (i=0; i<heroes.length; i++) {
			if (i < 8) {
				addHeroData(battletag, heroes[i].id, 0);
			}
			else {
				addHeroData(battletag, heroes[i].id, Math.floor(i/9)*1000);
			}
		}
		res.render('player.ejs', { ejs_btag : battletag , ejs_heroes : heroes });
		date = new Date();
		console.log(battletag + " Page after request"+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
	});
}

//localhost:3000/player/:battletag/hero/:heroID
//for a given heroID, it gets hero's stats, skills and items
function getHeroDetails(heroID, req, res) {
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

function updateItemDB(itemID, heroID, delay){
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		if (err) {
			return console.log("updateItemDB error connecting to db")
		}
		else {
			var itemCollection = db.collection("item");
			var itemRequestURL = "https://us.api.battle.net/d3/data/item/" + itemID + "?locale=" + locale+"&apikey=" + apiKey;
			setTimeout( function() {
				request(itemRequestURL, function (error, response, data) {
					currentItem = JSON.parse(data);
					if (currentItem.code == 403) {
						updateItemDB(itemID,heroID,delay+1000);
					}
					else{
						console.log(delay + " updateItemDB inrequest " +currentItem.name);
						(function(currentItem) {
							itemCollection.find({"itemID" : currentItem.tooltipParams.replace("item/","")}).toArray(function(err, result) {
								console.log("finding " + currentItem.tooltipParams.replace("item/","").substring(0,5) + " " + currentItem.name)
								if (result.length != 1) {
									itemCollection.insert({"itemID" : currentItem.tooltipParams.replace("item/",""), "Name" : currentItem.name, "Affixes" : currentItem.attributes, "Random Affixes" : currentItem.randomAffixes, "Gems" : currentItem.gems, "Socket Effects" : currentItem.socketEffects, "Hero" : parseInt(heroID)}, function(err, result) {
										console.log("updateItemDB successfully inserted " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5));
									});
								}
								else {
									console.log("updateItemDB already in database " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5) + " " + i);
								}
							});//end find in colleciton
						})(currentItem);//end self-invoking function
					}				
				});//end request
			},delay);//end settimeout
		}//end if successfully in db
	});
}



//for a hero, check each item and sum the important stats (elemental damage, cooldown reducion, reduced damage)
function getImportantStats(heroID) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		if (err) {
			return console.log("getImportantStats error connecting to db")
		}
		else {
			var itemCollection = db.collection("item");

			var eliteDam = 0;
			var fireDam = 0;
			var lightningDam = 0;
			var coldDam = 0;
			var arcaneDam = 0;
			var poisonDam = 0;
			var physDam = 0;
			var cooldown = 0;
			//fire,light,cold,arcane,poison,phys
			var elementalDam = [0,0,0,0,0,0];
			var meleeDamRed = 0;
			var rangeDamRed = 0;
			var eliteDamRed = 0;
			console.log("getImportantStats " + heroID);
			itemCollection.find({"Hero" : parseInt(heroID)}).toArray(function(error, results) {
				// console.log(results);
				for(i=0; i<results.length; i++) {
					for (j=0; j<results[i].Affixes.primary.length; j++) {
						//get cooldown reduction from every item
						if (results[i].Affixes.primary[j].text.indexOf("cooldown") != -1) {
							cooldownString = results[i].Affixes.primary[j].text;
							// console.log(results[i].Name + " " + cooldownString.substring(cooldownString.lastIndexOf(" ")+1,cooldownString.length-2 )+"%");
							cooldown += parseFloat(cooldownString.substring(cooldownString.lastIndexOf(" ")+1,cooldownString.length-2 ));
						}
						//get element damage from every item
						if (results[i].Affixes.primary[j].text.indexOf("skills deal") != -1) {
							// console.log(results[i].Affixes.primary[j].text);
							skillsString = results[i].Affixes.primary[j].text;
							number = parseInt(skillsString.substring(skillsString.indexOf("deal ")+5, skillsString.indexOf("%")));
							element = skillsString.substring(0, skillsString.indexOf(" skills"));

							switch (element) {
								case "Fire" :
									elementalDam[0] += number;
									fireDam += number;
									break;
								case "Cold" :
									elementalDam[1] += number;
									coldDam += number;
									break;
								case "Lightning" :
									elementalDam[2] += number;
									lightningDam += number;
									break;
								case "Poison" :
									elementalDam[3] += number;
									poisonDam += number;
									break;
								case "Arcane" :
									elementalDam[4] += number;
									arcaneDam += number;
									break;
								case "Physical" :
									elementalDam[5] += number;
									poisonDam += number;
									break;
							}
							// console.log(element+number);
						}
					}//end for affixes
				}//end for item

				//find the highestelement
				var highestElement = 0;
				for (i=0; i<elementalDam.length;i++) {
					if (elementalDam[i] > highestElement) {
						highestElement = elementalDam[i];
					}
				}
				switch (elementalDam.indexOf(highestElement)) {
					case 0 :
						elementalDam = ["Fire" , elementalDam[0]];
						break;
					case 1 :
						elementalDam = ["Cold" , elementalDam[1]];
						break;
					case 2 :
						elementalDam = ["Lightning" , elementalDam[2]];
						break;
					case 3 :
						elementalDam = ["Poison" , elementalDam[3]];
						break;
					case 4 :
						elementalDam = ["Arcane" , elementalDam[4]];
						break;
					case 5 :
						elementalDam = ["Physical" , elementalDam[5]];
						break;
				}
				console.log(elementalDam);
				console.log("total cooldown " + cooldown);
			});//end  find
		}//end else
	});	//end connection
}

app.get('/', function(req, res) {
	res.sendfile('default.html');
});


app.get('/updatebarb', function (req,res) {
	leaderboardMethods.getCurrentLeaderboard('barbarian');
	res.redirect('/');
});
app.get('/updatesader', function (req,res) {
	leaderboardMethods.getCurrentLeaderboard('crusader');
	res.redirect('/');
});
app.get('/updatedh', function (req,res) {
	leaderboardMethods.getCurrentLeaderboard('dh');
	res.redirect('/');
});
app.get('/updatemonk', function (req,res) {
	leaderboardMethods.getCurrentLeaderboard('monk');
	res.redirect('/');
});
app.get('/updatewiz', function (req,res) {
	leaderboardMethods.getCurrentLeaderboard('wizard');
	res.redirect('/');
});
app.get('/updatewd', function (req,res) {
	leaderboardMethods.getCurrentLeaderboard('wd');
	res.redirect('/');
});

//files
app.get('/get.js', function(req,res) {
	res.sendfile('get.js');
});
app.get('/request.js', function(req,res) {
	res.sendfile('request.js');
});
app.get('/styles/battletag.css', function(req,res) {
	res.sendfile('styles/battletag.css');
});
app.get('/styles/hero.css', function(req,res) {
	res.sendfile('styles/hero.css');
});

app.get('/player/:battletag', function(req,res) {
	getHeroes(req.params.battletag, req, res);
});

app.get('/player/:battletag/hero/:heroID', function(req, res) {
	getHeroDetails(req.params.heroID, req, res);
	getImportantStats(req.params.heroID);
});

app.get('/:category/:diabloClass', function(req,res) {
	leaderboardMethods.getLeaderboard(req.params.diabloClass, req.params.category, req, res);
});

//setting which leaderboard to get data from.
app.get('/normal', function(req,res) {
	leaderboardMethods.getGRiftCategory('normal');
	res.redirect('/');
});
app.get('/hc', function(req,res) {
	leaderboardMethods.getGRiftCategory('hc');
	res.redirect('/');
});
app.get('/season', function(req,res) {
	leaderboardMethods.getGRiftCategory('season');
	res.redirect('/');
});
app.get('/seasonhc', function(req,res) {
	leaderboardMethods.getGRiftCategory('seasonhc');
	res.redirect('/');
});

app.get('/*' , function(req,res) {
	res.send("404");
});


app.listen(3000);


/*--work on later
//given jsondata for player, method finds all heroes that match the leaderboard's class
function findHero(player, diabloClass) {
	var heroes = player.heroes;
	var matchingClass = []
	heroes.forEach(function(hero) {
		if (hero.class == diabloClass) {
			// console.log(hero.name + " " + hero.class + diabloClass);
			matchingClass.push(hero);
		}
	});
	if (matchingClass.length == 1) {
		return matchingClass[0];
	}
	else {
		findLeaderboardHero(player, matchingClass);
	}
}

function findLeaderboardHero(player, matches){

	var highestHero;
	var mainstat=0;
	matches.forEach(function(hero) {
		//change this to databse later
		var battletag = player.battleTag.replace("#", "-");
		var requestURL = "https://us.api.battle.net/d3/profile/" + battletag + "/hero/" + hero.id + "?locale=en_US&apikey=y34m8hav4zpvrezvrs6xhgjh6uphqa5r";
		// console.log(requestURL);
		setTimeout( function () {request(requestURL, function(error, response, data) {
			var heroData = JSON.parse(data);
			// console.log(heroData.stats);
			
			console.log(battletag + " " + heroData.name + " " +	heroData.stats.strength);
			// if (heroData.stats.strength > mainstat) {
			// 	console.log(heroData.stats.strength);
			// 	heroData.stats.strength = mainstat;
			// 	highestHero = hero;
			// }

		});
	},1000);
		//if main stat is highest assume
	});
}
*/