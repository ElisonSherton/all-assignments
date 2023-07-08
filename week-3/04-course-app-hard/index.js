const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// Create two secret tokens: one for the users and one for the admin
const user_secret = "sec_dfre12";
const admin_secret = "rew_dsfi";

// Connect to the database
username = "";
password = ""
mongoose.connect(`mongodb+srv://${username}:${password}@cluster0.wwcnagn.mongodb.net/`)

// Define schemas for admins, users, courses and user purchases
let ADMINS = [];
let USERS = [];
let COURSES = [];
let USER_PURCHASES = [];

// Create schemas in mongo to define the different objects which we would be using in 
// order to store element types in the Database
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
});

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  imageLink: {
    type: String,
    required: false
  },
  published: {
    type: Boolean,
    required: true
  }
});

const userPurchaseSchema = new mongoose.Schema({
  username: String,
  purchasedCourses: Array
});


// Define models for the above schemas
const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Course = mongoose.model('Course', courseSchema);
const userPurchase = mongoose.model('userPurchase', userPurchaseSchema);

// Load all the documents from mongoDB to memory before doing any 
// Requests below
function getDocuments(element, arr) {
  element.find({}).then((documents) => {
    documents.forEach((document) => {
      arr.push(document);
    });
    // console.log(arr);
  }).catch((error) => {
    console.log({error: error.message})
  });
}

getDocuments(User, USERS);
getDocuments(Admin, ADMINS);
getDocuments(Course, COURSES);
getDocuments(userPurchase, USER_PURCHASES);


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

      // Commit the changes to mongoDB to persist them
      const newAdmin = new Admin({ username: admin_body.username, password: admin_body.password });
      newAdmin.save()
        .then((result) => {
          return res.status(200).send({message: "Admin Created Successfully", token: token});
        })
        .catch((error) => {
          return res.status(500).send({message: "Cannot create the user", error: error.message});
        });
      
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
  catch (error){
    // Handle any server error gracefully
    res.status(500).send({message: "Login could not succeed.", error: error.message});
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
      COURSES.push(course_body);
      
      // Write the course to DB
      const newCourse = new Course(course_body);
      // console.log(course_body);


      newCourse.save()
        .then((result) => {
          res.status(200).send({message: "Course Created Successfully"});
        })
        .catch((error) => {
          res.status(500).send({message: "Created the course but could not commit it to the DB", error: error.message});
        });

    }
  }
  catch(error) {
    res.status(500).send({message: "Cannot view the courses at this time", error: error.message});  
  }
});

