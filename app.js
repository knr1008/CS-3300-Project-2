var express = require('express');
var path = require('path');
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
const validator  = require('express-validator');
var mysql = require('mysql');
var appDir = path.dirname(require.main.filename);
const bcrypt = require('bcryptjs');
require('dotenv').config({path: appDir + '/.env'});

const fs = require("fs");

var app = express();
const multer = require('multer');

var upload = multer({
  dest: path.join(__dirname, './html/assets/temp')
});

app.use('/assets/css', express.static('css'));
app.use(express.static('html'));
app.use('/assets/js', express.static('js'));
// app.use(validator());

var con;
var cur_post = null;
var alerts = [];
var check_filter = null

var api = express.Router();

const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./db/database.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the in-memory SQlite database.');
});

//starts app
app.listen(8000, () => {
  console.log('Project2 listening on port 8000!');
});

app.get("/", express.static(path.join(__dirname, "./html/assets/public")));

//loads login page on start up
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

  var query4 = "SELECT email FROM User;";
  db.all(query4, [], (err, rows) => {
    if (err) {
      console.log("Failed to pull emails from database.")
      console.log(err);
      res.sendFile(path.join(__dirname,'./html/login.html'));
    } else {
      console.log('Data received from Db:\n');
      console.log(rows);

      var check = false;

      rows.forEach((d) => {
        if (d.email.toLowerCase() == email.toLowerCase()) {
          check = true;
        }
      });

      if (!check) {
        alerts.push({alert: "Invalid username.", type: "danger"});
      }
    }
  });

  //checks login against database
  var request = "SELECT email, password FROM User WHERE email = '" + email + "'";
  db.all(request, [], (err, result) => {
    if (err){
      res.sendFile(path.join(__dirname,'./html/login.html'));
    }
    if (alerts.length != 0){
      console.log("Invalid username");
      res.sendFile(path.join(__dirname,'./html/login.html'));
    } else {
      var pw_hash = result[0]["password"];
      var email = result[0]["email"];
      bcrypt.compare(password, pw_hash, function(err, res2) {
        if (res2){
          console.log("Authenticated");
          cur_user = email;
          console.log(cur_user)
          res.sendFile(path.join(__dirname,'./html/home.html'));
        } else {
          console.log("Invalid password");
          alerts.push({alert: "Invalid password.", type: "danger"});
          res.sendFile(path.join(__dirname,'./html/login.html'));
        }
      });
    }
  });
});

