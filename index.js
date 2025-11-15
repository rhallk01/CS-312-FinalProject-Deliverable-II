//Add import statements
import express from "express";
import bodyParser from "body-parser";
import methodOverride from 'method-override';
import pg from "pg";
import ejs from "ejs";
import multer from "multer";
import path from "path";

//set up express and the port
const app = express();
const port = 3000;
app.engine("ejs", ejs.__express);

//connect to database  
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "RecipeDB",
  password: "#Hammer25!",
  port: 5432,
});
db.connect();

//tell express what folder the static files are, make them accessible with relative urls
app.use(express.static("public"));
//parse data that is recieved
app.use(bodyParser.urlencoded({ extended: true }));


app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      var method = req.body._method
      console.log(method,req.body._method)
      delete req.body._method
      return method
    }
  }))


// Configure file upload storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

const upload = multer({ storage: storage });


//set up tags variables to be used later
var tags = ["all", "gluten free" ,"nut free", "vegetarian", "keto", "vegan"];
var cuisineTypeTags = ["all", "Indian" ,"Chinese", "Mediterranian", "UK", "USA", "Mexican"];
var mealTypeTags = ["all", "breakfast" ,"lunch", "dinner", "snack"];
//set up variables to track the current user  
let currentUserId;
let currentUserName; 

//function to get posts  
async function getPosts() {
  const result = await db.query("SELECT * FROM recipes");

  const posts = result.rows.map((post) => ({
    name: post.creator_name,
    title: post.title,
    content: post.body,
    time: post.time_updated,
    initTime: post.date_created,
    id: post.recipe_id,
    tag: post.tag,
    creator_id: post.creator_user_id,
    cook_time: post.cook_time,
    ingredients: post.ingredients,
    difficulty: post.difficulty,
    image_path: post.image_path,
    mealType: post.mealtype,
    cuisineTag: post.cuisinetag,
    notes: post.notes
  }));
  return posts;
}

//standard home page render, send recipe post, tags list, and current page
app.get("/", async (req, res) => {
  var allPosts = await getPosts();
  //const currentUser = await getCurrentUser();
  res.render("index.ejs", {allPosts: allPosts, tags:tags, mealTypeTags:mealTypeTags, cuisineTypeTags:cuisineTypeTags, currentPage: 'index', currentUserId: currentUserId});
});

//render login page  
app.get("/login", (req, res) => {
  res.render("login.ejs", { error: '' });
});

//render registration page  
app.get("/register", (req, res) => {
  res.render("register.ejs", { error: '' });
});

//handle submitted register request  
app.post("/register", async (req, res) => {
  //get the username, userid, and password that was entered
  const userName = req.body.username;
  const userId = req.body.user_id;
  const password = req.body.password;

  //get all instances of rows in the database with the user id that was entered
  //this is to make sure that it doesn't already exist, as it must be unique
  try {
    const checkResult = await db.query("SELECT * FROM users WHERE user_id = $1", [
      userId,
    ]);

    //if there aren't zero results, render exists message
    if (checkResult.rows.length > 0) {
      res.render("register.ejs", { error: "User ID already exists. Try logging in" });
    } else {
      await db.query(
        "INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)",
        [userId, password, userName]
      );
      //set the current user to the new user and go back to home
      currentUserId = userId;
      currentUserName = userName; 
      return res.redirect("/");
    }
  } catch (err) {
    //error
    console.log(err);
  }
});

//handle submitted login request  
app.post("/login", async (req, res) => {
  //get the userid and password that was entered
  const userId = req.body.user_id;
  const password = req.body.password;

  //get all instances of rows in the database with the user id that was entered
  //make sure this user id exists and that the passwords match
  try {
    const result = await db.query("SELECT * FROM users WHERE user_id = $1", [
      userId,
    ]);
    //if returns 1, exists! 
    if (result.rows.length > 0) {
      //get the row and store the password for checking
      const user = result.rows[0];
      const storedPassword = user.password;

      //check if entered password matches db password
      if (password === storedPassword) {
        //if so, store current user and redirect home
        currentUserId = user.user_id;
        currentUserName = user.name;
        res.redirect("/");
      } else {
        //if incorrect password, show message on login page
        res.render("login.ejs", { error: "Incorrect password" });
      }
    } else {
      //if user id doesnt exist, show message on login page
      res.render("login.ejs", { error: "User not found" });
    }
  } catch (err) {
    //catch error
    console.log(err);
  }
});

//render make recipe post page
app.get("/form", (req, res) => {
  //make sure they are a user!  
  if (!currentUserId){
    return res.redirect('/');
  }
  res.render("form.ejs", {tags:tags, cuisineTypeTags:cuisineTypeTags, mealTypeTags:mealTypeTags});
});

//if the home button is clicked, redirect to home page render
app.get("/clickHome", (req, res) => {
  return res.redirect('/');
});

