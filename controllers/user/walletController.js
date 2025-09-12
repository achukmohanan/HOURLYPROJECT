const Razorpay = require("razorpay");
const razorpayInstance = require('./razorpay')




const walletTopUp = async (req,res) =>{
    try {
        const {userId,amount} = req.body
        console.log("amount in wallet top up is ",amount);
        
        const options = {
            amount: amount * 100,
            currency:'INR',
            receipt:'wallet_topup'+ Date.now(),
            payment_capture:1
        };
        const order = await razorpayInstance.orders.create(options);
        res.json({orderId:order.id , amount:options.amount , currency:options.currency});
    } catch (error) {
        console.log("error in the wallet top up ",error);
        return res.status(500).json({success:false,message:"Razorpay payment creation failed"})
    }
}

module.exports = {
    walletTopUp
}