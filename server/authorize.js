const bcrypt = require('bcrypt');
const JWT = require("jsonwebtoken");
require('dotenv').config();

const hashing = async (value) => {
    let salt = await bcrypt.genSalt(10);
    let hash = await bcrypt.hash(value, salt);
    return hash
}

const hashCompare = async (value,hashValue) => {
    // this will return true or flase
    const bcryptValue = await bcrypt.compare(value,hashValue);
    return bcryptValue
}

const createJWT = async ({email})=>{
    let token = await JWT.sign( {email}, 
                                process.env.JWT_SECRET,
                                {
                                    expiresIn:"24h"
                                });
    return token
}

const authenticate = async (req,res,next)=>{
    try {
        //get the token sent in header
        const headerToken = await req.headers["authorization"];
        if(!headerToken){
            return res.sendStatus(403)
        }

        //splitting to get bearer token
        const bearer = headerToken.split(" ");
        const bearerToken = bearer[0];
        if(!bearerToken){
            return res.sendStatus(403);
        }

        // verifying if token is valid
        JWT.verify(bearerToken,process.env.JWT_SECRET, (err,decoded)=>{
            if(err){
                return res.sendStatus(401)
            }
            if(decoded){
                const auth = decoded;
                console.log(auth)
                // auth contains with this info 
                // {
                //     email: 'a@a.com',
                //     id: '60622f8dbc44fb2f14f54443',
                //     iat: 1617048930,
                //     exp: 1617135330
                // }

                //atching that to body
                req.body.auth = auth;
                next();
            }
        })
    } catch (error) {
        console.log(error);
        res.sendStatus(401)
    }
}

module.exports = {hashing,hashCompare,createJWT,authenticate}; 