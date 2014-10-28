var currentArray = allData.slice(0,100);
var currentTop = 100;
var currentDataset = "dps";
// var axes = true;

var height = 300, width = 800;
var barPadding = 1;
var xPadding = 60;
var yPadding = 25;
var svg= d3.select("#visual")
	.append("svg")
	.attr("height", height)
	.attr("width" , width);

var tip = d3.tip().attr('class', 'd3-tip').html(function(d,i) {
	return (i+1)+"."+"<span class=\"btag\">"+d.battletag+"</span><br />DPS:<span class=\"damage\">"+d.stats.damage+"</span><br />Toughness:<span class=\"damage\">"+d.stats.toughness;
});
svg.call(tip);

function addLegend() {

	var legend = svg.selectAll(".legend")
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

	var category = svg.selectAll(".category")
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


	// var extra = svg.selectAll(".extra")
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

function createGraph(currentTop, currentDataset) {
	//if number == null, set to currentTop
	currentArray = allData.slice(0,currentTop);
		// d3.selectAll('.enter').attr("class", "exit").exit().transition().remove();

	d3.selectAll('.enter').attr("class", "exit").remove();

	var xScale = d3.scale.linear()
					.domain([0, currentArray.length])
					.range([xPadding, width-xPadding]);
	var yScale = d3.scale.linear()
					.domain([0, d3.max(currentArray, function(d) { 	
						return getY(d, currentDataset);		
					})])
					.range([height-yPadding, yPadding]);

	var xAxis = d3.svg.axis()
					.scale(xScale)
					.orient("bottom")
					.ticks(5);
	var yAxis = d3.svg.axis()
					.scale(yScale)
					.orient("left")
					.ticks(5);

	//add bars and links
	svg.selectAll("rect").data(currentArray).enter()
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
			.attr("width", (width-(2*xPadding)) / currentArray.length - barPadding)
			.attr("height", function(d) {
				// if (d == null || d == 0) {
				// 	return 0;
				// }
				// else {
					return height-yScale(getY(d, currentDataset))-yPadding;
				// }	
			})
			.attr("class" , "enter bar")
			.on('mouseover', tip.show)
			.on('mouseout', tip.hide);
	//add xAxis
	svg.append("g")
		.attr("class", "enter axis")
		.attr("transform", "translate(0," + (height-yPadding) + ")")
		.call(xAxis);
	//add yAxis
	svg.append("g")
		.attr("class", "enter axis")
		.attr("transform", "translate("+xPadding+", 0)")
		.call(yAxis);


	
}
addLegend();
	// d3.select(".legend text").datum(currentTop).attr("class", "selected");
	// d3.select(".category text").datum(currentDataset).attr("class", "selected");
createGraph(currentTop, currentDataset);

d3.select("#hundred").on("click",function() {
	currentDataset = "toughness";
	currentArray = allData.slice(0,100);
	d3.selectAll('.enter').attr("class", "exit").style('opacity' , 0);

	svg.selectAll("rect").data(currentArray).transition()
	.attr("x" , function(d,i) {
		return i * (width/currentArray.length); })
	.attr("y" , function(d) { 
		if (d == null || d == 0) {
			return 0;
		}
		else {
			return height-d.stats.damage/10000;
		}
	})
	.attr("width", width / currentArray.length - barPadding)
	.attr("height", function(d) {
		if (d == null || d == 0) {
			return 0;
		}
		else {
			return d.stats.damage/10000;
		}	
	})
	.attr("class" , "enter")
	.style("opacity" , 1);
	;
});