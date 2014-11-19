var currentArray = allData.slice(0,100);
//Data for setting up DPS/Toughness bar graph
var currentTop = 100;
var currentDataset = "dps";
var currentClass = currentArray[0].class;
var skillURLbase = "http://us.battle.net/d3/en/class/"+currentClass;

var globalData = {};

var statsGraphData = {
	h: 300,
	w: 700,
	barPad: 1,
	xPad: 60,
	yPad: 25
};

var statsd3 = {
	graph: d3.select("#mainStatsDiv")
				.append("svg")
				.attr("height", statsGraphData.h)
				.attr("width", statsGraphData.w),
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
				}),
};
statsd3.graph.call(statsd3.tooltip);


var itemPieData = {
	h: 200,
	w: 200
};
var itemsd3 = {
	graph: d3.select("#itemGraphDiv")
				.append("svg")
				.attr("height", itemPieData.h)
				.attr("width" , itemPieData.w),

};
//Data for setting up item pie chart
var allItems = [[],[]];
var itemName = allItems[0];
var itemCount = allItems[1];
var itemTotal = 0;



//Data for setting up skills pie chart
var	allActiveSkills = [ [], [], [], [] ];
var activeSkillNames = allActiveSkills[0];
var activeSkillCount = allActiveSkills[1];
var activeSkillTotal = 0;
var	runeNames = allActiveSkills[2];
var	runeCount = allActiveSkills[3]; 
var allPassiveSkills = [[],[]];
var passiveSkillsName = allPassiveSkills[0];
var passiveSkillsCount = allPassiveSkills[1];
var passiveSkillTotal = 0;

var skillsPieChartHeight = 200, skillsPieChartWidth = 400;
var skillsPieChart = d3.select("#skillGraphDiv")
	.append("svg")
	.attr("height", skillsPieChartHeight)
	.attr("width" , skillsPieChartWidth);


fromTopHeroesGetSkills();
createActiveSkillPie();

function createActiveSkillPie() {
	skillsPieChart.selectAll('.enter').attr("class", "exit").remove();

	var pie = d3.layout.pie();
	var outerRadius = skillsPieChartHeight / 2 ;
	var innerRadius = 0;
	var arc = d3.svg.arc()
				.innerRadius(innerRadius)
				.outerRadius(outerRadius);
	var color = d3.scale.category20();

	var arcs = skillsPieChart.selectAll("g.arc")
					.data(pie(activeSkillCount))
					.enter()
					.append("a").attr('xlink:href', function(d,i) {
						return skillURLbase + "/active/" + activeSkillNames[i].toLowerCase().replace(" " , "-"); 
					})
					.append("g")
					.attr("class", "arc enter")
					.attr("transform", "translate(" + 200 + ", " + outerRadius + ")")

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
	    	var skillPercentage = (activeSkillCount[i]/activeSkillTotal*100).toFixed(0)
	    	if (skillPercentage > 7) {
		    	return skillPercentage+"%";
	    	}
	    	if (skillPercentage > 2) {
	    		return skillPercentage;
	    	}
	    });

	var activeSkillsTooltip = d3.tip().attr('class', 'd3-tip').html(function(d,i) {
		
		var activeTooltipString = "<span class=\"skillName\">" + activeSkillNames[i]+"</span> ("+activeSkillCount[i]+")<br /><br />";

		//runeName[i] is an array of Runes for that skill
		var allRunesForSkill = runeNames[i]; 
		var runeCountsForSkill = runeCount[i];

		//get runes and count for skill
		allRunesForSkill.forEach(function(rune) {
			var runeCount = runeCountsForSkill[allRunesForSkill.indexOf(rune)];
			var runePercentage = ((runeCount / activeSkillCount[i])*100).toFixed(0) + "% ";
			activeTooltipString += runePercentage + rune + " (" + runeCount + ")<br />";
		});
		return activeTooltipString;
	});
	arcs.call(activeSkillsTooltip);
	arcs.on("mouseover", activeSkillsTooltip.show)
		.on("mouseout", activeSkillsTooltip.hide);
}

