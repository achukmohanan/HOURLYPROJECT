 const User = require('../../models/userSchema');

const pageNotFound = async (req,res)=>{
    try {
        return res.render("user/error404")
    } catch (error) {
        res.redirect('/pagenotfound')
    }
}

const loadHomepage = async (req,res)=>{
        try {
            return  res.render('user/home')

        } catch (error) {
    // console.log("error happened",error.message);
    res.status(500).send("server error")           
        }
}

const loadSignup = async (req,res)=>{
    try {
        return res.render('user/signup')
    } catch (error) {
        console.log('Home page not loaded:',error);
        res.status(500).send('Server Error')
    }
}

const signup = async(req,res) =>{
    const {name,email,phone,password} = req.body;
    try {
        const newUser = new User ({name,email,phone,password});
        await newUser.save();
          
        res.redirect('/login')
    } catch (error) {
        console.log("error for save user ",error);
        res.status(500).send('Internal Server Error')
        
    }
}


const login = async (req,res) => {
    try {
        return res.render('user/login')
    } catch (error) {
        console.log('error happened in login:',error);
        res.status(500).send('Server error')
    }
}

const forgotPassword = async (req,res) => {
    try {
        return res.render('user/forgotpassword')
    } catch (error) {
        console.log('error happened in forgotpassword: ', error)
        res.status(500).send('Server error')
       
    }
}

const confirmWithOtt = async (req,res) =>{
    try {
        return res.render('user/confirmWithOtt')
    } catch (error) {
        console.log('error happened in confirm with ott ', error)
        res.status(500).send('Server error')
    }
}
 
const changePassword = async (req,res) =>{
    try {
        return res.render('user/changepassword')
    } catch (error) {
        console.log('eroor happened in change password ', error)
    }
}

const landingPage = async (req,res) =>{
    try {
        res.render('user/landing')
    } catch (error) {
        res.status(500).send("enternal error happend")
    }
}


module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    login,
    forgotPassword,
    confirmWithOtt,
    changePassword,
    landingPage
}