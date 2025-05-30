import express from "express";
import bodyParser from "body-parser";

// postgreSQL module
import pg from "pg";

// allows us to setup a new session to save a new user login session
import session from "express-session";
// allows login/authentication features (like email/password login, Google login, GitHub login, etc.)
// to be added to the application.
import passport from "passport";
// Strategy class for local username/password authentication
import { Strategy } from "passport-local";
// Strategy class for Google OAuth authentication
import GoogleStrategy from "passport-google-oauth2";

// used to securely hash passwords; automatically generates a random salt and hashes the password.
import bcrypt from "bcrypt";

// used for salting passwords
const saltRounds = 10;

// allows us to access our passwords and other sensitive variables from the .env file
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.APP_PORT;

// allows the application to use EJS
app.set("view engine", "ejs");

// allows the Express server to correctly read form data via the body of the request (req.body)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    // Master key the sever uses to make sure the session cookie is authentic and hasn't been altered
    // by a hacker or someone else. If the cookie does not match this secret, the server will reject the session.
    secret: process.env.SESSION_SECRET,
    // Forces the session to be saved back to the session store, even if it wasn’t modified during the request.
    // (Setting it to false means don't resave unless the session data was actually modified — good for performance.)
    resave: false,
    // Saves new sessions that are uninitialized (i.e., new but not modified) to the session store
    saveUninitialized: true,
    //
    cookie: {
      // how long the session will last before it expires (milliseconds)
      maxAge: 1000 * 60 * 60,
    },
  })
);

// intializes passport into the app; sets up passport to process incoming requests (the application will
// now look for any authentication-related information in those requests (like login attempts)).
// in simpler terms, intialize() makes Passport ready to intercept and handle login, signup, and authentication logic.
app.use(passport.initialize());
// tells passport to use session based authentication
app.use(passport.session());

// accessing the postgreSQL server
const db = new pg.Client({
  user: process.env.PG_USERNAME,
  host: "localhost",
  // access the "authentication-practice" database from the postgreSQL server
  database: "authentication-practice",
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
// connect to the postgreSQL server
db.connect();

// constants for the tables in the authentication-practice database in the postgreSQL server
const usersTable = "users";

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/secrets", async (req, res) => {
  // req.user is passed in from the callback function (cb) in the Strategy object
  console.log("req.user", req.user);
  // check to see if a session exists
  if (req.isAuthenticated()) {
    //TODO: Update this to pull in the user secret to render in secrets.ejs

    console.log(
      "typeof req.user.secret = ",
      typeof req.user.secret,
      "req.user.secret === null: ",
      req.user.secret === null
    );
    // if the user's secret field is null,
    if (req.user.secret === null) {
      // render the submit.ejs file so that the user will be prompted to submit a secret
      res.render("submit");
    } else {
      // otherwise, render the secrets.ejs file (the user's secret will be displayed)

      // if the user is authenticated (session is valid), render the secrets page/ejs file
      res.render("secrets", {
        secret: req.user.secret,
      });
    }
  } else {
    // otherwise, redirect the user to the /login route so they can authenticate themselves
    res.redirect("/login");
  }
});

// triggered when the "submit" button is clicked in the secrets.ejs file
app.get("/submit", async (req, res) => {
  // check to see if a user/session exists
  if (req.isAuthenticated()) {

  // if the user clicks the "submit" button here, that means that they want 
  // to update their secret so, render the submit.ejs file so they can do that.
  res.render("submit");
  } else {
    // otherwise, redirect the user to the /login route so they can authenticate themselves
    res.redirect("/login");
  }
});

