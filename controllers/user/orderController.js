
const PDFDocument = require('pdfkit');
const fs = require('fs');    
const path = require('path');
const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const razorpayInstance = require('./razorpay');
const crypto = require("crypto");

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
        
       
        if(paymentMethod === 'COD'){
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
            status:'Pending',
            paymentStatus:"Cash on Delivery"
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
       return res.json({success:true,orderId:order._id,payment:'COD'});
    }
    if(paymentMethod === 'razorpay'){
         
            const options = {
                amount: totalPrice * 100, // amount in paisa
                currency: "INR",
                receipt: "order_rcptid_" + new Date().getTime(),
            };
            const razorpayOrder = await razorpayInstance.orders.create(options);
            return res.json({
                success:true,
                payment:'razorpay',
                order:{
                    id:razorpayOrder.id,
                    amount:totalPrice * 100,
                    currency:'INR'
                },
                key:process.env.RAZORPAY_KEY_ID,            
                orderId: razorpayOrder.id
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
const cancelOrder = async (req,res) =>{
    try {
        const { orderId,itemId } = req.params;
        const {action,reason} = req.body;
        console.log("reason is ",reason) 
        const userId = req.session.user;
        // console.log("item Id is",itemId)
        const order = await Order.findOne({orderId,userId }).populate('orderedItems.product');

        if(!order){
            return res.status(404).json({success:false,message:"Order Not Found"})
        }
        const item = order.orderedItems.id(itemId);
        // console.log("item is ",item)
        if(!item){
            return res.status(404).json({success:false,message:"Item not found in this order"})
        }

        if(action === 'request'){
        if(order.status === "Delivered"){
            return res.status(400).json({success:false,message:"Delivered Orders Can't Cancel"})
        }
        if(item.status === "Cancelled"){
            return res.status(400).json({success:false,message:'This Item is  Already Cancelled'})
        }
          
        item.cancelRequest = {requested:true ,reason}
        item.status = "Cancellation Requested";
    }else if(action === 'withdraw'){
        if(item.status !== 'Cancellation Requested'){
            return res.status(404).json({success:false,message:"No Withdrawn Requested"})
        }
        item.cancelRequest = null;
        item.status = 'Pending'
    }   
        await order.save();
        // console.log("order cancelled requested",order);
        return res.status(200).json({success:true,message:`Cancel ${action} Processed Successfully`})

    } catch (error) {
        console.log("error in the cancel order ",error);
        return res.status(500).json({success:false,message:"Internal Server Error"})
    }
}
const returnOrder = async(req,res) =>{
    try {
        const {id} = req.params
        const {reason} = req.body;
        console.log("reason is ",reason)
        let   order = await Order.findOne({orderId:id}).populate('userId');
        if(!order){
            return res.status(404).json({success:false,message:"Order is not Found"})
        }
        order.returnRequest={
            requested:true,
            requestedAt:new Date(),
            verified:false
        }
         order.orderedItems.forEach(item =>{
            if(item.status === 'Delivered'){
                item.status = "Return Requested" 
            }else if(item.status === 'Return Requested'){
            order.status = 'Return Requested'
           }
        });
            
        const totalDelivered = order.orderedItems.filter(item=> item.status === 'Delivered').length;
        const totalReturnRequest = order.orderedItems.filter(item => item.status === 'Return Requested').length;
        if(totalDelivered === 0 && totalReturnRequest > 0){
            order.status = "Return Requested";
        }else if(totalDelivered > 0 && totalReturnRequest > 0){
            order.status = "Partially Returned"
        }
           
        order.returnReason = reason;
        await order.save();
        console.log("payment method",order.paymentMethod)
       
        console.log("order is ",order);
        
       return res.json({ success: true,message:"Return request submitted",order });
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
   };

const orderFailure = async (req,res) =>{
    try {
        return res.render('user/order-failure')
    } catch (error) {
        
    }
}
   
module.exports = {
   postOrder,
   orderSuccess,
   cancelOrder,
   returnOrder,
   viewOrderDetails,
   orderFailure
}