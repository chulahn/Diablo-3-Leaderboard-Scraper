
var currentArray = allGRiftHeroes.slice(0,100);
//Data for setting up DPS/Toughness bar graph
var currentTop = 100;
var currentDataset = "dps";
var currentClass = currentArray[0].class;
var skillURLbase = "http://us.battle.net/d3/en/class/"+currentClass;

var globalData = {};
d3.select('#graph').style('width');

var statsd3 = {
	dimens: {
		h: parseInt(d3.select('#graph').style('height')),
		w: parseInt(d3.select('#graph').style('width')),
		barPad: 1,
		xPad: 60,
		yPad: 25
	},
	graph: null,
	tooltip: d3.tip()
				.attr('class', 'd3-statsTip')
				.offset([-10, 0])
				.html(function(d,i) {
					var rankAndBTag = (i+1)+"."+"<span class=\"btag\">"+d.battletag+"</span>";
					var dpsString = "DPS:<span class=\"damage\">"+d.stats.damage+"</span>";
					var toughnessString = "Toughness:<span class=\"damage\">"+d.stats.toughness+"</span>";

					var element = d.extraItemData && d.extraItemData.elementalDam[0][0];
					var elementInc = d.extraItemData && d.extraItemData.elementalDam[0][1];
					var elementalString = "<span class="+element.toLowerCase()+">" + element + " DPS:" + (d.stats.damage * (1+(elementInc/100))).toFixed(0) + "</span>";

					var completeString = rankAndBTag+"<br />"+
							dpsString+"<br />"+
							toughnessString;
							
					if (elementInc > 0 && element !== undefined) {
						completeString += "<br />"+elementalString;
					}

					return completeString;
				})
};

var itemsd3 = {
	dimens: {
		h: parseInt(d3.select('#graph').style('height'))*.75,
		w: parseInt(d3.select('#graph').style('width'))*.75
	},
	graph: null,
	data: null,
	tooltip: null,
	data: {
		//resetItemData sets names=all[0],count=all[1]
		//names[i] = "The Furnace" , count[i] = number of Furnaces
		all: [[],[]],
		names: null,
		count: null,
		total: 0
	}
};

var skillsd3 = {
	graph: null,
	dimens: {
		h: parseInt(d3.select('#graph').style('height'))*.75,
		w: parseInt(d3.select('#graph').style('width'))*.75
	},
	data: {
		//names[0]="Earthquake", count[0]=50 (earthquake users)
		//runeNames[0] = ["Molten Fury", "Cave In"], runeCount[0] = [25, 25]
		active : {
			all: [ [], [], [], [] ],
			names: null,
			count: null,
			total: 0,
			runeNames : null,
			runeCount : null
		},
	
		passive : {
			all: [ [], [] ],
			names: null,
			count: null,
			total: 0
		}
	}
};

var gemsd3 = {
	dimens: {
		h: parseInt(d3.select('#graph').style('height'))*.75,
		w: parseInt(d3.select('#graph').style('width'))*.75
	},
	graph: null,
	tooltip: null,
	data: {
		all : [ [], []],
		names: null,
		count: null,
		total: 0
	}
};

/*
	Initializes graphs so data can be added and visualized.
*/
function initGraphs() {
	statsd3.graph = d3.select("#mainStatsDiv")
				.append("svg")
				.attr("height", statsd3.dimens.h)
				.attr("width", statsd3.dimens.w)
				.call(statsd3.tooltip);

	skillsd3.graph = d3.select("#skillGraphDiv")
				.append("svg")
				.attr("height", skillsd3.dimens.h)
				.attr("width" , skillsd3.dimens.w);

	itemsd3.graph = d3.select("#itemGraphDiv")
				.append("svg")
				.attr("height", itemsd3.dimens.h)
				.attr("width" , itemsd3.dimens.w);

	gemsd3.graph = d3.select("#gemGraphDiv")
				.append("svg")
				.attr("height", gemsd3.dimens.h)
				.attr("width" , gemsd3.dimens.w);


	itemsd3.tooltip = d3.tip().attr('class', 'd3-tip').html(function(d,i) {
		var items = itemsd3.data
		return items.names[i]+" ("+items.count[i]+")";
	});

	console.log(gemsd3)

	if (gemsd3.data != undefined) 
	gemsd3.tooltip = d3.tip().attr('class', 'd3-tip').html(function(d,i) {
		var gems = gemsd3.data;
		console.log(gems);
		var gemName = (gems && gems.names[i]) || "None";
		var gemCount = (gems && gems.count[i]) || "None";
		return gemName+" ("+gemCount+")";
	});
}


