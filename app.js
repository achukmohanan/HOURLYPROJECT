const express = require('express');
const app = express();
const env = require('dotenv').config();
const db = require('./config/db');
const path = require('path')
const userRouter = require('./routes/userRouter');
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
app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next();
})
app.set('view engine', 'ejs')
app.set('views'[path.join(__dirname, 'views/admin'), path.join(__dirname, 'views/user')])
app.use(express.static(path.join(__dirname, "public")))



app.use('/', userRouter)
app.use((req, res, next) => {
    res.status(404).render('user/error404')
})





app.listen(process.env.PORT, () => console.log('http://localhost:3000'))


module.exports = app;