//TODO: Add a get route for the submit button
//Think about how the logic should work with authentication.
// triggered when the "submit" button is clicked on the submit.ejs file
app.post("/submit", async (req, res) => {
  // adds a secret to the database

  // always do a check
  if (req.user === null) {
    // Throw an error, we should never reach this point though because
    // the app won't allow this route to be triggered unless a user has been authenticated
    console.error(`Error (/submit): user has not been authenticated.`);
    // redirect the end user to the login page
    res.redirect("/login");
  } else {
    console.log(
      "'/submit' route: req.body = ",
      req.body,
      "req.user = ",
      req.user
    );
    // check to see if the user's input was passed in the body of the request
    if (req.body.hasOwnProperty("secret")) {
      let newSecret = req.body.secret;
      // check to see if newSecret is an empty string
      if (newSecret.trim().length === 0) {
        // Redirect the user back to /secrets.
        // In there, the submit.ejs file will be rendered again (because the user still does not have a secret)
        // so that they can actaually add a secret this time around.
        res.redirect("/secrets");
      } else {
        // find the user in the users table
        let email = req.user.email;
        // variable to store the result of the query
        let result;

        try {
          result = await db.query(
            `SELECT * FROM ${usersTable} WHERE email = ($1)`,
            [email]
          );
        } catch (err) {
          console.error(`Error (/submit): `, err.stack);
        }

        if (result.rowCount < 1) {
          // Error: no row in the users table with that email
          console.error(
            `Error (/submit): User with email ${email} does not exist. `,
            err.stack
          );
          res.redirect("/login");
        } else if (result.rowCount > 1) {
          // Error: more than one row in the user table has that email
          res
            .sendStatus(409)
            .json(`Error (/submit): ${email} belongs to more than one user.`);
        } else {
          // update its "secret" field with the input.
          let userToUpdate = result.rows[0];
          let queryResult;
          try {
            queryResult = await db.query(
              `UPDATE ${usersTable} SET secret = ($1) WHERE email = ($2) RETURNING *`,
              [newSecret, email]
            );
            // debugging (to ensure that the update was successful)
            console.log("Updated row = ", queryResult.rows[0]);
          } catch (err) {
            console.error(
              `Error (/submit) executing UPDATE query: `,
              err.stack 
            );
          }
          // render the user to the secrets
          res.render("secrets", {
            secret: queryResult.rows[0].secret,
          });
        }
      }
    }
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

// gets triggered when the user clicks "login with google" (see login.ejs)
app.get(
  "/auth/google",
  passport.authenticate("google", {
    // this object tells google what we (the application) need from them (google)
    // application grabs the profile and the email of the user once they log in.
    scope: ["profile", "email"],
  })
);

// gets triggered once a user authenticates with google
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    // where the user gets redirected to if their Google OAuth authentication was successful
    successRedirect: "/secrets",
    // where the user gets redirected to if their Google OAuth authentication was NOT successful
    failureRedirect: "/login",
  })
);

// logs the user out, triggered when the user click the "log out" button (see secrets.ejs)
app.get("/logout", async (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(`Error occured when logging out: `, err);
    }

    // redirect the user to the home page once they have logged out
    res.redirect("/");
  });
});

app.post("/register", async (req, res) => {
  // debugging
  console.log("'/register' route: req.body = ", req.body);
  if (
    req.body.hasOwnProperty("username") &&
    req.body.hasOwnProperty("password")
  ) {
    // user submits credentials to create an account in body of the request

    let email = req.body.username;
    let pw = req.body.password;

    if (email.trim().length === 0 || pw.trim().length === 0) {
      // Error:  email or password is an empty string
      console.error(
        `Error (/register): email and/or username is an empty string.`
      );
    } else {
      try {
        // INSERT credentials into the necessary table (users) in the database (HASH password first)
        // hash password
        bcrypt.hash(pw, saltRounds, async (err, hash) => {
          if (err) {
            // error occured when trying to hash the password
            console.error(`(/register) error hashing password: `, err.stack);
          } else {
            const result = await db.query(
              `INSERT INTO ${usersTable} (email, password) VALUES ($1, $2) RETURNING *`,
              [email, hash]
            );
            // the "RETURNING *' keyword in the query returns all the columns from the user that was just inserted into the table
            const user = result.rows[0];
            // redirect the user to the secrets EJS file/page
            // res.render("secrets");

            // logs in the user & saves them to the session once they register
            req.login(user, (err) => {
              // error occured
              console.log(err);
              // redirect the user to the secrets EJS file/page
              res.redirect("/secrets");
            });
          }
        });
      } catch (err) {
        // In a real application, this error would get sent to the front end and the front end developer(s)
        // would properly display the correct error message to the end user
        console.error(
          `Error registering user with email = ${email}: `,
          err.stack
        );
        // redirect the user back to the register route
        res.redirect("/register");
      }
    }
  } else {
    // Error: for some reason, the username & password were not send in the request
    console.error(
      `Error (/register): email and/or username not sent in the body of the request.`
    );
  }
});

