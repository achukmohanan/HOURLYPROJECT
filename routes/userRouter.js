const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController');
const passport = require('passport');
const profileController = require('../controllers/user/profileControllers')

//error management
router.get('/pagenotfound', userController.pageNotFound);

//signup management
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup)
router.get('/home', userController.loadHomepage);
router.post('/resend-otp',userController.resendOtp)
router.get('/confirmwithotp',userController.confirmWithOtp)
router.post('/confirmwithotp',userController.confirmwithotp)
router.get('/google', passport.authenticate('google', {scope: ['profile', 'email'],prompt: 'select_account',accessType:'offline'}));

//login management
router.get('/login' ,userController.loadLogin)
router.post('/login',userController.login)
router.get('/changepassword',userController.changePassword)

//home page
// router.get('/', userController.landingPage)
router.get('/account',userController.loadaccount)
router.get('/logout',userController.logout);

//profile management 
router.get('/forgotpassword',profileController.forgotPassword)
// router.post('/forgotpassword',profileController.forgotPasswordvalid)
router.get('/forgotemailvalid',profileController.getforgotemail)
router.post('/forgotemailvalid',profileController.forgotEmailValid)
router.post('/verify-passForgot-otp',profileController.verifyForgotPassOtp)
router.get('/resetpassword',profileController.getResetPassPage);
router.post('/resend-forgot-otp',profileController.resendOtp)
router.post('/reset-password',profileController.postNewPassword);
module.exports = router; 