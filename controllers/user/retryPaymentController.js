const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Transaction = require("../../models/transactionSchema");
const { STATUS_CODE } = require("../../utils/statusCode");
const razorpayInstance = require("./razorpay");
const crypto = require('crypto')

const retryPayment = async (req,res)=>{
    try {
        
        const {orderId,itemId,itemPrice} = req.body;

        const order = await Order.findOne({orderId});
        // const price = Number(order.totalPrice - order.discount)
        
   
    if(!order) return res.status(STATUS_CODE.NOT_FOUND).json({success:false,message:'Order Not Found'})
       
        const razorOrder = await razorpayInstance.orders.create({
            amount:order.totalPrice * 100,
            currency:'INR',
            receipt:'retry_' + orderId.slice(0,20)
        });

        return res.json({success:true,
            key:process.env.RAZORPAY_KEY_ID,
            razorpayOrderId:razorOrder.id,
            amount:razorOrder.amount
            })

// console.log("check 4")
    } catch (error) {
        console.log("error in the retry payment controller ",error);
        return res.json({ success: false, message: "Retry payment failed" });
    }
}

const verifyRetryPayment = async(req,res) =>{
    try {
        const {orderId,itemId,razorpay_order_id,razorpay_payment_id,razorpay_signature,error} = req.body;
 
    // Validate required fields (at least orderId & itemId)
    if (!orderId || !itemId) {
      return res.status(400).json({ success: false, message: "orderId and itemId are required" });
    }
        // failure
        if(!razorpay_payment_id || !razorpay_signature){
            
            const order = await Order.findOne({orderId});

            if(!order) {
                console.log("Order not found for failure case:", orderId);
                return res.json({success:false,message:"Order Not Found"});
            }
            order.orderedItems = order.orderedItems.map((item)=>{
                if(item._id.toString() === itemId){
                    item.status = 'Payment-failed'
                }
                return item
            });
            await order.save();

            await Transaction.create({
                userId:order.userId,
                orderId,
                type:'Failed',
                amount:order.totalPrice,
                paymentMethod:'Razorpay',
                description: error?.reason || "Retry payment failed"
            })
            console.log("transaction is created ....",)
            return res.json({success:false,message:'Payment Failed. Transaction logged'})
        }



        const body = razorpay_order_id + '|' + razorpay_payment_id;

        const expectedSignature = crypto
        .createHmac('sha256',process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex')

        if(expectedSignature !== razorpay_signature){
            return res.json({success:false,message:"Signature Mismatch"})
        }
        //update existing order
        const order = await Order.findOne({orderId});
        console.log("order is found in the verify retry payment controller")

        if(!order) return res.json({success:false,message:"Order Not Found"})

          
           order.orderedItems = order.orderedItems.map(item=>{
                item.status = 'Pending'
            return item;
           })

           order.paymentMethod = 'Razorpay',
           order.status = 'Pending';
           order.invoiceDate = new Date();  
           await order.save();

            await Cart.updateOne(
                {userId:order.userId},
                {$set:{items:[]}}
               );
           
               for(const item of order.orderedItems){
                const product = await Product.findById(item.product)

                if(product){
                    product.quantity = Math.max(0,product.quantity - item.quantity);
                    product.status = product.quantity <=0 ? 'out of stock':'Available';
                    await product.save()
                }
               }


           await Transaction.create({
            userId:order.userId,
            orderId,
            type:'Debit',
            amount:order.totalPrice,
            paymentMethod:'Razorpay',
            description:'Retry Payment Successfull'

           });
           return res.json({success:true,message:"Payment verified & order updated successfully"})

    } catch (error) {
        console.log("error in the verifyRetryPayment COntroller ",error);
        return res.json({ success: false, message: "Internal Server Error" });        
    }
}

module.exports = {
    retryPayment,
    verifyRetryPayment
}