 function getCollectionName(diabloClass) {

	switch (diabloClass) {
			case "barbarian":
				return "barbs";
			case "crusader":
				return "sader";
			case "dh":
				return "dh";
			case "wd":
				return "wd";
			case "monk":
				return "monk";
			case "wizard":
				return "wiz";
		} 
}

// console.log(getCollectionName("barbarian"))