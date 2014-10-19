var express = require("express");
var leaderboardMethods = require('./d3_modules/leaderboardMethods');
var playerMethods = require('./d3_modules/playerMethods');
var heroMethods = require('./d3_modules/heroMethods');

var app = express();
// var db = require('./db');

var mongo = require('mongodb');
// var Server = mongo.Server;
var Db = mongo.Db;
var MongoClient = mongo.MongoClient;

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
	playerMethods.getHeroes(req.params.battletag, req, res);
});

app.get('/player/:battletag/hero/:heroID', function(req, res) {
	heroMethods.getHeroDetails(req.params.heroID, req, res);
	getImportantStats(req.params.heroID);
});

app.get('/update/:diabloClass', function(req,res) {
	leaderboardMethods.getCurrentLeaderboard(req.params.diabloClass);
	res.redirect('/');
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