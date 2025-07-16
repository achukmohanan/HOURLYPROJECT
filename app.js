const express = require('express');
const app = express();
const passport = require('./config/passport')
const env = require('dotenv').config();
const db = require('./config/db');
const path = require('path') 
const session = require('express-session')   
const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter');
const nocache = require('nocache');


db()
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000    
    }
}))
app.use(passport.initialize());
app.use(passport.session());

app.use(nocache())

app.use((req,res,next)=>{
    
    res.locals.user = req.user;
    next()
})


//google auth
app.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
// app.get('/google/callback',passport.authenticate('google',{failureRedirect:'/'}),(req,res)=>{
//     res.redirect('/home')
// })

app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next();
})

app.set('view engine', 'ejs')
app.set('views'[path.join(__dirname, 'views/admin'), path.join(__dirname, 'views/user')])
app.use(express.static(path.join(__dirname, "public")))
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/uploads', express.static('uploads'));

app.use('/', userRouter);
//password: password123 or newpassword
app.use('/admin',adminRouter);
// password:adminpassword
app.use((req, res, next) => {
    res.status(404).render('user/error404'); // render your 404.ejs
});






app.listen(process.env.PORT, () => console.log('http://localhost:3000'))


module.exports = app;
    

// admin@gmail.com
// admin123