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

var diabloClasses = ["crusader", "barbarian", "dh", "wizard", "wd", "monk"];
var apiKey = "y34m8hav4zpvrezvrs6xhgjh6uphqa5r";
var locale = "en_US";


function getCollectionName(diabloClass) {
	switch (diabloClass) {
			case "barbarian":
				return "barbs";
			case "crusader":
				return "sader";
			case "dh":
				return "dh";
			case "wd":
				return "wd";
			case "monk":
				return "monk";
			case "wizard":
				return "wiz";
		} 
}


//For accessing Battletags on Leaderboard from DB and create Leaderboard page.
function getLeaderboard(diabloClass, req, res) {    
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		if(!err) {
			console.log("Inside getLeaderboard");
		}	
		var collectionName = getCollectionName(diabloClass);
		var diabloClassCollection = db.collection(collectionName);
		//from the collection, get only the Battletags as an array sorted by rank, and create site
		diabloClassCollection.find({},{"_id" : 0 ,"Standing" : 0,"Greater Rift" : 0,"Heroes" : 0}).sort({"Standing" : 1}).toArray(function(err, results) {
    		console.log(results[0].Battletag);
    		res.render('ClassLeaderboard.ejs', {title : diabloClass , ejs_battletags : results });
    		db.close();
  		});
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

//localhost:3000/player/BATTLETAG
//for a given Battletag, it makes a request to get all heroes for that tag.  After getting heroes, create the page for that Battletag
function getHeroes(battletag, req, res) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		var heroCollection = db.collection("hero");
	});

	var requestURL = "https://us.api.battle.net/d3/profile/" + battletag + "/?locale="+locale+"&apikey=" + apiKey;
	date = new Date();
	console.log(battletag + " Page before request"+ date.getMinutes() +":"+ date.getSeconds() + date.getMilliseconds());
	request(requestURL, function (error, response, data) {
		var jsonData = JSON.parse(data);
		if (jsonData.code == "NOTFOUND") {
			res.send("Invalid Battletag");
			//request the tag again.
		}
		var heroes = jsonData.heroes;
		res.render('player.ejs', { ejs_btag : battletag , ejs_heroes : heroes });
		date = new Date();
		console.log(battletag + " Page after request"+ date.getMinutes() +":"+ date.getSeconds() + date.getMilliseconds());
	});
}

//localhost:3000/player/:battletag/hero/:heroID
//for a given heroID, it gets hero's stats, skills and items
function getHeroDetails(heroID, req, res) {
	var heroRequestURL = "https://us.api.battle.net/d3/profile/"+req.params.battletag+"/hero/"+heroID+"?locale="+locale+"&apikey="+apiKey;
	request(heroRequestURL, function (error, response, data) {
		//string to json
		console.log(typeof data);
		var heroData = JSON.parse(data);
		console.log(typeof heroData);
		var heroItems = JSON.stringify(heroData.items);
		console.log(typeof heroItems);
		heroItems = heroItems.replace("{\"h", "[\"h");
		heroItems = heroItems.replace("]}}","]}]");
		// heroItems = heroItems.replace("items\":{","items\":[")
		console.log(heroItems.indexOf("]}}"));
		console.log(heroItems);
		// heroItems = JSON.parse(heroItems);
				console.log(heroItems);
		// console.log(heroItems);
		// JSON.parse(heroData);
		// console.log(JSON.parse(heroData.items));
		// var heroItems = JSON.parse(heroData.items);
		// console.log(heroItems);
		res.render('hero.ejs', {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems})
		date = new Date();
		console.log(date.getMinutes() +":"+ date.getSeconds());
	});

}

//gets data from battletag and writes to db.
//helper method for database
function requestDataWriteToDB(action, requestURL, player, delay, db, diabloClass) {
	setTimeout( function() {
		request(requestURL, function (error, response, data) {
			//...parse it
			var jsonData = JSON.parse(data);
			//
			if (jsonData.battleTag == undefined){
				jsonData.battleTag = "UNDEFINED";
			}
			console.log(player[0] + " " + jsonData.battleTag);
			//...get all heroes from jsonData and store it
			var collection = "";
			switch (diabloClass) {
				case "barbarian":
					collection = "barbs";
					break;
				case "crusader":
					collection = "sader";
					break;
			} 
			// console.log(findHero(jsonData, diabloClass));
			if (action == "write") {
				db.collection(collection).insert({"Standing" : player[0] ,"Battletag" : jsonData.battleTag , "Greater Rift" : player[2] ,"Heroes" : jsonData.heroes}, function(err, results) {
					// if (!err) {
						// console.log('successfully added ' + jsonData.battleTag);
					// }
				});
			}
			if (action == "update") {
				db.collection(collection).update({"Standing" : player[0]}, {"Standing" : player[0] ,"Battletag" : jsonData.battleTag , "Greater Rift" : player[2] ,"Heroes" : jsonData.heroes}, function(err, results) {
					// if (!err) {
						// console.log('successfully added ' + jsonData.battleTag);
					// }
				});
			}
		});
	},delay);
}


//add heroesdata to hero colelction.
function addHeroData() {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		if(!err) {
			console.log("inside addHeroData");
		}	

		requestURL = "https://us.api.battle.net/d3/profile/revis-1877/hero/10562781?locale=en_US&apikey=y34m8hav4zpvrezvrs6xhgjh6uphqa5r";

		setTimeout( function() {
			request(requestURL, function (error, response, data) {
				//...parse it
				var jsonData = JSON.parse(data);
				var items = jsonData.items;
				console.log(items);
				//...get all heroes from jsonData and store it


				// console.log(findHero(jsonData, diabloClass));
				
				//add hero to collection, after that, add items
				db.collection("hero").insert({"heroID" : jsonData.id , "Name" : jsonData.name, "Class" : jsonData.class , "Skills" : jsonData.skills, "Items" : jsonData.items}, function(err, results) {

				});//end request callback.
			});//end request
		},0);//end setTimeout
	});//end mongoclien connect
}

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



