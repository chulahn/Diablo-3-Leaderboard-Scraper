var exports = module.exports = {};
var request = require("request");
var jsdom = require("jsdom");
var mongo = require("mongodb");
var playerMethods = require("../d3_modules/playerMethods");
var heroMethods = require("../d3_modules/heroMethods");
var set = require("../d3_modules/setMethods")
var async = require("async");
var colors = require("colors");
var debug = require("../d3_modules/debugMethods.js");

var MongoClient = mongo.MongoClient;

var databaseURL = process.env.DBURL || "mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders";
var apiKey = process.env.APIKEY || "y34m8hav4zpvrezvrs6xhgjh6uphqa5r";

var region = "us";
var apiURL = ".api.battle.net/d3/"
var locale = "en_US";
var gRiftCategory= "era/1/rift-";
var collectionCategory = "normal";

var delayCounter = 0;
//used when finding heroes in heroCollection
var searchParamHC;
var searchParamSeason;

function timeToDelay() {
	delayCounter++;
	return (1500* (Math.floor(delayCounter/10)));
}

var itemDelayCounter = 0;
function itemDelay() {
	itemDelayCounter++;
	return (1000 * itemDelayCounter);
}

//Gets the leaderboard table from Battle.net website, parses each row, creates an API request URL
//and passes it to checkLeaderboardCollectForPlayer to add/update player to collection e.g(hcbarb, seasondh, etc..)
exports.getCurrentLeaderboard = function(region, diabloClass, leaderboardType) {
	MongoClient.connect(databaseURL, function(err, db) {
		//successfully connected
		if(!err) {
			set.setRegion(region);
			exports.setGRiftCategory(leaderboardType);
			debug.timeString(region + " " + diabloClass + " " + gRiftCategory + " Leaders before request ");
			var requestURL = "https://" + region + ".battle.net/d3/en/rankings/" + gRiftCategory + getClassNameForLeaderboard(diabloClass);
			request(requestURL, function (error, response, body) {
				console.log("getLeaderboardFromDB inside request");

				var startTable = body.indexOf("<table>");
				var endTable = body.indexOf("</table>");
				var table = body.substring(startTable,endTable);
				
				//the information of all players on leaderboard
				var leaders = [];
				
				//env uses HTML or URL, [script, it will be JQuery], and callback function(error, window)
				//passes in table from battle.net and allows Jquery to be used
				jsdom.env(table, ["http://code.jquery.com/jquery.js"], function (error, window) {
					var $ = window.jQuery;

					//used to know when to stop collecting data.  eg. top50,100,etc.*top 100 for now*
					var count =0;

					//Looping through each TR element from Battle.net Leaderboard.  
					//For each TR, add the data from each TD, and after all data has been collected for a TR
					//push that row to leaders array.
					$('tbody tr').each( function getDataFromRow(){

						//CHANGE TO 1000 later
						if (count < 100) {
							
							var cellIndex = 0; 
							//information from the current player will be added to this array.  
							//When all information for player is added, it will be pushed to leaders array
							//[rank, battletag, tier, timespent, date accomplished]
							var playerData = [];

							//for the current row, get data from each td.
							$(this).children().each( function() {
								//rank
								if (cellIndex == 0) {
									var rank = $(this).html();
									//remove char in front, last space and period at end
									rank = rank.substring(1,rank.length-2);
									console.log(rank + " " + (count+1));
									if (rank !== "Rankings not yet availabl") {
										playerData.push(parseInt(rank));
									}
								}
								//battletag
								else if (cellIndex == 1) {
									//get link from cell
									var link = $(this).find('a').attr('href');
									//extract battletag from link
	//!!! check if works for all regions.
									var battletag = link.substring(0,link.length-1).replace("/d3/en/profile/","");
									playerData.push(battletag);
								}
								//tier, timespent, and completed date
								else if (cellIndex <= 4) {
									var data = $(this).html();
									data = data.substring(1, data.length-1);
									playerData.push(data);
								}
								cellIndex++;
							});//end looping through columns for a row
							
							if (playerData.length !== 0) {
								leaders.push(playerData);
							}
						} //end if count<length loop
						count++;
					});//end tbody loop.  All battletags and greater rift information has been added to leaders array.
					
					//For each player in leaders, use the battletag to make a request to the API.
					//currentCallNum is to know when 10 requests have been made because API only allows 10 requests per second.
					//last10thCallTime is set when first API call is made and is updated on every 10th call to know when to make the next request
					var currentCallNum = 0;
					var last10thCallTime;
					leaders.forEach(function (playerData, i) {
						i = currentCallNum;

						date = new Date();					
						var currentTime = new Date();
						currentTime = currentTime.getSeconds()*1000 + currentTime.getMilliseconds();
						//only update if greater than 100  REMOVE THIS LATER
						if (i >= 0) {
						//Not the 10th call
						if (i % 10 !== 9) {
							//but is first 10
							if (i < 10) {
								//and is first call, set last10thCallTime, and updateDB.
								if (i === 0) {
									last10thCallTime = new Date();
									last10thCallTime = last10thCallTime.getSeconds()*1000 + last10thCallTime.getMilliseconds();
								}
								console.log("requested " + i + " " + last10thCallTime);
								checkLeaderboardCollectForPlayer(region, playerData, 0, db, diabloClass, 0);					
							}
							//Not 10th call or first 10(11-19, 21-29), get the current time and 
							//check how long its been since the previous 10 calls, (previousTime - currentTime)
							//If enough time has passsed (timeDifference was <= 0), update with no delay.  Else add delay
							else {
								
								var currentTime = new Date();
								currentTime = currentTime.getSeconds()*1000 + currentTime.getMilliseconds();
								var timeDifference = last10thCallTime - currentTime;
								console.log("requested " + playerData + " " + last10thCallTime + " " + currentTime);
								if (timeDifference <= 0) {
									checkLeaderboardCollectForPlayer(region, playerData, 0, db, diabloClass, 0);	
								}
								else {
									console.log(i + " timeDiff was " + timeDifference);
									checkLeaderboardCollectForPlayer(region, playerData,timeDifference+800,db,diabloClass,0);
								}
							}//end not first 10 else
						}//end not a 10th call loop
						
						//It was a 10th call, add 1000 to last10thCallTime, so currentTime 
						else {
							last10thCallTime += 1000;
							if (i === 9){
								console.log("requested " + i + " " + last10thCallTime + "Current request" + currentTime);
								checkLeaderboardCollectForPlayer(region, playerData,0,db,diabloClass,0);
							}
							//after 10th(20,30) call
							else{
								var timeDifference = last10thCallTime - currentTime;
								console.log("requested " + i + " " + last10thCallTime + " " + currentTime);
								checkLeaderboardCollectForPlayer(region, playerData,timeDifference+800,db,diabloClass,0);
							}	
						}
						}//REMOVE LATER
						currentCallNum++;
					});//end battletag forloop
				});//end jsdom
			});//end request
		}//end if successfuly connected
	});//end mongodb
}//end function

