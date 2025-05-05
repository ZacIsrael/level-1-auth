import express from "express";
import bodyParser from "body-parser";

// postgreSQL module
import pg from "pg";

// allows us to access our passwords and other sensitive variables from the .env file
import dotenv from "dotenv";
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
        const result = await db.query(
          `INSERT INTO ${usersTable} (email, password) VALUES ($1, $2)`,
          [email, pw]
        );

        // redirect the user to the secrets EJS file/page
        res.render("secrets");
      } catch (err) {
        console.error(
          `Error registering user with email = ${email}: `,
          err.stack
        );
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
      // check database to see if the user exists or if their password is correct
      try {
        const result = await db.query(
          `SELECT * FROM ${usersTable} WHERE LOWER(email) = ($1) AND password = ($2);`,
          [email, pw]
        );
        console.log("(/login): result.rows = ", result.rows);
        if (result.rows.length !== 1) {
          // Only one row should be returned
          console.error(
            `Error (/login): There is more than one user with the email ${email}`
          );
        } else {
          // if so, allows the user access to the site
          // redirect the user to the secrets EJS file/page
          res.render("secrets");
        }
      } catch (err) {
        // if not, deny them access to the site and display necessary error message
        console.error(
          `Error loggin in user with email = ${email}: `,
          err.stack
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
