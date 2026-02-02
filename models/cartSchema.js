const mongoose = require('mongoose');
const Coupon = require('./couponSchema');
const  {Schema} = mongoose;

const cartSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        quantity:{
            type:Number,
            required:true,
            default:1
        },
        
    }],
    coupon:{
        code:String,
        discountAmount:Number
    },
    totalAmount: Number,
    finalAmount: Number
})

const Cart = mongoose.model("Cart", cartSchema)

module.exports = Cart;