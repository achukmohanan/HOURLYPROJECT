const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController');
const passport = require('passport');

router.get('/pagenotfound', userController.pageNotFound);
router.get('/home', userController.loadHomepage);
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup)
router.get('/login' ,userController.loadLogin)
router.post('/login',userController.login)
router.get('/forgotpassword',userController.forgotPassword)
router.get('/confirmwithotp',userController.confirmWithOtp)
router.post('/confirmwithotp',userController.confirmwithotp)
router.get('/changepassword',userController.changePassword)
router.get('/', userController.landingPage)
router.post('/resend-otp',userController.resendOtp)
router.get('/google', passport.authenticate('google', {scope: ['profile', 'email'],prompt: 'select_account',accessType:'offline'}));




module.exports = router; 
