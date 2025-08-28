const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const razorpayInstance = require('./razorpay');


// const getPaymentPage = async (req,res) =>{
//     try {
//         const userId  = req.session.user;
//         console.log("user id is ",userId)
//         return res.render('user/payment')
//     } catch (error) {
        
//     }
// }

const postPayment = async (req,res) =>{
    try {
        const userId = req.session.user;
        const selectedIndex = req.body.addressId;

        const address = await Address.find({userId:userId});
        if(!address || !address.length){
            return res.redirect('/checkout')
        }
        const selectedAddress = address[0].address[selectedIndex];
        // console.log("selectedAddres is " ,selectedAddress)

        const findUser = await User.findById(userId);
        // console.log("user is ",findUser)
        const cart = await Cart.findOne({userId}).populate('items.productId')
        if(!cart || !cart.items.length){
            res.redirect('/cart')
        }

        let total = cart.items.reduce((sum,item)=>{
           return sum + item.productId.salePrice * item.quantity
        },0)

        // console.log("total Price is ",total)
        const orderData = {
            findUser,
            userId,
            address:selectedAddress,
            items:cart.items,
            totalPrice:total
        }
        // console.log("orderdata",orderData)
        res.render('user/payment',{orderData});

    } catch (error) {
        console.log("error in the post payment ",error)
    }
}

const postOrder = async (req,res) =>{
    try {
        const  userId = req.session.user;
        const {address,paymentMethod} = req.body;
        console.log("payment method",paymentMethod);
        
        // console.log("address is in post order", address)
        //eni ee id vech address fetch2. save cheyanam
        const findAddress = await Address.findOne({"address._id":address},{"address.$":1})
        // console.log("findAddress is ",findAddress)

        if(!findAddress || findAddress.address.length !== 1){
            return res.status(400).json({success:false,message:"Address not found"})
        }
        const cart = await Cart.findOne({userId}).populate('items.productId');
        if(!cart || cart.items.length === 0){
            return res.status(400).json({success:false,message:"Cart is Empty"})
        }

        for(let item of cart.items){
            if(item.productId.quantity < item.quantity){
                return res.status(400).json({success:false,message:`${item.productId.productName} is Out Of Stock!`})
            }
        }

        let totalPrice = cart.items.reduce((total,item)=>{
            return total +  item.productId.salePrice * item.quantity;
        },0)
        
        
        if(paymentMethod === 'cod'){

        const order = new Order({
            userId,
            address:findAddress.address[0],
            orderedItems:cart.items.map(item => ({
            product:item.productId._id,
            quantity:item.quantity,
            price:item.productId.salePrice
            })),
            totalPrice,
            paymentMethod,
            status:'Pending'
        })
        // console.log("order is ",order)
        await order.save();
        
        for(let item of cart.items){
            await Product.updateOne(
                {_id:item.productId._id},
                {$inc:{quantity: -item.quantity}}
            )
        }

        await  Cart.deleteOne({userId});
        console.log("order is placed",order)
       return res.json({success:true,orderId:order._id,payment,payment:'COD'});
    }
    if(paymentMethod === 'razorpay'){
         // Razorpay Flow
            const options = {
                amount: totalPrice * 100, // amount in paisa
                currency: "INR",
                receipt: "order_rcptid_" + new Date().getTime(),
            };
            const razorpayOrder = await razorpayInstance.orders.create(options);
            return res.json({
                success:true,
                razorpayOrderId:razorpayOrder._id,
                amount:totalPrice * 100,
                key:process.env.RAZORPAY_KEY_ID,
                currency:"INR"
            });
    }
    } catch (error) {
        console.log("error in the postorder",error)
        res.status(500).json({status:false,message:"Internal Server Error"});
    }
}
const orderSuccess = async(req,res) =>{
    try {
        return res.render('user/order-success')
    } catch (error) {
        
    }
}

// const viewOrderPage = async(req,res) =>{
//     try {
//         const user = req.session.user;
//         const orders = await Order.find({userId:user})
//         .populate('userId')
//         .populate('orderedItems.product')
//         .sort({createdOn:-1})
        
//         // console.log("orders is ",orders)
//         return res.render('user/orderView',{
//             orders
//         });
//     } catch (error) {
//         console.log("error in view order page ",error);
        
//     }
// }

const cancelOrder = async (req,res) =>{
    try {
        const { orderId } = req.params;
        const userId = req.session.user;

        const order = await Order.findOne({orderId,userId }).populate('orderedItems.product');

        if(!order){
            return res.status(404).json({success:false,message:"Order Not Found"})
        }
        if(order.status === "Delivered"){
            return res.status(400).json({success:false,message:"Delivered Orders Can't Cancel"})
        }
        if(order.status === "Cancelled"){
            return res.status(400).json({success:false,message:'Order Already Cancelled'})
        }
        
        for(let item of order.orderedItems){
            await Product.findByIdAndUpdate(item.product._id,{
                $inc:{quantity:item.quantity}
            })
        }
        order.status = "Cancelled";
        await order.save();
        // console.log("order cancelled");
        return res.status(200).json({success:true,message:"Order Cancelled Successfully"})

    } catch (error) {
        console.log("error in the cancel order ",error);
        return res.status(500).json({success:false,message:"Internal Server Error"})
    }
}
const returnOrder = async(req,res) =>{
    try {
        const {id} = req.params
        const {reason} = req.body;
        // console.log("reason is ",reason)
        const order = await Order.findOne({orderId:id}).populate('userId');
        if(!order){
            return res.status(404).json({success:false,message:"Order is not Found"})
        }
        if(order.status !== "Delivered"){
            return res.json({ success: false, message: "Only delivered orders can be returned" });
        }

        order.status = "Returned"
        order.returnReason = reason;
        await order.save();

        if (order.paymentMethod === "COD" && order.status === "Returned") {
            await User.findByIdAndUpdate(order.userId, {
            $inc: { wallet: order.totalPrice }  
    });
             
        }
        // console.log("qgvqwkhdvwl");
        
       return res.json({ success: true });
    } catch (error) {
        console.log("error in the returnOrder",error);
        return res.json({ success: false, message: "Server error" });
        
    }
}   
const viewOrderDetails = async (req,res) =>{
    try {
        const orderId = req.params.id;
        const orders = await Order.find({orderId:orderId}).populate('orderedItems.product')

        for(let order of orders){
            const parent = await Address.find(
                {"address._id":order.address},
                {"address.$":1}
            ).lean();
            order.fullAddress = parent?.address
        }
        console.log("orders is ",orders)
        return res.render('user/orderView',{orders})
    } catch (error) {
        console.log("error in the viewOrderDetails ",error);
        
    }
}

module.exports ={
    // getPaymentPage,
    postPayment,
    postOrder,
    orderSuccess,
    // viewOrderPage,
    cancelOrder,
    returnOrder,
    viewOrderDetails   
}