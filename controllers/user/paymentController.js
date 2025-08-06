const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema');


const getPaymentPage = async (req,res) =>{
    try {
        const userId  = req.session.user;
     
        return res.render('user/payment')
    } catch (error) {
        
    }
}

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

        const cart = await Cart.findOne({userId}).populate('items.productId')


        //    console.log("req.body is ",req.body.addressId)
    } catch (error) {
        console.log("error in the post payment ",error)
    }
}
module.exports ={
    getPaymentPage,
    postPayment
}