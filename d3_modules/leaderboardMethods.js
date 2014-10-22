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

function timeToDelay() {
	delayCounter++;
	return (1000* (Math.floor(delayCounter/10)));
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

exports.getLeaderboard = function(diabloClass, leaderboardType, req, res) {    
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
	//Takes about 1/10th second
		date = new Date();
		console.log(diabloClass + " Page before request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
		//successfully connected
		if (err) {
			return console.log(err);
		}	
		else  {
			console.log("Inside getLeaderboard for " + diabloClass + " " + leaderboardType);
			var collectionName = getCollectionName(diabloClass, leaderboardType);
			var diabloClassCollection = db.collection(collectionName);
			//from the collection, get only the Battletags as an array sorted by rank, and create site
			diabloClassCollection.find({},{"_id" : 0 ,"Greater Rift" : 0}).sort({"Standing" : 1}).toArray(function (err, leaderboardResults) {
	    		
	    		if (leaderboardResults.length == 0) {
	    			exports.getGRiftCategory(leaderboardType);
	    			exports.getCurrentLeaderboard(diabloClass);
	    			res.redirect('/');
	    		}
	    		else {

		    		date = new Date();
					console.log(diabloClass + " Page after request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());

		    		var dpsArray = [];
		    		var allData = [];
		    		//for each battletag from the leaderboard
		    		leaderboardResults.forEach(function(currentPlayer) {
		    			delayCounter =0;
		    			var heroCollection = db.collection("hero");
		    			//get the correct hero based on class, and add to array
		    			heroCollection.find({"battletag" : currentPlayer.Battletag.replace("#", "-"), "class" : getClassNameForDatabase(diabloClass) }).toArray(function (error, heroResults) {
		    				//if we found the Hero based on BattleTag and class, add that Hero's Damage to dpsArray, else put 
		    				if (heroResults.length > 0) {
		    					console.log('result was found')
		    					// console.log(heroResults[0].Stats.damage);
		    					heroToPush=heroResults[0];
		    					heroResults.forEach(function(hero) {
		    						if (hero.stats.damage > heroToPush.stats.damage) {
		    							//store hero later, for now just store damage
		    							heroToPush = hero;
		    						}
		    					})
		    					allData[currentPlayer.Standing-1] = heroToPush;
		    					dpsArray[currentPlayer.Standing-1] = heroToPush.stats.damage;
		    				}
		    				//else get the heroes from currentPlayer, find the ones that match the current leaderboard class, and add them.
		    				//currentHero is information from battletag lookup, not hero.
		    				else {
		    					var currentPlayerHeroes = currentPlayer.Heroes;
		    					// console.log (currentPlayerHeroes);
		    					currentPlayerHeroes.forEach(function(currentHero) {
		    						if (currentHero.level == 70) {
			    						if (getClassNameForDatabase(diabloClass) == currentHero.class && currentHero.dead == false) {
			    							// console.log(currentHero);
			    							// console.log("before " + delayCounter);
			    							playerMethods.addHeroData(currentPlayer.Battletag.replace("#", "-"), currentHero.id, timeToDelay(),db);
			    							// console.log("after " + delayCounter);
			    						}
			    						else {
			    							dpsArray[currentPlayer.Standing-1] = 0;
			    						}
			    					}
		    					});
		    					// heroCollection.insert()
		    				}
							//if everyone found in hero database that has same class and battletag
							if (dpsArray.length == leaderboardResults.length) {
								var count = 0;
								for (i = 0 ; i < leaderboardResults.length ; i++) {
									if (dpsArray[i] != undefined) {
										count++;
									}
								}
								if (count ==  leaderboardResults.length) {
									// console.log(dpsArray);
									//page renders when dpsArray has not been completely filled
						    		date = new Date();
									console.log(diabloClass + " Page rendered "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());

			    					res.render('ClassLeaderboard.ejs', {title : diabloClass , leaderboardType : collectionCategory , ejs_battletags : leaderboardResults , dpsData : dpsArray, all:allData });
								}
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


//adds players from leaderboards to db in class collection
//action can be update or add
exports.getCurrentLeaderboard = function(diabloClass) {
	console.log(1);
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		//successfully connected
		if(!err) {
			console.log("We are connected");
			//Time log
			date = new Date();
			console.log(diabloClass + " " + gRiftCategory + " Leaders before request "+ date.getMinutes() +":"+ date.getSeconds());
			// console.log("https://" + region + apiURL + "/profile/" + battletag + "/?locale=" + locale + "&apikey=" + apiKey);  

			var requestURL = "https://" + region + ".battle.net/d3/en/rankings/" + gRiftCategory + getClassNameForLeaderboard(diabloClass);
			console.log(requestURL);
			request(requestURL, function (error, response, body) {
				console.log("requesting")
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

					//for each row
					$('tbody tr').each( function getDataFromRow(){
						//get the top players from 1 to count
						//change to 1000 later
						if (count < 100) {
							//index for a row's column.  gets reset after each row.
							var cellIndex = 0; 
							//information from the player will be added to this array, which will be pushed to array of players
							//[rank, battletag, tier, timespend, date accomplished]

							var playerData = [];
							//for the current row, get each data
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
									var battletag = link.substring(0,link.length-1).replace("/d3/en/profile/","");
									playerData.push(battletag);
								}
								//tier, timespent, and completed
								else if (cellIndex <= 4) {
									var data = $(this).html();
									data = data.substring(1, data.length-1);
									playerData.push(data);
								}
								cellIndex++;
							});//end looping through columns fo a row
							
							//if there was data add it to list of players
							if (playerData.length != 0) {
								leaders.push(playerData);
							}
						} //end if count<length loop
						count++;
					});//end tbody loop

					//count is used to know which call# it currently is to know when to make the next request
					var currentCallNum =0;
					var timer;
					leaders.forEach(function (playerData, i) {
						i = currentCallNum;
						var requestURL = "https://us.api.battle.net/d3/profile/" + playerData[1] + "/?locale="+locale+"&apikey=" + apiKey;
						date = new Date();					
						var timeCheck = new Date();
						timeCheck = timeCheck.getSeconds()*1000 + timeCheck.getMilliseconds();
						
						//only allowed 10 api calls per second
						//not the 10th call
						if (i % 10 != 9) {
							//if its the first 10 calls, set a timer to know when when to make next 10 calls
							if (i < 10) {
								//timer is set on first call
								if (i == 0) {
									timer = new Date();
									timer = timer.getSeconds()*1000 + timer.getMilliseconds();
								}
								console.log("requested " + i + " " + timer);
								updateDiabloClassDBforPlayer(requestURL,playerData,0,db,diabloClass,0);					
							}
							//not 10th call or first 10, get the current time and check how long its been since the previous 10 calls
							else {
								//get current time
								var timeCheck = new Date();
								timeCheck = timeCheck.getSeconds()*1000 + timeCheck.getMilliseconds();

								var timeDifference = timer - timeCheck;
								console.log("requested " + playerData + " " + timer + " " + timeCheck);
								//if time difference is 0 or less, no delay
								if (timeDifference <= 0) {
									updateDiabloClassDBforPlayer(requestURL,playerData,0,db,diabloClass,0);	
								}
								else {
									console.log(i + " timeDiff was "+ timeDifference);
									updateDiabloClassDBforPlayer(requestURL,playerData,timeDifference+800,db,diabloClass,0);
								}
							}//end not first 10 else
						}//end not a 10th call loop
						
						//on 10th call set the next time to make next 10 calls to 1s after previous 10.
						else {
							timer = timer+ 1000;
							if (i==9){
								console.log("requested " + i + " " + timer + "Current request" + timeCheck);
								updateDiabloClassDBforPlayer(requestURL,playerData,0,db,diabloClass,0);
							}
							//after 10th call
							else{
								var timeDifference = timer - timeCheck;
								console.log("requested " + i + " " + timer + " " + timeCheck);
								updateDiabloClassDBforPlayer(requestURL,playerData,timeDifference+800,db,diabloClass,0);
							}	
						}
						currentCallNum++;
					});//end battletag forloop
				});//end jsdom
			});//end request
		}//end if successfuly connected
	});//end mongodb
}//end function

//gets data from battletag and writes to diabloClass db.
//helper method for getCurrentLeaderboard
 function updateDiabloClassDBforPlayer(requestURL, playerData, delay, db, diabloClass, calledAgain) {
	setTimeout( function() {
		request(requestURL, function (error, response, data) {
			// console.log(data);
			if (data == undefined) {
				updateDiabloClassDBforPlayer(requestURL, playerData, delay, db, diabloClass, calledAgain);
			} 

			else {
				var jsonData = JSON.parse(data);
			
				//if call was null, 
				if (jsonData.battleTag == undefined){
					console.log("updateDiabloClassDBforPlayer-----" + playerData[0] + " was undefined, called " + calledAgain + "times")
					updateDiabloClassDBforPlayer(requestURL,playerData,1000,db,diabloClass,calledAgain+1);
					// jsonData.battleTag = "UNDEFINED";
				}
				else {
					console.log("updateDiabloClassDBforPlayer, jsondata not null " + calledAgain + "  " +  playerData + " " + jsonData.battleTag);
					if (playerData.length != 5) {
						console.log("updateDiabloClassDBforPlayer did not have length of 5 for " + jsonData.battleTag);
					}
					//...get all heroes from jsonData and store it
					var collectionName = getCollectionName(diabloClass,gRiftCategory);
					var diabloClassCollection = db.collection(collectionName);

					diabloClassCollection.find().toArray(function(err, results) {
						//[rank, battletag, tier, timespend, date accomplished]
						var collectionLength = results.length;
						//nothing in collection add player
						if (collectionLength == 0) {
							diabloClassCollection.insert({"Standing" : playerData[0] , "Battletag" : jsonData.battleTag , "Greater Rift" : playerData[2] , "Time Spent" : playerData[3] , "Date Completed" : playerData[4] , "Heroes" : jsonData.heroes}, function(err, results) {
							});
						}
						//change to 1000 later
						//check what hasnt been added
						else if (collectionLength <100) {
							diabloClassCollection.find({"Standing" : playerData[0]}).toArray(function(err, result) {
								//if it the current standing hasn't been added, add it
								if (result.length == 0) {
									console.log("adding " + jsonData.battleTag + " to " + playerData[0]);
									diabloClassCollection.insert({"Standing" : playerData[0] , "Battletag" : jsonData.battleTag , "Greater Rift" : playerData[2] , "Time Spent" : playerData[3] , "Date Completed" : playerData[4] , "Heroes" : jsonData.heroes}, function(err, results) {
									});
								}
								else {
								}
							});
						}
						//collection is correct size
						else if (collectionLength == 100) {

							//playerData[0] occasionally doesn't show up

							diabloClassCollection.find({"Standing" : playerData[0]}).toArray(function(err, result) {
								//If Leaderboard spot has not changed, do nothing, otherwise update
								if (result.length == 0) {
									console.log("updateDiabloClassDBforPlayer ranking not found for " + playerData[0]);
								}
								if(playerData[1].replace("-","#") == jsonData.battleTag && result[0]["Greater Rift"] == playerData[2] && result[0]["Time Spent"] == playerData[3] && result[0]["Date Completed"] == playerData[4]) {
										console.log("updateDiabloClassDBforPlayer found " + jsonData.battleTag + " nothing changed");
								}
								else {	
									diabloClassCollection.update({"Standing" : playerData[0]} , {"Battletag" : jsonData.battleTag , "Greater Rift" : playerData[2] , "Time Spent" : playerData[3] , "Date Completed" : playerData[4] , "Heroes" : jsonData.heroes}, function(err, results) {
										console.log("updateDiabloClassDBforPlayer, found,"+ jsonData.battleTag +  " --------updated with " + playerData);
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