/*
	Draw methods
	
	drawStatGraph: draws graph based on how many heroes to show and DPS/toughness/etc
	Others: draws piechart based on global data that was set in Set methods
*/
function drawStatGraph(currentTop, currentDataset) {
	currentArray = allGRiftHeroes.slice(0,currentTop);

	statsd3.graph.selectAll('.enter').attr("class", "exit").remove();

	var xScale = d3.scale.linear()
					.domain([0, currentArray.length])
					.range([statsd3.dimens.xPad, statsd3.dimens.w - statsd3.dimens.xPad]);
	var yScale = d3.scale.linear()
					.domain([0, d3.max(currentArray, function(d) { 	
						return getY(d, currentDataset);		
					})])
					//top, bottom
					.range([statsd3.dimens.h - 0, 0]);
					//.range([statsd3.dimens.h - statsd3.dimens.yPad, statsd3.dimens.yPad]);

	var xAxis = d3.svg.axis()
					.scale(xScale)
					.orient("bottom")
					.ticks(5);
	var yAxis = d3.svg.axis()
					.scale(yScale)
					.orient("left")
					.ticks(5);

	//add bars and links
	statsd3.graph
		.selectAll("rect")
		.data(currentArray)
		.enter()
		.append("a").attr('xlink:href', function(d,i) {
			return "#"+(i+1);
		})
		.append("rect")
		.attr("x" , function(d,i) {
			return xScale(i); 
		})
		.attr("y" , function(d) { 
			return yScale(getY(d, currentDataset));
		})
		//width of one bar is (widthOfGraph / # of datapoints) - spaceInBetweenBars
		.attr("width", (statsd3.dimens.w-(2*statsd3.dimens.xPad)) / currentArray.length - statsd3.dimens.barPad)
		.attr("height", function(d) {
			// if (d == null || d == 0) {
			// 	return 0;
			// }
			// else {
				var barHeight = statsd3.dimens.h - yScale(getY(d, currentDataset)) - statsd3.dimens.yPad ;

				if (barHeight <= 0) {
					return 0;
				}
				else {
					return barHeight;
				}
			// }	
		})
		.attr("class" , function(d,i) {
			//dont show colors if not in elem, or no item data
			if ((currentDataset !== "elemDps" && currentDataset !== "eliteElemDps") || d.extraItemData === undefined) {
				return "enter bar none"
			}
			else {
				var elementStats = d.extraItemData.elementalDam[0];
				//only show color if player has element boost
				if (elementStats[1] !== 0) {
					var element = (d.extraItemData.elementalDam[0][0]).toLowerCase();
					return "enter bar " + element;
				}

				else {
					return "enter bar none";
				}

			}

		})
		.on('mouseover', statsd3.tooltip.show)
		.on('mouseout', statsd3.tooltip.hide);
	//add xAxis
	statsd3.graph.append("g")
		.attr("class", "enter axis")
		.attr("transform", "translate(0," + (statsd3.dimens.h-statsd3.dimens.yPad) + ")")
		.call(xAxis);
	//add yAxis
	statsd3.graph.append("g")
		.attr("class", "enter axis")
		.attr("transform", "translate(" + statsd3.dimens.xPad+", " + (-1 * statsd3.dimens.yPad) + ")")
		//.attr("transform", "translate("+statsd3.dimens.xPad+", 0)")
		.call(yAxis);	

	/* 
		Helper method for drawStatGraph to know what Y value to return based on currentDataSet(dps/toughness/elemDps)
	*/
	function getY(d, currentDataset) {
		if (d == null || d == 0) {
			return 0;
		}
		else {
			switch(currentDataset) {
				case "dps":
					return d.stats.damage;
					break;
				case "toughness":
					return d.stats.toughness;
					break;
				case "elemDps":
					var elem = (d.extraItemData && d.extraItemData.elementalDam[0][1]) || 0;
					return d.stats.damage * (1 + (elem/100));
					break;
				case "eliteElemDps":
					var elem = (d.extraItemData && d.extraItemData.elementalDam[0][1]) || 0;
					var elite = (d.extraItemData && d.extraItemData.eliteDam) || 0;
					return d.stats.damage * (1 + (elem/100)) * (1 + (elite/100));
					break;
			}
		}
	}
}

