var exports = module.exports = {};
var request = require("request");
var jsdom = require("jsdom");
var mongo = require("mongodb");
var playerMethods = require("../d3_modules/playerMethods");

var MongoClient = mongo.MongoClient;

var apiKey = "y34m8hav4zpvrezvrs6xhgjh6uphqa5r";
var region = "us";
var apiURL = ".api.battle.net/d3/"
var locale = "en_US";
var gRiftCategory= "era/1/rift-";
var collectionCategory = "normal";

var delayCounter = 0;

var searchParamHC;
var searchParamSeason;


function timeToDelay() {
	delayCounter++;
	return (1500* (Math.floor(delayCounter/10)));
}

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


//used to set the griftcategory to know which leaderboard to request from.  used in update, which is called in getCurrentLeaderboard, which is called when updating.
exports.getGRiftCategory = function(category) {
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
//called on localhost:/:category/:diabloClass
//If leaderboardCollection has no data or not 1000 call getCurrentLeaderboard
//For each player in that leaderboard, find the heroes (if it is hardcore/season and matches class) in heroCollection 
//and get the one that has the highest dps, add to allData which is used for d3 visualization
	//If not found in heroCollection, attempt to add by getting the heroID from searching the leaderboardCollection
//Once allData reaches 1000 and data is not undefined, renderpage
exports.getLeaderboard = function(diabloClass, leaderboardType, req, res) {    
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
	//Takes about 1/10th second
		date = new Date();
		console.log(diabloClass + " Page before request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
		if (err) {
			return console.log(err);
		}	
		//successfully connected
		else  {
			console.log("Inside getLeaderboard for " + diabloClass + " " + leaderboardType);
			var collectionName = getCollectionName(diabloClass, leaderboardType);
			var leaderboardCollection = db.collection(collectionName);
			//get all from collection, sort by rank
			leaderboardCollection.find({},{"_id" : 0 }).sort({"Standing" : 1}).toArray(function (err, leaderboardResults) {
	    		
	    		if (leaderboardResults.length == 0 || leaderboardResults.length != 1000) {
	    			exports.getGRiftCategory(leaderboardType);
	    			exports.getCurrentLeaderboard(diabloClass);
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

		    			//get the hero that matches searchParams
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
		    				}

		    				//hero was not in the heroCollection.  get heroes from currentPlayer (in leaderboardCollection), and find the ones that match searchParams.
		    				//if no heroes, or hero is dead, set to 0
		    				else {
		    					var currentPlayerHeroes = currentPlayer.Heroes;
		    					//player deleted heroes
		    					if (currentPlayerHeroes.length == 0) {
	    							allData[currentPlayer.Standing-1] = 0;
		    					}
		    					currentPlayerHeroes.forEach(function(currentHero) {
		    						if (currentHero.level == 70) {
			    						if (getClassNameForDatabase(diabloClass) == currentHero.class && currentHero.dead == false && currentHero.hardcore == searchParamHC && currentHero.seasonal == searchParamSeason) {
			    							// console.log(currentHero);
			    							console.log("before " + delayCounter);
			    							playerMethods.addHeroData(currentPlayer.Battletag.replace("#", "-"), currentHero.id, timeToDelay(),db);
			    							console.log("after " + delayCounter);
			    						}
			    						//error handling for hc players.  heroID is in currentPlayer.Heroes, but was dead
			    						else {
			    							// console.log(currentPlayer.Battletag , currentHero);
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
										// console.log(allData[i] + " " + i);
									}
								}
								console.log("alldata length " + allData.length + " count " + count);
								if (count ==  leaderboardResults.length) {
						    		date = new Date();
									console.log(diabloClass + " Page rendered "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
									//Takes about half a minute to render.
			    					res.render('ClassLeaderboard.ejs', {title : diabloClass , leaderboardType : collectionCategory , ejs_battletags : leaderboardResults , all:allData });
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
//and passes it to updateLeaderboardCollectForPlayer to add/update player to collection e.g(hcbarb, seasondh, etc..)
exports.getCurrentLeaderboard = function(diabloClass) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		//successfully connected
		if(!err) {
			console.log("We are connected");
			date = new Date();
			console.log(diabloClass + " " + gRiftCategory + " Leaders before request "+ date.getMinutes() +":"+ date.getSeconds());
			var requestURL = "https://" + region + ".battle.net/d3/en/rankings/" + gRiftCategory + getClassNameForLeaderboard(diabloClass);
			request(requestURL, function (error, response, body) {
				console.log("getLeaderboard inside request")
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
						if (count < 1000) {
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
//edit battletagRequestURL handle multiple regions.
						// var battletagRequestURL = "https://"+region+".api.battle.net/d3/profile/" + playerData[1] + "/?locale=" + locale + "&apikey=" + apiKey;

						var battletagRequestURL = "https://us.api.battle.net/d3/profile/" + playerData[1] + "/?locale=" + locale + "&apikey=" + apiKey;
						date = new Date();					
						var currentTime = new Date();
						currentTime = currentTime.getSeconds()*1000 + currentTime.getMilliseconds();
						//only update if greater than 100  REMOVE THIS LATER
						if (i >= 100) {
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
								updateLeaderboardCollectForPlayer(battletagRequestURL,playerData,0,db,diabloClass,0);					
							}
							//Not 10th call or first 10, get the current time and check how long its been since the previous 10 calls, (previousTime - currentTime)
							//If enough time has passsed (timeDifference was <= 0), update with no delay.  Else add delay
							else {
								//temporary code
																if (i == 100) {
									last10CallsTime = new Date();
									last10CallsTime = last10CallsTime.getSeconds()*1000 + last10CallsTime.getMilliseconds();
								}
								//temporary code end
								var currentTime = new Date();
								currentTime = currentTime.getSeconds()*1000 + currentTime.getMilliseconds();
								var timeDifference = last10CallsTime - currentTime;
								console.log("requested " + playerData + " " + last10CallsTime + " " + currentTime);
								if (timeDifference <= 0) {
									updateLeaderboardCollectForPlayer(battletagRequestURL,playerData,0,db,diabloClass,0);	
								}
								else {
									console.log(i + " timeDiff was " + timeDifference);
									updateLeaderboardCollectForPlayer(battletagRequestURL,playerData,timeDifference+800,db,diabloClass,0);
								}
							}//end not first 10 else
						}//end not a 10th call loop
						
						//It was a 10th call, add 1000 to last10CallsTime, so currentTime 
						else {
							last10CallsTime += 1000;
							if (i == 9){
								console.log("requested " + i + " " + last10CallsTime + "Current request" + currentTime);
								updateLeaderboardCollectForPlayer(battletagRequestURL,playerData,0,db,diabloClass,0);
							}
							//after 10th call
							else{
								var timeDifference = last10CallsTime - currentTime;
								console.log("requested " + i + " " + last10CallsTime + " " + currentTime);
								updateLeaderboardCollectForPlayer(battletagRequestURL,playerData,timeDifference+800,db,diabloClass,0);
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
 function updateLeaderboardCollectForPlayer(requestURL, playerData, delay, db, diabloClass, calledAgain) {
	setTimeout( function() {
		request(requestURL, function (error, response, data) {
			if (data == undefined) {
				updateLeaderboardCollectForPlayer(requestURL, playerData, delay, db, diabloClass, calledAgain+1);
			} 

			else {
				var requestedPlayerData = JSON.parse(data);
				if (requestedPlayerData.battleTag == undefined){
					console.log("updateLeaderboardCollectForPlayer-----" + playerData[0] + " was undefined, called " + calledAgain + "times")
					updateLeaderboardCollectForPlayer(requestURL,playerData,1000,db,diabloClass,calledAgain+1);
				}
				//requestedPlayerData should have no errors, continue
				else {
					console.log("updateLeaderboardCollectForPlayer, requestedPlayerData not null " + calledAgain + "  " +  playerData + " " + requestedPlayerData.battleTag);
					//if passed in playerData did not have all information.
					if (playerData.length != 5) {
						console.log("updateLeaderboardCollectForPlayer did not have length of 5 for " + requestedPlayerData.battleTag);
					}

//wrap in else

					var collectionName = getCollectionName(diabloClass,gRiftCategory);
					var leaderboardCollection = db.collection(collectionName);

					//Check leaderboardCollection's length.  If it is less than what it should be, insert to Collection.
					//else check to see if the player that is passed in matches the player in collection for that standing.
					leaderboardCollection.find().toArray(function(err, results) {
						//playerData = [standing, battletag, tier, timespend, date accomplished]
						var collectionLength = results.length;
						//nothing in collection add player
						if (collectionLength == 0) {
							leaderboardCollection.insert({"Standing" : playerData[0] , "Battletag" : requestedPlayerData.battleTag , "Greater Rift" : playerData[2] , "Time Spent" : playerData[3] , "Date Completed" : playerData[4] , "Heroes" : requestedPlayerData.heroes}, function(err, results) {
							});
						}
//!!!!!!!
						//check what hasnt been added
						else if (collectionLength <1000) { //change collectionLength to 1000 later
							leaderboardCollection.find({"Standing" : playerData[0]}).toArray(function(err, searchResult) {
								//if it the current standing hasn't been added, add it
								if (searchResult.length == 0) {
									console.log("adding " + requestedPlayerData.battleTag + " to " + playerData[0]);
									leaderboardCollection.insert({"Standing" : playerData[0] , "Battletag" : requestedPlayerData.battleTag , "Greater Rift" : playerData[2] , "Time Spent" : playerData[3] , "Date Completed" : playerData[4] , "Heroes" : requestedPlayerData.heroes}, function(err, results) {
										console.log("successfully added "+ requestedPlayerData.battleTag + " to " + playerData[0])
									});
								}
								else {
								}
							});
						}

						//collection is correct size, check if there were any changes.
						else if (collectionLength == 1000) { //change collectionLength to 1000 later

							//playerData[0] occasionally doesn't show up

							leaderboardCollection.find({"Standing" : playerData[0]}).toArray(function(err, searchResult) {
								if (searchResult.length == 0) {
									console.log("updateLeaderboardCollectForPlayer ranking not found for " + playerData[0]);
								}
								if(playerData[1].replace("-","#") == requestedPlayerData.battleTag && result[0]["Greater Rift"] == playerData[2] && result[0]["Time Spent"] == playerData[3] && result[0]["Date Completed"] == playerData[4]) {
										console.log("updateLeaderboardCollectForPlayer found " + requestedPlayerData.battleTag + " nothing changed");
								}
								else {	
									leaderboardCollection.update({"Standing" : playerData[0]} , {"Battletag" : requestedPlayerData.battleTag , "Greater Rift" : playerData[2] , "Time Spent" : playerData[3] , "Date Completed" : playerData[4] , "Heroes" : requestedPlayerData.heroes}, function(err, results) {
										console.log("updateLeaderboardCollectForPlayer, found,"+ requestedPlayerData.battleTag +  " --------updated with " + playerData);
									});			
								}
							});					 
						}
					});//end collectionFind
				}//end inside db and data was not null
			}//end if successfully connected to db
		});//end request
	},delay);//end settimeout
}



//used when searching a collection for a class.  used in getCurrentLeaderboard.  the diabloclass passed in is req.params.diabloclass
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

//used when searching a collection for a class.  used in getCurrentLeaderboard.  the diabloclass passed in is req.params.diabloclass
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

function getCollectionName(diabloClass, gRiftCategory) {
	//when requesting from battle.net, set collection name based on what was set in getGRiftCategory
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
	//when accesing db from getLeaderboard
	else {
		collectionCategory = gRiftCategory;
	}
	
	return collectionCategory + diabloClass;

}