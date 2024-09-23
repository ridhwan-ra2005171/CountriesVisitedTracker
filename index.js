import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "LearnPostgres1",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

//below is hard coded
// let users = [
//   { id: 1, name: "Angela", color: "teal" },
//   { id: 2, name: "Jack", color: "powderblue" },
// ];
let users = []

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1",[currentUserId]);
  let countries = []; //keep track of countries for that user
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

//need to get who is the current user
async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  const users = result.rows;
  //to get user by id
  return users.find((user)=> user.id == currentUserId)
  

}

//main page
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();

  //need to get all users to be displayed
  const result = await db.query("SELECT * FROM users");
  const users = result.rows;
  //end of fetching all users

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users, //passing all users for the tab
    color: currentUser.color,
  });
});

//add country
app.post("/add", async (req, res) => {
  const input = req.body["country"]; //get the input from country
  const currentUser = await getCurrentUser(); //check current user
  try {
    
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
    
    const data = result.rows[0];
    console.log("data:", data);
    const countryCode = data.country_code; //get the country code
    
    try {
      //we insert row, having country code + current user_id
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) { //if its already visited by that user
      console.log(err);
      const countries = await checkVisisted();
      const currentUser = await getCurrentUser();
      const result = await db.query("SELECT * FROM users");
      const users = result.rows;
      res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
      error: "Country has already been added, try again.",
  });
      
    }
  } catch (err) {
    console.log(err);
  }

});

//adding new user (along with the color)
app.post("/user", async (req, res) => {
  //<input type="submit" name="add" value="new" id="tab">
  if(req.body.add === "new"){
    res.render("new.ejs") //go to the new form page
  }else{
    currentUserId = req.body.user; //whatever tab is selected will be displayed
    res.redirect("/") //back to homepage
  }
});

//HANDLING NEW USERS
//from the /new ejs page, when user writes name and choose color
app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name,color) VALUES($1, $2) RETURNING*;", [name,color]
  );

  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
