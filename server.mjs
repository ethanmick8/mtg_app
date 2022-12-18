import mysql from 'mysql';
import bcrypt from 'bcrypt';
import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import * as utils from './public/JS/utilities.mjs';

const port = 3000
//const bcrypt = require('bcrypt')
//var mysql = require('mysql')
//const express = require('express')
//*const session = require('express-session')
const app = express()

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
    //require('dotenv').config()
}

export default {};

// looks for ejs file
app.set('view-engine','ejs')
app.use(express.urlencoded({extended: false}))

app.use(session( {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// connect to database, check README for clarification on local running, testing
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'hexa',
  password: 'hexasynth',
  database: 'magic'
});

conn.connect(function(err) {
  if (err) throw err; // again check README
  console.log("Successfully connected to database!");
});

function getUser(username, callback) {
  const query = 'SELECT * FROM m_account WHERE username = ?';
  conn.query(query, [username], (error, results) => {
    if (error) {
      return callback(error);
    }
    callback(null, results[0]);
  });
}


async function login(username, password) {
  return new Promise(async (resolve, reject) => {
    getUser(username, async (err, user) => {
      if (err) {
        return reject(err);
      }
      const isValid = await bcrypt.compare(password, user.pswd);
      if (isValid) {
        resolve(user);
      } else {
        resolve(null);
      }
    });
  });
}

app.get('/', (req,res) => {
  if (!req.session.isLoggedIn) { // if not logged in
    return res.redirect('/login')
  }
  res.render('index.ejs')
});

app.get('/login', (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect('/');
  }
  res.render('login.ejs');
});

app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const user = await login(username, password);
  if (user) {
    // Login successful
    req.session.isLoggedIn = true;
    req.session.user = user;
    console.log('user logged in!');
    res.redirect('/')
  } else {
    // Login failed
    console.log('log in failed!');
    res.redirect('/login');
  }
});

// GET /register
app.get('/register', (req, res) => {
  res.render('register.ejs');
});

// POST /register
app.post('/register', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const f_name = req.body.fname;
  const l_name = req.body.lname;
  const full_name = (f_name + ' ' + l_name);
  const email = req.body.email;
  const bdate = req.body.bdate;
  const age = req.body.age;
  const phone_num = req.body.phone;
  const address = req.body.address;
  const permission = 1 // upon creation, users default to level 1 permission status
  const user_id = Math.floor(Date.now() + Math.random());

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a new user
  const createUserQuery = 'INSERT INTO m_user (user_id, full_name, email, bdate, age) VALUES (?, ?, ?, ?, ?);';
  const user_values = [user_id, full_name, email, bdate, age]
  conn.query(createUserQuery, user_values, async (error, results) => {
    if (error) {
      // Handle error
      console.log('user creation failed - user insert');
      return;
    }
    //const user_id = results.insertId;

    // Create a new account
    const createAccountQuery = `INSERT INTO m_account (username, pswd, phone_num, address, permission, uid) VALUES (?, ?, ?, ?, ?, ?);`;
    const acc_values = [username, hashedPassword, phone_num, address, permission, user_id];
    conn.query(createAccountQuery, acc_values, (error, results) => {
      if (error) {
        // Handle error
        console.log('user creation failed - account insert');
        return;
      }
      // Redirect to login page
      console.log('user creation success!');
      res.redirect('/login');
    });
  });
});

app.get('/order', (req, res) => {
  res.render('order.ejs')
});

