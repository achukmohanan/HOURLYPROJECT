const mongoose = require('mongoose')
const {Schema} = mongoose
const {v4:uuidv4} = require('uuid')

const orderSchema = new Schema({
    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    orderedItems:[{
        product:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        }
    }],
    userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
    },
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:false
    },
    address:{
        type:Schema.Types.ObjectId,
        ref: 'Address',
        required:true
    },
    invoiceDate:{
        type:Date,
    },
     paymentMethod: {
        type: String,
        required: true,
        enum: ['COD', 'Razorpay', 'Wallet', 'Paypal'], // add what you use
        default: 'COD'
    },
    status:{
        type:String,
        required:true,
        enum:['Pending','Processing','Shipped','Delivered','Cancelled','Return Request','Returned','Out-for-delivery','Payment-failed']
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false
    },
    returnReason:{
        type:String,
        default:null
    }
})

const Order = mongoose.model("Order",orderSchema);

module.exports = Order; 