//make a request to API with passed in requestURL.  Add players until collectionSize is correct.
//If collectionSize is correct, check if the player in collection matches request, else update.
//If data was undefined, call again.
 function checkLeaderboardCollectForPlayer(region, playerDataFromTable, delay, db, diabloClass, calledAgain) {
 	set.setRegion(region);
	setTimeout( function() {
		var requestURL = "https://"+region+".api.battle.net/d3/profile/" + playerDataFromTable[1] + "/?locale=" + locale + "&apikey=" + apiKey;

		request(requestURL, function (error, response, data) {
			if (data == undefined) {
				checkLeaderboardCollectForPlayer(region, playerDataFromTable, delay, db, diabloClass, calledAgain+1);
			} 

			else {
				var requestedPlayerData = JSON.parse(data);
				if (requestedPlayerData.battleTag == undefined){
					console.log("checkLeaderboardCollectForPlayer-----" + playerDataFromTable[0] + " was undefined, called " + calledAgain + "times",requestURL);
					checkLeaderboardCollectForPlayer(region, playerDataFromTable,1000,db,diabloClass,calledAgain+1);
				}
				//requestedPlayerData should have no errors, continue
				else {
					//playerDataFromTable [rank, btag, grift, time , date completed]
					console.log("checkLeaderboardCollectForPlayer, requestedPlayerData not null " + region + " calledAgain" + calledAgain + "  " + playerDataFromTable[1] + " " + requestedPlayerData.battleTag);
					//if passed in playerDataFromTable did not have all information.
					if (playerDataFromTable.length != 5) {
						console.log("checkLeaderboardCollectForPlayer did not have length of 5 for " + requestedPlayerData.battleTag);
					}
					else {
						var collectionName = region+getCollectionName(diabloClass,gRiftCategory);
						var leaderboardCollection = db.collection(collectionName);

						//Check leaderboardCollection's length.  If it is less than what it should be, insert to Collection.
						//else check to see if the player that is passed in matches the player in collection for that standing.
						leaderboardCollection.find().toArray(function(err, leaderboardArray) {
							//playerDataFromTable = [standing, battletag, tier, timespend, date accomplished]
							if (leaderboardArray == null) {
								checkLeaderboardCollectForPlayer(region, playerDataFromTable, 1000, db, diabloClass, calledAgain);
							}
							else {
								var collectionLength = leaderboardArray.length;
								//nothing in collection add player
								if (collectionLength == 0) {
									insertInLeaderboardCollect(leaderboardCollection, playerDataFromTable, requestedPlayerData);
								}
		//!!!!!!!
								//check what hasnt been added, if the current standing hasn't been added, add it
								else if (collectionLength < 100) {
									leaderboardCollection.find({"Standing" : playerDataFromTable[0]}).toArray(function(err, standingSearchResult) {
										if (standingSearchResult.length == 0) {
											console.log("adding " + requestedPlayerData.battleTag + " to " + playerDataFromTable[0]);
											insertInLeaderboardCollect(leaderboardCollection, playerDataFromTable, requestedPlayerData);
										}
										else {
										}
									});
								}
								//collection is correct size, check if there were any missing standings.
								else if (collectionLength == 100) {
									leaderboardCollection.find({"Standing" : playerDataFromTable[0]}).toArray(function(err, standingSearchResult) {
										//if standing was missing, find the battletag in collection from Tabledata, and set the standing
										if (standingSearchResult.length == 0) {
											console.log("checkLeaderboardCollectForPlayer standing not found for " + playerDataFromTable);
											leaderboardCollection.update({"Battletag" : playerDataFromTable[1].replace("-","#")}, {$set : {"Standing" : playerDataFromTable[0]}}, function (err, results) {
												if (err) {
													return console.log("error when setting standing xxxxxxxxxxxxxxxx")
												}
												else {
													console.log("adding standing to " + playerDataFromTable[1]);
												}			
											});
										}
										//check if player in DB in current spot, matches player from request
										//if they do match, check if heroes are still the same.  else update
										else {	
											//console.log(standingSearchResult, standingSearchResult.length);
											if (playerDataFromTable[0] == null || playerDataFromTable[0] == undefined) {
												asdfa
											}
											databasePlayer = standingSearchResult[0];

											if (samePlayerInSpot(playerDataFromTable, databasePlayer)) {
												console.log("checkLeaderboardCollectForPlayer " + playerDataFromTable[0] + " " + requestedPlayerData.battleTag + " did not change. Checking for hero/PR updates");

												if (!playerRecordSame(playerDataFromTable, databasePlayer)) {
													console.log("updateLeaderboardCollect " + requestedPlayerData.battleTag + " had a new PR, updating");
													updateInLeaderboardCollect(leaderboardCollection, playerDataFromTable, requestedPlayerData);							
												}

												if (!playerHasSameHeroes(playerDataFromTable,requestedPlayerData)) {
													console.log("updateLeaderboardCollect heroes have changed for " + requestedPlayerData.battleTag);
													updateInLeaderboardCollect(leaderboardCollection, playerDataFromTable, requestedPlayerData);							
												}
											}
											//different player in standing spot
											else {	
												console.log("updateLeaderboardCollect Different Player in Standing.  Updating");
												updateInLeaderboardCollect(leaderboardCollection, playerDataFromTable, requestedPlayerData);
											}
										}
									});					 
								}
							}
						});//end collectionFind
					}//end else playerData had all info
				}//end inside db and data was not null
			}//end if successfully connected to db
		});//end request
	},delay);//end settimeout
}

