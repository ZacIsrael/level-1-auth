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

  // user submits credentials to create an account in body of the request

  // INSERT credentials into the necessary table (users) in the database 

});

// user submits credential
app.post("/login", async (req, res) => {

  // user submits credentials in body of request

  // check database to see if the user exists or if their password is correct

  // if so, allows the user access to the site

  // if not, deny them access to the site and display necessary error message

});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
