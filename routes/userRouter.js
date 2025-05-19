const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController');
const passport = require('passport');

router.get('/pagenotfound', userController.pageNotFound);
router.get('/home', userController.loadHomepage);
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup)
router.get('/login' ,userController.login)
router.get('/forgotpassword',userController.forgotPassword)
router.get('/confirmwithott',userController.confirmWithOtp)
router.post('/confirmwithotp',userController.confirmwithott)
router.get('/changepassword',userController.changePassword)
router.get('/', userController.landingPage)
router.post('/resend-otp',userController.resendOtp)




module.exports = router; 