// function getLastUpdated(leaderboardCollection) {
// 	leaderboardCollection.find({}).sort({"lastupdated" : -1}).toArray(function(err, results) {
// 		console.log(results[0]["lastupdated"].getMinutes() + " " + results[0]["lastupdated"].getSeconds());
// 	});
// }

function samePlayerInSpot(playerDataFromTable, databasePlayer) {
	return (playerDataFromTable[1].replace("-","#") == databasePlayer.Battletag);
}

function playerRecordSame(playerDataFromTable, databasePlayer) {
	return (playerDataFromTable[2] == databasePlayer["Greater Rift"] && playerDataFromTable[3] == databasePlayer["Time Spent"] && playerDataFromTable[4] == databasePlayer["Date Completed"]);
}

function playerHasSameHeroes(playerDataFromTable, requestedPlayerData) {
	return (JSON.stringify(databasePlayer.Heroes) == JSON.stringify(requestedPlayerData.heroes));
}

function insertInLeaderboardCollect(leaderboardCollection, playerDataFromTable, requestedPlayerData) {
	leaderboardCollection.insert({"Standing" : playerDataFromTable[0] , "Battletag" : requestedPlayerData.battleTag , "Greater Rift" : playerDataFromTable[2] , "Time Spent" : playerDataFromTable[3] , "Date Completed" : playerDataFromTable[4] , "Heroes" : requestedPlayerData.heroes, "lastupdated" : new Date()}, function(err, results) {
		if (err) {
			setTimeout(function () {
				insertInLeaderboardCollect(leaderboardCollection, playerDataFromTable, requestedPlayerData);
			}, 2000);
			return console.log("error in insertInLeaderboardCollect ", err);
		}
		else {
			console.log("successfully added "+ requestedPlayerData.battleTag + " to " + playerDataFromTable[0]);
		}
	});
}

