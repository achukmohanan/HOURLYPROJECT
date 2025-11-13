const Order = require("../../models/orderSchema");
const { STATUS_CODE } = require("../../utils/statusCode");
const razorpayInstance = require("./razorpay");


const retryPayment = async (req,res)=>{
    try {
        console.log("req body issssss",req.body)
        const {orderId,itemId,itemPrice} = req.body;

        const order = await Order.findOne({orderId});
    
    if(!order) return res.status(STATUS_CODE.NOT_FOUND).json({success:false,message:'Order Not Found'})
        
        const razorOrder = await razorpayInstance.orders.create({
            amount:itemPrice * 100,
            currency:'INR',
            receipt:'retry_' + orderId
        });

        return res.json({success:true,
            key:process.env.RAZORPAY_KEY_ID,
            razorpayOrderId:razorOrder.id,
            amount:razorOrder.amount
            })


    } catch (error) {
        console.log("error in the retry payment controller ",error);
        return res.json({ success: false, message: "Retry payment failed" });
    }
}

module.exports = {
    retryPayment
}