function drawPie(string) {

	var data;
	var graph;
	var dimens;
	var tooltip;

	switch (string) {
		case "items":
			data = itemsd3.data;
			graph = itemsd3.graph;
			dimens = itemsd3.dimens;
			tooltip = itemsd3.tooltip;
			break;

		case "gems":
			data = gemsd3.data;
			graph = gemsd3.graph;
			dimens = gemsd3.dimens;
			tooltip = gemsd3.tooltip;
			break;

	}

	graph.selectAll('.enter').attr("class", "exit").remove();

	var pie = d3.layout.pie();
	var outerRadius = dimens.h / 2 ;
	var innerRadius = 0;
	var arc = d3.svg.arc()
				.innerRadius(innerRadius)
				.outerRadius(outerRadius);
	var color = d3.scale.category10();
	var arcs = graph.selectAll("g.arc")
					.data(pie(data.count))
					.enter()
					.append("g")
					.attr("class", "arc enter")
					.attr("transform", "translate(" + dimens.w * .5 + ", " + outerRadius + ")")

	arcs.append("path")
		.attr("fill", function(d, i) {
			return color(i)
		})
		.attr("d", arc)
	    .attr("class", "enter");

	arcs.append("text")
	    .attr("transform", function(d) {
	        return "translate(" + arc.centroid(d) + ")";
	    })
	    .attr("text-anchor", "middle")
	    .attr("class", "enter")
	    .html(function(d, i) {
	    	var itemPercentage = ((d.value/data.total)*100).toFixed(0);
	    	var percentageString = itemPercentage + "% ";
	    	
	        if (itemPercentage > 20) {
	        	
	        	return percentageString + getShortenedName(data.names[i]);

	        }
	        else if (itemPercentage > 2) {
	        	return percentageString;
	        }
	    });

	arcs.call(tooltip);
	arcs.on("mouseover", tooltip.show)
		.on("mouseout", tooltip.hide);

	function getShortenedName(fullName) {

		switch(fullName) {
			case "Bane Of the Powerful":
				return "Powerful";
				break;
			case "Bane Of the Trapped":
				return "Trapped";
				break;
			case "Gem of Efficacious Toxin":
				return "Toxin";
				break;
			case "No Gems":
				return "No Gems";
				break;

			case "Ring of Royal Grandeur":
				return "RoRG";
				break;

			case "Stone of Jordan":
				return "SoJ";
				break;

			default:
				var findSpace = fullName.indexOf(" ");
				if (findSpace !== -1) {
					var firstWord = fullName.slice(0,findSpace);
					firstWord = firstWord.replace(",","");

					
					if (firstWord !== "The") {
						return firstWord;
					}

					//the furnace, remove first word
					//if ther are more than one word, remove them.
					else {
						var removedFirst = fullName.substring(findSpace+1, fullName.length);
						var findSpace = removedFirst.indexOf(" ");
						if (findSpace !== -1) {
							removedAll = removedFirst.substring(0, findSpace);
							return removedAll;
						}
						else {
							return removedFirst;
						}

					}
				}
				else {
					return fullName;
				}

		}
	}		
}


