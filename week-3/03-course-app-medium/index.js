const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const fs = require('fs');

app.use(express.json());

// Create two secret tokens: one for the users and one for the admin
const user_secret = "sec_dfre12";
const admin_secret = "rew_dsfi";

// // Create global variables to store the data
// let ADMINS = [];
// let USERS = [];
// let COURSES = [];
// let USER_PURCHASES = new Map();

// In contrast to the previous assignment, here we will persist the admins, users, courses and purchases in our local file system.
// Hence, on starting the app, we need to load those from our native file system
function read_file_and_parse_json(file_path) {
  // Data must be read synchronously here,  because we dont want to make 
  // Any API calls before actually loading the existing data
  try{
    var data = fs.readFileSync(file_path, "utf-8");
    data = JSON.parse(data);
    return data;
  }
  catch(err) {
    console.log(err.message);
    return [];
  }
}

let ADMINS = read_file_and_parse_json("admins.json");
let USERS = read_file_and_parse_json("users.json");
let COURSES = read_file_and_parse_json("courses.json");
let USER_PURCHASES = read_file_and_parse_json("purchases.json");

// Convert the USER_PURCHASES object into a map
var map = new Map();

for (const key in USER_PURCHASES) {
  if (USER_PURCHASES.hasOwnProperty(key)) {
    map.set(key, USER_PURCHASES[key]);
  }
}

USER_PURCHASES = map;


// Create incremental IDs for courses 
// This will start from the max of the existing courses
let current_course_id = 1;
if (COURSES.length > 0){
  let current_ids = COURSES.map((data) => {return data.id});
  let current_max = Math.max(...current_ids);
  current_course_id = current_max + 1;
}

// Create a function to encrypt an admin using jwt
function generate_admin_token(user){
  // Encrypt the user using the user_secret key
  token = jwt.sign(user, admin_secret, {expiresIn: '1h'});
  return token;
}

// Create a middleware to verify the identity of an admin who has already been signed up
const authenticate_admin = (req, res, next) => {
  try{
    // Get the authorization key and extract the key by removing the bearer tag from it
    const tmp = req.headers.authorization;
    const token = tmp.split(" ")[1];

    // Verify the user
    jwt.verify(token, admin_secret, (err, user) => {
      if (err){
        return res.status(403).send({message: "Forbidden", err});
      }
      next();
    });
    
  }
  // If there has been some issue internally, i.e. above code didn't work, exit gracefully
  catch(err){
    res.status(500).send({error: "Couldn't authenticate the admin"});
  }
}

// Create a function to encrypt a user using jwt
function generate_user_token(user){
  // Encrypt the user using the user_secret key
  token = jwt.sign(user, user_secret, {expiresIn: '1h'});
  return token;
}

// Create a middleware to verify the identity of a user 
// who has already signed up
const authenticate_user = (req, res, next) => {
  try{
    // Get the authorization key and extract the key by removing the bearer tag from it
    const tmp = req.headers.authorization;
    const token = tmp.split(" ")[1];

    // Verify the user
    jwt.verify(token, user_secret, (err, user) => {
      if (err){
        return res.status(403).send({message: "Forbidden", err});
      }
      next();
    });
    
  }
  // If there has been some issue internally, i.e. above code didn't work, exit gracefully
  catch(err){
    res.status(500).send({error: "Couldn't authenticate the user"});
  }
}

// Admin routes
app.post('/admin/signup', (req, res) => {
  try {
    // logic to sign up admin

    // Check if the admin already exists in the database
    const admin_body = req.body
    const existingAdmin = ADMINS.find((admin) => admin_body.username === admin.username && admin_body.password === admin.password)

    if (existingAdmin){
      res.status(400).send({error: "Admin already exists"})
    }
    else {
      // create an admin
      token = generate_admin_token({username: admin_body.username});
      
      ADMINS.push(admin_body);
      fs.writeFileSync("admins.json", JSON.stringify(ADMINS));

      res.status(200).send({message: "User Created Successfully", token: token});
    }
  }
  catch(error) {
    res.status(500).send({error: "Cannot create the user"});
  }
});

app.post('/admin/login', (req, res) => {
  // logic to log in admin
  try{
    // Extract the admin's username and password
    let admin_name = req.headers.username;
    let admin_pw = req.headers.password;

    // Find the admin in our global ADMINS list
    let admin = ADMINS.find((ad) => ad.username == admin_name && ad.password === admin_pw)
    
    if(admin) {
      token = generate_admin_token({username: admin_name}, admin_secret, {expiresIn: "1hr"});
      res.status(200).send({message: "Logged in Successfully", token});
    }
    else{
      res.status(400).send({message: "Admin doesn't exist"});
    }
  }
  catch (err){
    // Handle any server error gracefully
    res.status(500).send({error: "Login could not succeed."});
  }
});

app.post('/admin/courses', authenticate_admin, (req, res) => {
  try{
    
    // logic to create a course
    let course_body = req.body;

    // Check if the course already exists in the COURSES published so far
    let exists = COURSES.find((course) => course.title === course_body.title && 
                                          course.description == course_body.description && 
                                          course.price === course_body.price && 
                                          course.imageLink === course_body.imageLink)

    // Only add the course if it does not currently exist in the courses array
    if (exists) {
      res.status(400).send({message: "Course already exists. Cannot add again"});
    }
    else {
      // Create a course and attach it the current ID and increment the ID subsequently
      course_body.id = current_course_id;
      current_course_id += 1;
      COURSES.push(course_body);
      fs.writeFileSync("courses.json", JSON.stringify(COURSES));
      res.status(200).send("Created successfully");
    }
  }
  catch(err) {
    res.status(500).send({message: "Cannot view the courses at this time", error: err.message});  
  }
});

