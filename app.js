var async = require("async");
var express = require("express");
var mongo = require("mongodb");
var MongoClient = mongo.MongoClient;
var databaseURL = process.env.DBURL || "mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders";

var leaderboardMethods = require("./d3_modules/leaderboardMethods");
var playerMethods = require("./d3_modules/playerMethods");
var heroMethods = require("./d3_modules/heroMethods");
var render = require("./d3_modules/renderMethods")

var app = express();

var fileRouter = require("./routes/files.js");

app.use("/", fileRouter);


app.get("/", function(req, res) {
	res.sendfile("index.html");
});
//shows leaderboard page
app.get("/:region/:category/:diabloClass", function(req,res) {

	if (req.params.diabloClass !== "all") {
		render.leaderboardPage(req.params.region, req.params.diabloClass, req.params.category, req, res);
	}
	else {
		MongoClient.connect(databaseURL, function(err, db) {

			if (db) {
				render.getAllClasses(db, "us",req.params.category,req,res);
			}

			else {
				res.send("error connecting to db in all")
			}
		});
	}
});
//shows a player page, with heroes.
app.get("/player/:battletag", function(req,res) {
	render.getHeroes(req.params.battletag, req, res);
});
//shows a hero page
app.get("/player/:battletag/hero/:heroID", function(req, res) {
	render.heroPage(parseInt(req.params.heroID), req, res);
	// heroMethods.getImportantStats(parseInt(req.params.heroID));
});

app.get("/all/:category", function(req,res) {
	MongoClient.connect(databaseURL, function(err, db) {

		if (db) {
			render.getAllClasses(db, "us",req.params.category,req,res);
		}

		else {
			res.send("error connecting to db in all")
		}
	});
})

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
			async.series([

				function (callback) {
					playerMethods.addHeroData("us",req.params.battletag, parseInt(req.params.heroID), 50, db, callback);
				}
			 
			 ],function finished(err) {
				if (!err) {
					res.redirect("/player/"+req.params.battletag+"/hero/"+req.params.heroID);
				}
				else {
					console.log(err);
					return res.send("could not update player");
				}
			});
		}	
	});
});

app.get("/*" , function(req,res) {
	res.send("404");
});


app.listen(process.env.PORT || 3000);