app.post('/order', async (req, res) => {
  if (req.session.user.permission != 1) {
    console.log('user not allowed to submit orders.');
    return res.redirect('/');
  }
  const order_id = Math.floor(Date.now() + Math.random());
  const uid = req.session.user.uid;
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const exp_ship = date.toISOString().split('T')[0]; // tomorrow (business day)
  const pay_info = req.body.pay_info;
  const hashed_pay = await bcrypt.hash(pay_info, 10);
  const order_auid = '1670809476300'; // admin id for orders
  //const auid = fetchAdminId(order_auid); // call fetch with order_auid
  const cards = req.body.cards;
  const card_quan = [];
  req.session.card_quan = card_quan; // store card quantity for retrieval in confirmation
  var error_occured = false;
  //const quantity = getNumCards(cards);
  const card_array = utils.groupIdenticalStrings(utils.stringToArray(cards));
  const createOrderQuery = `INSERT INTO m_order (order_id, exp_ship, act_ship, pay_info, uid, auid) VALUES (?, ?, null, ?, ?, ?);`;
  const values = [order_id, exp_ship, hashed_pay, uid, order_auid];
  conn.query(createOrderQuery, values, (error, results) => {
    if (error) { // error code: 1
      // Handle error
      console.log('order placement failed - error code: 1');
      error_occured = true;
      return;
    }
    // add all cards to m_contains
    const includeCardsQuery = `INSERT INTO m_contains (multi_id, order_id, quantity) VALUES (?,?,?);`;
    for (let i = 0; i < card_array.length-1; i++) {
      if (card_array[i-1] == card_array[i]) { // handle duplicate cards to maintain ref. integrity / constraints
        continue;
      }
      const quantity = utils.cardCount(card_array, card_array[i]);
      req.session.card_quan.push(quantity); // add to array
      const card_values = [card_array[i], order_id, quantity];
      conn.query(includeCardsQuery, card_values, (error, results) => {
        if (error) { // error code: 2
          // Handle error
          console.log('order placement failed - error code: 2');
          //res.redirect('/order/failed');
          error_occured = true;
          return;
        }
      });
    }
    // below is the implementation for sendsdfsfsfsdfsing confirmation emails, which I couldn't quite figure out in the
    // time alotted for the assignment.
    /*
    // send emails to addresses of admin to fulfill and user who placed
    const a_email = "admin1@admin";
    const admin_sent = sendEmail(a_email, uid, card_array, exp_ship, true);
    if (!admin_sent) { // this will always display, as the admin used here has a fake email address.
      console.log("(Admin email invalid. No email was sent.)")
    }
    //const u_email = retrieveEmail(uid);
    //const u_email = req.session.user.email;
    const u_email = 'ethanmick741@gmail.com';
    const user_sent = sendEmail(u_email, uid, card_array, exp_ship, false); // might work
    // Redirect to login page
    if (user_sent) {
      console.log('Order placement success!. Receipt emailed to user address on record');
      return res.redirect('/');
    } */
    if (!error_occured) {
      console.log('Order placement success!.');
      req.session.card_order = card_array;
      const exp_ship_date = utils.formatDate(exp_ship); // format for friendly user display
      req.session.exp_ship_date = exp_ship_date;
      res.redirect('/order/confirmation');
    } else {
      res.redirect('/order/failed');
    }
  });
});

app.get('/order/confirmation', (req, res) => {
  const bulk_ids = req.session.card_order;
  const quantity = req.session.card_quan;
  const exp_ship_date = req.session.exp_ship_date;
  const distinct = (value, index, self) => {
    return self.indexOf(value) === index;
  }
  const cards_ids = bulk_ids.filter(distinct); // get unique cards
  if (cards_ids.length != quantity.length) { // handle edge case
    quantity.push(1);
  }

  // use a promise to get the card names
  getCardStats(cards_ids)
    .then(({names, prices}) => {
      // if the promise is resolved, render the confirmation
      var total = 0.00;
      res.render('confirmation.ejs', { cards_ids, names, prices, quantity, total, exp_ship_date });
    })
    .catch((error) => {
      // if the promise is rejected, redirect to the orderfailed page
      res.redirect('/order/orderfailed');
    });
});

app.get('/order/failed', (req, res) => {
  res.render('orderfailed.ejs')
});


app.get('/deck', (req, res) => {
  res.render('deck.ejs')
});

