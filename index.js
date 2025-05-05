import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

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
    let email = req.body.username;
    let pw = req.body.password;

    if(email.trim().length === 0 || pw.trim().length() === 0){
      // Error:  email or password is an empty string
      console.error(`Error (/register): email and/or username is an empty string.`);
    } else {

    // user submits credentials to create an account in body of the request

    // INSERT credentials into the necessary table (users) in the database
  
  }
  
  } else {
    // Error: for some reason, the username & password were not send in the request
    console.error(`Error (/register): email and/or username not sent in the body of the request.`);
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

    let email = req.body.username;
    let pw = req.body.password;

    if(email.trim().length === 0 || pw.trim().length() === 0){
      // Error:  email or password is an empty string
      console.error(`Error (/login): email and/or username is an empty string.`);
    } else {

    // user submits credentials in body of request

    // check database to see if the user exists or if their password is correct

    // if so, allows the user access to the site

    // if not, deny them access to the site and display necessary error message


  }
  } else {
    // Error: for some reason, the username & password were not send in the request
    console.error(`Error (/login): email and/or username not sent in the body of the request.`);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
