var request = require("request");
var express = require("express");
var fs = require("fs");
var jsdom = require("jsdom");
var http = require('https');

var heroes;

var app = express();
var date = new Date();

var apiKey = "y34m8hav4zpvrezvrs6xhgjh6uphqa5r";
var locale = "en_US";

console.log(date.getMinutes() +":"+ date.getSeconds());
app.get('/', function(req, res) {
	res.sendfile('default.html');

	date = new Date();
	console.log("Main Page "+ date.getMinutes() +":"+ date.getSeconds());
	
});

app.get('/get.js', function(req,res) {
	res.sendfile('get.js');
})

function getLeaderboards(diabloClass) {
	date = new Date();
	console.log("Barb Leaders before request "+ date.getMinutes() +":"+ date.getSeconds());
	request("http://us.battle.net/d3/en/rankings/era/1/rift-barbarian", function (error, response, body) {
		var startTable = body.indexOf("<table>");
		var endTable = body.indexOf("</table>");
		//get leaderboard table
		var table = body.substring(startTable,endTable);

		//env uses HTML or URL, [script, it will be JQuery], and callback function(error, window)
		jsdom.env(table, ["http://code.jquery.com/jquery.js"], function (error, window) {
			//allows normal JQuery usage
			var $ = window.jQuery;
			var battleTags = [];
			$('.battletag > a ').each(function() {
				//for each battletag, get the href, remove the last char "/" and remove the begging to get just the tag
				battleTags.push($(this).attr('href').substring(0,$(this).attr('href').length-1).replace("/d3/en/profile/",""));
			});
			//show all the battletags that have in leaderboards
			
			date = new Date();
			console.log("Barb Leaders "+ date.getMinutes() +":"+ date.getSeconds());
			return battleTags;
		});
		// res.end();
	});
}


app.get('/barbarian', function(req,res) {
	//get leaderboard page

	
	res.render('ClassLeaderboard.ejs', {title : "Barbarian" , ejs_battletags : getLeaderboards("barbarian") });
});

app.get('/barbarian/:battletag', function(req, res) {
	var requestURL = "https://us.api.battle.net/d3/profile/" + req.params.battletag + "/?locale="+locale+"&apikey=" + apiKey;
	
	date = new Date();
		console.log(req.params.battletag + " Page before request"+ date.getMinutes() +":"+ date.getSeconds());
	//...get JSON data
	request(requestURL, function (error, response, data) {
		//...parse it
		var jsonData = JSON.parse(data);
		//...get all heroes from jsonData and store it
		heroes = jsonData.heroes;
		res.render('player.ejs', { ejs_btag : req.params.battletag , ejs_heroes : heroes  });
		date = new Date();
		console.log(req.params.battletag + " Page "+ date.getMinutes() +":"+ date.getSeconds());
	});
});

app.get('/barbarian/:battletag/:heroID', function(req, res) {


	//..create url to get json data for that hero
	var heroData;
	var heroRequestURL = "https://us.api.battle.net/d3/profile/"+req.params.battletag+"/hero/"+req.params.heroID+"?locale="+locale+"&apikey="+apiKey;
	request(heroRequestURL, function (error, response, data) {

		heroData = JSON.parse(data);
		res.render('hero.ejs', {ejs_btag : req.params.battletag ,ejs_heroData : heroData})
		date = new Date();
		console.log(date.getMinutes() +":"+ date.getSeconds());
	});

});

app.get('/demon-hunter', function(req,res) {

	res.render('test.ejs', {title : "demon-hunter"});

});

app.get('/*' , function(req,res) {
	res.send("404");
});


app.listen(3000);
