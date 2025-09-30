const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema')
const razorpayInstance = require('./razorpay');
const crypto = require("crypto");
const Transaction = require('../../models/transactionSchema')

const postPayment = async (req,res) =>{
    try {
        console.log("hekkoweinowb")
        const userId = req.session.user;
        const selectedIndex = req.body.addressId;
        const discount = req.body.discount

        const address = await Address.find({userId:userId});
        if(!address || !address.length){
            return res.redirect('/checkout')
        }
        const selectedAddress = address[0].address[selectedIndex];

        const findUser = await User.findById(userId);
        
       

        const cart = await Cart.findOne({userId}).populate('items.productId')
        if(!cart || !cart.items.length){
            res.redirect('/cart')
        }
        

        let total = cart.items.reduce((sum,item)=>{
           return sum + item.productId.salePrice * item.quantity
        },0)

        total-=discount;
        const orderData = {
            findUser,
            userId,
            address:selectedAddress,
            items:cart.items,
            totalPrice:total,
            discount
        }
        
        res.render('user/payment',{orderData});

    } catch (error) {
        console.log("error in the post payment ",error)
    }
}
const confirmRazorpay = async (req,res) =>{
    try {
        const userId = req.session.user; 
        const {razorpay_order_id,razorpay_payment_id,razorpay_signature,address,amount,discount}  = req.body;
        console.log("discount  in the confirm ",discount);
        
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        // console.log("address is ",address)
        const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex"); 

        if (expectedSignature === razorpay_signature) {
            const cart = await Cart.findOne({userId}).populate('items.productId')
           
            const price = Number(amount/100)
            let totalPrice =price
            console.log("after checking amount is ",totalPrice)
            // fetch selected address snapshot
      const selectedAddress = await Address.findOne(
        { "address._id": address, userId },
        { "address.$": 1 }
      );
    //   console.log("selected address",selectedAddress)
      if (!selectedAddress) {
        return res.json({ success: false, message: "Address not found" });
      }
            const order = new Order({
                userId,
                orderedItems:cart.items.map(item =>({
                    product:item.productId._id,
                    quantity:item.quantity,
                    price:item.productId.salePrice,
                })),
                totalPrice,
                paymentMethod:'Razorpay',
                status:'Pending',
                paymentStatus:'Paid',
                discount:discount,
                paymentId: razorpay_payment_id,
                address: selectedAddress.address[0],
                deliveredAt:null,
                couponApplied:discount>0 ? true : false
            });

            await order.save();
            
            for(let item of cart.items){
                await Product.updateOne(
                    {_id:item.productId._id},
                    {$inc:{quantity:-item.quantity}}
                );
            }
            await Cart.deleteOne({userId})
            await Transaction.create({
                userId,
                orderId:order.orderId,
                type:'Debit',
                amount:totalPrice,
                paymentMethod:'Razorpay',
                description:`Order is Placed`,

            })
            // console.log("transaction is in the razor pay is success")
      return  res.json({ success: true, message: "Payment verified successfully" });
    } else { 
        console.log("this else case is worked which is payment failed")
      return  res.json({success: false, message: "Payment Failed"});
    }
    } catch (error) {
        console.log("error in the confirm razor pay ",error)    
    }
}


module.exports ={
    postPayment,
    confirmRazorpay  
}