const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema')


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
            address,
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

const viewOrderPage = async(req,res) =>{
    try {
        const user = req.session.user;
        const orders = await Order.find({userId:user})
        .populate('userId')
        .populate('orderedItems.product');
        
        // console.log("orders is ",orders)
        return res.render('user/orderView',{
            orders
        });
    } catch (error) {
        console.log("error in view order page ",error);
        
    }
}
module.exports ={
    // getPaymentPage,
    postPayment,
    postOrder,
    orderSuccess,
    viewOrderPage   
}