//submit a recipe post, then go back to home page
app.post('/submitPost', upload.single('image'), async (req, res) => {
    //make sure they are a user! 
    if (!currentUserId){
      return res.redirect('/');
    }
  
    //retrieve name, title, content, and tag from form
    const creatorName = currentUserName;
    const creatorID = currentUserId;
    const recipeTitle = req.body.recipeTitle;
    const content = req.body.content;
    const instructions = req.body.instructions;
    const ingredients = req.body.ingredients;
    const tagName = req.body.tagName.toLowerCase();
    const difficulty = parseInt(req.body.difficulty);
    const imagePath = req.file ? '/uploads/' + req.file.filename : null;
    const cookTime = parseInt(req.body.cookTime) || 0;
    const cuisineTag = req.body.cuisineTag.toLowerCase();
    const mealType = req.body.mealType.toLowerCase();
    const notes = req.body.notes || null;

    //add post to DB 
    const result = await db.query(
      "INSERT INTO recipes (creator_name, creator_user_id, title, body, date_created, time_updated, tag, difficulty, instructions, image_path, cook_time, cuisinetag, mealtype, ingredients, notes) VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING recipe_id;",
      [creatorName, creatorID, recipeTitle, content, tagName, difficulty, instructions, imagePath, cookTime, cuisineTag, mealType, ingredients, notes]
    );
    
    const newPostId = result.rows[0].recipe_id;

    // add recipe ID to user's submitted_recipes
    await db.query(`
      UPDATE users
      SET submitted_recipes = array_append(submitted_recipes, $1)
      WHERE user_id = $2;
    `, [newPostId, currentUserId]);   
      
    //redirect to home page
    return res.redirect('/');
});

//if the user chooses tags from the dropdowns to sort by and clicks the
//filter button, show only correctly tagged posts on home page
app.post("/tagSort", async (req, res) => {
  //get tags from request, if all show all recipe posts
  const { tag, cuisineTag, mealType } = req.body;
  const allPosts = await getPosts();

  // filter by tags
  let filtered = allPosts.filter(p => {
    const matchesTag = tag === "all" || p.tag?.toLowerCase() === tag.toLowerCase();
    const matchesCuisine = cuisineTag === "all" || p.cuisineTag?.toLowerCase() === cuisineTag.toLowerCase();
    const matchesMeal = mealType === "all" || p.mealType?.toLowerCase() === mealType.toLowerCase();
    return matchesTag && matchesCuisine && matchesMeal;
  });

  //render home page with filtered posts 'taggedPosts' as tags
  res.render("index.ejs", {
    allPosts: filtered,
    tags,
    cuisineTypeTags,
    mealTypeTags,
    currentPage: "index"
  });
});

//save recipe to profile
app.post("/saveRecipe", async (req, res) => {
  //if not logged in, redirect to login
  if (!currentUserId) return res.redirect("/login");

  //get id of recipe clicked on
  const recipeId = parseInt(req.body.recipeId);
  //find in db by id
  try {
    //update users table by user_id to add the recipe id
    //to the saved_recipes column
    await db.query(`
      UPDATE users
      SET saved_recipes = array_append(saved_recipes, $1)
      WHERE user_id = $2;
    `, [recipeId, currentUserId]);
    //redirect home
    res.redirect("/");
  } catch (err) {
    console.error("error saving recipe:", err);
    res.status(500).send("Save failed");
  }
});

//go to profile page
app.get("/profile", async (req, res) => {
  //if user not logged in, redirect to login page
  if (!currentUserId) return res.redirect("/login");

  try {
    //find user in db, make sure they exist
    const userResult = await db.query("SELECT * FROM users WHERE user_id = $1", [currentUserId]);
    const user = userResult.rows[0];

    // get the recipes that the user has in saved_recipes by searching the recipes database
    //for any entries whose recipe_id is in the users saved_recipes
    const saved = user.saved_recipes.length
      ? await db.query("SELECT * FROM recipes WHERE recipe_id = ANY($1::int[])", [user.saved_recipes])
      : { rows: [] };

    // get the recipes that the user has in submitted_recipes by searching the recipes database
    //for any entries whose recipe_id is in the users submitted_recipes
    const submitted = user.submitted_recipes.length
      ? await db.query("SELECT * FROM recipes WHERE recipe_id = ANY($1::int[])", [user.submitted_recipes])
      : { rows: [] };

    //get collections from user row
    const collections = await db.query("SELECT * FROM collections WHERE user_id = $1", [currentUserId]);

    //reder profile page with the above info
    res.render("profile.ejs", {
      user,
      saved: saved.rows,
      submitted: submitted.rows,
      collections: collections.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Profile failed to load");
  }
});

//add collections tp profile
app.post("/addCollection", async (req, res) => {
  //if current user isnt logged in, redirect to login
  if (!currentUserId) return res.redirect("/login");

  //get new collection name 
  const { name } = req.body;
  try {
    //insert a collection into the collection database, with the name of the collection and the user it belongs to 
    await db.query("INSERT INTO collections (user_id, name) VALUES ($1, $2)", [currentUserId, name]);
    //redirect to profile
    res.redirect("/profile");
  } catch (err) {
    console.error("Error adding collection:", err);
    res.status(500).send("Could not add collection");
  }
});

// add a saved or submitted recipe to a collection
app.post("/addToCollection", async (req, res) => {
  //if user not logged in, redirect to login page
  if (!currentUserId) {
    return res.redirect("/login");
  }

  const { recipe_id, collection_id } = req.body;
  const recipeId = parseInt(recipe_id);
  const collectionId = parseInt(collection_id);

  try {
    // get current recipe_ids in the selected collection
    const result = await db.query("SELECT recipe_ids FROM collections WHERE id = $1 AND user_id = $2", [collectionId, currentUserId]);
    if (result.rows.length === 0) {
      return res.status(404).send("not found");
    }

    let recipeIds = result.rows[0].recipe_ids || [];

    // avoid duplicates
    if (!recipeIds.includes(recipeId)) {
      recipeIds.push(recipeId);
    }

    // update collection
    await db.query("UPDATE collections SET recipe_ids = $1 WHERE id = $2", [recipeIds, collectionId]);
    res.redirect("/profile");
  } catch (err) {
    console.error("Error adding recipe to collection:", err);
    res.status(500).send("Internal Server Error");
  }
});


//start the Express server
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});