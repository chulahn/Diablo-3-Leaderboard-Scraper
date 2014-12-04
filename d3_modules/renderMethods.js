var exports = module.exports = {};
var debug = require("../d3_modules/debugMethods.js");
var leaderboard = require("../d3_modules/leaderboardMethods.js");
var set = require("../d3_modules/setMethods.js");
var heroMethods = require("../d3_modules/heroMethods");
var playerMethods = require("../d3_modules/playerMethods");
var colors = require("colors");
var request = require("request");

var async = require("async");

var mongo = require("mongodb");
var Db = mongo.Db;
var MongoClient = mongo.MongoClient;
var databaseURL = process.env.DBURL || "mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders";
var apiKey = process.env.APIKEY || "y34m8hav4zpvrezvrs6xhgjh6uphqa5r";

var region = "us";
var apiURL = ".api.battle.net/d3/"
var locale = "en_US";
var gRiftCategory= "era/1/rift-";
var collectionCategory = "normal";

/*
	/player/:battletag/hero/:heroID
	Renders a hero's page given an ID based on data in heroCollection.
	If not in hero collection, make a request to Blizzard.
*/
exports.heroPage = function(heroID, req, res) {
	var heroRequestURL = "https://" + region + apiURL + "/profile/" +req.params.battletag+"/hero/"+heroID+"?locale="+locale+"&apikey="+apiKey;

	debug.timeString(heroID + " Page before request ");

	//Takes 200ms.  Only has information from DB.  Not always up to Date
	MongoClient.connect(databaseURL, function(err, db) {
		if (err) {
			return console.log("getHeroDetails error connecting to db")
		}
		else {
			heroCollection = db.collection("hero");
			heroCollection.find({"heroID" : parseInt(heroID)}).toArray(function(err, matchedHero) {
				if (matchedHero.length > 0) {
					var heroData = matchedHero[0];
					var heroItems = heroData.items;
					//add items to DB if extraItemData is undefined
					if (heroData.level == 70 && heroData.extraItemData == undefined) {
						// exports.getItemIDsFromHero(heroItems,heroID,10);
					}
					console.log(heroData);
					res.render("hero.ejs", {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems, ejs_heroID : heroID})
					debug.timeString(heroID + " Page after request in database");
				}
				//not in database.  must request data from Blizzard site.
				//Takes about same time.  Can crash if too many requests were made 
				else {
					request(heroRequestURL, function (error, response, data) {
						var heroData = JSON.parse(data);
						var heroItems = heroData.items;
						if (heroData.level == 70) {
							// exports.getItemIDsFromHero(heroItems,heroID,10);
						}
						console.log(heroData)
						res.render("hero.ejs", {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems, ejs_heroID : heroID})
						debug.timeString(heroID + " Page after request ");
					});
				}
			});
		}
	});
}


/*
	/:category/:diabloClass
	leaderboardType is category (normal, hc, season, seasonhc)
	Renders leaderboard page by selecting the correct collection in Database and for each battletag,
	find the gRiftHero (must be 70, match hardcore and season, correct class, and gRiftHero == true), inside heroCollection
	and append it to array.  store this array in cached collection.

	If leaderboardCollection did not have full amount, find+add missing battletags.

	If gRiftHero == false, find the hero that matches params and has highest DPS.

	If no matching heroes are found(deleted hero, hc death, etc..) pass 0.
*/

