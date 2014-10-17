
var request = require("request");
var express = require("express");
var fs = require("fs");
var jsdom = require("jsdom");
var http = require('https');
var app = express();
// var db = require('./db');

var mongo = require('mongodb');
var Server = mongo.Server;
var Db = mongo.Db;
var MongoClient = mongo.MongoClient;

var date;

var apiKey = "y34m8hav4zpvrezvrs6xhgjh6uphqa5r";
var region = "us";
var apiURL = ".api.battle.net/d3/"
var locale = "en_US";
var diabloClasses = ["crusader", "barbarian", "dh", "wizard", "wd", "monk"];

//https://kr.api.battle.net/d3/profile/Nokia-3756/?locale=ko_KR&apikey=y34m8hav4zpvrezvrs6xhgjh6uphqa5r
//"https://" + region + apiURL + "/profile/" + battletag + "/?locale=" + locale + "&apikey=" + apiKey  

var gRiftCategory= "era/1/rift-";
var collectionCategory = "normal";

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

	switch (diabloClass) {
			case "barbarian":
				return collectionCategory + "barbs";
			case "crusader":
				return collectionCategory + "sader";
			case "dh":
				return collectionCategory + "dh";
			case "wd":
				return collectionCategory + "wd";
			case "monk":
				return collectionCategory + "monk";
			case "wizard":
				return collectionCategory + "wiz";
		} 
}
//used to set the griftcategory to know which leaderboard to request from.
function getGRiftCategory(category) {
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

//For accessing Battletags on Leaderboard from DB and create Leaderboard page.
function getLeaderboard(diabloClass, leaderboardType, req, res) {    
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
//Takes about 1/10th second
		date = new Date();
		console.log(diabloClass + " Page before request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
		//successfully connected

		if (err) {
			return console.log(err);
		}	
		else  {
			console.log("Inside getLeaderboard");
			var collectionName = getCollectionName(diabloClass, leaderboardType);
			console.log(collectionName);
			var diabloClassCollection = db.collection(collectionName);
			//from the collection, get only the Battletags as an array sorted by rank, and create site
			diabloClassCollection.find({},{"_id" : 0 ,"Standing" : 0,"Greater Rift" : 0,"Heroes" : 0}).sort({"Standing" : 1}).toArray(function(err, results) {
	    		date = new Date();
				console.log(diabloClass + " Page after request "+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
	    		res.render('ClassLeaderboard.ejs', {title : diabloClass , leaderboardType : collectionCategory , ejs_battletags : results });
	    		db.close();
	  		});
		}
	});

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

//add heroesdata to hero collection.
function addHeroData(battletag, heroID, delay) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		if(err) {
			return console.log("addHeroData error")
		}
		else {
			console.log("inside addHeroData for " + battletag + " " + heroID + "delay is " + delay);
			var requestURL = "https://" + region + apiURL + "profile/" + battletag.replace("#", "-") + "/hero/" + heroID + "?locale=" + locale + "&apikey=" + apiKey;
			console.log(requestURL);
			// var requestURL = "https://us.api.battle.net/d3/profile/" + battletag.replace("#","-") + "/hero/" + heroID +"?locale=en_US&apikey=" + apiKey
			// console.log(requestURL);
			setTimeout( function() {
				request(requestURL, function (error, response, data) {
					if (data == undefined) {
						console.log("addHeroData data was undefined");
						//error handling, call again
						addHeroData(battletag, heroID, 1000);
					}
					else {
						var jsonData = JSON.parse(data);
						var items = jsonData.items;
						//check if data is not null
						if (items == null) {
							console.log("addHeroData items was null for " + battletag + " " + heroID);
							//error handling, call again
							addHeroData(battletag, heroID,1000);
						}					
						else {
							if (db == null) {
								console.log("addHeroData database was null for " + battletag + " " + heroID);
								//error handling, call again
								addHeroData(battletag, heroID, 1000);							
							}
							else {
								if (jsonData.level == 70) {
									var heroCollection = db.collection("hero");
									heroCollection.find({"heroID" : jsonData.id}).toArray(function(err, results) {
										//found, just update.  otherwise insert.
										if (results.length == 1) {
											heroCollection.update({"heroID" : jsonData.id}, {"heroID" : jsonData.id , "Battletag": battletag,  "Name" : jsonData.name, "Class" : jsonData.class , "Level" : jsonData.level, "Paragon" : jsonData.paragonLevel, "Hardcore" : jsonData.hardcore, "Seasonal" : jsonData.seasonal, "Skills" : jsonData.skills, "Items" : jsonData.items}, function(err, results) {
												console.log("addHeroData found, updating "+ battletag + " " + jsonData.id);
											});//end update.
										}
										else {
											heroCollection.insert({"heroID" : jsonData.id , "Battletag": battletag,  "Name" : jsonData.name, "Class" : jsonData.class , "Level" : jsonData.level, "Paragon" : jsonData.paragonLevel, "Hardcore" : jsonData.hardcore, "Seasonal" : jsonData.seasonal, "Skills" : jsonData.skills, "Items" : jsonData.items}, function(err, results) {
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


//localhost:3000/player/BATTLETAG
//for a given Battletag, it makes a request to get all heroes for that tag.  After getting heroes, create the page for that Battletag
function getHeroes(battletag, req, res) {
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
		for (i=0; i<heroes.length; i++) {
			if (i < 8) {
				addHeroData(battletag, heroes[i].id, 0);
			}
			else {
				addHeroData(battletag, heroes[i].id, Math.floor(i/9)*1000);
			}
		}
		res.render('player.ejs', { ejs_btag : battletag , ejs_heroes : heroes });
		date = new Date();
		console.log(battletag + " Page after request"+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
	});
}

//localhost:3000/player/:battletag/hero/:heroID
//for a given heroID, it gets hero's stats, skills and items
function getHeroDetails(heroID, req, res) {
	console.log(getCollectionName('barbs'));	
	// console.log("https://" + region + apiURL + "/profile/" + battletag + "/?locale=" + locale + "&apikey=" + apiKey  );
	var heroRequestURL = "https://" + region + apiURL + "/profile/" +req.params.battletag+"/hero/"+heroID+"?locale="+locale+"&apikey="+apiKey;

	date = new Date();
	console.log(heroID + " Page before request"+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());

	request(heroRequestURL, function (error, response, data) {
		//string to json
		var heroData = JSON.parse(data);
		var heroItems = heroData.items;
		if (heroData.level == 70) {
			getItemIDsFromHero(heroItems,10);
		}
		res.render('hero.ejs', {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems})
		date = new Date();
		console.log(heroID + " Page after request"+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
	});
}

function getItemIDsFromHero(heroItems, delay) {
	var allItems = [];
	if (heroItems.rightFinger != null) {
		allItems.push(heroItems.rightFinger);
	}
	if (heroItems.leftFinger != null) {
		allItems.push(heroItems.leftFinger);
	}
	if (heroItems.head != null) {
		allItems.push(heroItems.head);
	}
	if (heroItems.torso != null) {
		allItems.push(heroItems.torso);
	}
	if (heroItems.feet != null) {
		allItems.push(heroItems.feet);
	}
	if (heroItems.hands != null) {
		allItems.push(heroItems.hands);
	}
	if (heroItems.shoulders != null) {
		allItems.push(heroItems.shoulders);
	}
	if (heroItems.legs != null) {
		allItems.push(heroItems.legs);
	}
	if (heroItems.bracers != null) {
		allItems.push(heroItems.bracers);
	}
	if (heroItems.waist != null) {
		allItems.push(heroItems.waist);
	}
	if (heroItems.neck != null) {
		allItems.push(heroItems.neck);
	}
	if (heroItems.mainHand != null) {
		allItems.push(heroItems.mainHand);
	}
	if (heroItems.offHand != null) {
		allItems.push(heroItems.offHand);
	}
	allItems.forEach(function(item, i) {
		console.log(item.name + " " + i);
		console.log(delay);
		itemID = item.tooltipParams.replace("item/" , "");
		updateItemDB(itemID, delay);
		delay = delay + 100;
		i++;
	});
}

function updateItemDB(itemID , delay){
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		if (err) {
			return console.log("updateItemDB error connecting to db")
		}
		else {
			var itemCollection = db.collection("item");
			var itemRequestURL = "https://us.api.battle.net/d3/data/item/" + itemID + "?locale=" + locale+"&apikey=" + apiKey;
			setTimeout( function() {
				request(itemRequestURL, function (error, response, data) {
					currentItem = JSON.parse(data);
					if (currentItem.code == 403) {
						updateItemDB(itemID,delay+1000);
					}
					else{
						console.log(delay + " updateItemDB inrequest " +currentItem.name);
						(function(currentItem) {
							itemCollection.find({"itemID" : currentItem.tooltipParams.replace("item/","")}).toArray(function(err, result) {
								console.log("finding " + currentItem.tooltipParams.replace("item/","").substring(0,5) + " " + currentItem.name)
								if (result.length != 1) {
									itemCollection.insert({"itemID" : currentItem.tooltipParams.replace("item/",""), "Name" : currentItem.name, "Affixes" : currentItem.attributes, "Random Affixes" : currentItem.randomAffixes, "Gems" : currentItem.gems, "Socket Effects" : currentItem.socketEffects}, function(err, result) {
										console.log("updateItemDB successfully inserted " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5));
									});
								}
								else {
									console.log("updateItemDB already in database " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5));
								}
							});//end find in colleciton
						})(currentItem);//end self-invoking function
					}				
				});//end request
			},delay);//end settimeout
		}//end if successfully in db
	});
}

//adds players from leaderboards to db in class collection
//action can be update or add
function getCurrentLeaderboard(diabloClass) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		//successfully connected
		if(!err) {
			console.log("We are connected");
			//Time log
			date = new Date();
			console.log(diabloClass + " " + gRiftCategory + " Leaders before request "+ date.getMinutes() +":"+ date.getSeconds());
			// console.log("https://" + region + apiURL + "/profile/" + battletag + "/?locale=" + locale + "&apikey=" + apiKey);  

			// var requestURL = "http://us.battle.net/d3/en/rankings/era/1/rift-" + diabloClass;
			var requestURL = "https://" + region + ".battle.net/d3/en/rankings/" + gRiftCategory + diabloClass;
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


app.get('/', function(req, res) {
	console.log(gRiftCategory);
	res.sendfile('default.html');
});


app.get('/updatebarb', function (req,res) {
	getCurrentLeaderboard('barbarian');
	res.redirect('/');
});
app.get('/updatesader', function (req,res) {
	getCurrentLeaderboard('crusader');
	res.redirect('/');
});
app.get('/updatedh', function (req,res) {
	getCurrentLeaderboard('dh');
	res.redirect('/');
});
app.get('/updatemonk', function (req,res) {
	getCurrentLeaderboard('monk');
	res.redirect('/');
});
app.get('/updatewiz', function (req,res) {
	getCurrentLeaderboard('wizard');
	res.redirect('/');
});
app.get('/updatewd', function (req,res) {
	getCurrentLeaderboard('wd');
	res.redirect('/');
});

//files
app.get('/get.js', function(req,res) {
	res.sendfile('get.js');
});
app.get('/request.js', function(req,res) {
	res.sendfile('request.js');
});
app.get('/battletag.css', function(req,res) {
	res.sendfile('battletag.css');
});

app.get('/:category/:diabloClass', function(req,res) {
	getLeaderboard(req.params.diabloClass, req.params.category, req, res);
});

app.get('/player/:battletag', function(req,res) {
	getHeroes(req.params.battletag, req, res);
});

app.get('/player/:battletag/hero/:heroID', function(req, res) {
	getHeroDetails(req.params.heroID, req, res);
});

//setting which leaderboard to get data from.
app.get('/normal', function(req,res) {
	getGRiftCategory('normal');
	res.redirect('/');
});
app.get('/hc', function(req,res) {
	getGRiftCategory('hc');
	res.redirect('/');
});
app.get('/season', function(req,res) {
	getGRiftCategory('season');
	res.redirect('/');
});
app.get('/seasonhc', function(req,res) {
	getGRiftCategory('seasonhc');
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