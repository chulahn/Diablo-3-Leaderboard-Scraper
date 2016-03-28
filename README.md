# Diablo-3-Leaderboard-Scraper
Webscraper using Node.js.

<h3>About</h3>
This was my first webapp with d3.js and using a database(MongoDB).  I wanted to challenge myself after making the StartingStrength app.  It was truly a learning experience with using a database, and I had to think about how I wanted to organize everything as well as adding and updating.
<p>It grabs data from Battle.net <a href="http://us.battle.net/d3/en/rankings/season/1/rift-hardcore-wd">Leaderboards</a> and generates stats based on gear.  First the user clicks which leaderboard he wants to see, and then shows the users who have the top 100 spot.  From those 100, it calculates what I thought was important statistics(average damage, toughness, critcal hit chance), popular items, and skillsets.  Then once a Player is clicked, all Heroes for a Player are displayed and the Hero that is assumed to be on the Leaderboard is shown with a star(A player might have two Barbarians however one might be used for farming while the other might be strictly for Greater Rifting).  Then once a Hero is clicked, their items and stats can be viewed with tooltips just like it is on Battle.net.  

<h3>Why</h3>
I used to spend a lot of time playing Diablo 3, almost too much time.  After maxing out one character, I wanted to play the other classes however I did not know how to play them.  Battle.net has leaderboards which assign players a rank based on their class and the time they cleared a Greater Rift.  A Greater Rift is a timed dungeon.  The higher level the Greater Rift the more difficult it is, therefore those at the top have a higher Greater Rift number but a lower time.  I wanted to learn the other classes by seeing what build and items the leaders used.



<h3>Features</h3>
<ul>
  <li>Show Top 100 Players
  <li>Show Stats (Number and Graph)
  <li>Show Popular Items / Gems
  <li>Show Popular Skills
  <ul><li>Rune Words</li></ul>
  <li>Guess Leaderboard Hero
  <li>Cache and update (Buggy with items)
</ul>
  
    
<h3>Notes</h3>
This was made ~ 1.5 years ago and hasn't been touched in a while, so the MongoDB might be a little dated and might take time to store data.  If a page doesn't work, try refreshing the page so the API calls can be made.  This was done while Season 1 was up, and it is current at Season 5 if I am correct so I did not account for each separate Season.  I stopped played Diablo 3 so this app has not been updated in quite a while.
