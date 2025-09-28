const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const concernSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    issueType:{
        type:String,
        enum:[
            "Cancel Issue",
            "Return Issue",
            "Refund Issue",
            "Referral Issue",
            "Coupon Issue",
            "Product Issue",
            "Delivery Issue",
            "Offer Issue",,
            "Feedback",
            "Order Issue",
            "Other"
        ],
        required:true,
    },
    description:{
        type:String,
        required:true,
        trim:true
    },
    status:{
        type:String,
        enum:[
            'Pending','Approved','Rejected','Resolved'
        ],
        default:'Pending'
    },
    adminReply:{
        type:String,
        default:""
    },
    createdAt:{
        type:Date,
        default:Date.now()
    },
    updatedAt:{
        type:Date,
        default:Date.now()
    }
})

const Concern =  mongoose.model('Concern',concernSchema);
module.exports = Concern ;