// user submits credential
// authenticate() triggers the local Strategy that is defined below
app.post(
  "/login",
  passport.authenticate("local", {
    // where the user gets redirected to if their authentication was successful
    successRedirect: "/secrets",
    // redirects the user back to the /login route if their authentication was unsuccessful
    failureRedirect: "/login",
  })
);

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    // debugging, this function retrieves the username & password from the front end file
    console.log("username = ", username, "password = ", password);
    if (username.trim().length === 0 || password.trim().length === 0) {
      // Error:  email or password is an empty string
      // console.error(
      //   `Error (/login): email and/or username is an empty string.`
      // );

      // return call back function with the error
      return cb(`Error (/login): email and/or username is an empty string.`);
    } else {
      // check database to see if the user exists

      // email is NOT case sensitive
      username = username.toLocaleLowerCase();

      // variable that determines whether or not a user with the email provided exists
      let exists = -1;

      // variable that stores the result of the query
      let result;
      try {
        result = await db.query(
          `SELECT * FROM ${usersTable} WHERE LOWER(email) = ($1)`,
          [username]
        );
        if (result.rows.length === 1) {
          exists = 1;
        } else if (result.rows.length > 1) {
          exists = 2;
        }

        console.log("result.rows = ", result.rows);
      } catch (err) {
        console.error(`There is no user with email = ${username}: `, err.stack);
      }

      // a user with the email provided does exist in the users table
      if (exists === 1) {
        // user found in the database
        const user = result.rows[0];
        console.log("user = ", user);
        let storedPassword = user.password;
        // take user input and compare against the hashed password stored in the database
        bcrypt.compare(password, storedPassword, async (err, result) => {
          if (err) {
            // console.error(`(/login) error comparing password: `, err.stack);
            // send the error as a parameter in the callback function
            return cb(err);
          } else {
            // check to see if their password is correct
            // result is a boolean that indicates if the user input and the stored password are the same
            console.log("result = ", result);
            if (result) {
              // user put the correct password, give them access to the site
              // cb: callback fucntion (errors, details of the user); this allows for the isAuthenticated() function in the /secrets route to work
              return cb(null, user);
            } else {
              // if not, deny them access to the site and display necessary error message
              // console.error(`Incorrect password for user with email = ${username}.`);
              // Redirect user back to the login; In a real application, the frontend developers
              // would properly display the error message and prompt the user to try loggin in again.
              // res.redirect("/login");

              // the false value for the 2nd parameter lets the application know that the user has not been authenticated
              return cb(null, false);
            }
          }
        });
      } else if (exists === 2) {
        // More than 1 user with that email
        // Only 1row should be returned
        // console.error(
        //   `Error (/login): There is more than one user with the email ${username}`
        // );

        return cb(
          `Error (/login): There is more than one user with the email ${username}`
        );
      } else {
        // user not found
        // console.error(
        //   `Error (/login): User with email = ${username} does not exist.`
        // );

        return cb(
          `Error (/login): User with email = ${username} does not exist.`
        );
      }
    }
  })
);