//adds players from leaderboards to db in class collection
//action can be update or add
function addPlayersTodataBase(diabloClass, action) {
	MongoClient.connect("mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders", function(err, db) {
		//successfully connected
		if(!err) {
			console.log("We are connected");
		}	

		//Time log
		date = new Date();
		console.log(diabloClass +" Leaders before request "+ date.getMinutes() +":"+ date.getSeconds());


		var requestURL = "http://us.battle.net/d3/en/rankings/era/1/rift-" + diabloClass;
		request(requestURL, function (error, response, body) {
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
				$('tbody tr').each( function(){
					//get the top players from 1 to count
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
								if (rank != "Rankings not yet availabl") {
									playerData.push(rank);
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
				leaders.forEach(function (player, i) {
					i = currentCallNum;
					var requestURL = "https://us.api.battle.net/d3/profile/" + player[1] + "/?locale="+locale+"&apikey=" + apiKey;
					date = new Date();
					// ...get JSON data
					
					var timeCheck = new Date();
					timeCheck = timeCheck.getSeconds()*1000 + timeCheck.getMilliseconds();
					
					//on 10th call, set a time
					if (i % 10 == 9) {
						// timer = new Date();
						timer = timer+ 1000;
						if (i==9){
							console.log("requested " + i + " " + timer + "Current request" + timeCheck);
							if (action == "write") {
								requestDataWriteToDB("write", requestURL,player,0,db,diabloClass);
							}
							if (action == "update") {
								requestDataWriteToDB("update", requestURL,player,0,db,diabloClass);
							}
						}
						//after 10th call
						else{
							var timeDifference = timer - timeCheck;
							console.log("requested " + i + " " + timer + " " + timeCheck);
							if (action == "write") {
								requestDataWriteToDB("write", requestURL, player, timeDifference+800,db,diabloClass);
							}
							if (action == "update") {
								requestDataWriteToDB("update", requestURL,player,timeDifference+800,db,diabloClass);
							}
						}	
					}
					//not a 10th call, check time difference
					else {
						//first 10 calls
						if (i < 10) {
							//first call, set a timer to know when to call requests after reaching limit
							if (i == 0) {
								timer = new Date();
								timer = timer.getSeconds()*1000 + timer.getMilliseconds();
							}
							console.log("requested " + i + " " + timer);
							if (action == "write") {
								requestDataWriteToDB("write", requestURL,player,0,db,diabloClass);	
							}
							if (action == "update") {
								requestDataWriteToDB("update", requestURL,player,0,db,diabloClass);
							}						
						}
						//not 10th call or first 10
						else {
							//get current time
							var timeCheck = new Date();
							timeCheck = timeCheck.getSeconds()*1000 + timeCheck.getMilliseconds();

							var timeDifference = timer - timeCheck;
							console.log("requested " + player + " " + timer + " " + timeCheck);
							//if time difference is 0 or less, no delay
							if (timeDifference <= 0) {
								if (action == "write") {
									requestDataWriteToDB("write", requestURL,player,0,db,diabloClass);
								}
								if (action == "update") {
									requestDataWriteToDB("update", requestURL,player,0,db,diabloClass);
								}	
							}
							else {
								console.log(i + " timeDiff was "+ timeDifference);
								if (action == "write") {
									requestDataWriteToDB("write", requestURL,player,timeDifference+800,db,diabloClass);
								}
								if (action == "update") {
									requestDataWriteToDB("update", requestURL,player,timeDifference+800,db,diabloClass);
								}	
							}
						}//end else all not fist 10
					}
					count++;
				});//end battletag forloop
			});//end jsdom
		});//end request
	});//end mongodb
}//end function

app.get('/', function(req, res) {
	res.sendfile('default.html');
});

app.get('/updatebarb', function (req,res) {
	addPlayersTodataBase('barbarian','update');
})

app.get('/updatesader', function (req,res) {
	addPlayersTodataBase('crusader','update');
})
app.get('/get.js', function(req,res) {
	res.sendfile('get.js');
})

app.get('/battletag.css', function(req,res) {
	res.sendfile('battletag.css');
})


app.get('/barbarian', function(req, res) {
	getLeaderboard("barbarian", req, res);
	addHeroData();
});


app.get('/crusader', function(req, res) {
	getLeaderboard("crusader", req, res);
});

app.get('/dh', function(req, res) {
	getLeaderboard("dh", req, res);
});

app.get('/monk', function(req, res) {
	getLeaderboard("monk", req, res);
});

app.get('/wd', function(req, res) {
	getLeaderboard("wd", req, res);
});


app.get('/player/:battletag', function(req,res) {

	getHeroes(req.params.battletag, req, res);

});

// app.get('/crusader', function(req, res) {
// 	getLeaderboard("crusader", req, res);
// });

app.get('/wizard', function(req, res) {
	getLeaderboard("wizard", req, res);
});

app.get('/player/:battletag/hero/:heroID', function(req, res) {
	getHeroDetails(req.params.heroID, req, res);
});


app.get('/*' , function(req,res) {
	res.send("404");
});


app.listen(3000);
