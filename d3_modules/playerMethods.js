var exports = module.exports = {};
var request = require("request");
var express = require("express");

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


function timeToDelay(delayCounter) {
	delayCounter++;
	return (1000* (Math.floor(delayCounter/10)+1));
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
	request(requestURL, function (error, response, data) {
		var jsonData = JSON.parse(data);
		if (jsonData.code == "NOTFOUND") {
			res.send("Invalid Battletag");
			//request the tag again.
		}
		var heroes = jsonData.heroes;
		if (heroes == undefined) {
			console.log("getHeroes Jsondata.heroes undefined");
			getHeroes(battletag,req,res);
		}
		else {
			for (i=0; i<heroes.length; i++) {
				if (i < 8) {
					exports.addHeroData(battletag, heroes[i].id, 0);
				}
				else {
					exports.addHeroData(battletag, heroes[i].id, Math.floor(i/9)*1000);
				}
			}
			res.render('player.ejs', { ejs_btag : battletag , ejs_heroes : heroes });
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
						var jsonData = JSON.parse(data);
						var items = jsonData.items;
						//account was inactive 
						if (jsonData.code == "NOTFOUND") {
							console.log("notfound");
						}

						//check if data is not null
						else if (items == null) {
							console.log("addHeroData items was null for " + battletag + " " + heroID);
							console.log(jsonData);
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