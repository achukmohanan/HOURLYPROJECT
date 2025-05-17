const User = require('../../models/userSchema');
const nodemailer = require("nodemailer");
const env = require('dotenv').config();
const bcrypt = require('bcrypt')

const pageNotFound = async (req, res) => {
    try {
        return res.render("user/error404")
    } catch (error) {
        res.redirect('/pagenotfound')
    }
}

const loadHomepage = async (req, res) => {
    try {
        return res.render('user/home')

    } catch (error) {
        console.log("error happened", error.message);
        res.status(500).send("server error")
    }
}

const loadSignup = async (req, res) => {
    try {
        return res.render('user/signup')
    } catch (error) {
        console.log('Home page not loaded:', error);
        res.status(500).send('Server Error')
    }
}

function generateOtp() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP : ${otp}<b>`,

        })
        return info.accepted.length > 0
    } catch (error) {
        console.log("Error sending email", error);
        return false;
    }
}

const signup = async (req, res) => {
    try {
        const { name,phone,email, password, cPassword } = req.body

        if (password !== cPassword) {
            return res.render("user/signup", { message: "Password does not match!" })
        } 
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("user/signup", { message: "User with this Email already Exists" })
        }
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if(!emailSent){
            return res.json("email-error")
        } 

        req.session.userOtp = otp;
        req.session.userData = {name,phone,email,password};

        res.render('user/confirmwithotp')
        console.log("Otp sent",otp);
        
    } catch (error) {
        console.log("signup error",error);
        res.redirect('/error404')
    }
}


const login = async (req, res) => {
    try {
        return res.render('user/login')
    } catch (error) {
        console.log('error happened in login:', error);
        res.status(500).send('Server error')
    }
}

const forgotPassword = async (req, res) => {
    try {
        return res.render('user/forgotpassword')
    } catch (error) {
        console.log('error happened in forgotpassword: ', error)
        res.status(500).send('Server error')

    }
}

const confirmWithOtp = async (req, res) => {
    try {
        return res.render('user/confirmwithotp')
    } catch (error) {
        console.log('error happened in confirm with ott ', error)
        res.status(500).send('Server error')
    }
}

const changePassword = async (req, res) => {
    try {
        return res.render('user/changepassword')
    } catch (error) {
        console.log('eroor happened in change password ', error)
    }
}

const landingPage = async (req, res) => {
    try {
        res.render('user/home')
    } catch (error) {
        res.status(500).send("enternal error happend")
    }
}

const securePassword = async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash;


    } catch (error) {
        
    }
}

const   confirmwithott = async (req,res)=>{ 
    try {
        const {otp1, otp2, otp3, otp4} = req.body;
        console.log(req.body);

        const otp = otp1 + otp2 + otp3 + otp4
        
        if(otp === req.session.userOtp){
            console.log('otp verified successfully')
            const user = req.session.userData
            const passwordHash = await securePassword(user.password);
            const saveUserData = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash,
            })
            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({success:true, redirectUrl:"/login"})

        }else{
            res.status(400).json({success:false,message:"Invalid OTP,Please try again"})
        }
    } catch (error) {
        console.log("error in verify otp ",error);
        res.status(500).json({success:false,message:"An errr occured"})
    }
}



module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    login,
    forgotPassword,
    confirmWithOtp,
    changePassword,
    landingPage,
    confirmwithott,
   
} 