function drawActivePie() {
	var active = skillsd3.data.active;
	var skillsPieChart = skillsd3.graph;
	skillsPieChart.selectAll('.enter').attr("class", "exit").remove();

	var pie = d3.layout.pie();
	var outerRadius = skillsd3.dimens.h / 2 ;
	var innerRadius = 0;
	var arc = d3.svg.arc()
				.innerRadius(innerRadius)
				.outerRadius(outerRadius);
	var color = d3.scale.category20();

	var arcs = skillsPieChart.selectAll("g.arc")
					.data(pie(active.count))
					.enter()
					.append("a").attr('xlink:href', function(d,i) {
						return skillURLbase + "/active/" + active.names[i].toLowerCase().replace(" " , "-"); 
					})
					.append("g")
					.attr("class", "arc enter")
					.attr("transform", "translate(" + skillsd3.dimens.w * .5 + ", " + outerRadius + ")")

	arcs.append("path")
		.attr("fill", function(d, i) {
			return color(i)
		})
		.attr("d", arc)
	    .attr("class", "enter");

	arcs.append("text")
	    .attr("transform", function(d) {
	        return "translate(" + arc.centroid(d) + ")";
	    })
	    .attr("text-anchor", "middle")
	    .attr("class", "enter")
	    .html(function(d, i) {
	    	var skillPercentage = (active.count[i]/active.total*100).toFixed(0)
	    	if (skillPercentage > 7) {
		    	return skillPercentage+"%";
	    	}
	    	if (skillPercentage > 2) {
	    		return skillPercentage;
	    	}
	    });

	var activeSkillsTooltip = d3.tip().attr('class', 'd3-tip').html(function(d,i) {
		
		var activeTooltipString = "<span class=\"skillName\">" + active.names[i]+"</span> ("+active.count[i]+")<br /><br />";

		//runeName[i] is an array of Runes for that skill
		var allRunesForSkill = active.runeNames[i]; 
		var runeCountsForSkill = active.runeCount[i];

		//get runes and count for skill
		allRunesForSkill.forEach(function(rune) {
			var runeCount = runeCountsForSkill[allRunesForSkill.indexOf(rune)];
			var runePercentage = ((runeCount / active.count[i])*100).toFixed(0) + "% ";
			activeTooltipString += runePercentage + rune + " (" + runeCount + ")<br />";
		});
		return activeTooltipString;
	});
	arcs.call(activeSkillsTooltip);
	arcs.on("mouseover", activeSkillsTooltip.show)
		.on("mouseout", activeSkillsTooltip.hide);
}
function drawPassivePie() {
	var passive = skillsd3.data.passive;
	var skillsPieChart = skillsd3.graph;

	skillsPieChart.selectAll('.enter').attr("class", "exit").remove();

	var pie = d3.layout.pie();
	var outerRadius = skillsd3.dimens.h / 2 ;
	var innerRadius = 0;
	var arc = d3.svg.arc()
				.innerRadius(innerRadius)
				.outerRadius(outerRadius);
	var color = d3.scale.category20();

	var arcs = skillsPieChart.selectAll("g.arc")
					.data(pie(passive.count))
					.enter()
					.append("a").attr('xlink:href', function(d,i) {
						return skillURLbase + "/passive/" + passive.names[i].toLowerCase().replace(" " , "-"); 
					})
					.append("g")
					.attr("class", "arc enter")
					.attr("transform", "translate(" + skillsd3.dimens.w * .5 + ", " + outerRadius + ")")

	arcs.append("path")
		.attr("fill", function(d, i) {
			return color(i)
		})
		.attr("d", arc)
	    .attr("class", "enter");

	arcs.append("text")
	    .attr("transform", function(d) {
	        return "translate(" + arc.centroid(d) + ")";
	    })
	    .attr("text-anchor", "middle")
	    .attr("class", "enter")
	    .html(function(d, i) {
	    	var skillPercentage = (passive.count[i]/passive.total*100).toFixed(0)
	    	if (skillPercentage > 7) {
		    	return skillPercentage+"%";
	    	}
	    	if (skillPercentage > 2) {
	    		return skillPercentage;
	    	}
	    });

	var passiveTooltip = d3.tip().attr('class', 'd3-tip').html(function(d,i) {
		
		var passiveString = "<span class=\"skillName\">" + passive.names[i]+"</span> ("+passive.count[i]+")";

		return passiveString;
	});
	arcs.call(passiveTooltip);
	arcs.on("mouseover", passiveTooltip.show)
		.on("mouseout", passiveTooltip.hide);
}

