# Diablo-3-Leaderboard-Scraper
Webscraper using Node.js

<h3>About</h3>
This was my first webapp with d3.js and using a database(MongoDB).  It grabs data from Battle.net <a href="http://us.battle.net/d3/en/rankings/season/1/rift-hardcore-wd">Leaderboards</a> and generates stats based on gear.  First the user clicks which leaderboard he wants to see, and then shows the users who have the top 100 spot.  From those 100, it calculates what I thought was important data, average damage, toughness, critcal hit chance, etc.  

<h3>Why</h3>
I used to spend a lot of time playing Diablo 3, almost too much time.  After maxing out one character, I wanted to play the other classes however I did not know how to play them.  Battle.net has leaderboards which assign players a rank based on their class and the time they cleared a Greater Rift.  A Greater Rift is a timed dungeon.  The higher level the Greater Rift the more difficult it is, therefore those at the top have a higher Greater Rift number but a lower time.  I wanted to learn the other classes by seeing what build and items the leaders used.




It also calculates the percentage of which item was used at certain spots and also what skills as well as what runes for those skills.  After clicking a player, it shows all characters and the app does its best guess the correct character that made it to the leaderboard, as one player can have more than one character.  For each player 
