var exports = module.exports = {};
var request = require("request");
var jsdom = require("jsdom");
var mongo = require("mongodb");
var playerMethods = require("../d3_modules/playerMethods");
var heroMethods = require("../d3_modules/heroMethods");

var MongoClient = mongo.MongoClient;

var apiKey = "y34m8hav4zpvrezvrs6xhgjh6uphqa5r";
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


//called on localhost:/:category/:diabloClass
//leaderboardType is req.params.category (normal, hc, season, seasonhc)
//If leaderboardCollection has no data or not 1000 call getCurrentLeaderboard
//For each player in that leaderboard, find the heroes (if it is hardcore/season and matches class) in heroCollection 
//and get the one that has the highest dps, add to allData which is used for d3 visualization
	//If not found in heroCollection, attempt to add by getting the heroID from searching the leaderboardCollection
//Once allData reaches 1000 and data is not undefined, renderpage
exports.getLeaderboardFromDB = function(region, diabloClass, leaderboardType, req, res) {    
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
	//Takes about 1/10th second
		date = new Date();
		console.log(diabloClass + " Page before request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
		if (err) {
			return console.log(err);
		}	
		//successfully connected
		else  {
			console.log("Inside getLeaderboardFromDB for " + region + " " + diabloClass + " " + leaderboardType);
			setRegion(region);
			var collectionName = region + getCollectionName(diabloClass, leaderboardType);
			var leaderboardCollection = db.collection(collectionName);
			console.log(collectionName);
			//get all from collection, sort by rank
			leaderboardCollection.find({},{"_id" : 0 }).sort({"Standing" : 1}).toArray(function (err, leaderboardResults) {
	    		
	    		if (leaderboardResults.length == 0 || leaderboardResults.length != 100) {
	    			exports.getCurrentLeaderboard(region, diabloClass, leaderboardType);
	    			res.redirect('/');
	    		}
	    		//leaderboard has 1000
	    		else {
		    		date = new Date();
					console.log(diabloClass + " Page after request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
					console.log(leaderboardType);
					//array for storing all heroes in DB
		    		var allData = [];
		    		setSearchParams(leaderboardType);
		    		leaderboardResults.forEach(function(currentPlayer) {
		    			delayCounter =0;
		    			var heroCollection = db.collection("hero");

		    			//get the heroes that matches searchParams
		    			heroCollection.find({"battletag" : currentPlayer.Battletag.replace("#", "-"), "class" : getClassNameForDatabase(diabloClass), "seasonal" : searchParamSeason, "hardcore" : searchParamHC }).toArray(function (error, heroResults) {
		    				//if we found the Hero based on BattleTag and class, find the hero with the highest dps. 
		    				if (heroResults.length > 0) {
		    					// console.log('result was found ',heroResults[0].hardcore,leaderboardResults.length ,allData.length);
		    					heroToPush=heroResults[0];
		    					heroResults.forEach(function(hero) {
		    						if (hero.stats.damage > heroToPush.stats.damage) {
		    							heroToPush = hero;
		    						}
		    					});
		    					allData[currentPlayer.Standing-1] = heroToPush;
		    					// console.log(heroToPush)
		    					if (heroToPush.extraItemData == undefined) {
		    						// console.log("getting extraItemData from " + heroToPush.battletag);
		    						// heroMethods.getItemIDsFromHero(heroToPush.items, heroToPush.heroID, itemDelay(),db);
		    					}
		    				}

		    				//hero was not in the heroCollection.  get heroes from currentPlayer (in leaderboardCollection), and find the ones that match searchParams and add to collection.
		    				//if no heroes, or hero is dead, set to 0
		    				else {
		    					var currentPlayerHeroes = currentPlayer.Heroes;
		    					//player deleted all heroes or no matches
		    					if (currentPlayerHeroes.length == 0) {
	    							allData[currentPlayer.Standing-1] = 0;
		    					}
		    					var validHero70Count = 0;
		    					currentPlayerHeroes.forEach(function(currentHero) {
		    						//find the hero that matches searchParams (class, HC, seasonal, 70)
		    						if (currentHero.level == 70 && currentHero.hardcore == searchParamHC && currentHero.seasonal == searchParamSeason && getClassNameForDatabase(diabloClass) == currentHero.class) {
			    						if (currentHero.dead == false) {
			    							validHero70Count += 1;
			    							// console.log(currentHero);
			    							console.log("before " + delayCounter);
			    							playerMethods.addHeroData(region, currentPlayer.Battletag.replace("#", "-"), currentHero.id, timeToDelay(),db);
			    							console.log("after " + delayCounter);
			    						}
			    						//error handling for hc players.  heroID is in currentPlayer.Heroes, but was dead
			    						else {
			    							// console.log(currentPlayer.Battletag , currentHero);
			    							allData[currentPlayer.Standing-1] = 0;
			    						}
			    					}

			    					//reached lastHero, if there were no valid 70s, add 0.  player, has heroes, but deleted grift hero hero
		    						if (currentPlayerHeroes.indexOf(currentHero) == currentPlayerHeroes.length-1) {
		    							//notfound in addHero
		    							if (currentPlayer.Battletag == "Buhbuhlooske#1480" ||currentPlayer.Battletag == "AchillesRbrn#1782" || currentPlayer.Battletag == "Bwnage#1400") {
		    								// console.log( currentPlayerHeroes);
		    								console.log(validHero70Count);
		    								allData[currentPlayer.Standing-1] = 0;
		    							}
		    							if (validHero70Count == 0) {
		    								console.log("validHero70Count was 0 for " + currentPlayer.Standing + " " + currentPlayer.Battletag);
		    								allData[currentPlayer.Standing-1] = 0;
		    							}
		    						}
		    					});
		    				}
							//Make sure allData has data at each point in array before rendering page
							if (allData.length == leaderboardResults.length) {
								var count = 0;
								for (i = 0 ; i < leaderboardResults.length ; i++) {
									if (allData[i] != undefined) {
										count++;
									}
									else {
										console.log(allData[i] + " " + (i+1));
									}
								}
								console.log("alldata length " + allData.length + " count " + count);

								if (count ==  leaderboardResults.length) {
						    		date = new Date();
									console.log(diabloClass + " Page rendered "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
									//Takes about half a minute to render.
			    					res.render('ClassLeaderboard.ejs', {title : diabloClass , region : region, leaderboardType : collectionCategory , ejs_battletags : leaderboardResults , all:allData });
								}//end rendering page
							}
		    			})//end toArray callback from finding hero.
		    		})//end for each result from Leaderboard search
		  		}
	  		});//end toArray callbackk from finding leaderboard
		}//end else
	});//end mongoconnect

/* Takes ~1 Minute.  Always up to date
	date = new Date();
	console.log(diabloClass +" Leaders before request "+ date.getMinutes() +":"+ date.getSeconds());
	var requestURL = "http://us.battle.net/d3/en/rankings/era/1/rift-" + diabloClass
	request(requestURL, function (error, response, body) {
		var startTable = body.indexOf("<table>");
		var endTable = body.indexOf("</table>");
		//get leaderboard table
		var table = body.substring(startTable,endTable);
		var battleTags = [];
		//env uses HTML or URL, [script, it will be JQuery], and callback function(error, window)
		jsdom.env(table, ["http://code.jquery.com/jquery.js"], function (error, window) {
			//allows normal JQuery usage
			var $ = window.jQuery;
			var count =0;
			$('.battletag > a ').each(function() {
				//for each battletag, get the href, remove the last char "/" and remove the begging to get just the tag
				// if (count < length) {
					battleTags.push($(this).attr('href').substring(0,$(this).attr('href').length-1).replace("/d3/en/profile/",""));
				// }c
				// count ++;
			});
			//show all the battletags that have in leaderboards
			date = new Date();
			console.log(diabloClass + " Leaders "+ date.getMinutes() +":"+ date.getSeconds());
			res.render('ClassLeaderboard.ejs', {title : diabloClass , ejs_battletags : battleTags });
		});
	});
*/
}

//Gets the leaderboard table from Battle.net website, parses each row, creates an API request URL
//and passes it to checkLeaderboardCollectForPlayer to add/update player to collection e.g(hcbarb, seasondh, etc..)
exports.getCurrentLeaderboard = function(region, diabloClass, leaderboardType) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		//successfully connected
		if(!err) {
			setRegion(region);
			exports.setGRiftCategory(leaderboardType);
			date = new Date();
			console.log(region + " " + diabloClass + " " + gRiftCategory + " Leaders before request "+ date.getMinutes() +":"+ date.getSeconds());
			var requestURL = "https://" + region + ".battle.net/d3/en/rankings/" + gRiftCategory + getClassNameForLeaderboard(diabloClass);
			request(requestURL, function (error, response, body) {
				console.log("getLeaderboardFromDB inside request")
				var startTable = body.indexOf("<table>");
				var endTable = body.indexOf("</table>");
				//get leaderboard table from Battle.net website
				var table = body.substring(startTable,endTable);
				//the information of all players on leaderboard
				var leaders = [];
				//env uses HTML or URL, [script, it will be JQuery], and callback function(error, window)
				//passes in table from battle.net and allows Jquery to be used

				jsdom.env(table, ["http://code.jquery.com/jquery.js"], function (error, window) {
					//allows normal JQuery usage
					var $ = window.jQuery;
					//used to know when to stop collecting data.  eg. top50,100,etc
					var count =0;

					//Looping through each TR element from Battle.net Leaderboard.  For each TR, add the data from each TD, and after all data has been collected for a TR
					//push that row to leaders array.
					$('tbody tr').each( function getDataFromRow(){
						//get the top players from 1 to count, CHANGE TO 1000 later
						if (count < 100) {
							//index for a row's column.  gets reset after each row.
							var cellIndex = 0; 
							//information from the current player will be added to this array.  When all information for player is added, it will be pushed to leaders array
							//[rank, battletag, tier, timespend, date accomplished]
							var playerData = [];
							//for the current row, get each data from each td.
							$(this).children().each( function() {
								//rank
								if (cellIndex == 0) {
									var rank = $(this).html();
									//remove char in front, last space and period at end
									rank = rank.substring(1,rank.length-2);
									console.log(rank + " " + (count+1));
									if (rank != "Rankings not yet availabl") {
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
							
							//if there was data add it to list of players
							if (playerData.length != 0) {
								leaders.push(playerData);
							}
						} //end if count<length loop
						count++;
					});//end tbody loop.  All battletags and greater rift information has been added to leaders array.
					
					//For each player in leaders, use the battletag to make a request to the API.
					//currentCallNum is to know when 10 requests have been made because API only allows 10 requests per second.
					//last10CallsTime is set when first API call is made and is updated on every 10th call to know when to make the next request
					var currentCallNum = 0;
					var last10CallsTime;
					leaders.forEach(function (playerData, i) {
						i = currentCallNum;

						date = new Date();					
						var currentTime = new Date();
						currentTime = currentTime.getSeconds()*1000 + currentTime.getMilliseconds();
						//only update if greater than 100  REMOVE THIS LATER
						if (i >= 0) {
						//Not the 10th call
						if (i % 10 != 9) {
							//but is first 10
							if (i < 10) {
								//and is first call, set last10CallsTime, and updateDB.
								if (i == 0) {
									last10CallsTime = new Date();
									last10CallsTime = last10CallsTime.getSeconds()*1000 + last10CallsTime.getMilliseconds();
								}
								console.log("requested " + i + " " + last10CallsTime);
								checkLeaderboardCollectForPlayer(region, playerData,0,db,diabloClass,0);					
							}
							//Not 10th call or first 10, get the current time and check how long its been since the previous 10 calls, (previousTime - currentTime)
							//If enough time has passsed (timeDifference was <= 0), update with no delay.  Else add delay
							else {
								//temporary code
								// 								if (i == 100) {
								// 	last10CallsTime = new Date();
								// 	last10CallsTime = last10CallsTime.getSeconds()*1000 + last10CallsTime.getMilliseconds();
								// }
								//temporary code end
								var currentTime = new Date();
								currentTime = currentTime.getSeconds()*1000 + currentTime.getMilliseconds();
								var timeDifference = last10CallsTime - currentTime;
								console.log("requested " + playerData + " " + last10CallsTime + " " + currentTime);
								if (timeDifference <= 0) {
									checkLeaderboardCollectForPlayer(region, playerData,0,db,diabloClass,0);	
								}
								else {
									console.log(i + " timeDiff was " + timeDifference);
									checkLeaderboardCollectForPlayer(region, playerData,timeDifference+800,db,diabloClass,0);
								}
							}//end not first 10 else
						}//end not a 10th call loop
						
						//It was a 10th call, add 1000 to last10CallsTime, so currentTime 
						else {
							last10CallsTime += 1000;
							if (i == 9){
								console.log("requested " + i + " " + last10CallsTime + "Current request" + currentTime);
								checkLeaderboardCollectForPlayer(region, playerData,0,db,diabloClass,0);
							}
							//after 10th call
							else{
								var timeDifference = last10CallsTime - currentTime;
								console.log("requested " + i + " " + last10CallsTime + " " + currentTime);
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
 	setRegion(region);
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
	leaderboardCollection.insert({"Standing" : playerDataFromTable[0] , "Battletag" : requestedPlayerData.battleTag , "Greater Rift" : playerDataFromTable[2] , "Time Spent" : playerDataFromTable[3] , "Date Completed" : playerDataFromTable[4] , "Heroes" : requestedPlayerData.heroes}, function(err, results) {
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
	leaderboardCollection.update({"Standing" : playerDataFromTable[0]} , {$set : {"Battletag" : requestedPlayerData.battleTag , "Greater Rift" : playerDataFromTable[2] , "Time Spent" : playerDataFromTable[3] , "Date Completed" : playerDataFromTable[4] , "Heroes" : requestedPlayerData.heroes}}, function(err, results) {
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

//used in getLeaderboardFromDB.  set's searchParams to find heroes in heroCollection.
function setSearchParams(leaderboardType) {
	switch (leaderboardType) {
		case "normal" :
			searchParamHC = false;
			searchParamSeason = false;
			return;
		case "hc" :
			searchParamHC = true;
			searchParamSeason = false;
			return;
		case "season" :
			searchParamHC = false;
			searchParamSeason = true;
			return;
		case "seasonhc" :
			searchParamHC = true;
			searchParamSeason = true;
			return;
	}	
}