function createPassivePie() {
	skillsPieChart.selectAll('.enter').attr("class", "exit").remove();

	var pie = d3.layout.pie();
	var outerRadius = skillsPieChartHeight / 2 ;
	var innerRadius = 0;
	var arc = d3.svg.arc()
				.innerRadius(innerRadius)
				.outerRadius(outerRadius);
	var color = d3.scale.category20();

	var arcs = skillsPieChart.selectAll("g.arc")
					.data(pie(passiveSkillCount))
					.enter()
					.append("a").attr('xlink:href', function(d,i) {
						return skillURLbase + "/passive/" + passiveSkillNames[i].toLowerCase().replace(" " , "-"); 
					})
					.append("g")
					.attr("class", "arc enter")
					.attr("transform", "translate(" + 200 + ", " + outerRadius + ")")

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
	    	var skillPercentage = (passiveSkillCount[i]/passiveSkillTotal*100).toFixed(0)
	    	if (skillPercentage > 7) {
		    	return skillPercentage+"%";
	    	}
	    	if (skillPercentage > 2) {
	    		return skillPercentage;
	    	}
	    });

	var passiveTooltip = d3.tip().attr('class', 'd3-tip').html(function(d,i) {
		
		var passiveString = "<span class=\"skillName\">" + passiveSkillNames[i]+"</span> ("+passiveSkillCount[i]+")";

		return passiveString;
	});
	arcs.call(passiveTooltip);
	arcs.on("mouseover", passiveTooltip.show)
		.on("mouseout", passiveTooltip.hide);
}

//used in itemPicker div
var itemStrings = ["shoulders", "head", "neck", "hands", "torso", "bracers", "leftFinger", "waist", "rightFinger", "mainHand", "legs", "offHand", "feet"];	

