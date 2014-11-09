var exports = module.exports = {};


exports.timeString = function(string) {
	date = new Date();
	console.log(string + " " +  date.getMinutes() +":"+ date.getSeconds() +":"+ date.getMilliseconds());
}

