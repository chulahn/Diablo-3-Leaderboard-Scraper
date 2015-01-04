var express = require('express');
var router = express.Router();

router.get("/d3functions.js", function(req,res) {
	res.sendfile("d3functions.js");
});

//style
router.get("/styles/battletag.css", function(req,res) {
	res.sendfile("styles/battletag.css");
});
router.get("/styles/battletag.less", function(req,res) {
	res.sendfile("styles/battletag.less");
});
router.get("/styles/homepage.css", function(req,res) {
	res.sendfile("styles/homepage.css");
});
router.get("/styles/homepage.less", function(req,res) {
	res.sendfile("styles/homepage.less");
});
router.get("/styles/hero.css", function(req,res) {
	res.sendfile("styles/hero.css");
});
router.get("/styles/hero.less", function(req,res) {
	res.sendfile("styles/hero.less");
});
router.get("/styles/leaderboard.css", function(req,res) {
	res.sendfile("styles/leaderboard.css");
});
router.get("/styles/leaderboard.less", function(req,res) {
	res.sendfile("styles/leaderboard.less");
});

router.get("/partials/_default.less", function(req, res) {
	res.sendfile("partials/_default.less");
})

//images
router.get("/images/hardcore.png", function(req,res) {
	res.sendfile("images/hardcore.png");
});
router.get("/images/seasonal.png", function(req,res) {
	res.sendfile("images/seasonal.png");
});

router.get("/images/barbarian-female.png", function(req,res) {
	res.sendfile("images/barbarian-female.png");
});
router.get("/images/barbarian-male.png", function(req,res) {
	res.sendfile("images/barbarian-male.png");
});

router.get("/images/crusader-female.png", function(req,res) {
	res.sendfile("images/crusader-female.png");
});
router.get("/images/crusader-male.png", function(req,res) {
	res.sendfile("images/crusader-male.png");
});

router.get("/images/demon-hunter-female.png", function(req,res) {
	res.sendfile("images/demon-hunter-female.png");
});
router.get("/images/demon-hunter-male.png", function(req,res) {
	res.sendfile("images/demon-hunter-male.png");
});

router.get("/images/monk-female.png", function(req,res) {
	res.sendfile("images/monk-female.png");
});
router.get("/images/monk-male.png", function(req,res) {
	res.sendfile("images/monk-male.png");
});

router.get("/images/witch-doctor-female.png", function(req,res) {
	res.sendfile("images/witch-doctor-female.png");
});
router.get("/images/witch-doctor-male.png", function(req,res) {
	res.sendfile("images/witch-doctor-male.png");
});

router.get("/images/wizard-female.png", function(req,res) {
	res.sendfile("images/wizard-female.png");
});
router.get("/images/wizard-male.png", function(req,res) {
	res.sendfile("images/wizard-male.png");
});
router.get("/images/legendary.png", function(req,res) {
	res.sendfile("images/legendary.png");
});

module.exports = exports = router;