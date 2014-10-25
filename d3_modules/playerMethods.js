var exports = module.exports = {};
var request = require("request");
var express = require("express");
var heroMethods = require("../d3_modules/heroMethods.js");

var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;

var apiKey = "y34m8hav4zpvrezvrs6xhgjh6uphqa5r";
var region = "us";
var apiURL = ".api.battle.net/d3/"
var locale = "en_US";
// var gRiftCategory= "era/1/rift-";
// var collectionCategory = "normal";

var delayCounter = 0;
function timeToDelay() {
	delayCounter++;
	return (1100* (Math.floor(delayCounter/10)+1) + 2000);
}


//localhost:3000/player/BATTLETAG
//for a given Battletag, it makes a request to get all heroes for that tag.  After getting heroes, call addHeroData and create the page for that Battletag
//addHeroData is currently uncommented until it has been updated.
exports.getHeroes = function(battletag, req, res) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		var heroCollection = db.collection("hero");
	});

	var requestURL = "https://" + region + apiURL + "profile/" + battletag + "/?locale=" + locale + "&apikey=" + apiKey;
	date = new Date();
	console.log(battletag + " Page before request"+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
	request(requestURL, function (error, response, playerInformation) {
		var playerJSON = JSON.parse(playerInformation);
		if (playerJSON.code == "NOTFOUND") {
			res.send("Invalid Battletag");
			//request the tag again.
			getHeroes(battletag,req,res);
		}
		var playersHeroes = playerJSON.heroes;
		if (playersHeroes == undefined) {
			console.log("getHeroes playerJSON.heroes undefined");
			getHeroes(battletag,req,res);
		}
		else {
			for (i=0; i<playersHeroes.length; i++) {
				// exports.addHeroData(battletag, playersHeroes[i].id, 0,timeToDelay());
			}
			res.render('player.ejs', { ejs_btag : battletag , ejs_heroes : playersHeroes });
			date = new Date();
			console.log(battletag + " Page after request"+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
		}
	});
}

//add hero's data to hero collection if the hero is level 70 and has certain damage.  damageFiler currently set to 0 for instance hero probably unequipped weapon
 exports.addHeroData = function(region, battletag, heroID, delay,db) {
 	setRegion(region);
	console.log("inside addHeroData for " + battletag + " " + heroID + "delay is " + delay);
	var requestURL = "https://" + region + apiURL + "profile/" + battletag.replace("#", "-") + "/hero/" + heroID + "?locale=" + locale + "&apikey=" + apiKey;
	setTimeout( function() {
		request(requestURL, function (error, response, data) {
			if (data == undefined) {
				console.log("addHeroData data was undefined");
				//error handling, call again
				exports.addHeroData(battletag, heroID, 2000);
			}
			else {
				var requestedHeroData = JSON.parse(data);
				var items = requestedHeroData.items;
				//start error Handling
				//account was inactive 
				if (requestedHeroData.code == "NOTFOUND") {
					console.log("notfound");
				}
				//check if data is not null
				else if (items == null) {
					console.log("addHeroData items was null for " + battletag + " " + heroID);
					exports.addHeroData(battletag, heroID,timeToDelay());
					console.log(requestedHeroData);
				}					
				else {
					//database was null
					if (db == null) {
						console.log("addHeroData database was null for " + battletag + " " + heroID);
						exports.addHeroData(battletag, heroID, timeToDelay());							
					}
					//end error handling
					//If the Hero is level 70 and has damage > than CURRENTLY 0, search heroCollection.  If hero is there, determine whether or not to update, else add hero.
					//TODO: add heroes item, and importantInfo
					else {
						//100000 for dh.  if less than this and hero wasnt added to db, visualization will not load.
						if (requestedHeroData.level == 70 && requestedHeroData.stats.damage > 0) {
							var heroCollection = db.collection("hero");
							heroCollection.find({"heroID" : requestedHeroData.id}).toArray(function(err, results) {
								//found, just update.  otherwise insert.
								if (results.length == 1) {
//!!!!!!!							//check if there is damage increase, check if all items are equipped and call get Important INFO
									// if (requestedHeroData.stats.damage > 300000){
										console.log("here")
										heroCollection.update({"heroID" : requestedHeroData.id}, {"heroID" : requestedHeroData.id , "battletag": battletag,  "name" : requestedHeroData.name, "class" : requestedHeroData.class , "level" : requestedHeroData.level, "Paragon" : requestedHeroData.paragonLevel, "hardcore" : requestedHeroData.hardcore, "seasonal" : requestedHeroData.seasonal, "skills" : requestedHeroData.skills, "items" : requestedHeroData.items, "stats" : requestedHeroData.stats, "region" : region}, function(err, results) {
										console.log("addHeroData found, updating "+ battletag + " " + requestedHeroData.id);
										});//end update.
									// }
								}
								else {
									heroCollection.insert({"heroID" : requestedHeroData.id , "battletag": battletag,  "name" : requestedHeroData.name, "class" : requestedHeroData.class , "level" : requestedHeroData.level, "Paragon" : requestedHeroData.paragonLevel, "hardcore" : requestedHeroData.hardcore, "seasonal" : requestedHeroData.seasonal, "skills" : requestedHeroData.skills, "items" : requestedHeroData.items, "stats" : requestedHeroData.stats, "region" : region}, function(err, results) {
										console.log("addHeroData not found, inserting "+ battletag + " " + requestedHeroData.id);
										// console.log("adding items")
										// heroMethods.getItemIDsFromHero(requestedHeroData.items, requestedHeroData.id, timeToDelay());

									});//end insertion.
								}
							});//end update/insert 
						}//end else DB not null
					}//end jsonData had no errors
				}//end else for when data was not null
			}
		});//end api request for heroID
	},delay);//end setTimeout
}

//sets the Region for requests.  used when adding to DB
function setRegion(region) {
	switch (region) {
		case "us":
			locale = "en_US";
			region = "us";
			break;
		case "eu":
			locale = "en_GB";
			region = "eu";
			break;
		case "tw":
			locale = "zh_TW";
			region = "tw";
			break;
		case "kr":
			locale = "ko_KR";
			region = "kr";
			break;
	}
}