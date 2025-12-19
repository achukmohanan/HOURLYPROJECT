const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const User = require("../models/userSchema");
// const { Profiler } = require("react");
const env = require('dotenv').config()


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://www.hourly.sbs/google/callback"
  
   
    
},
async (accessToken, refreshToken, profile, done) => {
    // console.log("google profile",profile);
    try {
        const email = profile.emails[0].value;

        let user = await User.findOne({ 
           $or:[
            { googleId: profile.id },
            { email: email }
           ]
        });

        if (user) {
            if(!user.googleId){
                user.googleId = profile.id;
                await user.save();
            }
          return done(null, user);
        } 

            console.log("creating user");
            
            user = new User({
                name: profile.displayName,
                email: email,
                googleId: profile.id,
            });

            await user.save();
            return done(null, user);
        
    } catch (err) {
        console.log("error happened in google passport",err);
        return done(err, null);
    }
}));


passport.serializeUser((user,done)=>{
    done(null,user.id)
})

passport.deserializeUser((id,done)=>{
    User.findById(id)
    .then(user=>{
        done(null,user)
    })
    .catch(err=>{
        done(err,null)
    })
})

module.exports = passport;