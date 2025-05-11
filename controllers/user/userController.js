const User = require('../../models/userSchema');
const nodemailer = require("nodemailer");
const env = require('dotenv').config();

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
            html: `<b>Your OTP<b>`,

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
            return res.render("/signup", { message: "Password does not match!" })
        } 
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User with this Email already Exists" })
        }
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if(!emailSent){
            return res.json("email-error")
        }

        req.session.userOtp = otp;
        req.session.userData = {name,phone,email,password};

        res.render('user/confirmwithotp')
        // console.log("Otp sent",otp);
        
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

const confirmWithOtt = async (req, res) => {
    try {
        return res.render('user/confirmWithOtt')
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

// const confirmwithott = async (req,res)=>{ 
//     try {
//         const {otp} = req.body;
//         console.log(otp);
        
//         if(otp === req.session.userOtp){
//             const user = req.session.userData
//         }
//     } catch (error) {
        
//     }
// }

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