/*
	Get active skills and runes for each player.
*/
function fromTopHeroesGetSkills() {
	//reset values.  
	allActiveSkills = [ [], [], [], [] ];
	activeSkillNames = allActiveSkills[0];
	activeSkillCount = allActiveSkills[1];
	runeNames = allActiveSkills[2];
	runeCount = allActiveSkills[3]; 
 	activeSkillTotal = 0;
	
	allPassiveSkills = [[],[]];
	passiveSkillNames = allPassiveSkills[0];
	passiveSkillCount = allPassiveSkills[1];
	passiveSkillTotal = 0;
	

 	allData.forEach(function (currentPlayer) {

 		if (currentPlayer.skills != undefined) {
 			//add active skills for graph
	 		var currentPlayerActiveSkills = currentPlayer.skills.active;
	 		currentPlayerActiveSkills.forEach(function (currentActive) {
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
		 			var locationOfCurrentActive = activeSkillNames.indexOf(currentSkillName);
		 			if (locationOfCurrentActive == -1) {
		 				activeSkillNames.push(currentSkillName);
		 				activeSkillCount.push(1);

		 				runeNames.push([currentRuneName]);
		 				runeCount.push([1]);
		 				activeSkillTotal += 1;
		 			}
		 			else {
		 				activeSkillCount[locationOfCurrentActive] += 1;
		 				activeSkillTotal += 1;
		 				//check if rune was already added.
		 				var runesForCurrentSkill = runeNames[locationOfCurrentActive]
		 				var runeCountForCurrentSkill = runeCount[locationOfCurrentActive];

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
			var currentPlayerPassives = currentPlayer.skills.passive;
			currentPlayerPassives.forEach(function (currentPassive) {
				if (currentPassive.skill != undefined) {
					var currentPassiveName = currentPassive.skill.name;
					var locationOfCurrentPassive = passiveSkillNames.indexOf(currentPassiveName);
					if (locationOfCurrentPassive == -1) {
		 				passiveSkillNames.push(currentPassiveName);
		 				passiveSkillCount.push(1);
		 				passiveSkillTotal += 1;
		 			}
		 			else {
		 				passiveSkillCount[locationOfCurrentPassive] += 1;
		 				passiveSkillTotal += 1;
		 			}
				}
			});
 		}
 	});
}

/* 
	Helper method for createGraph to know what Y value to return.
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

/*
	Deletes previous graph and creates new graph on how many heroes to show and DPS/toughness
*/
function createGraph(currentTop, currentDataset) {
	currentArray = allData.slice(0,currentTop);
		// d3.selectAll('.enter').attr("class", "exit").exit().transition().remove();

	statsd3.graph.selectAll('.enter').attr("class", "exit").remove();

	var xScale = d3.scale.linear()
					.domain([0, currentArray.length])
					.range([statsGraphData.xPad, statsGraphData.w - statsGraphData.xPad]);
	var yScale = d3.scale.linear()
					.domain([0, d3.max(currentArray, function(d) { 	
						return getY(d, currentDataset);		
					})])
					.range([statsGraphData.h - statsGraphData.yPad, statsGraphData.yPad]);

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
		.attr("width", (statsGraphData.w-(2*statsGraphData.xPad)) / currentArray.length - statsGraphData.barPad)
		.attr("height", function(d) {
			// if (d == null || d == 0) {
			// 	return 0;
			// }
			// else {
				return statsGraphData.h-yScale(getY(d, currentDataset))-statsGraphData.yPad;
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
		.attr("transform", "translate(0," + (statsGraphData.h-statsGraphData.yPad) + ")")
		.call(xAxis);
	//add yAxis
	statsd3.graph.append("g")
		.attr("class", "enter axis")
		.attr("transform", "translate("+statsGraphData.xPad+", 0)")
		.call(yAxis);	
}

/*
	Helper method used in createItemPie
	Get and count the item(head, torso, etc..) that players are using and sets allItems, itemTotal. 
*/
function fromTopHeroesGetItem(item) {
	//reset values
	allItems = [[],[]];
	itemName = allItems[0];
	itemCount = allItems[1];
 	itemTotal = 0;

	allData.forEach(function (currentPlayer) {

	// for(i=0; i<allData.length; i++) {
		var currentItem = (currentPlayer.items && currentPlayer.items[item]);
		if (currentItem != undefined) {
			var locationOfCurrentItem = itemName.indexOf(currentItem.name);
			if (locationOfCurrentItem == -1) {
				itemName.push(currentItem.name);
				itemCount.push(1);
				itemTotal += 1;
			}
			else {
				itemCount[locationOfCurrentItem] += 1;
				itemTotal += 1;
			}
		}
	// }
	})
}

/* 
	Helper method used in createItemPie
	Returns a string that will fit the pieChart.

*/
function getShortenedItemName(currentItemName, itemPercentage) {
	var percentageString = itemPercentage + "% ";

	if (currentItemName == "Ring of Royal Grandeur") {
		return percentageString + "RoRG";
	}
	if (currentItemName == "Stone of Jordan") {
		return percentageString + "SoJ";
	}

	//If item name is more than one word, get the first word.
	var findSpace = currentItemName.indexOf(" ");
	if (findSpace != -1) {
		var newItemName = currentItemName.substring(0, findSpace);
		//if the first word is not "The", return
		if (newItemName != "The") {
			return percentageString + newItemName;
		}
		//Trim the first word from itemString.  Check if there are more than two words
		//If so, trim all words after the second, and return.
		//else return second word
		else {
			newItemName = currentItemName.substring(findSpace+1, currentItemName.length);
			findSpace = newItemName.indexOf(" ");
			if (findSpace != -1) {
				newItemName = newItemName.substring(0, findSpace);
				return percentageString + newItemName;
			}
			else {
				return percentageString + newItemName;
			}
		}
	} 	
	else {
		return percentageString + currentItemName;
	}
}

/*
	Deletes previous pie chart and creates new pie chart based on allItems array.
*/
function createItemPie() {
	var itemsPieChart = itemsd3.graph;
	itemsPieChart.selectAll('.enter').attr("class", "exit").remove();

	var pie = d3.layout.pie();
	var outerRadius = itemPieData.h / 2 ;
	var innerRadius = 0;
	var arc = d3.svg.arc()
				.innerRadius(innerRadius)
				.outerRadius(outerRadius);
	var color = d3.scale.category10();

	var arcs = itemsPieChart.selectAll("g.arc")
					.data(pie(itemCount))
					.enter()
					.append("g")
					.attr("class", "arc enter")
					.attr("transform", "translate(" + outerRadius + ", " + outerRadius + ")")

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
	    	var itemPercentage = ((d.value/itemTotal)*100).toFixed(0);
	    	var percentageString = itemPercentage + "%";
	    	//if itemPercentage > 20, add name of item
	        if (itemPercentage > 20) {
	        	return getShortenedItemName(itemName[i], itemPercentage);
	        }
	        else if (itemPercentage > 2) {
	        	return percentageString;
	        }
	    });

	var itemTooltip = d3.tip().attr('class', 'd3-tip').html(function(d,i) {
		return itemName[i]+" ("+itemCount[i]+")";
	});
	arcs.call(itemTooltip);
	arcs.on("mouseover", itemTooltip.show)
		.on("mouseout", itemTooltip.hide);
}



$(document).ready(function() {

	var itemPickerHTML = "";

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
	$('#itemPicker').hide();
	$('#itemGraphDiv').hide();
	$('#skillGraphDiv').hide();

	$('.items').each(function () {
		$(this).on('click' , function() {
			var clickedItem = $(this).attr('id');
			fromTopHeroesGetItem(clickedItem);
			createItemPie();
			$('#statSpan').removeClass('selected');
			$('.currentGraph').removeClass('currentGraph');
			$(this).addClass('currentGraph');
			$('#mainStatsDiv').hide();
			$('#skillGraphDiv').hide();
			$('#itemGraphDiv').show();
		})
	});

	$()

	createGraph(currentTop, currentDataset);
	fromTopHeroesGetItem("head");
	createItemPie();

});

/* 
	Creating click handler.  Show more options on click if not statBarGraph.  else show statBarGraph
*/
$('#graphChooser span').each(function () {
	var spanID = $(this).attr('id');
	//skills, items
	if (spanID != "statSpan") {

		$(this).on('click', function() {
			$(this).toggleClass('selected');

			if ($(this).attr('class') == "selected") {
				$('#'+spanID.replace("Span", "Picker")).show();	
			}
			else {
				$('#'+spanID.replace("Span", "Picker")).hide();
			}
		});
	}
	//Stats
	else {

		$(this).on('click', function() {
			$(this).toggleClass('selected');

			if ($(this).attr('class') == "selected") {
				$('#'+spanID.replace("Span", "Picker")).show();	
			}
			else {
				$('#'+spanID.replace("Span", "Picker")).hide();
			}


		});
	}
});

$('#skillPicker a').each(function () {
	var id = $(this).attr('id');
	
	$(this).on('click', function() {
		$('#mainStatsDiv').hide();
		$('#itemGraphDiv').hide();
		$('.currentGraph').removeClass('currentGraph');
		$(this).addClass('currentGraph');
		if (id == "primary") {
			createActiveSkillPie();
		}
		else {
			createPassivePie();
		}
		$('#skillGraphDiv').show();
	});
});


// $('#items').on('click', function() {

// 	$(this).toggleClass('selected');

// 	if ($(this).attr('class') == "selected") {
// 		$('#itemPicker').show();	
// 	}
// 	else {
// 		$('#itemPicker').hide();
// 	}

// });

// $('#skills').on('click', function() {

// 	$(this).toggleClass('selected');

// 	if ($(this).attr('class') == "selected") {
// 		$('#skillsPicker').show();	
// 	}
// 	else {
// 		$('#skillsPicker').hide();
// 	}

// });

// d3.select("#hundred").on("click",function() {
// 	currentDataset = "toughness";
// 	currentArray = allData.slice(0,100);
// 	d3.selectAll('.enter').attr("class", "exit").style('opacity' , 0);

// 	svg.selectAll("rect").data(currentArray).transition()
// 	.attr("x" , function(d,i) {
// 		return i * (width/currentArray.length); })
// 	.attr("y" , function(d) { 
// 		if (d == null || d == 0) {
// 			return 0;
// 		}
// 		else {
// 			return height-d.stats.damage/10000;
// 		}
// 	})
// 	.attr("width", width / currentArray.length - barPadding)
// 	.attr("height", function(d) {
// 		if (d == null || d == 0) {
// 			return 0;
// 		}
// 		else {
// 			return d.stats.damage/10000;
// 		}	
// 	})
// 	.attr("class" , "enter")
// 	.style("opacity" , 1);
// 	;
// });