app.put('/admin/courses/:courseId', authenticate_admin, async (req, res) => {
  // logic to edit a course

  try{
    // logic to create a course
    let course_body = req.body;
    let cid = req.params.courseId;

    // Check if the courseID is present in the list of courses created so far
    let exists = COURSES.findIndex(course => course._id.toString() == cid)
    
    // Only update the course if it does not currently exist in the courses array
    if (exists === -1) {
      res.status(400).send({message: "No course found with the given ID"});
    }
    else {
      // Update the course with the specified ID
      course_body.id = cid;
      COURSES[exists] = course_body;

      // Find and update the course body with the new information
      Course.findByIdAndUpdate(cid, course_body)
        .then((course) => {
          res.status(200).send({message: "Updated course successfully"});
        })
        .catch((error) => {
          res.status(500).send({
            message: "Updated course locally but could not commit the changes to DB",
            error: error.message
          });
        });
    }
  }
  catch(error) {
    res.status(500).send({message: "Cannot update the course right now", error: error.message});  
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
      // create an admin
      token = generate_user_token({username: user_body.username});
      USERS.push(user_body);

      // Commit the changes to mongoDB to persist them
      const newUser = new User({ username: user_body.username, password: user_body.password });
      newUser.save()
        .then((result) => {
          return res.status(200).send({message: "User Created Successfully", token: token});
        })
        .catch((error) => {
          return res.status(500).send({error: "Cannot create the user"});
        });

    }
  }
  catch(error) {
    res.status(500).send({message: "Cannot create the user", error: error.message});
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
  catch (error){
    // Handle any server error gracefully
    res.status(500).send({error: JSON.stringify(error.message)});
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
  catch(error) {
    res.status(500).send({message: "Please try again later", error: error.message});
  }

});

app.post('/users/courses/:courseId', authenticate_user, (req, res) => {
  // logic to purchase a course
  try{
    // Extract username from the authentication token
    token = req.headers.authorization.split(" ")[1];
    jwt.verify(token, user_secret, async (err, user) => {
      let name = user.username;

      // Check if the said courseId exists and is published currently
      // If either of the two is not satisfied, then send an error
      let cid = req.params.courseId;

      // var exists = COURSES.findIndex(crs => crs._id.toString() === cid)
      let exists = await Course.findById(cid).catch((err) => {
        console.log(err.message);
      })
      
      console.log(exists)
      
      if (exists){
        if (!exists.published) {
          return res.status(400).send({message: "Requested course is not yet published"})
        }
      }
      else{
        return res.status(400).send({message: "Provided course ID is invalid"})
      }

      // If they haven't purchased anything before, register them in the 
      // Map of USER_PURCHASES and assign a list of purchased course ids
      // Against their names, else just append the purchased course in the map

      // Check if the user has made any purchase previously. If yes, then retrieve that object
      let user_obj = USER_PURCHASES.filter((element) => {
            return element.username === name
      });

      if (user_obj.length > 0) {
        user_obj = user_obj[0]
        // Check if the said course is already purchased
        var purchased = user_obj.purchasedCourses.filter((element) => {
          return element === cid;
        })

        if (purchased.length > 0) {
          res.status(400).send({message: "User has already purchased this course"})
        }
        else{
            user_obj.purchasedCourses.push(cid);   
            
            // Here we will have to find and update
            item_id = user_obj._id;

            // Find and update the course body with the new information
            userPurchase.findByIdAndUpdate(item_id, user_obj)
            .then((course) => {
              res.status(200).send({message: "Purchased the course successfully"});
            })
            .catch((error) => {
              res.status(500).send({
                message: "Purchased course but could not update it in the DB",
                error: error.message
              });
            });
        }
      }
      else {
        user_purchases = {username: name, purchasedCourses: [cid]};

        // Here we just need to push a new entry
        USER_PURCHASES.push(user_purchases);

        // Commit the changes to mongoDB to persist them
        const newUserPurchaseObj = new userPurchase(user_purchases);
        newUserPurchaseObj.save()
          .then((result) => {
            return res.status(200).send({message: "Course purchased Successfully"});
          })
          .catch((error) => {
            return res.status(500).send({message: "Cannot purchase the course", error: error.messsage});
          });
      }
    });
  }
  catch(error) {
    res.status(500).send({message: "Cannot purchase the course right now", error: error.message});
  }
});

app.get('/users/purchasedCourses', async (req, res) => {
  // logic to view purchased courses
  try{
        // Extract username from the authentication token
        token = req.headers.authorization.split(" ")[1];

        // Verify the user and extract their username from the token provided
        jwt.verify(token, user_secret, async (err, user) => {
          let name = user.username;

          let user_obj = await userPurchase.findOne({username: name});    
          let courses = await Course.find({});

          // Find the courses corresponding to the IDs
          if (user_obj){
            // Get the actual course description from the course IDs
            var purchased_courses = user_obj.purchasedCourses.map((cid) => courses.find((crs) => crs._id.toString() === cid));
            res.status(200).send({courses: purchased_courses});
          }
          else {
            // This user hasn't bought any courses, hence returning empty list
            res.status(200).send({courses: []});
          }
        });
  }
  catch(error) {
    res.status(500).send({message: "Cannot view purchased courses currently", error: error.message});
  }

});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
