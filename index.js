const express = require("express");
const app = express();
const multer = require('multer')
// const uuid = require('uuidv4')
const AWS = require('aws-sdk')
var cors = require("cors");

require('dotenv').config();

const mongodb = require('mongodb');

const { hashing,hashCompare,createJWT,authenticate } = require("./server/authorize");

const mongoClient = mongodb.MongoClient;

//middleware
app.use(express.json());
app.use(cors());

const dbUrl = process.env.DB_URL || "mongodb://127.0.0.1:27017";
const port = process.env.PORT || 4000;

// aws instance
const s3 = new AWS.S3({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

app.get("/",(req,res) => {
    res.send("Welcome to my app")
})

// register route
// app.post("/register", async (req,res)=>{
  
//     const client = await mongoClient.connect(dbUrl);
//     if(client){
//         try {
//                 const db = client.db("productManager");
//                 const documentFind = await db.collection("users").findOne({email:req.body.email});
//                 if(documentFind){
//                     res.status(400).json({
//                         message:"User already Exists"
//                     })
//                 } else {

//                     //getting hash of the password
//                     // const hash = await hashing(req.body.password);

//                     // updating pwd with hash
//                     // req.body.password = hash;

//                     // insert user regestration details to db
//                     const document = await db.collection("users").insertOne(req.body);

//                     if(document) {
//                         res.status(200).json({
//                             "message":"Record created"
//                         })
//                     }
//                 }
//             client.close();
//         } catch (error) {
//             console.log(error);
//             client.close();
//         }
//     } else {
//         res.sendStatus(500);
//     }
// })

const storage = multer.memoryStorage({
    destination: function(req, file, callback) {
        callback(null, '')
    }
})

const upload = multer({storage}).single('image')

app.post('/upload', [upload] ,(req,res) => {
    console.log("upload called::::::::")
    const user = req.headers.user;
    console.log("User::::",user)
    console.log(req.file)
    
    // let myFile = req.file.originalname.split(".")
    // const fileType = myFile[myFile.length - 1]

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: user+"/"+req.file.originalname,
        Body: req.file.buffer
    }

    s3.upload(params, (error, data) => {
        if(error){
            res.status(500).send(error)
        }
        res.status(200).send(data)
    })
})

app.get('/getFiles',async (req,res) => {
    console.log("Getting Files:::")
    let user = req.query.user;
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Prefix: user+"/"
    }

    await s3.listObjectsV2(params, (error, data) => {
        if(error){
            res.status(500).send(error)
        }
        res.status(200).send(data);
    })
})

// register route
app.post("/register", async (req,res)=>{
    console.log("Register call:::")
    const client = await mongoClient.connect(dbUrl);
    if(client){
        try {
                const db = client.db("User_Details");
                const documentFind = await db.collection("users").findOne({email:req.body.email});
                if(documentFind){
                    res.status(400).json({
                        message:"User already Exists"
                    })
                } else {

                    //getting hash of the password
                    const hash = await hashing(req.body.password);

                    // updating pwd with hash
                    req.body.password = hash;

                    // insert user regestration details to db
                    const document = await db.collection("users").insertOne(req.body);

                    if(document) {
                        res.status(200).json({
                            "message":"Record created"
                        })
                    }
                }
            client.close();
        } catch (error) {
            console.log(error);
            client.close();
        }
    } else {
        res.sendStatus(500);
    }
})

//Login
app.post("/login", async(req,res)=>{
    console.log("login called")
    const client = await mongoClient.connect(dbUrl);
    if(client){
        try {

            const { email, password} = req.body;
            const db = client.db("User_Details");

            //find if user exists
            const user = await db.collection("users").findOne({email});
            if(user){

                // comparing hashed with user pwd
                const compare = await hashCompare(password, user.password);
                if(compare){
                    //call to get token
                    const {_id,name,email} = user;
                    const token = await createJWT({email});
                    return res.status(200).json({token,_id,name,email})
                } else {
                    return res.status(400).json({message: "ivalid login/password"})
                }
            }
            client.close()
        } catch (error) {
            console.log(error);
            client.close();
            return res.status(400)
        }

    }
})

app.listen(port, () => console.log("app is listning",port) )