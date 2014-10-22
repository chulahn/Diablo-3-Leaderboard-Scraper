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

var delayCounter = 0;
function timeToDelay() {
	delayCounter++;
	return (1000* (Math.floor(delayCounter/10)+1) + 2000);
}


//localhost:3000/player/BATTLETAG
//for a given Battletag, it makes a request to get all heroes for that tag.  After getting heroes, called addHeroData and create the page for that Battletag
exports.getHeroes = function(battletag, req, res) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		var heroCollection = db.collection("hero");
	});

	var requestURL = "https://" + region + apiURL + "/profile/" + battletag + "/?locale=" + locale + "&apikey=" + apiKey;
	date = new Date();
	console.log(battletag + " Page before request"+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
	request(requestURL, function (error, response, playerInformation) {
		var playerJSON = JSON.parse(playerInformation);
		if (playerJSON.code == "NOTFOUND") {
			res.send("Invalid Battletag");
			//request the tag again.
		}
		var playersHeroes = playerJSON.heroes;
		if (playersHeroes == undefined) {
			console.log("getHeroes playerJSON.heroes undefined");
			getHeroes(battletag,req,res);
		}
		else {
			for (i=0; i<playersHeroes.length; i++) {
				if (i < 8) {
					exports.addHeroData(battletag, playersHeroes[i].id, 0);
				}
				else {
					exports.addHeroData(battletag, playersHeroes[i].id, Math.floor(i/9)*1000);
				}
			}
			res.render('player.ejs', { ejs_btag : battletag , ejs_heroes : playersHeroes });
			date = new Date();
			console.log(battletag + " Page after request"+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
		}
	});
}

//add heroesdata to hero collection if the hero is level 70.
 exports.addHeroData = function(battletag, heroID, delay) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		if(err) {
			return console.log("addHeroData error");
		}
		else {
			console.log("inside addHeroData for " + battletag + " " + heroID + "delay is " + delay);
			var requestURL = "https://" + region + apiURL + "profile/" + battletag.replace("#", "-") + "/hero/" + heroID + "?locale=" + locale + "&apikey=" + apiKey;
			// console.log(requestURL);
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
						//account was inactive 
						if (requestedHeroData.code == "NOTFOUND") {
							console.log("notfound");
						}

						//check if data is not null
						else if (items == null) {
							console.log("addHeroData items was null for " + battletag + " " + heroID);
							console.log(requestedHeroData);
							//error handling, call again
							exports.addHeroData(battletag, heroID,2000);
						}					
						else {
							if (db == null) {
								console.log("addHeroData database was null for " + battletag + " " + heroID);
								//error handling, call again
								exports.addHeroData(battletag, heroID, 2000);							
							}
							else {
								//100000 for dh
								if (requestedHeroData.level == 70 && requestedHeroData.stats.damage > 100000) {
									var heroCollection = db.collection("hero");
									heroCollection.find({"heroID" : requestedHeroData.id}).toArray(function(err, results) {
										//found, just update.  otherwise insert.
										if (results.length == 1) {
											// if (requestedHeroData.stats.damage > 300000){
												heroCollection.update({"heroID" : requestedHeroData.id}, {"heroID" : requestedHeroData.id , "battletag": battletag,  "name" : requestedHeroData.name, "class" : requestedHeroData.class , "level" : requestedHeroData.level, "Paragon" : requestedHeroData.paragonLevel, "hardcore" : requestedHeroData.hardcore, "seasonal" : requestedHeroData.seasonal, "skills" : requestedHeroData.skills, "items" : requestedHeroData.items, "stats" : requestedHeroData.stats}, function(err, results) {
												console.log("addHeroData found, updating "+ battletag + " " + requestedHeroData.id);
												});//end update.
											// }
										}
										else {
											heroCollection.insert({"heroID" : requestedHeroData.id , "battletag": battletag,  "name" : requestedHeroData.name, "class" : requestedHeroData.class , "level" : requestedHeroData.level, "Paragon" : requestedHeroData.paragonLevel, "hardcore" : requestedHeroData.hardcore, "seasonal" : requestedHeroData.seasonal, "skills" : requestedHeroData.skills, "items" : requestedHeroData.items, "stats" : requestedHeroData.stats}, function(err, results) {
												console.log("addHeroData not found, inserting "+ battletag + " " + requestedHeroData.id);
												console.log("adding items")
												heroMethods.getItemIDsFromHero(requestedHeroData.items, requestedHeroData.id, timeToDelay());

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