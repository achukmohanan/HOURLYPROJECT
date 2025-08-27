
const PDFDocument = require('pdfkit');
const fs = require('fs');    
const path = require('path');
const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');


const postOrder = async (req,res) =>{
    try {
        const  userId = req.session.user;
        const {address,paymentMethod} = req.body;

        console.log("address is in post order", address)
        //eni ee id vech address fetch2. save cheyanam
        const findAddress = await Address.findOne({"address._id":address},{"address.$":1})
        console.log("findAddress is ",findAddress)

        if(findAddress.address.length !== 1){
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
        res.json({success:true,orderId:order._id});

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

        order.returnRequest={
            requested:true,
            requestedAt:new Date(),
            verified:false
        }
        order.status = "Return Requested"
        order.returnReason = reason;
        await order.save();

    //     if (order.paymentMethod === "COD" && order.status === "Returned") {
    //         await User.findByIdAndUpdate(order.userId, {
    //         $inc: { wallet: order.totalPrice }  
    // });
             
        // }
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
   }
   
module.exports = {
   postOrder,
   orderSuccess,
   cancelOrder,
   returnOrder,
   viewOrderDetails
}