app.post('/deck', async (req, res) => {
  const deck_name = req.body.deckname;
  const uid = req.session.user.uid;
  const size = 0;
  const is_legal = 0;
  if (size == '100') {
    const is_legal = 1;
  }
  const color = req.body.colors;
  const avg_mv = 0.00;
  const primer = req.body.primer;
  const total_cost = 0.00
  const createDeckQuery = `INSERT INTO deck (deck_name, uid, size, is_legal, color, avg_mv, primer, total_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;
  const values = [deck_name, uid, size, is_legal, color, avg_mv, primer, total_cost];
  conn.query(createDeckQuery, values, (error, results) => {
    if (error) {
      // Handle error
      console.log('deck creation failed');
      return;
    }
    // Redirect to login page
    console.log('Deck creation success!. Deck stats:\n' + 'Name:\n' + deck_name + '\nColor:\n' + color);
    res.redirect('/deckeditor');
  });
});

// this is a work in progress
app.get('/deckeditor', (req, res) => {
  // Get the user so we can get their decks
  const id = req.session.user.uid;
  getDeckNames(id)
    .then(({decks}) => {
      res.render('deckeditor.ejs', { decks });
    })
    .catch((error) => {
      res.redirect('orderfailed.ejs');
    });
});

// in progress
app.post('/deckeditor', async (req, res) => {
  // add all cards to consists of
  for (let i = 0; i < card_array.length; i++) {
    const includeCardsQuery = `INSERT INTO m_contains (multi_id, order_id, quantity) VALUES (?,?,?);`;
    const card_values = [card_array[i], order_id, utils.cardCount(card_array, card_array[i])];
    conn.query(includeCardsQuery, card_values, (error, results) => {
      if (error) { // error code: 2
        // Handle error
        console.log('order placement failed - error code: 3');
        return;
      }
    });
  }
});

app.get('/dec/:deckName', (req, res) => {
  const deck_name = req.params.deckName;
  res.redirect('deckinterface.ejs', {deck});
});

app.get('/logout', (req, res) => {
  req.session.isLoggedIn = false;
  res.redirect('/login');
});

// get card names based on array of muids
function getCardStats(muidArray) {
  return new Promise((resolve, reject) => {
    var names = [];
    var prices = [];
    const query = `SELECT card_name, price FROM card WHERE muid IN (?);`;
    conn.query(query, [muidArray], (error, results) => { 
      if (error) {
        reject(error);
        return;
      }
      results.forEach(function(results) {
        names.push(results.card_name);
        prices.push(results.price); 
      });
      resolve({names: names, prices: prices});
    });
  });
}

// retrieve the names of all decks registered to the user
function getDeckNames(id) {
  return new Promise((resolve, reject) => {
    const query = `SELECT deck_name FROM deck WHERE uid = (?);`;
    var cards = [];
    conn.query(query, id, (error, results) => {
      if (error) {
        reject(error);
        console.log('Error code: dfet457'); // could not fetch decks
        return;
      }
      let i = 0;
      results.forEach(function(results) {
        decks.push(results.deck_name);
      });
      resolve({decks: decks});
    });
  });
}

// retrieve all data pertaining to a deck based on its unique name
//etDeckData(deck_name) {
//  return new Promise((resolve, reject) => {
 //   const query = `SELECT * FROM deck WHERE deck_name = (?);`;
//    conn.query(query, deck_name, (error, results) => {
//        if (error) {
//          reject(error);
//          console.log("Error code: dgert 567");
//          return;
//        }
//        const row = results[0];
//        const 
//    });
//  });
//}


//cons

/* function fetchAdminId(auid) {
  const query = `SELECT user_id FROM m_user WHERE user_id = (?);`;
  const id = auid;
  var res = '';
  conn.query(query, id, (error, results) => {
    if (error) {
      console.log("Error code: 3"); // failed to fetch admin
      return `NULL`; // specific value for database insertion
    }
    res =results[0];
  });
  return res;
} */

//const sgMail = require('@sendgrid/mail');
//const validator = require('validator');

// not sure that this is implemented correctly, couldn't fully figure it out (didn't have the time), left it here for reference though
/* const sendEmail = (email, uid, cards, exp_ship, route) => {
  console.log(email);
  if (validator.isEmail(email)) {
  } else {
    return null;
  }

  try {
    // SendGrid API key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);


    let message;
    if (route) {
      // If 'route' is true, create a message for a new order to be sent to admin
      message = {
        to: email,
        subject: 'New card order submitted by a user!',
        text: `User identification: ${uid}\nOrder contents: ${cards.join('\n')}\nTarget Ship Date: ${exp_ship}`
      };
    } else {
      // If 'route' is false, create a message for a confirmed order to the buying user
      message = {
        to: email,
        subject: 'Magic Card Order confirmed!',
        text: `User identification: ${uid}\nOrder contents: ${cards.join('\n')}\nExpected Ship Date: ${exp_ship}`
      };
    }

    // Send the email
    sgMail.send(message);

  } catch (error) {
    return false;
  }

    return true;
}; */

/* function retrieveEmail(uid) {
  const query = `SELECT email FROM m_user WHERE uid = (?);`;
  const id = uid;
  let res;
  conn.query(query, id, (error, results) => {
    if (error) {
      return null;
    }
    res = results[0];
  });
  return res;
} */


// local port 3000
app.listen(port, () => console.log(`Example app listening on port ${port}!`))




