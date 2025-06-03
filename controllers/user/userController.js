const User = require('../../models/userSchema');
const nodemailer = require("nodemailer");
const env = require('dotenv').config();
const bcrypt = require('bcrypt');
 


const pageNotFound = async (req, res) => {
    try {
        return res.render("user/error404")
    } catch (error) {
        res.redirect('/error404')
    }
}

const loadHomepage = async (req, res) => {
    try {

        const user = req.session.user;
        if(user){
            const userData = await User.findById(user._id);
            res.render('user/home',{user: userData});
        }else{
            return res.render('user/home')
        }
        // return res.redi  rect('/login')

    } catch (error) {
        console.log("Home page is not loading", error);
       res.status(500).send("server error")
    }
};

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
        const { name ,phone ,email, password, cPassword } = req.body

        if (password !== cPassword) {
            return res.status(400).json({
                success:false,
                message:"Password does not Match"
            });
        } 
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.status(400).json({
                success:false,
                message:"User with this Email already exists"
            });
        }
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if(!emailSent){
           return res.status(500).json({
            success:false,
            message:"Failed to send verification Email.Please try again"
           });
        } 

        


        req.session.userOtp = otp;
        req.session.userData = {name,phone,email,password};
        
        // console.log(req.session.userData)
        console.log("Otp sent",otp);


        return res.status(200).json({success : true, message : 'Otp send Successfully...!'});

        
    } catch (error) {
        console.log("signup error",error);
        res.redirect('/error404')
    }
    const otpSent = true;
        if(otpSent){
            return res,json({
                success: true,
                message:"OTP sent to your Email"

            });

        }else{
            return res.status(500).json({
                success:false,
                message:"Failed to sent OTP,Please try again"
            });
        }
}


const loadLogin = async (req, res) => {
    try {
        return res.render('user/login')
    } catch (error) {
        console.log('error happened in login:', error);
        res.redirect('/pageNotFound')
    }
}

const login = async (req,res) => {
    try {
        const {email ,password} = req.body;
        
// console.log(req.body);

        const findUser = await User.findOne({isAdmin:0,email:email})
        if(!findUser){
            return res.render('user/login',{message:"User not found"})
        }
        if(findUser.isBlocked){     
            return res.render('user/login',{message:"User is blocked by Admin"})
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password)
        if(!passwordMatch){
            return res.render("user/login",{message:"Incorrect Password"})
        }

//            console.log('Email:', email);
// console.log('Password:', password);
// console.log('Found user:', findUser);
     
        req.session.user = findUser;
        
      return  res.redirect('/home')


    } catch (error) {
        console.log("login error",error);
        res.render("user/login",{message:"login failed. Please try again later"})
        
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
        res.render('user/landing')
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

const confirmwithotp = async (req, res) => {
    try {
        const { otp1, otp2, otp3, otp4 } = req.body;

        // Ensure all fields are present
        if (!otp1 || !otp2 || !otp3 || !otp4) {
            return res.status(400).json({ success: false, message: "All 4 OTP digits are required" });
        }

        const otp = otp1 + otp2 + otp3 + otp4;

        // Compare with session OTP
        if (otp === req.session.userOtp) {
            console.log('OTP verified successfully');

            const user = req.session.userData;

            if (!user) {
                return res.status(400).json({ success: false, message: "User session expired. Please sign up again." });
            }

            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
            });

            await saveUserData.save();

            req.session.user = saveUserData._id;
            delete req.session.userOtp;
            delete req.session.userData;

            return res.status(200).json({
                success: true,
                message: "OTP verified successfully",
                redirectUrl: "/login"
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP, please try again"
            });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred"
        });
    }
}


const resendOtp = async (req,res)=>{
    try {
        console.log(req.session.userData)
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in Session"})
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent =  await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP:",otp);
            return res.status(200).json({success:true,message:"OTP Resend Succesfully"})
        }else{
            return res.status(500).json({success:false,message:"Failed to Resend OTP. Please try again"});
        }

    } catch (error) {
        console.log("error  resending otp",error);
        res.status(500).json({success:false,message:"internal Server Error,Please try again"});
        
    }
}

const loadaccount = async (req,res) =>{
    try {
        return res.render('user/account')
    } catch (error) {
        res.status(500).send("server error")
        console.log("error occured in account",error);
        
    }
}

const logout = async (req,res) => {
    try {
        req.session.destroy ((err)=>{
            if(err){
                console.log("Session destruction error",err.message);
                return res.redirect('/error404')
                
                
            }
            
            return res.redirect('/login')
            
        })
    } catch (error) {
        console.log("logout error ",error);
        res.redirect('/error404')
        
    }
}

module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    loadLogin,
    forgotPassword,
    confirmWithOtp,
    changePassword,
    landingPage,
    confirmwithotp,
    resendOtp,
    login,
    loadaccount,
    logout
} 

