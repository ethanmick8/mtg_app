# mtg_app
rudimetary Mgic: the Gathering card database UI

This project utilizes a database created in mySQL to pull/add and display data to users pertaining to  
Magic: the Gathering cards. The database used was created locally on my machine using the queries  
provided in the queries.sql file located in this project. I connected to the database using  
mySQL.createConnection in server.js (the main server file) and if one wishes to use this application,  
they can create a temporary database on their machine with these queries and then set up the connection  
accordingly. Bootstrap is used as a framework, and several web pages are used that are pretty  self-explanatory in nature. Orders of cards can be placed, and data is displayed back to the user upon placement. Decks can be created, but the functionality of adding cards to them is something  I have yet to add to this in progress application. I've defined several helper functions in the server.js  file that aid with queries, fetching data from the database and/or the session.