/*	
	Reset methods.  
	Helper method used in Set methods.

	Initializes and resets data(skillsd3.data) that will be used in the skillGraph(skillsd3.graph)
*/
function resetData(category) {
	var data;
	var active;
	switch(category) {
		case "gems":
			data = gemsd3.data;
			break;
		case "items":
			data = itemsd3.data;
			break;
		case "skills":
			data = skillsd3.data.passive;
			active = skillsd3.data.active;
			break;
	}

	data.all = [[],[]];
	data.names = data.all[0];
	data.count = data.all[1];
	data.total = 0;

	if (active !== undefined) {
		active.all = [ [], [], [], [] ];
		active.names = active.all[0];
		active.count = active.all[1];
		active.runeNames = active.all[2];
		active.runeCount = active.all[3];
	 	active.total = 0;
	}
}

/*
	Set methods.  
	After reading Data, set data global variables(itemsd3.data, skillsd3.data)
	Data is API response that is stored in heroCollection.

	getTopSkills: Get active skills+runes and passives for each player's hero.
	getTopItems: Get item(head, torso, etc..) for each hero.
*/
function getTopSkills() {
	resetData("skills");

	var active = skillsd3.data.active;
	var passive = skillsd3.data.passive;
	

 	allGRiftHeroes.forEach(function (currentHero) {

 		if (currentHero.skills != undefined) {
 			//add active skills for graph
	 		var currentHeroActiveSkills = currentHero.skills.active;
	 		currentHeroActiveSkills.forEach(function (currentActive) {
	 			if (currentActive.skill != undefined) {
		 			var currentSkillName = currentActive.skill.name;
		 			var currentRuneName;
		 			//set rune name
		 			if (currentActive.rune == undefined) {
		 				currentRuneName = "No Rune";
		 			}
		 			else {
			 			currentRuneName = currentActive.rune.name;
		 			}

		 			//check if skill has been added
		 			var locationOfCurrentActive = active.names.indexOf(currentSkillName);
		 			if (locationOfCurrentActive == -1) {
		 				active.names.push(currentSkillName);
		 				active.count.push(1);

		 				active.runeNames.push([currentRuneName]);
		 				active.runeCount.push([1]);
		 				active.total += 1;
		 			}
		 			else {
		 				active.count[locationOfCurrentActive] += 1;
		 				active.total += 1;
		 				//check if rune was already added.
		 				var runesForCurrentSkill = active.runeNames[locationOfCurrentActive]
		 				var runeCountForCurrentSkill = active.runeCount[locationOfCurrentActive];

		 				var locationOfCurrentRune = runesForCurrentSkill.indexOf(currentRuneName);
		 				if (locationOfCurrentRune == -1) {
		 					runesForCurrentSkill.push(currentRuneName);
		 					runeCountForCurrentSkill.push(1);
		 				}
		 				else {
		 					runeCountForCurrentSkill[locationOfCurrentRune] += 1;
		 				}
		 			}
	 			}
	 		});//finished adding active skills and runes

			//add passive
			var currentHeroPassives = currentHero.skills.passive;
			currentHeroPassives.forEach(function (currentPassive) {
				if (currentPassive.skill != undefined) {
					var currentPassiveName = currentPassive.skill.name;
					var locationOfCurrentPassive = passive.names.indexOf(currentPassiveName);
					if (locationOfCurrentPassive == -1) {
		 				passive.names.push(currentPassiveName);
		 				passive.count.push(1);
		 				passive.total += 1;
		 			}
		 			else {
		 				passive.count[locationOfCurrentPassive] += 1;
		 				passive.total += 1;
		 			}
				}
			});
 		}
 	});
}
function getTopItems(item) {
	resetData("items");
	var items = itemsd3.data;

	allGRiftHeroes.forEach(function (currentHero) {

		var currentItem = (currentHero.items && currentHero.items[item]);
		if (currentItem != undefined) {
			var locationOfCurrentItem = items.names.indexOf(currentItem.name);
			if (locationOfCurrentItem == -1) {
				items.names.push(currentItem.name);
				items.count.push(1);
				items.total += 1;
			}
			else {
				items.count[locationOfCurrentItem] += 1;
				items.total += 1;
			}
		}
	})
}
function getTopGems() {
	resetData("gems");
	var gems = gemsd3.data;

	allGRiftHeroes.forEach(function (currentHero) {

		var currentItems = (currentHero.items);

		if (currentHero.extraItemData && currentHero.extraItemData.gems !== undefined) {

			var currentGems = currentHero.extraItemData.gems;
			
			currentGems.forEach(function(gem) {

				var gemLocation = gems.names.indexOf(gem);

				if (gemLocation === -1) {
					gems.names.push(gem);
					gems.count.push(1);
					gems.total += 1;
				}
				else {
					gems.count[gemLocation] += 1;
					gems.total += 1;
				}
			})
		}
		else {
			// console.log(currentHero,"had no gem")
		}
	});

	console.log(gems.names);
	if (gems.names[0] == undefined) {
		gems.names.push("No Gems");
		gems.count.push(1);
		gems.total += 1;
	}
}

