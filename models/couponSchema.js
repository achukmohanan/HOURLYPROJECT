const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  purpose:{
    type:String,
    enum:['Referral','General'],
    required:true
  },
  discountType: {
    type: String,
    enum: ["percentage"],
    default:"percentage",
  },
  discountValue: {  
    type: Number,
    required: true,
  },
 
  description: {
    type: String,
  },
  limit: {
    type: Number,
    default: 1,
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  expireOn: {
    type: Date,
    required: true,
  },

  minPurchase: {
    type: Number,
    required: true,
  },
  maxDiscount:{
    type:Number,
    required:true
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  userId: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
