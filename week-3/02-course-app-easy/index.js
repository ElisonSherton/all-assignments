const express = require('express');
const app = express();

app.use(express.json());

let ADMINS = [];
let USERS = [];
let COURSES = [];
let USER_COURSE_PURCHASES = new Map();
let current_course_id = 1;
let current_user_id = 1;

// Admin routes
app.post('/admin/signup', (req, res) => {
  // logic to sign up admin
  let signup_body = req.body;
  ADMINS.push(signup_body);
  res.status(200).send({message: "Admin created successfully"});
});

function admin_auth(username, password) {
  let admin_authenticated = false;

  // If an admin is authentic, then this will turn the above flag to true
  ADMINS.every((admin) => {
    if (admin.username == username && admin.password == password){
      admin_authenticated = true;
      return false;
    }
    return true;
  })

  return admin_authenticated;
}

app.post('/admin/login', (req, res) => {
  // logic to log in admin
  let provided_uname = req.headers.username;
  let provided_pw = req.headers.password;

  // Check if the given user exists in the ADMINS array
  if (admin_auth(provided_uname, provided_pw)){
    res.status(200).send({message: "Logged in successfully"})
  } 
  else{
    res.status(400).send({message: "Admin doesn't exist; Invalid Username and/or Password"})
  }
});

app.post('/admin/courses', (req, res) => {
  // logic to create a course
  let provided_uname = req.headers.username;
  let provided_password = req.headers.password;
  
  // First authenticate the admin
  if (!admin_auth(provided_uname, provided_password)) {
    res.status(400).send({message: "You don't have the right to add a course"})
  }
  else{
    console.log(`Authentication Successful. Before Creation of course${current_course_id}`);

    // Subsequently create the course
    let course_details = req.body;
    course_details.id = current_course_id;
    current_course_id += 1;
    console.log(`After Creation of course${current_course_id}`);

    COURSES.push(course_details);
    res.status(200).send({message: "Course created successfully", courseId: current_course_id - 1})
  }
});

function findAndUpdate(cid, updated_course) {
  found = -1;
  for(let i = 0; i < COURSES.length; i++){
    if (COURSES[i].id == cid) {
      found = i;
      break;
    }
  }
  
  let NEW_COURSES = []
  for(let i = 0; i < COURSES.length; i++) {
    if (i == found) {
      NEW_COURSES.push(updated_course)
    }
    else {
      NEW_COURSES.push(COURSES[i])
    }
  }

  return NEW_COURSES;

}

app.put('/admin/courses/:courseId', (req, res) => {
  // logic to edit a course

  // First authenticate the admin
  let provided_uname = req.headers.username;
  let provided_password = req.headers.password;
  
  if (!admin_auth(provided_uname, provided_password)) {
    res.status(400).send({message: "You don't have the right to add a course."})
  }
  else{
    // Then start to edit the course
    let cid = req.params.courseId;
    let updated_course = req.body;
    updated_course.id = cid;

    COURSES = findAndUpdate(cid, updated_course)
    res.status(200).send({message: "Course updated successfully."})
  }
});

app.get('/admin/courses', (req, res) => {
  // logic to get all courses

  // First authenticate the admin
  let provided_uname = req.headers.username;
  let provided_password = req.headers.password;
  
  if (!admin_auth(provided_uname, provided_password)) {
    res.status(400).send({message: "You don't have the right to list all the courses."});
  }
  else{
    // Just send the courses output in the form of a json
    res.status(200).send({courses:COURSES});
  }
});

// User routes
app.post('/users/signup', (req, res) => {
  // logic to sign up user

  let signup_body = req.body;
  signup_body.id = current_user_id;
  current_user_id += 1;
  USERS.push(signup_body);
  res.status(200).send({message: "User created successfully"});
});

function user_auth(username, password) {
  let user_authenticated = false;

  // If an admin is authentic, then this will turn the above flag to true
  USERS.every((user) => {
    if (user.username == username && user.password == password){
      user_authenticated = true;
      return false;
    }
    return true;
  })

  return user_authenticated;
}

app.post('/users/login', (req, res) => {
  // logic to log in user
  let provided_uname = req.headers.username;
  let provided_pw = req.headers.password;

  // Check if the given user exists in the USERS array
  if (user_auth(provided_uname, provided_pw)){
    res.status(200).send({message: "Logged in successfully"})
  } 
  else{
    res.status(400).send({message: "User doesn't exist; Invalid Username and/or Password"})
  }
});

app.get('/users/courses', (req, res) => {
  // logic to list all courses

  // First authenticate the admin
  let provided_uname = req.headers.username;
  let provided_password = req.headers.password;
  
  if (!user_auth(provided_uname, provided_password)) {
    res.status(400).send({message: "You don't have the right to list all the courses."});
  }
  else{
    // Just send the courses output in the form of a json
    res.status(200).send({courses:COURSES});
  }
});

function course_exists(cid) {
  let course_present = false;

  // If an admin is authentic, then this will turn the above flag to true
  COURSES.every((course) => {
    if (course.id == cid){
      course_present = true;
      return false;
    }
    return true;
  });

  return course_present;
}

function retrieve_user_id(username, password) {
  let user_id = -1;

  // If an admin is authentic, then this will turn the above flag to true
  USERS.every((user) => {
    if (user.username == username && user.password == password){
      user_id = user.id;
      return false;
    }
    return true;
  });

  return user_id;
}

app.post('/users/courses/:courseId', (req, res) => {
  // logic to purchase a course

  // Authenticate the user
  let provided_uname = req.headers.username;
  let provided_password = req.headers.password;
  
  if (!user_auth(provided_uname, provided_password)) {
    res.status(400).send({message: "You don't have the right to list all the courses."});
  }
  else{
    // Validate the requested course actually exists
    let cid = req.params.courseId;
    if (!course_exists(cid)) {
      res.status(400).send({message: "You don't have the right to list all the courses."});
    }

    // Find the user ID
    uid = retrieve_user_id(provided_uname, provided_password)

    // Purchase the course
    if (USER_COURSE_PURCHASES.has(uid)) {
      l = USER_COURSE_PURCHASES.get(uid);
      l.push(cid);
      USER_COURSE_PURCHASES.set(uid, l);
    }
    else {
      USER_COURSE_PURCHASES.set(uid, [cid]);
    }

    res.status(200).send("Course purchased successfully!")
  }
});

app.get('/users/purchasedCourses', (req, res) => {
  // logic to view purchased courses

  // Authenticate the user
  let provided_uname = req.headers.username;
  let provided_password = req.headers.password;
  
  if (!user_auth(provided_uname, provided_password)) {
    res.status(400).send({message: "You don't have the right to list all the courses."});
  }
  else{
    // Get his userid
    uid = retrieve_user_id(provided_uname, provided_password)

    // Send the list of purchased courses
    res.status(200).send({purchasedCourses: USER_COURSE_PURCHASES.get(uid)});
  }
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
