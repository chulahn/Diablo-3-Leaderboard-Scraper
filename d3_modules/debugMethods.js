var exports = (module.exports = {});
var colors = require("colors");

exports.timeString = function(string) {
  date = new Date();
  console.log(
    colors.green(
      "[",
      date.getMinutes(),
      ":",
      date.getSeconds(),
      ":",
      date.getMilliseconds(),
      "] ",
      string
    )
  );
};
