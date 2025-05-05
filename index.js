import express from "express";
import bodyParser from "body-parser";

// postgreSQL module
import pg from "pg";

// used to securely hash passwords; automatically generates a random salt and hashes the password.
import bcrypt from "bcrypt";

// used for salting passwords
const saltRounds = 10;

// allows us to access our passwords and other sensitive variables from the .env file
import dotenv from "dotenv";
import e from "express";
dotenv.config();

const app = express();
const port = 3000;

// allows the application to use EJS
app.set("view engine", "ejs");

// allows the Express server to correctly read form data via the body of the request (req.body)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// accessing the postgreSQL server
const db = new pg.Client({
  user: process.env.PG_USERNAME,
  host: "localhost",
  // access the "authentication-practice" database from the postgreSQL server
  database: "authentication-practice",
  password: process.env.PG_PASSWORD,
  port: 5432,
});
// connect to the postgreSQL server
db.connect();

// constants for the tables in the authentication-practice database in the postgreSQL server
const usersTable = "users";

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
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
              `INSERT INTO ${usersTable} (email, password) VALUES ($1, $2)`,
              [email, hash]
            );

            // redirect the user to the secrets EJS file/page
            res.render("secrets");
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
            console.log('result = ', result);
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