// REGISTER ===========================================================================================================================================================
app.post('/register',urlencodedParser,  function(req, res) {
  var fname = req.body.fname;
  var lname = req.body.lname;
  var email = req.body.email.toLowerCase();
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

  var query4 = "SELECT email FROM User;";
  db.all(query4, [], (err, rows) => {
    if (err) {
      console.log("Failed to pull emails from database.")
      console.log(err);
      res.redirect(req.get('referer'));
    } else {
      console.log('Data received from Db:\n');
      console.log(rows);

      var check = false;

      rows.forEach((d) => {
        if (d.email.toLowerCase() == email) {
          check = true;
        }
      });

      if (check) {
        alerts.push({alert: "Email already exists in the database.", type: "danger"});
      }
    }
  });

  if (valid) {
    bcrypt.hash(password, 10, function(err, hash) {
      var query = "INSERT INTO User (password, firstName, lastName, email, phoneNumber, lastLogin) "+
      "VALUES ('" + hash + "', '" + fname + "', '" + lname + "', '" + email + "', '" + phone + "', null);";

      console.log(query);
      db.run(query, [], (err) => {
        if (err) {
          console.log("Registration attempt failed");
          if (alerts.length == 0) {
            alerts.push({alert: "Registration attempt failed, please try again.", type: "danger"});
          }
          console.log(err);
          res.redirect(req.get('referer'));
        } else {
          console.log("Registration success");
          alerts.push({alert: "Registered successfully!", type: "success"});

          // send an email to newly registered user
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

          res.sendFile(path.join(__dirname,'./html/login.html'));
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
  db.all("SELECT * FROM User WHERE Email = '" + cur_user + "';", [], (err,rows) => {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_posts', urlencodedParser, function(req, res){
  console.log("Arrived on home page.");
  db.all("SELECT * FROM Posts ORDER BY Posts.postDate ASC;" , [], (err,rows) => {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_individual_post', urlencodedParser, function(req, res) {
  console.log("Arrived on Post" + cur_post);
  db.all("SELECT * FROM Posts WHERE postId='" + cur_post + "';", [], (err, row) => {
    if (err) throw err;
    console.log('Data received from Db:\n');
    console.log(row);
    res.json(row);
  });
});

app.get('/pull_contact_choice', urlencodedParser, function(req, res) {
  var email;

  db.get("SELECT * FROM Posts WHERE postId='" + cur_post + "';", [], (err, row1) => {
    if (err) throw err;
    email = row1.email;
    db.all("SELECT * FROM User WHERE email='" + email + "';", [], (err, row2) => {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(row2);
      res.json(row2);
    });
  });
});

app.get('/pull_my_posts', urlencodedParser, function(req, res) {
  console.log("Arrived on my posts page.");
  db.all("SELECT * FROM Posts WHERE email='" + cur_user + "';", [], (err, rows) => {
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

  db.all(query, [], (err) => {
    if (err) {
      console.log("Update profile attempt failed");
      alerts.push({alert: "Updating profile failed, please try again.", type: "danger"});
      res.sendFile(path.join(__dirname,'./html/update-info.html'));
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
    db.all("SELECT password FROM User WHERE Email = '" + cur_user + "'", [], (err, result) => {
      if (err){
        alerts.push({alert: "Error has occurred, please try again.", type: "danger"});
        res.sendFile(path.join(__dirname,'./html/update-password.html'));
      }
      var pw_hash = result[0]["password"];
      bcrypt.compare(currPass, pw_hash, function(err, res2) {
        if (res2){
          console.log("Password authenticated");
          bcrypt.hash(newPass, 10, function(err, hash) {
            var query = "UPDATE User SET password='" + hash + "' WHERE email='" + cur_user + "';";
            console.log(query);
            db.run(query, [], function(err) {
              if (err) {
                console.log("Update password attempt failed");
                alerts.push({alert: "Updating password failed, please try again.", type: "danger"});
                res.sendFile(path.join(__dirname,'./html/update-password.html'));
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
          res.sendFile(path.join(__dirname,'./html/update-password.html'));
        }
      });
    });
  } else {
    console.log("Invalid input");
    res.sendFile(path.join(__dirname,'./html/update-password.html'));
  }
});
// SUBMIT ====================================================================================================================================
app.post('/submit_post', upload.single("file"), function(req, res) {
  console.log("Received post response");
  var postTitle = req.body.postTitle;
  var postText = req.body.postText;
  var contactChoice = req.body.contactChoice;

  var query = "INSERT INTO Posts (email, title, postText, notification) VALUES ('" + cur_user + "', '" + postTitle + "', '" + postText + "', '" + contactChoice + "');";
  console.log(query);

  db.run(query, [], (err) => {
    if (err) {
      console.log("1 Submit post attempt failed.");
      alerts.push({alert: "Posting failed, please try again.", type: "danger"});
      console.log(err);
    } else {
      console.log("2 Submit post success.");
    }
  });

  if (alerts.length == 0) {
    var query2 = "SELECT * FROM Posts WHERE email='" + cur_user + "' ORDER BY Posts.postId DESC;";
    var query3 = "DELETE FROM Posts WHERE email IN (SELECT email FROM Posts WHERE email='" + cur_user + "' ORDER BY Posts.postId DESC LIMIT 1);";
    console.log(query2);
    console.log(query3);
    db.get(query2, [], (err, row) => {
      if (err) {
        console.log("3 Submit post attempt failed.");
        alerts.push({alert: "Posting failed, please try again.", type: "danger"});
        console.log(err);
        db.run(query3, [], (err) => {
          if (err) {
            console.log("4 Failed to delete from database.");
            console.log(err);
          } else {
            console.log("5 Deleted post in database.");
          }
        });
      } else {
        const tempPath = req.file.path;
        const targetPath = path.join(__dirname, "./html/assets/uploadedImages/" + row.postId + ".png");
        if (path.extname(req.file.originalname).toLowerCase() == ".png") {
          fs.rename(tempPath, targetPath, err => {
            if (err) {
              console.log("6 Submit post attempt failed.");
              alerts.push({alert: "Posting failed, please try again.", type: "danger"});
              console.log(err);
              db.run(query3, [], (err) => {
                if (err) {
                  console.log("7 Failed to delete from database.");
                  console.log(err);
                } else {
                  console.log("8 Deleted post in database.");
                }
              });
            } else {
              console.log("9 Successfully uploaded image to directory.");
              alerts.push({alert: "Posted successfully!", type: "success"});

              //Send email out to all other users 
              var query4 = "SELECT email FROM User;";
              db.all(query4, [], (err,rows) => { // get all target users' email
                if (err) {
                  console.log(err);
                } else {
                  console.log('Data received from Db:\n');
                  console.log(rows);

                  rows.forEach((d) => { // use email to send notification to each user
                    //send an email out to all other users
                    if (cur_user.toLowerCase() != d.email.toLowerCase()) {
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
                        to: d.email,
                        subject: 'New Listing in Buzz Marketplace',
                        text: 'A new post has been listed in the Buzz Marketplace'
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
                }
              });
            }
          });
        } else {
          fs.unlink(tempPath, err => {
            if (err) {
              console.log(err);
            } else {
              console.log("Uploaded image not a PNG file.");
              alerts.push({alert: "Uploaded image failed, must use a PNG file.", type: "danger"});
              db.run(query3, [], (err) => {
                if (err) {
                  console.log("10 Failed to delete from database.");
                  console.log(err);
                } else {
                  console.log("11 Deleted post in database.");
                }
              });
            }
          });
        }
      }
    });
  }
  
  res.sendFile(path.join(__dirname,'./html/home.html'));
});

// DELETE ====================================================================================================================================
app.post('/deletepost', urlencodedParser, function(req, res) {
  console.log("Received post response");
  cur_post = req.body.postId;

  var query = "DELETE FROM Posts WHERE postId IN (SELECT postId FROM Posts WHERE postId='" + cur_post + "' LIMIT 1);";
  db.run(query, [], (err) => {
    if (err) {
      console.log("Failed to delete post.")
      console.log(err);
      alerts.push({alert: "Failed to delete your post. Try again", type: "danger"});
    } else {
      console.log("Succeeded in deleting post.");
      const targetPath = path.join(__dirname, "./html/assets/uploadedImages/" + cur_post + ".png");
      fs.unlink(targetPath, err => {
        if (err) {
          console.log(err);
          alerts.push({alert: "Failed to delete image.", type: "danger"});
        } else {
          console.log("Successfully deleted image");
          alerts.push({alert: "Successfully deleted post.", type: "success"});
        }
      });
    }
  });

  res.sendFile(path.join(__dirname,'./html/myposts.html'));
});
