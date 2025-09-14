const Razorpay = require("razorpay");

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,      // from dashboard
    key_secret: process.env.RAZORPAY_KEY_SECRET, // from dashboard
});

module.exports = razorpayInstance;