exports.leaderboardPage = function(region, diabloClass, leaderboardType, req, res) {    

	MongoClient.connect(databaseURL, function(err, db) {
	//Takes about 1/10th second


		debug.timeString(diabloClass + " Page before request ");
		if (err) {
			return console.log(err);
		}	
		//successfully connected
		else  {
			console.log("Inside getLeaderboardFromDB for " + region + " " + diabloClass + " " + leaderboardType);
			set.setRegion(region);
			var collectionName = region + getCollectionName(diabloClass, leaderboardType);
			var leaderboardCollection = db.collection(collectionName);
			console.log(collectionName);

			db.collection("cached").find({"collectName" : collectionName}).toArray(function (err, foundCache) {

				if (foundCache && foundCache[0] && foundCache[0].heroes !== undefined && foundCache[0].heroes.length === 100) {

					var pageData = foundCache[0];

					res.render('ClassLeaderboard.ejs',{title : diabloClass , region : region, leaderboardType : collectionCategory , ejs_battletags : pageData.battletags , ejs_allGRiftHeroes : pageData.heroes , lastupdated : date});
					console.log(colors.green("rendered from cache!"));
					debug.timeString(diabloClass + " Page rendered ");
				}

				else {

					cacheData();
				}
			});


			function cacheData() {
				//get all from collection, sort by rank
				leaderboardCollection.find({},{"_id" : 0 }).sort({"Standing" : 1}).toArray(function (err, leaderboardResults) {
		    		
		    		//there aren't enough battletags in leaderboardCollect, update
		    		if (leaderboardResults.length == 0 || leaderboardResults.length != 100) {
		    			leaderboard.getCurrentLeaderboard(region, diabloClass, leaderboardType);
		    			res.redirect('/');
		    		}
		    		//leaderboard has 1000
		    		else {
		    			debug.timeString(diabloClass + " Page after request ");
						console.log(leaderboardType,"Here");
						//array for storing all heroes in DB
			    		var allGRiftHeroes = [];
			    		setSearchParams(leaderboardType);

						async.eachSeries(leaderboardResults, function (currentPlayerFromDB, foundGRiftHeroCallback) {

							function getItemDataFor(heroToPush){
		    					var thisHero = {items : heroToPush.items,
												heroID : heroToPush.heroID,
												class : heroToPush.class}
	    						heroMethods.getItemIDsFromHero(thisHero, 300, foundGRiftHeroCallback);
							}

			    			var heroCollection = db.collection("hero");
			    			
			    			heroCollection.find({"battletag" : currentPlayerFromDB.Battletag.replace("#", "-"), "class" : getClassNameForDatabase(diabloClass), "seasonal" : searchParamSeason, "hardcore" : searchParamHC, "gRiftHero" : true}).toArray(function (error, gRiftHeroResults) {
			    				//found grift hero, check if it has extraItemData.  if not add it
			    				if (gRiftHeroResults.length != 0) {	

			    					heroToPush = gRiftHeroResults[0];
			    					
			    					if (heroToPush.extraItemData != undefined && heroToPush.extraItemData.gems != undefined && heroToPush.extraItemData.lastupdated != undefined) {
				    					console.log("found grift hero and extraItemData, gems, lastupdated for " + currentPlayerFromDB.Battletag + " " + currentPlayerFromDB.Standing) 	    					
		    							allGRiftHeroes[currentPlayerFromDB.Standing-1] = heroToPush;
		    							foundGRiftHeroCallback();
			    					}
			    					//get items, then get extraitemdata, then push, then increment. 
			    					else {
				    					console.log("found grift hero attempting to add extraItemData for " + currentPlayerFromDB.Battletag + " " + currentPlayerFromDB.Standing + " " + heroToPush.heroID);	
			    						getItemDataFor(heroToPush)
				    					// var thisHero = {items : heroToPush.items,
				    					// 				heroID : heroToPush.heroID,
				    					// 				class : heroToPush.class}
			    						// heroMethods.getItemIDsFromHero(thisHero, 300, foundGRiftHeroCallback);
			    					}
			    				}
			    				//hero wasnt found. try to found it.
			    				else {
			    					//find the heroes in heroCollection that matches params.
					    			heroCollection.find({"battletag" : currentPlayerFromDB.Battletag.replace("#", "-"), "class" : getClassNameForDatabase(diabloClass), "seasonal" : searchParamSeason, "hardcore" : searchParamHC}).toArray(function (error, heroResults) {
						    			
						    			//if the hero matches params, find the highest dps.  then get extraItemData.
					    				if (heroResults.length > 0) {
					    					heroToPush=heroResults[0];
					    					
					    					heroResults.forEach(function(hero) {
					    						console.log(colors.blue(hero.heroID));
					    						if (hero.stats.damage > heroToPush.stats.damage) {
					    							heroToPush = hero;
					    						}
					    					});
					    					console.log(colors.red(heroToPush.heroID));
					    					allGRiftHeroes[currentPlayerFromDB.Standing-1] = heroToPush;
					    					
					    					if (heroToPush.extraItemData == undefined) {
					    						console.log("found grift hero, 119, adding extraItemData " + currentPlayerFromDB.Battletag + " " + currentPlayerFromDB.Standing)
					    						getItemDataFor(heroToPush)
						    					// 	var thisHero = {items : heroToPush.items,
				    							// 		heroID : heroToPush.heroID,
				    							// 		class : heroToPush.class}
					    						// heroMethods.getItemIDsFromHero(thisHero, 300, foundGRiftHeroCallback);				    						
					    					}


					    					//player has extraitemData but did not have griftHero
					    					else {
					    						console.log("found grift hero, 125, had extraItemData, no griftHero " + currentPlayerFromDB.Battletag + " " + currentPlayerFromDB.Standing)
					    						
					    						var thisHero = {items : heroToPush.items,
				    									heroID : heroToPush.heroID,
				    									class : heroToPush.class}
					    						heroMethods.getItemIDsFromHero(thisHero, 300, foundGRiftHeroCallback);		


					    						foundGRiftHeroCallback();
					    					}
					    				}

					    				//check if hero has players in leaderboard/battletag data.
					    				else {
							    			var currentPlayerHeroes = currentPlayerFromDB.Heroes;
					    					//player deleted all heroes or no matches
					    					if (currentPlayerHeroes.length == 0) {
				    							allGRiftHeroes[currentPlayerFromDB.Standing-1] = 0;
					    						console.log("Deleted all heroes or no matches 130 " + currentPlayerFromDB.Battletag + " " + currentPlayerFromDB.Standing)

				    							foundGRiftHeroCallback();
					    					}
					    					else {
						    					var validHero70Count = 0;

						    					/*
													Instead of getting gRiftHero from heroCollection, search leaderboardCollection(ushcbarb, ucseasonwiz)
													and get the hero's that are valid for that leaderboard.
						    					*/
						    					function findHeroInBattletagData(currentPlayerHeroes) {

						    					}
						    					console.log(colors.red(currentPlayerFromDB.Battletag, currentPlayerFromDB.Standing, "hero length ",currentPlayerHeroes.length))
						    					currentPlayerHeroes.forEach(function(currentHero) {
						    						//find the hero that matches searchParams (class, HC, seasonal, 70)
						    						if (currentHero.level == 70 && currentHero.hardcore == searchParamHC && currentHero.seasonal == searchParamSeason && getClassNameForDatabase(diabloClass) == currentHero.class) {
							    						if (currentHero.dead == false) {
							    							validHero70Count += 1;
							    							console.log(colors.green(currentHero.id));
							    							playerMethods.addHeroData(region, currentPlayerFromDB.Battletag.replace("#", "-"), currentHero.id, 300, db, foundGRiftHeroCallback);
							    						}
							    						//error handling for hc players.  heroID is in currentPlayerFromDB.Heroes, but was dead, dont add to valid hero count
							    						else {
									    						console.log(colors.green("hardcore hero was dead 150 " + currentPlayerFromDB.Battletag + " " + currentPlayerFromDB.Standing +  " " + currentHero.name));
							    						}
							    					}

							    					//reached lastHero, if there were no valid 70s, add 0.  player, has heroes, but deleted grift hero hero
						    						if (currentPlayerHeroes.indexOf(currentHero) == currentPlayerHeroes.length-1) {

						    							if (validHero70Count == 0) {
						    								console.log("validHero70Count was 0 for " + currentPlayerFromDB.Standing + " " + currentPlayerFromDB.Battletag);
						    								allGRiftHeroes[currentPlayerFromDB.Standing-1] = 0;
						    								foundGRiftHeroCallback();
						    							}
						    						}
						    					});
					    					}
					    				}


			    					});

			    				}
			    			});
							// }
			    		}, function(err){
			    			if (err) {
			    				console.log("fail");
			    			}
			    			else {
			    				//render
								debug.timeString(diabloClass + " Page rendered ");
								//Takes about half a minute to render.
								//get the lastupdated time and then render page.
								async.waterfall([
									function(callback) {
										leaderboardCollection.find({}).sort({"lastupdated" : -1}).toArray(function(err, results) {
											if (results[0]["lastupdated"] != undefined) {	
												callback(null, results[0]["lastupdated"]);
											}
											else {
												callback(null, 0);
												console.log(results[0])
											}
										});
								}], function(err, date) {

									// collection loaded
									db.collection("cached").update({"collectName" : collectionName},
																	{$set: {
																		"lastupdated": date,
																		"heroes": allGRiftHeroes,
																		"battletags": leaderboardResults
																	}}, {upsert: true}, function(err, results) {
																		if (err) {
																			console.log(colors.red("error storing results"));
																		}
																		else {
																			console.log(colors.green("success storing results"));
																		}
																	});


			    					res.render('ClassLeaderboard.ejs', {title : diabloClass , region : region, leaderboardType : collectionCategory , ejs_battletags : leaderboardResults , ejs_allGRiftHeroes : allGRiftHeroes , lastupdated : date, lastCached: new Date()});
								});	
			    			}

			    		});
			  		}
		  		});//end toArray callbackk from finding leaderboard

			}
		}//end else
	});//end mongoconnect

/* 
	Takes ~1 Minute.  Always up to date.  Can't show analysis
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
				// }
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

exports.getAllClasses = function(db, region, leaderboardType, req, res) {
	async.waterfall([

		function getBarbs(gotBarbs) {

			var allClasses = [];
			db.collection(region+leaderboardType+"barb").find({}).toArray(function (err, barbs) {

				barbs.forEach(function(barb) {
					barb.class = "barbarian";
				});
				allClasses = allClasses.concat(barbs)
				gotBarbs(null, allClasses);
			});
		},

		function getWDs(allClasses, gotWDS) {

			db.collection(region+leaderboardType+"wd").find({}).toArray(function (err, wds) {

				wds.forEach(function(wd) {
					wd.class = "witch-doctor";
				});

				allClasses = allClasses.concat(wds);
				gotWDS(null, allClasses);
			});
		},

		function getWiz(allClasses, gotWiz) {

			db.collection(region+leaderboardType+"wiz").find({}).toArray(function (err, wizs) {
				
				wizs.forEach(function(wiz) {
					wiz.class = "wizard";
				});

				allClasses = allClasses.concat(wizs);
				gotWiz(null, allClasses);
			});
		},

		function getSader(allClasses, gotSaders) {

			db.collection(region+leaderboardType+"sader").find({}).toArray(function (err, saders) {

				saders.forEach(function(sader) {
					sader.class = "crusader";
				});

				allClasses = allClasses.concat(saders);
				gotSaders(null, allClasses);
			});
		},

		function getMonks(allClasses, gotMonks) {
			db.collection(region+leaderboardType+"monk").find({}).toArray(function (err, monks) {
				
				monks.forEach(function(monk) {
					monk.class = "monk";
				});

				allClasses = allClasses.concat(monks);
				gotMonks(null, allClasses);
			});
		},
		function getDHs(allClasses, gotDHs) {
			db.collection(region+leaderboardType+"dh").find({}).toArray(function (err, DHs) {
				
				DHs.forEach(function(DH) {
					DH.class = "demon-hunter";
				});

				allClasses = allClasses.concat(DHs);
				gotDHs(null, allClasses);
			});
		}
	], function (err, allClasses) {

		if (allClasses) {

			allClasses.sort(function (a,b) {

				if (b["Greater Rift"] != a["Greater Rift"]) {
					return b["Greater Rift"] - a["Greater Rift"];
				}

				else {
					return a["Time Spent"]-b["Time Spent"];
				}
			});


			res.render('allLeaderboard.ejs', {title: "All", region: region, leaderboardType: leaderboardType, ejs_battletags: allClasses, all:[], lastupdated: new Date()})
		}
		else {
			res.send(404);
		}
	});
}


//localhost:3000/player/BATTLETAG
//for a given Battletag, it makes a request to get all heroes for that tag.  After getting heroes, call addHeroData and create the page for that Battletag
//addHeroData is currently uncommented until it has been updated.
exports.getHeroes = function(battletag, req, res) {
	var gRiftHeroes = 0;
	var playersHeroes;

	async.series([

		//find gRiftHero then pass in.
		function findGRiftHero(foundGRiftHeroCallback) {
			debug.timeString(battletag + " Page before db search");
			MongoClient.connect(databaseURL, function(err, db) {
				var heroCollection = db.collection("hero");
				heroCollection.find({"battletag" : battletag , "gRiftHero" : true}).toArray(function (err, heroResults) {
					debug.timeString(battletag + " Page after db search");
					if (heroResults.length > 0) {
						gRiftHeroes = heroResults;
						foundGRiftHeroCallback();
					}
					else {
						console.log(heroResults);
						foundGRiftHeroCallback();
					}
				});//end find in heroCollection
			});			
		},
		function getAllHeroes(gotHeroesCallback) {
			var requestURL = "https://" + region + apiURL + "profile/" + battletag + "/?locale=" + locale + "&apikey=" + apiKey;
			debug.timeString(battletag + " Page before request");
			request(requestURL, function (error, response, playerInformation) {
				var playerJSON = JSON.parse(playerInformation);
				if (playerJSON.code == "NOTFOUND") {
					res.send("Invalid Battletag");
					//request the tag again.
					getHeroes(battletag,req,res);
				}
				playersHeroes = playerJSON.heroes;
				if (playersHeroes == undefined) {
					console.log("getHeroes playerJSON.heroes undefined");
					getHeroes(battletag,req,res);
				}
				else {
					for (i=0; i<playersHeroes.length; i++) {
						// exports.addHeroData(battletag, playersHeroes[i].id, 0,timeToDelay());
					}
					debug.timeString(battletag + " Page after request");
					gotHeroesCallback();
				}
			});

		},
	],function renderPage(err) {

		if (err) {
			console.log(err);
			getHeroes(battletag, req, res);
		}
		else {
			debug.timeString(battletag + " Page rendered");
			res.render('player.ejs', { ejs_btag : battletag , ejs_heroes : playersHeroes , ejs_grift_heroes : gRiftHeroes });
		}
	});
}




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