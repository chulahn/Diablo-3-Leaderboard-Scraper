var leaderboardMethods = require('./d3_modules/leaderboardMethods');
var playerMethods = require('./d3_modules/playerMethods');
var heroMethods = require('./d3_modules/heroMethods');

var express = require("express");
var app = express();

var mongo = require('mongodb');
var Db = mongo.Db;
var MongoClient = mongo.MongoClient;

//for a hero, search itemDatabase, and sum the important stats (elemental damage, cooldown reducion, reduced damage)
function getImportantStats(heroID) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
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

app.get('/', function(req, res) {
	res.sendfile('default.html');
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
app.get('/styles/leaderboard.css', function(req,res) {
	res.sendfile('styles/leaderboard.css');
});

app.get('/player/:battletag', function(req,res) {
	playerMethods.getHeroes(req.params.battletag, req, res);
});

app.get('/player/:battletag/hero/:heroID', function(req, res) {
	heroMethods.getHeroDetails(parseInt(req.params.heroID), req, res);
	getImportantStats(parseInt(req.params.heroID));
});

app.get('/update/player/:battletag/hero/:heroID', function(req, res) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		if (err) {
			return console.log(err);
		}
		else {
			console.log(req.params.battletag)
			playerMethods.addHeroData(req.params.battletag, parseInt(req.params.heroID), 50, db);
			res.redirect('/player/'+req.params.battletag+'/hero/'+req.params.heroID);
		}	
	});
});

app.get('/update/:diabloClass', function(req,res) {
	leaderboardMethods.getCurrentLeaderboard(req.params.diabloClass);
	res.redirect('/');
});

app.get('/:region/:category/:diabloClass', function(req,res) {
	leaderboardMethods.getLeaderboard(req.params.region, req.params.diabloClass, req.params.category, req, res);
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
