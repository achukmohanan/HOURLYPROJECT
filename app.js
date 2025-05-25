const express = require('express');
const app = express();
const passport = require('./config/passport')
const env = require('dotenv').config();
const db = require('./config/db');
const path = require('path')    
const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter');
const session = require('express-session')

db()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000    
    }
}))

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
app.get('/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/home')
})

app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next();
})
app.set('view engine', 'ejs')
app.set('views'[path.join(__dirname, 'views/admin'), path.join(__dirname, 'views/user')])
app.use(express.static(path.join(__dirname, "public")))



app.use('/', userRouter)
app.use('/admin',adminRouter)
app.use((req, res, next) => {
    res.status(404).render('user/error404')
})





app.listen(process.env.PORT, () => console.log('http://localhost:3000'))


module.exports = app;
