const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const User = require("../models/userSchema");
// const { Profiler } = require("react");
const env = require('dotenv').config()


passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "https://www.hourly.sbs/google/callback",
            passReqToCallback:true
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

            let referredBy = null;
            if(req.session.refferalCode){
                const refUser =  await User.findOne({
                    referralCode:req.session.referralCode,

                })
                if(refUser) referredBy = refUser._id;
            }
            
            user = new User({
                name: profile.displayName,
                email: email,
                googleId: profile.id,
                referralCode:generateReferralCode(profile.displayName),
                referredBy
            });

            await user.save();
             if (referredBy) {
                await User.findByIdAndUpdate(referredBy, {
                    $inc: { wallet: 50 },
                    $push: { redeemedUsers: newUser._id },
                });
                }
                delete req.session.referralCode;
            return done(null, user);
        
    } catch (err) {
        console.log("error happened in google passport",err);
        return done(err, null);
    }
}));

function generateReferralCode(name) {
  const prefix = name.replace(/\s/g, "").slice(0, 4).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return prefix + random;
}


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