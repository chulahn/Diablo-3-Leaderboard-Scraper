var exports = module.exports = {};


exports.setRegion = function setRegion(region) {
	switch (region) {
		case "us":
			locale = "en_US";
			region = "us";
			break;
		case "eu":
			locale = "en_GB";
			region = "eu";
			break;
		case "tw":
			locale = "zh_TW";
			region = "tw";
			break;
		case "kr":
			locale = "ko_KR";
			region = "kr";
			break;
	}
}