// Google based Strategy
passport.use(
  "google",
  new GoogleStrategy(
    {
      // client and secret are generated from the app in Google cloud
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      // gives access to the user's profile's information
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    // the function below gets triggered once the user successfully authenticates with their google account
    async (accessToken, refreshToken, profile, cb) => {
      console.log("user's google profile = ", profile);

      // Save the data from the user's profile into the users table in the postgreSQL database
      // profile.json has the following fields: email, name, email_verified (boolean), given_name, family_name, sub, & picture
      // profile also has an email field
      let email = profile.email;
      try {
        // check to see if a user with the profile.json.email already exists
        const result = await db.query(
          `SELECT * FROM ${usersTable} WHERE email = ($1)`,
          [email]
        );
        // if so, prompt the user to log in
        if (result.rowCount > 0) {
          console.log(
            `User with email ${email} already exists. Logging them in.`
          );
          cb(null, result.rows[0]);
        } else {
          // Otherwise, store this new user in the users table
          try {
            let newUser = await db.query(
              `INSERT INTO ${usersTable} (email, password) VALUES ($1, $2)`,
              [email, "google"]
            );
            // cb: callback fucntion (errors, details of the user); this allows for the isAuthenticated() function in the /secrets route to work
            cb(null, newUser);
          } catch (err) {
            console.error(
              `Error inserting user that signed in with Google OAuth into the database.`
            );
            cb(err);
          }
        }
      } catch (err) {
        // error
        console.error(
          `Error excuting query that searches for a user with email = ${email}.`
        );
        cb(err);
      }
    }
  )
);

// serializeUser() allows the application to save the data of the user that is logged in to local storage
passport.serializeUser((user, cb) => {
  // no error, user's data
  cb(null, user);
});

// deserializeUser() allows the application to transform (deserialize) the user's data back into a manner in which we (the developer(s)) can access it
passport.deserializeUser((user, cb) => {
  // no error, user's data
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

/*
// user submits credential
app.post("/login", async (req, res) => {
  
  // debugging
  console.log("'/login' route: req.body = ", req.body);
  if (
    req.body.hasOwnProperty("username") &&
    req.body.hasOwnProperty("password")
  ) {
    // user submits credentials in body of request

    // email is NOT case sensitive
    let email = req.body.username.toLowerCase();
    let pw = req.body.password;

    if (email.trim().length === 0 || pw.trim().length === 0) {
      // Error:  email or password is an empty string
      console.error(
        `Error (/login): email and/or username is an empty string.`
      );
    } else {
      // check database to see if the user exists

      // variable that determines whether or not a user with the email provided exists
      let exists = -1;

      // variable that stores the result of the query
      let result;
      try {
        result = await db.query(
          `SELECT * FROM ${usersTable} WHERE LOWER(email) = ($1)`,
          [email]
        );
        if (result.rows.length === 1) {
          exists = 1;
        } else if (result.rows.length > 1) {
          exists = 2;
        }
      } catch (err) {
        console.error(`There is no user with email = ${email}: `, err.stack);
      }

      // a user with the email provided does exist in the users table
      if (exists === 1) {
        // user found in the database
        const userWithEmail = result.rows[0];
        let storedPassword = userWithEmail.password;
        // take user input and compare against the hashed password stored in the database
        bcrypt.compare(pw, storedPassword, async (err, result) => {
          if (err) {
            console.error(`(/login) error comparing password: `, err.stack);
          } else {
            // check to see if their password is correct
            // result is a boolean that indicates if the user input and the stored password are the same
            console.log("result = ", result);
            if (result) {
              // user put the correct password, give them access to the site
              res.render("secrets");
            } else {
              // if not, deny them access to the site and display necessary error message
              console.error(
                `Incorrect password for user with email = ${email}.`
              );
              // Redirect user back to the login; In a real application, the frontend developers
              // would properly display the error message and prompt the user to try loggin in again.
              res.redirect("/login");
            }
          }
        });
      } else if (exists === 2) {
        // More than 1 user with that email
        // Only 1row should be returned
        console.error(
          `Error (/login): There is more than one user with the email ${email}`
        );
      } else {
        console.error(
          `Error (/login): User with email = ${email} does not exist.`
        );
      }
    }
  } else {
    // Error: for some reason, the username & password were not send in the request
    console.error(
      `Error (/login): email and/or username not sent in the body of the request.`
    );
  }

  
});
*/