app.put('/admin/courses/:courseId', authenticate_admin, (req, res) => {
  // logic to edit a course

  try{
    // logic to create a course
    let course_body = req.body;
    let cid = parseInt(req.params.courseId);

    // Check if the courseID is present in the list of courses created so far
    let exists = COURSES.findIndex(course => course.id === cid)

    // Only update the course if it does not currently exist in the courses array
    if (exists === -1) {
      res.status(400).send({message: "No course found with the given ID"});
    }
    else {
      // Update the course with the specified ID
      course_body.id = cid;
      COURSES[exists] = course_body;
      fs.writeFileSync("courses.json", json.stringify(COURSES));
      res.status(200).send("Updated course successfully");
    }
  }
  catch(err) {
    res.status(500).send({message: "Cannot update the course right now", error: err.message});  
  }

});

app.get('/admin/courses', authenticate_admin, (req, res) => {
  // logic to get all courses
  try{
    // Send all the courses created (Published or otherwise to the admin)
    res.status(200).send(COURSES);
  }
  catch(err) {
    res.status(500).send({error: "Internal Server Error"});
  }
});

// User routes
app.post('/users/signup', (req, res) => {
  // logic to sign up a user

  try {
    // Check if the user already exists in the database
    const user_body = req.body
    const existingUser = USERS.find((usr) => usr.username === user_body.username && 
                                             usr.password === user_body.password)

    if (existingUser){
      res.status(400).send({error: "User already exists"})
    }
    else {
      // create an user
      token = generate_user_token({username: user_body.username});
      USERS.push(user_body);
      fs.writeFileSync("users.json", JSON.stringify(USERS));
      res.status(200).send({message: "User Created Successfully", token: token});
    }
  }
  catch(error) {
    res.status(500).send({error: "Cannot create the user"});
  }
});

app.post('/users/login', (req, res) => {
  // logic to log in user
  try{
    // Extract the user's username and password
    let user_username = req.headers.username;
    let user_pw = req.headers.password;

    // Find the user in our global ADMINS list
    let user = USERS.find((usr) => usr.username == user_username && 
                                   usr.password === user_pw)
    
    if(user) {
      token = generate_user_token({username: user_username}, user_secret, {expiresIn: "1hr"});
      res.status(200).send({message: "Logged in Successfully", token});
    }
    else{
      res.status(400).send({message: "User doesn't exist"});
    }
  }
  catch (err){
    // Handle any server error gracefully
    res.status(500).send({error: JSON.stringify(err.message)});
  }
});

app.get('/users/courses', authenticate_user, (req, res) => {
  // logic to list all courses
  try {
    // Filter out courses which are not published yet
    filtered_courses = COURSES.filter(cr => cr.published);

    // Send all the filtered courses
    res.status(200).send({courses: filtered_courses});
  }
  catch(err) {
    res.status(500).send("Please try again later");
  }

});

app.post('/users/courses/:courseId', authenticate_user, (req, res) => {
  // logic to purchase a course
  try{
    // Extract username from the authentication token
    token = req.headers.authorization.split(" ")[1];
    jwt.verify(token, user_secret, (err, user) => {
      let name = user.username;

      // Find the user in the map and register the purchase against their name
      let user_purchases = USER_PURCHASES.get(name);

      // Check if the said courseId exists and is published currently
      // If either of the two is not satisfied, then send an error
      let cid = parseInt(req.params.courseId);
      var exists = COURSES.findIndex(crs => crs.id === cid)
      var published = COURSES.findIndex(crs => crs.id === cid && crs.published)
      if (exists !== -1){
        if (published === -1) {
          return res.status(400).send({message: "Requested course is not yet published"})
        }
      }
      else{
        return res.status(400).send({message: "Provided course ID is invalid"})
      }

      // If they haven't purchased anything before, register them in the 
      // Map of USER_PURCHASES and assign a list of purchased course ids
      // Against their names, else just append the purchased course in the map
      if (user_purchases) {
        user_purchases.push(cid);
      }
      else {
        user_purchases = [cid];
      }

      USER_PURCHASES.set(name, user_purchases);
      const mapObj = Object.fromEntries(USER_PURCHASES);
      fs.writeFileSync("purchases.json", JSON.stringify(mapObj));
      console.log(USER_PURCHASES);
      return res.status(200).send({message: `Course ${cid} purchased successfully!`})
    });
  }
  catch(err) {
    res.status(500).send({message: "Cannot purchase the course right now", error: err.message});
  }

});

app.get('/users/purchasedCourses', (req, res) => {
  // logic to view purchased courses
  try{
        // Extract username from the authentication token
        token = req.headers.authorization.split(" ")[1];

        // Verify the user and extract their username from the token provided
        jwt.verify(token, user_secret, (err, user) => {
          let name = user.username;
    
          // Find the user in the map and register the purchase against their name
          let user_purchases = USER_PURCHASES.get(name);

          // Find the courses corresponding to the IDs
          if (user_purchases){
            // Get the actual course description from the course IDs
            var purchased_courses = user_purchases.map((cid) => COURSES.find((crs) => crs.id === cid));
            res.status(200).send({courses: purchased_courses});
          }
          else {
            // This user hasn't bought any courses, hence returning empty list
            res.status(200).send({courses: []})
          }
        });
  }
  catch(err) {
    res.status(500).send({message: "Cannot view purchased courses currently"});
  }

});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
