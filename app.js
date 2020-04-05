var express = require('express');
var path = require('path');
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
const validator  = require('express-validator');
var mysql = require('mysql');
var appDir = path.dirname(require.main.filename);
const bcrypt = require('bcryptjs');
require('dotenv').config({path: appDir + '/.env'});

var app = express();

app.use('/assets/css', express.static('css'));
app.use(express.static('html'));
app.use('/assets/js', express.static('js'));
// app.use(validator());

var con;
var cur_post = null;
var alerts = [];
var check_filter = null

var api = express.Router();

// connect to database
while (con == null){
  console.log('Attempting sql connection');
  con = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });
  console.log("MySQL Connected!");
  // con.connect(function(err) {
  //   if (err) {
  //     return null
  //   }
  //   console.log("MySQL Connected!");
  // });
}

//starts app
app.listen(8000, () => {
  console.log('Project2 listening on port 8000!');
});

//loads home page on start up
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname,'./html/login.html'));
});

// Page navigations ===================================================================================================================
app.get("/logout", urlencodedParser,  function(req, res) {
    res.sendFile(path.join(__dirname,'./html/login.html'));
});

app.get("/home", urlencodedParser,  function(req, res) {
  res.sendFile(path.join(__dirname,'./html/home.html'));
});

app.get("/profile", urlencodedParser,  function(req, res) {
  res.sendFile(path.join(__dirname,'./html/profile.html'));
});

app.get("/myposts", urlencodedParser,  function(req, res) {
  res.sendFile(path.join(__dirname,'./html/myposts.html'));
});

app.post("/posts", urlencodedParser, function(req, res) {
  cur_post = req.body.postId;
  console.log(cur_post);
  console.log(req.body);
  res.sendFile(path.join(__dirname,'./html/posts.html'));
});

// LOGIN =========================================================================================================================
app.post('/',urlencodedParser,  function(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  console.log("post received: Username: %s Password: %s", email, password);

  //checks login against database
  var request = "SELECT email, password, role FROM User WHERE email = '" + email + "'";
  con.query(request, function (err, result) {
    if (err){
      res.redirect(req.get('referer'));
    }
    if (!result){
      console.log("Invalid username");
      alerts.push({alert: "Invalid username.", type: "danger"});
      res.redirect(req.get('referer'));
    } else {
      var pw_hash = result[0]["password"];
      var email = result[0]["email"];
      bcrypt.compare(password, pw_hash, function(err, res2) {
        if (res2){
          console.log("Authenticated");
          cur_user = email;
          cur_role = role;
          console.log(cur_user)
          res.sendFile(path.join(__dirname,'./html/home.html'));
        } else {
          console.log("Invalid password");
          alerts.push({alert: "Invalid password.", type: "danger"});
          res.redirect(req.get('referer'));
        }
      });
    }
  });
});

// REGISTER ===========================================================================================================================================================
app.post('/register',urlencodedParser,  function(req, res) {
  var fname = req.body.fname;
  var lname = req.body.lname;
  var email = req.body.email;
  var phone = req.body.phone;
  var password = req.body.pass;
  var confirmpass = req.body.confirmpass;
  console.log(req.body);

  var valid = true;
  if (password.length < 8 || password.length > 20) {
    alerts.push({alert: "Password must have a length between 8 and 20 characters.", type: "danger"});
    valid = false;
  }
  if (password != confirmpass) {
    alerts.push({alert: "Passwords do not match.", type: "danger"});
    valid = false;
  }

  if (valid) {
    bcrypt.hash(password, 10, function(err, hash) {
      var query = "INSERT INTO User (password, firstName, lastName, email, phoneNumber, lastLogin) "+
      "VALUES ('" + hash + "', '" + fname + "', '" + lname + "', '" + email + "', '" + phone + "', null);";

      console.log(query);
      con.query(query, function(err) {
        if (err) {
          console.log("Registration attempt failed");
          alerts.push("Registration attempt failed, please try again.");
          console.log(err);
          res.redirect(req.get('referer'));
        } else {
          console.log("Registration success");
          alerts.push({alert: "Registered successfully!", type: "success"});
          res.sendFile(path.join(__dirname,'./html/login.html'));

           //send an email to newly registered user
          var nodemailer = require('nodemailer');

          var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: 'cs3300project2@gmail.com',
              pass: 'csproject2!'
            }
          });

          var mailOptions = {
            from: 'cs3300project2@gmail.com',
            to: email,
            subject: 'Welcome to Buzz Marketplace!',
            text: 'Thanks for registering an account with us!'
          };

          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
        }
      });
    });
  } else {
    console.log("Invalid input");
    console.log(alerts)
    res.redirect(req.get('referer'));
  }
});

