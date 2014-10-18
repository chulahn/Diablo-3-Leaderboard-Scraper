var exports = module.exports = {};
var request = require("request");
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

//localhost:3000/player/:battletag/hero/:heroID
//for a given heroID, it gets hero's stats, skills and items
exports.getHeroDetails = function(heroID, req, res) {
	// console.log("https://" + region + apiURL + "/profile/" + battletag + "/?locale=" + locale + "&apikey=" + apiKey  );
	var heroRequestURL = "https://" + region + apiURL + "/profile/" +req.params.battletag+"/hero/"+heroID+"?locale="+locale+"&apikey="+apiKey;

	date = new Date();
	console.log(heroID + " Page before request"+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());

	request(heroRequestURL, function (error, response, data) {
		//string to json
		var heroData = JSON.parse(data);
		var heroItems = heroData.items;
		if (heroData.level == 70) {
			getItemIDsFromHero(heroItems,heroID,10);
		}
		res.render('hero.ejs', {ejs_btag : req.params.battletag ,ejs_heroData : heroData, ejs_itemData : heroItems})
		date = new Date();
		console.log(heroID + " Page after request"+ date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
	});
}


function getItemIDsFromHero(heroItems, heroID, delay) {
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
		updateItemDB(itemID, heroID, delay);
		delay = delay + 100;
		i++;
	});
}

function updateItemDB(itemID, heroID, delay){
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
						updateItemDB(itemID,heroID,delay+1000);
					}
					else{
						console.log(delay + " updateItemDB inrequest " +currentItem.name);
						(function(currentItem) {
							itemCollection.find({"itemID" : currentItem.tooltipParams.replace("item/","")}).toArray(function(err, result) {
								console.log("finding " + currentItem.tooltipParams.replace("item/","").substring(0,5) + " " + currentItem.name)
								if (result.length != 1) {
									itemCollection.insert({"itemID" : currentItem.tooltipParams.replace("item/",""), "Name" : currentItem.name, "Affixes" : currentItem.attributes, "Random Affixes" : currentItem.randomAffixes, "Gems" : currentItem.gems, "Socket Effects" : currentItem.socketEffects, "Hero" : parseInt(heroID)}, function(err, result) {
										console.log("updateItemDB successfully inserted " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5));
									});
								}
								else {
									console.log("updateItemDB already in database " + currentItem.name + " " + currentItem.tooltipParams.replace("item/","").substring(0,5) + " " + i);
								}
							});//end find in colleciton
						})(currentItem);//end self-invoking function
					}				
				});//end request
			},delay);//end settimeout
		}//end if successfully in db
	});
}
