const Order = require('../../models/orderSchema')

const getOrderPage = async (req,res) =>{
    try {
        // console.log(req.query)
         const {status,date,search} = req.query;
        let filter = {}

       
        //status
        if(status && status!== ""){
            filter.status = status          
        }
        //date
        if(date && date !== ""){
            const today = new Date();
            if(date ===  "today"){
                const startOfDay = new Date(today);
                startOfDay.setHours(0,0,0,0);

                const endOfDay = new Date(today);
                endOfDay.setHours(23,59,59,999);

                filter.createdOn ={
                    $gte: startOfDay,
                    $lt:endOfDay
                };
            }else if(date === 'week'){
                 const weekAgo = new Date(today);
                 weekAgo.setDate(today.getDate() - 7);

                 filter.createdOn = {$gte:weekAgo,$lte:today};
            }else if(date === "month"){
                const monthAgo = new Date(today);
                monthAgo.setMonth(today.getMonth() -1)   

                filter.createdOn = {$gte:monthAgo,$lte:today};
            }
        }
       //search

       if(search && search.trim() !==""){
        filter.$or = [
            {orderId:{$regex:search,$options:"i"}},
            {"userId.name":{$regex:search,$options:'i'}}
        ];
       }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        
        const totalOrders = await Order.countDocuments(filter)
        const totalPages = Math.ceil(totalOrders/limit);

        const orders = await Order.find(filter)
            .populate('userId','name email')
            .populate('orderedItems.product','name price')
            .sort({createdOn:-1})
            .skip((page - 1) * limit )
            .limit(limit)


        // console.log("orders are ",orders)

        if(req.xhr || req.headers.accept.indexOf('application/json') > -1){
            return res.json({
                orders
                
            });
        }
        // console.log("orders is",orders)

        return res.render('admin/order',{
            orders,
            currentPage:page,
            totalOrders,
            totalPages
        });  
    } catch (error) {
        console.log("error in the get order page",error);
        
    }
}
const viewOrderDetails = async (req,res) =>{
    try {
        const orderId = req.params.id;
        // console.log("orderid",orderId)
        const order = await Order.findOne({orderId:orderId})
        .populate('userId','name email phone')
        .populate('orderedItems.product','productName  salePrice productImage')
        .populate('address')
        
        if(!order){
            return res.status(404).json({success:false,message:" order is not found"});
        }
        // console.log("orders in view order",order)
      return res.render('admin/vieworder',{order}) 
    } catch (error) {
        console.log("error in view get order details ",error)
         return res.status(500).json({success:false,message:"Server Error"});
    }
}
const updateOrderStatus = async (req, res) =>{
    try {

        const {orderId} = req.params;
        const {status} = req.body;
        // console.log("status",status)
        // console.log("orderId",orderId)
        const order = await Order.findOneAndUpdate(
            {orderId},
            {$set:{status}},
            {new:true}
        );
        if(!order){
            return res.status(404).json({success:false,message:"Order is Not Found"})
        }
        return res.json({success:true,message:`Order status updatd to ${status}`,order})
    } catch (error) {
        console.log("error in the backenndn===",error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

const   approveReturnRequest =async (req,res)=> {
    try {
        const {orderId} = req.params;
        const {approve} = req.body;

        const order = await Order.findOne({orderId:orderId});

        if(!order){
            return res.status(400).json({success:false,message:"No order Found"});
        }
        if(!order.returnRequest.requested){
            return res.status(400).json({suceess:false,message:"No Return Request Found"})
        }
        if(approve){
            order.returnRequest.verified = true;
            order.status = "Return Approved";
            await order.save();
        }else{
            order.returnRequest.verified = false;
            order.status = "Return Rejected"
            await order.save()
        }
        
        return res.status(200).json({success:true,message:"Approved Successfully"})
    } catch (error) {
        console.log("error in the approve requst",error);

    }
}

module.exports = {
    getOrderPage,
    viewOrderDetails,
    updateOrderStatus,
    approveReturnRequest
}