const mongoose = require('mongoose')
const Product = require('./productSchema')
const {Schema} = mongoose

const WishlistSchema = new Schema({
    userId  :{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },
    products:[{
        productId:{
            type: Schema.type.ObjectId,
            ref:'Product',
            required:true
        },
        addedOn :{
            type:Date,
            default:Date.now
        }
    }]

})

const Wishlist = mongoose.model("Wishlist",WishlistSchema);
module.exports = Wishlist;