function createItemNav() {
	//used in itemPicker div
	var itemStrings = ["shoulders", "head", "neck", "hands", "torso", "bracers", "leftFinger", "waist", "rightFinger", "mainHand", "legs", "offHand", "feet"];

	var itemPickerHTML = "";
	itemPickerHTML += "<a href=\"#\" class=\"gem\">GEMS</a><br/>";
	
	$.each(itemStrings , function(index, item){
		if (itemStrings.indexOf(item) != itemStrings.length-1) {
			itemPickerHTML += "<a href=\"#\" class=\"items\" id="+item+">"+item+"</a> ";
			if ((itemStrings.indexOf(item) % 3) == 2) {
				itemPickerHTML += "<br />";
			}
		}
		else {
			itemPickerHTML += "<a href=\"#\" class=\"items\" id="+item+">"+item+"</a>";
		}
	});

	$('#itemPicker').append(itemPickerHTML);


}


$(document).ready(function() {

	createItemNav();

	$('#itemPicker').hide();
	$('#itemGraphDiv').hide();
	$('#skillGraphDiv').hide();
	$('#gemGraphDiv').hide();

	$('.items').each(function () {
		$(this).click(function() {
			var clickedItem = $(this).attr('id');
			getTopItems(clickedItem);
			// drawItemPie();
			drawPie("items")
			$('#statSpan').removeClass('selected');
			$('.currentGraph').removeClass('currentGraph');
			$(this).addClass('currentGraph');
			$('#mainStatsDiv').hide();
			$('#skillGraphDiv').hide();
			$('#gemGraphDiv').hide();
			$('#itemGraphDiv').show();
		})
	});

	$('.gem').click(function (){

		// drawGemPie();
		drawPie("gems");
		$('.currentGraph').removeClass('currentGraph');
		$(this).addClass('currentGraph');
		$('#mainStatsDiv').hide();
		$('#skillGraphDiv').hide();
		$('#itemGraphDiv').hide();
		$('#gemGraphDiv').show();
	})

	getTopSkills();
	getTopItems("head");
	getTopGems();

	initGraphs();

	drawStatGraph(currentTop, currentDataset);


});

/* 
	Creating click handler.  Show more options on click if not statBarGraph; else hide
*/
$('#graphChooser span').each(function () {
	var spanID = $(this).attr('id');
	var clickedNav = $('#'+spanID.replace("Span", "Picker"))

	$(this).click(function() {
		$(this).toggleClass('selected');

		if ($(this).attr('class') == "selected") {
			clickedNav.show();	
		}
		else {
			clickedNav.hide();
		}
	});	
});

$('#skillPicker a').each(function () {
	var id = $(this).attr('id');
	
	$(this).click(function() {
		$('#mainStatsDiv').hide();
		$('#itemGraphDiv').hide();
		$('.currentGraph').removeClass('currentGraph');
		$(this).addClass('currentGraph');
		if (id == "primary") {
			drawActivePie();
		}
		else {
			drawPassivePie();
		}
		$('#skillGraphDiv').show();
	});
});