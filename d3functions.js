var currentArray = allData.slice(0,100);
//Data for setting up DPS/Toughness bar graph
var currentTop = 100;
var currentDataset = "dps";

var statsBarGraphHeight = 300, statsBarGraphWidth = 800;
var barPadding = 1;
var xPadding = 60;
var yPadding=  25;
var statsBarGraph= d3.select("#mainStatsDiv")
	.append("svg")
	.attr("height", statsBarGraphHeight)
	.attr("width" , statsBarGraphWidth);
// var axes = true;
var statsTooltip = d3.tip().attr('class', 'd3-tip').html(function(d,i) {
	return (i+1)+"."+"<span class=\"btag\">"+d.battletag+"</span><br />DPS:<span class=\"damage\">"+d.stats.damage+"</span><br />Toughness:<span class=\"damage\">"+d.stats.toughness;
});
statsBarGraph.call(statsTooltip);


//Data for setting up item pie chart
var allItems = [[],[]];
var itemName = allItems[0];
var itemCount = allItems[1];
var itemTotal = 0;

var pieChartHeight = 200, pieChartWidth = 200;
var itemsPieChart = d3.select("#itemGraphDiv")
	.append("svg")
	.attr("height", pieChartHeight)
	.attr("width" , pieChartWidth);

//Data for setting up skills pie chart
var	allActiveSkills = [ [], [], [], [] ];
var activeSkillsName = allActiveSkills[0];
var activeSkillsCount = allActiveSkills[1];
var skillTotal = 0;
var	runeNames = allActiveSkills[2];
var	runeCount = allActiveSkills[3]; 
var passiveSkills = [[],[]];

var skillsPieChartHeight = 200, skillsPieChartWidth = 400;
var skillsPieChart = d3.select("#skillGraphDiv")
	.append("svg")
	.attr("height", skillsPieChartHeight)
	.attr("width" , skillsPieChartWidth);


fromTopHeroesGetSkills();
createSkillsPie();

function createSkillsPie() {
	skillsPieChart.selectAll('.enter').attr("class", "exit").remove();

	var pie = d3.layout.pie();
	var outerRadius = skillsPieChartHeight / 2 ;
	var innerRadius = 0;
	var arc = d3.svg.arc()
				.innerRadius(innerRadius)
				.outerRadius(outerRadius);
	var color = d3.scale.category20();

	var arcs = skillsPieChart.selectAll("g.arc")
					.data(pie(activeSkillsCount))
					.enter()
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
	    	var skillPercentage = (activeSkillsCount[i]/skillTotal*100).toFixed(0)
	    	if (skillPercentage > 7) {
		    	return skillPercentage+"%";
	    	}
	    	if (skillPercentage > 2) {
	    		return skillPercentage;
	    	}
	    });

	var activeSkillsTooltip = d3.tip().attr('class', 'd3-tip').html(function(d,i) {
		var activeTooltipString = activeSkillsName[i]+" ("+activeSkillsCount[i]+")<br />";

		//runeName[i] is an array of Runes for that skill
		var allRunesForSkill = runeNames[i]; 
		var runeCountsForSkill = runeCount[i];

		//get runes and count for skill
		allRunesForSkill.forEach(function(rune) {
			var runeCount = runeCountsForSkill[allRunesForSkill.indexOf(rune)];
			var runePercentage = ((runeCount / activeSkillsCount[i])*100).toFixed(0) + "% ";
			activeTooltipString += runePercentage + rune + " (" + runeCount + ")<br />";
		});
		return activeTooltipString;
	});
	arcs.call(activeSkillsTooltip);
	arcs.on("mouseover", activeSkillsTooltip.show)
		.on("mouseout", activeSkillsTooltip.hide);
}


//used in itemPicker div
var itemStrings = ["shoulders", "head", "neck", "hands", "torso", "bracers", "leftFinger", "waist", "rightFinger", "mainHand", "legs", "offHand", "feet"];	

