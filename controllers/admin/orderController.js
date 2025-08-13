const Order  = require('../../models/orderSchema')

const getOrderPage = async (req,res) =>{
    try {

        const orders = await Order.find()

        return res.render('admin/order')
    } catch (error) {
        
    }
}
module.exports = {
    getOrderPage
}