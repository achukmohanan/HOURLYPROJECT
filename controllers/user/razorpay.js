const Razorpay = require("razorpay");

console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID);
console.log("RAZORPAY_KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET);


const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,      // from dashboard
    key_secret: process.env.RAZORPAY_KEY_SECRET, // from dashboard
});

module.exports = razorpayInstance;
