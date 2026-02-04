const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    orderId:{
        type:String,
        ref:'Order',
        required:false
    },
    type:{
        type:String,
        enum:['Credit','Debit','Failed'],
        required:true
    },
    amount:{
        type:Number,
        required:true
    },
    paymentMethod:{
        type:String,
        enum:['Wallet','Razorpay','COD'],
        required:false
    },
     wallet: {
    type: Boolean,
    default: false
  },
    description:{
        type:String
    },
    date:{
        type:Date,
        default:Date.now,
        required:true
    }
});

const Transaction = mongoose.model('Transaction',transactionSchema)   

module.exports = Transaction;