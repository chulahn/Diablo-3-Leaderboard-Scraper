app.get('/barbarian', function(req,res) {
	//get leaderboard page
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
			var locale = "en_US";
			res.render('ClassLeaderboard.ejs', {title : "Barbarian" , ejs_battletags : battleTags });

			//for each BattleTag on Leaderboard (replace 1 for battleTags.length)...
			for (i=0; i<2; i++) {
				var requestURL = "https://us.api.battle.net/d3/profile/" + battleTags[i] + "/?locale="+locale+"&apikey=" + apiKey;

				//...get JSON data
				request(requestURL, function (error, response, data) {
					//...parse it
					var jsonData = JSON.parse(data);
					//...get all heroes from jsonData and store it
					heroes = jsonData.heroes;

					//..for each hero that was stored for that BattleTag (replace 1 for heroes.length)...
					for (j=0; j<2; j++) {
						//..create url to get json data for that hero
						var heroRequestURL = "https://us.api.battle.net/d3/profile/"+battleTags[j]+"/hero/"+heroes[j].id+"?locale="+locale+"&apikey="+apiKey;
						request(heroRequestURL, function (error, response, data) {
							// res.render('test.ejs', {title : heroes});

							date = new Date();
							console.log(date.getMinutes() +":"+ date.getSeconds());

						});
					}//end for loop for each hero for current battleTag
				});
			}//end for loop for each battleTag
		});

		// res.end();
	});
});