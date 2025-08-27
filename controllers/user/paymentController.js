const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema')

const postPayment = async (req,res) =>{
    try {
        const userId = req.session.user;
        const selectedIndex = req.body.addressId;

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
        const orderData = {
            findUser,
            userId,
            address:selectedAddress,
            items:cart.items,
            totalPrice:total
        }
        
        res.render('user/payment',{orderData});

    } catch (error) {
        console.log("error in the post payment ",error)
    }
}

module.exports ={
    postPayment  
}