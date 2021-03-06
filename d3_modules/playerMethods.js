var exports = module.exports = {};
var request = require("request");
var express = require("express");
var heroMethods = require("../d3_modules/heroMethods.js");
var async = require("async");
var debug = require("../d3_modules/debugMethods.js");

var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;

var databaseURL = process.env.DBURL || "mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders";
var apiKey = process.env.APIKEY || "y34m8hav4zpvrezvrs6xhgjh6uphqa5r";
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

//add hero's data to hero collection if the hero is level 70 and has certain damage.  damageFiler currently set to 0 for instance hero probably unequipped weapon
 exports.addHeroData = function(region, battletag, heroID, delay, db, callback) {
 	setRegion(region);
	console.log("inside addHeroData for " + battletag + " " + heroID + "delay is " + delay);
	var requestURL = "https://" + region + apiURL + "profile/" + battletag.replace("#", "-") + "/hero/" + heroID + "?locale=" + locale + "&apikey=" + apiKey;
	setTimeout( function() {
		request(requestURL, function (error, response, data) {
			if (data == undefined) {
				console.log("addHeroData: data was undefined, calling again");
				//error handling, call again
				exports.addHeroData(region, battletag, heroID, 2000);
			}
			else {
				// console.log(requestURL,data);
				var requestedHeroData = JSON.parse(data);
				var items = requestedHeroData.items;
				//start error Handling
				//account was inactive 
				if (requestedHeroData.code == "NOTFOUND") {
					console.log("notfound");
					console.log(data);
					console.log(requestedHeroData);
					callback();
				}
				//check if data is not null
				else if (items == null) {
					console.log("addHeroData: items was null for " + battletag + " " + heroID + " calling again");
					exports.addHeroData(region, battletag, heroID, timeToDelay(), callback);
					console.log(requestedHeroData);
				}					
				else {
					//database was null
					if (db == null) {
						console.log("addHeroData: database was null for " + battletag + " " + heroID + " calling again");
						exports.addHeroData(region, battletag, heroID, timeToDelay(), callback);							
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
									updateInHeroCollection(heroCollection, battletag, requestedHeroData, region, callback);
									// }
								}
								else {
									insertInHeroCollection(heroCollection, battletag, requestedHeroData, region, callback);
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

function insertInHeroCollection(heroCollection, battletag, requestedHeroData, region, callback) {
	heroCollection.insert(
		{"heroID" : requestedHeroData.id , 
			"battletag": battletag,
			"name" : requestedHeroData.name, 
			"class" : requestedHeroData.class ,
			"level" : requestedHeroData.level, 
			"paragonLevel" : requestedHeroData.paragonLevel, 
			"hardcore" : requestedHeroData.hardcore, 
			"seasonal" : requestedHeroData.seasonal, 
			"skills" : requestedHeroData.skills, 
			"items" : requestedHeroData.items, 
			"stats" : requestedHeroData.stats, 
			"region" : region,
			"lastupdated" : new Date()}, 
		function(err, results) {
			if (err) {
				return console.log("insertInHeroCollection error, " + err);
			}
			else {
				console.log("addHeroData: not found, inserting "+ battletag + " " + requestedHeroData.id);
				callback();
				// var heroData = {"heroID" : requestedHeroData.id, "class": requestedHeroData.class, "items": requestedHeroData.items};
				// heroMethods.getItemIDsFromHero(heroData, 50, callback);

			}
	});
}

function updateInHeroCollection(heroCollection, battletag, requestedHeroData, region, callback) {
	heroCollection.update(
		{"heroID" : requestedHeroData.id}, 
		{$set: {"heroID" : requestedHeroData.id , 
			"battletag": battletag, 
			"name" : requestedHeroData.name, 
			"class" : requestedHeroData.class , 
			"level" : requestedHeroData.level, 
			"paragonLevel" : requestedHeroData.paragonLevel, 
			"hardcore" : requestedHeroData.hardcore, 
			"seasonal" : requestedHeroData.seasonal, 
			"skills" : requestedHeroData.skills, 
			"items" : requestedHeroData.items, 
			"stats" : requestedHeroData.stats, 
			"region" : region,
			"lastupdated" : new Date()}}, 
		function(err, results) {
			if (err) {
				return console.log("updateInHeroCollection error, " + err)
			}
			else {
				console.log("updateInHeroCollection found, updating "+ battletag + " " + requestedHeroData.id);
				var heroData = {"heroID" : requestedHeroData.id, "class": requestedHeroData.class, "items": requestedHeroData.items};
				heroMethods.getItemIDsFromHero(heroData, 50, callback);
			}
	});//end update.	
}