/*
	Get active skills and runes for each player.
*/
function fromTopHeroesGetSkills() {
	//reset values
	allActiveSkills = [ [], [], [], [] ];
	activeSkillsName = allActiveSkills[0];
	activeSkillsCount = allActiveSkills[1];
	runeNames = allActiveSkills[2];
	runeCount = allActiveSkills[3]; 

 	skillTotal = 0;

 	allData.forEach(function (currentPlayer) {

 		if (currentPlayer.skills != undefined) {
 			//add active skills for graph
	 		var currentPlayerActiveSkills = currentPlayer.skills.active;
	 		currentPlayerActiveSkills.forEach(function (currentActive) {

	 			var currentSkillName = currentActive.skill.name;
	 			var currentRuneName;
	 			//set rune
	 			if (currentActive.rune == undefined) {
	 				currentRuneName = "No Rune";
	 			}
	 			else {
		 			currentRuneName = currentActive.rune.name;
	 			}

	 			var locationOfCurrentActive = activeSkillsName.indexOf(currentSkillName);

	 			if (locationOfCurrentActive == -1) {
	 				activeSkillsName.push(currentSkillName);
	 				activeSkillsCount.push(1);

	 				runeNames.push([currentRuneName]);
	 				runeCount.push([1]);
	 				skillTotal += 1;
	 			}
	 			else {
	 				activeSkillsCount[locationOfCurrentActive] += 1;
	 				skillTotal += 1;
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

	 		});
 		}
 	});
}

/*
	Add legend for DPS/toughness graph.  Allows to switch top (10,20,50,100) and DPS/toughness
*/
function addLegend() {

	var legend = statsBarGraph.selectAll(".legend")
					.data([10,20,50,100])
					.enter()
					.append("g")
					.attr("class", "legend")
	     			.attr("transform", function(d, i) { 
	     				return "translate("+(i*40)+",0)"; 
	     			});

	legend.append("text")
			.attr("x", 10)
			.attr("y", 13)
			.text(function(d) {
				return "Top " + d;
			})
			.on("click" , function(d) {
				currentTop=parseInt(d);
				createGraph(d, currentDataset);
				legend.selectAll(".selected").classed("selected",false);
				d3.select(this).attr("class", "selected");
			})
			.on("mouseover" , function() {
				d3.select(this).style("font-weight", "bold");
			})
			.on("mouseout" , function() {
				d3.select(this).style("font-weight" , "");
			});

	var category = statsBarGraph.selectAll(".category")
					.data(["dps" , "toughness"])
					.enter()
					.append("g")
					.attr("class", "category")
					.attr("transform", function(d, i) {
	    				return "translate("+(i*40)+",0)"; 
	     			});

	category.append("text")
			.attr("x", 200)
			.attr("y", 13)
			.text(function(d) {
				return d;
			})
			.on("click" , function(d) {
				currentDataset = d;
				createGraph(currentTop, d);
				category.selectAll(".selected").classed("selected",false);
				d3.select(this).attr("class", "selected");
			})
			.on("mouseover" , function() {
				d3.select(this).style("font-weight", "bold");
			})
			.on("mouseout" , function() {
				d3.select(this).style("font-weight" , "");
			});


	// var extra = statsBarGraph.selectAll(".extra")
	// 				.data(["axis on", "axes off"])
	// 				.enter()
	// 				.append("g")
	// 				.attr("class" , "extra")
	// 				.attr("transform", function(d, i) {
	//     				return "translate("+(i*60)+",0)"; 
	// 				});
	// extra.append("text")
	// 		.attr("x", 500)
	// 		.attr("y", 13)
	// 		.text(function(d) {
	// 			return d;
	// 		})
	// 		.on("click" , function() {
	// 			currentDataset = d;
	// 			d3.select(this).classed("selected");
	// 		})
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
		}
	}
}

/*
	Deletes previous graph and creates new graph on how many heroes to show and DPS/toughness
*/
function createGraph(currentTop, currentDataset) {
	currentArray = allData.slice(0,currentTop);
		// d3.selectAll('.enter').attr("class", "exit").exit().transition().remove();

	statsBarGraph.selectAll('.enter').attr("class", "exit").remove();

	var xScale = d3.scale.linear()
					.domain([0, currentArray.length])
					.range([xPadding, statsBarGraphWidth-xPadding]);
	var yScale = d3.scale.linear()
					.domain([0, d3.max(currentArray, function(d) { 	
						return getY(d, currentDataset);		
					})])
					.range([statsBarGraphHeight-yPadding, yPadding]);

	var xAxis = d3.svg.axis()
					.scale(xScale)
					.orient("bottom")
					.ticks(5);
	var yAxis = d3.svg.axis()
					.scale(yScale)
					.orient("left")
					.ticks(5);

	//add bars and links
	statsBarGraph.selectAll("rect").data(currentArray).enter()
		.append("a").attr('xlink:href', function(d,i) {
			return "#"+(i+1);
		}).append("rect")
			.attr("x" , function(d,i) {
				return xScale(i); 
			})
			.attr("y" , function(d) { 
				return yScale(getY(d, currentDataset));
			})
			//width of one bar is (widthOfGraph / # of datapoints) - spaceInBetweenBars
			.attr("width", (statsBarGraphWidth-(2*xPadding)) / currentArray.length - barPadding)
			.attr("height", function(d) {
				// if (d == null || d == 0) {
				// 	return 0;
				// }
				// else {
					return statsBarGraphHeight-yScale(getY(d, currentDataset))-yPadding;
				// }	
			})
			.attr("class" , "enter bar")
			.on('mouseover', statsTooltip.show)
			.on('mouseout', statsTooltip.hide);
	//add xAxis
	statsBarGraph.append("g")
		.attr("class", "enter axis")
		.attr("transform", "translate(0," + (statsBarGraphHeight-yPadding) + ")")
		.call(xAxis);
	//add yAxis
	statsBarGraph.append("g")
		.attr("class", "enter axis")
		.attr("transform", "translate("+xPadding+", 0)")
		.call(yAxis);	
}

/*
	Helper method used in createPie
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
		var currentItem = currentPlayer.items[item];
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
	Helper method used in createPie
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
function createPie() {
	itemsPieChart.selectAll('.enter').attr("class", "exit").remove();

	var pie = d3.layout.pie();
	var outerRadius = pieChartHeight / 2 ;
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
			createPie();
			$('#statSpan').removeClass('selected');
			$('.currentGraph').removeClass('currentGraph');
			$(this).addClass('currentGraph');
			$('#mainStatsDiv').hide();
			$('#skillGraphDiv').hide();
			$('#itemGraphDiv').show();
		})
	});

	$()

	addLegend();
	createGraph(currentTop, currentDataset);
	fromTopHeroesGetItem("head");
	createPie();

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
			$('#itemGraphDiv').hide();
			$('#skillGraphDiv').hide();
			
			$(this).addClass('currentGraph');

			$('#mainStatsDiv').show();
		});
	}
});

$('#skillPicker a').each(function () {
	var id = $(this).attr('id');

	if (id != "Both") {
		$(this).on('click', function() {
			$('#mainStatsDiv').hide();
			$('#itemGraphDiv').hide();
			$('.currentGraph').removeClass('currentGraph');
			$(this).addClass('currentGraph');
			$('#skillGraphDiv').show();
		});
	}
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