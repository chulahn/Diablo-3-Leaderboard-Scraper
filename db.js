var mongoose = require('mongoose');

mongoose.connect('mongodb://admin:admin@ds039850.mongolab.com:39850/d3leaders')

module.exports = mongoose.connection;