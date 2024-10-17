var express = require("express");
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
let dotenv = require('dotenv').config()
// local
const uri = `mongodb+srv://waseem:${dotenv.parsed.MONOGO_PASSWORD}@cluster0.5zygy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
//server
//const uri = `mongodb+srv://waseem:${process.env.MONOGO_PASSWORD}@cluster0.5zygy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
var router = express.Router();
const Joi = require("joi");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const signUpSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8) // Minimum length
    .max(30) // Maximum length
    .pattern(new RegExp("(?=.*[a-z])")) // At least one lowercase letter
    .pattern(new RegExp("(?=.*[A-Z])")) // At least one uppercase letter
    .pattern(new RegExp("(?=.*[0-9])")) // At least one digit
    .pattern(new RegExp("(?=.*[!@#$%^&*])")) // At least one special character
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.max": "Password must not be longer than 30 characters",
      "string.pattern.base":
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character",
    }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),

})


const grievienceSchema = Joi.object({
  complaint: Joi.string().required(),
  description: Joi.string().required(),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  userId :Joi.string().required()

})

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});
router.post("/create", async function (req, res, next) {
  const data = req.body;
  const { error } = signUpSchema.validate(data);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  const { name, password,email } = data;
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("streetSOS").command({ ping: 1 });
    const database = client.db("streetSOS");
    const users = database.collection("users");
    const findResult = await users.findOne({ email: email});
    if(findResult){
      return res.status(400).json({ error:"user already exist" });
    }
    
    const doc = {
      "name": name,
     "email":email,
    "password":hashedPassword
    }
    const result = await users.insertOne(doc);

    res.status(201).send({'User registered successfully':result});
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
  finally{
    await client.close();
  }


});

router.post("/login", async function (req, res, next){

const data = req.body;
  const { error } = loginSchema.validate(data);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  const {password,email } = data;
  const database = client.db("streetSOS");
  const users = database.collection("users");
  const findResult = await users.findOne({ email: email});
  if(!findResult){
    return res.status(400).json({ error:"user does'nt exist" });
  }
  if(findResult.email != email){
    res.status(401).send({error:'Invalid credentials'});
  }
  
  
  const passwordMatch = await bcrypt.compare(password, findResult.password);

    if (passwordMatch) {
      res.status(200).send({message:'Login successful',userId: findResult._id});
    } else {
      res.status(400).send({error:'Invalid credentials'});
    }

 //res.status(200).send({'User found successfully':findResult});

})

router.post("/complaint", async function (req, res, next){
  try{const data = req.body;
  const { error } = grievienceSchema.validate(data);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  const { complaint, description, latitude, longitude,userId} = data
  await client.connect();
  const database = client.db("streetSOS");
  const grievance = database.collection("grievance");
  const doc = {
    complaint: complaint,
    description: description,
    location: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
    verified: false,
    userID: ObjectId.createFromHexString(userId),
  };
  const result = await grievance.insertOne(doc);
  res.status(201).send({'complaint registered successfully':result});
}
catch (error) {
  console.error(error);
  res.status(500).send('An error occurred');
}
finally{
  await client.close();
}

})







module.exports = router;
