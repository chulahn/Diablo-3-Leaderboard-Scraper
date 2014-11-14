var leaderboardMethods = require("./d3_modules/leaderboardMethods");
var playerMethods = require("./d3_modules/playerMethods");
var heroMethods = require("./d3_modules/heroMethods");
var render = require("./d3_modules/renderMethods")
var async = require("async");
var asyncMethods = require('./asyncMethods.js')

var express = require("express");
var app = express();

var mongo = require("mongodb");
var Db = mongo.Db;
var MongoClient = mongo.MongoClient;
var databaseURL = process.env.DBURL || "mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders";

app.get("/", function(req, res) {
	res.sendfile("index.html");
});

//shows leaderboard page
app.get("/:region/:category/:diabloClass", function(req,res) {
	render.leaderboardPage(req.params.region, req.params.diabloClass, req.params.category, req, res);
});
//shows a player page, with heroes.
app.get("/player/:battletag", function(req,res) {
	render.getHeroes(req.params.battletag, req, res);
});
//shows a hero page
app.get("/player/:battletag/hero/:heroID", function(req, res) {
	render.heroPage(parseInt(req.params.heroID), req, res);
	//getImportantStats(parseInt(req.params.heroID));
});


//update methods
//update leaderboard
app.get("/update/:region/:category/:diabloClass", function(req,res) {
	leaderboardMethods.getCurrentLeaderboard(req.params.region, req.params.diabloClass, req.params.category, req, res);
});
//update hero
app.get("/update/player/:battletag/hero/:heroID", function(req, res) {
	MongoClient.connect(databaseURL, function(err, db) {
		if (err) {
			return console.log(err);
		}
		else {
			playerMethods.addHeroData("us",req.params.battletag, parseInt(req.params.heroID), 50, db);
			res.redirect("/player/"+req.params.battletag+"/hero/"+req.params.heroID);
		}	
	});
});

//files
app.get("/d3functions.js", function(req,res) {
	res.sendfile("d3functions.js");
});
app.get("/styles/battletag.css", function(req,res) {
	res.sendfile("styles/battletag.css");
});
app.get("/styles/homepage.css", function(req,res) {
	res.sendfile("styles/homepage.css");
});
app.get("/styles/hero.css", function(req,res) {
	res.sendfile("styles/hero.css");
});
app.get("/styles/leaderboard.css", function(req,res) {
	res.sendfile("styles/leaderboard.css");
});

app.get("/images/hardcore.png", function(req,res) {
	res.sendfile("images/hardcore.png");
});
app.get("/images/seasonal.png", function(req,res) {
	res.sendfile("images/seasonal.png");
});

app.get("/images/barbarian-female.png", function(req,res) {
	res.sendfile("images/barbarian-female.png");
});
app.get("/images/barbarian-male.png", function(req,res) {
	res.sendfile("images/barbarian-male.png");
});

app.get("/images/crusader-female.png", function(req,res) {
	res.sendfile("images/crusader-female.png");
});
app.get("/images/crusader-male.png", function(req,res) {
	res.sendfile("images/crusader-male.png");
});

app.get("/images/demon-hunter-female.png", function(req,res) {
	res.sendfile("images/demon-hunter-female.png");
});
app.get("/images/demon-hunter-male.png", function(req,res) {
	res.sendfile("images/demon-hunter-male.png");
});

app.get("/images/monk-female.png", function(req,res) {
	res.sendfile("images/monk-female.png");
});
app.get("/images/monk-male.png", function(req,res) {
	res.sendfile("images/monk-male.png");
});

app.get("/images/witch-doctor-female.png", function(req,res) {
	res.sendfile("images/witch-doctor-female.png");
});
app.get("/images/witch-doctor-male.png", function(req,res) {
	res.sendfile("images/witch-doctor-male.png");
});

app.get("/images/wizard-female.png", function(req,res) {
	res.sendfile("images/wizard-female.png");
});
app.get("/images/wizard-male.png", function(req,res) {
	res.sendfile("images/wizard-male.png");
});
app.get("/images/legendary.png", function(req,res) {
	res.sendfile("images/legendary.png");
});




app.get("/*" , function(req,res) {
	res.send("404");
});


app.listen(process.env.PORT || 3000);
