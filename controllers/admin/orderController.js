const Order  = require('../../models/orderSchema')

const getOrderPage = async (req,res) =>{
    try {

        const orders = await Order.find()
            .populate('userId','name email')
            .populate('orderedItems.product','name price');
        console.log("orders are ",orders)
        return res.render('admin/order',{
            orders
        })  
    } catch (error) {
        console.log("error in the get order page",error);
        
    }
}
module.exports = {
    getOrderPage
}