// PULL ==================================================================================================================================
app.get('/pull_profile',urlencodedParser,  function(req, res) {
  console.log("Arrived on profile page.");
  con.query("SELECT * FROM User WHERE Email = '" + cur_user + "';", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_posts', urlencodedParser, function(req, res){
  console.log("Arrived on home page.");
  con.query("SELECT User.firstName, User.lastName, Posts.postId, Posts.postDate, Posts.postText " +
            "FROM Posts " +
            "LEFT JOIN User on Posts.email = User.email " + 
            "ORDER BY Posts.postDate ASC;" , function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});
app.get('/pull_alerts', urlencodedParser, function(req, res){
  console.log(alerts);
  res.json(alerts);
  alerts = [];
});
// UPDATE ======================================================================================================================
app.post('/update_profile',urlencodedParser,  function(req, res) {
  var fname = req.body.fname;
  var lname = req.body.lname;
  var phone = req.body.phone;
  
  var query = "UPDATE User SET firstName='" + fname + "', lastName='" + lname + "', phoneNumber='" + phone + "' WHERE email='" + cur_user + "';";
  console.log(query);

  con.query(query, function(err) {
    if (err) {
      console.log("Update profile attempt failed");
      alerts.push({alert: "Updating profile failed, please try again.", type: "danger"});
      res.redirect(req.get('referer'));
    } else {
      console.log("Update profile success");
      alerts.push({alert: "Updated profile successfully!", type: "success"});
      res.sendFile(path.join(__dirname,'./html/profile.html'));
    }
  });
});

app.post('/update_password',urlencodedParser,  function(req, res) {
  var currPass = req.body.currPass;
  var newPass = req.body.newPass;
  var newPass2 = req.body.newPass2;
  console.log(req.body);

  var valid = true;
  if (newPass.length < 8 || newPass.length > 20) {
    alerts.push({alert: "Password must have a length between 8 and 20 characters.", type: "danger"});
    valid = false;
  }
  if (newPass != newPass2) {
    alerts.push({alert: "Passwords do not match.", type: "danger"});
    valid = false;
  }

  if (valid) {
    con.query("SELECT password FROM User WHERE Email = '" + cur_user + "'", function (err, result) {
      if (err){
        res.redirect(req.get('referer'));
      }
      var pw_hash = result[0]["password"];
      bcrypt.compare(currPass, pw_hash, function(err, res2) {
        if (res2){
          console.log("Password authenticated");
          bcrypt.hash(newPass, 10, function(err, hash) {
            var query = "UPDATE User SET password='" + hash + "' WHERE email='" + cur_user + "';";
            console.log(query);
            con.query(query, function(err) {
              if (err) {
                console.log("Update password attempt failed");
                alerts.push({alert: "Updating password failed, please try again.", type: "danger"});
                res.redirect(req.get('referer'));
              } else {
                console.log("Update password success");
                alerts.push({alert: "Updated password successfully!", type: "success"});
                res.sendFile(path.join(__dirname,'./html/profile.html'));
              }
            });
          });
        } else {
          console.log("Invalid password");
          alerts.push({alert: "Invalid password, please try again.", type: "danger"});
          res.redirect(req.get('referer'));
        }
      });
    });
  } else {
    console.log("Invalid input");
    res.redirect(req.get('referer'));
  }
});
// SUBMIT ====================================================================================================================================
app.post('/submit_post', urlencodedParser, function(req, res) {
  console.log("Received post response");
  var postText = req.body.postText;

  if (postText.length > 0) {
    var query = "INSERT INTO Posts (email, role, postText) VALUES ('" + cur_user + "', '" + cur_role + "', '" + postText + "');";
    console.log(query);

    con.query(query, function(err) {
      if (err) {
        console.log("Submit post attempt failed.");
        alerts.push({alert: "Posting failed, please try again.", type: "danger"});
        console.log(err);
      } else {
        console.log("Submit post success.");
        alerts.push({alert: "Posted successfully!", type: "success"});
      }
    });
  }
  res.sendFile(path.join(__dirname,'./html/home.html'));
});