function updateInLeaderboardCollect(leaderboardCollection, playerDataFromTable, requestedPlayerData) {
	leaderboardCollection.update({"Standing" : playerDataFromTable[0]} , {$set : {"Battletag" : requestedPlayerData.battleTag , "Greater Rift" : playerDataFromTable[2] , "Time Spent" : playerDataFromTable[3] , "Date Completed" : playerDataFromTable[4] , "Heroes" : requestedPlayerData.heroes, "lastupdated" : new Date()}}, function(err, results) {
		if (err) {
			return console.log("error in insertInLeaderboardCollect ", err);
		}
		else {		
			console.log("updateINLeaderboardCollect successful, "+ requestedPlayerData.battleTag +  " --------updated with " + playerDataFromTable);
		}
	});	
}


//diabloClass is req.params.diabloClass
//used in getCurrentLeaderboard to set the requestURL for getting the leaderboard table.
function getClassNameForLeaderboard(diabloClass) {
	if (diabloClass == "wiz" ){
		return "wizard";
	}
	else if (diabloClass == "barb") {
		return "barbarian";
	}
	else if (diabloClass == "sader") {
		return "crusader";
	}
	else {
		return diabloClass;
	}
}

//diabloClass is req.params.diabloClass
//used in getLeaderboardFromDB to know which class(barb, dh, etc.) to search in DB
function getClassNameForDatabase(diabloClass) {
	if (diabloClass == "wiz" ){
		return "wizard";
	}
	else if (diabloClass == "barb") {
		return "barbarian";
	}
	else if (diabloClass == "sader") {
		return "crusader";
	}
	else if (diabloClass == "dh") {
		return "demon-hunter";
	}
	else if (diabloClass == "wd") {
		return "witch-doctor";
	}
	else {
		return diabloClass;
	}
}



//localhost/normal, /hc, /season, etc.
//category is req.param
//Used to set gRiftCategory, which is used in getCurrentLeaderboard(gets table from Battle.net) to request correct table.
exports.setGRiftCategory = function(category) {
	switch (category) {
		case "normal" :
			gRiftCategory = "era/1/rift-";
			return;
		case "hc" :
			gRiftCategory =  "era/1/rift-hardcore-";
			return;
		case "season" :
			gRiftCategory =  "season/1/rift-";
			return;
		case "seasonhc" :
			gRiftCategory =  "season/1/rift-hardcore-"
			return;
	}
}

//gets a collectionName whether updating or getting.  SPLIT THIS FUNCTION LATER
function getCollectionName(diabloClass, gRiftCategory) {
	//inside update, after request from bnet, collectionName is what was set in setGRiftCategory
	if (gRiftCategory == "era/1/rift-") {
		collectionCategory="normal";		
	}
	else if (gRiftCategory ==  "era/1/rift-hardcore-") {
		collectionCategory="hc";
	}
	else if (gRiftCategory ==  "season/1/rift-") {
		collectionCategory="season";
	}
	else if (gRiftCategory ==  "season/1/rift-hardcore-") {
		collectionCategory="seasonhc";
	}
	//not updating, but accesing db from getLeaderboardFromDB
	else {
		collectionCategory = gRiftCategory;
	}
	return collectionCategory + diabloClass;
}
