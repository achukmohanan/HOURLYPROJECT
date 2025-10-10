const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Transaction = require('../../models/transactionSchema');
const {STATUS_CODE} = require('../../utils/statusCode')
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
        .populate('orderedItems.product','productName  salePrice productImage status')
        .populate('address')
        
        if(!order){
            return res.status(STATUS_CODE.NOT_FOUND).json({success:false,message:" order is not found"});
        }
        // console.log("orders in view order",order)
      return res.render('admin/vieworder',{order}) 
    } catch (error) {
        console.log("error in view get order details ",error)
         return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({success:false,message:"Server Error"});
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
            {$set:{"orderedItems.$[elem].status":status,
                status:status
            }},
            {new:true,
                arrayFilters:[{"elem.status":{$ne:'Cancelled'}}]
            }
        );
        
        if(!order){
            return res.status(STATUS_CODE.NOT_FOUND).json({success:false,message:"Order is Not Found"})
        }
        if(status === 'Delivered'){
            order.deliveredAt = new Date();
            order.save();
            console.log("deleiverd status updated");
            
        }
        return res.json({success:true,message:`Order status updatd to ${status}`,order})
    } catch (error) {
        console.log("error in the backenndn===",error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
    }
}

const   approveReturnRequest =async (req,res)=> {
    try {
        const {orderId} = req.params;
        const {approve} = req.body;
            console.log("approve is ",approve)
        const order = await Order.findOne({orderId:orderId});

        if(!order){
            return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:"No order Found"});
        }
        if(!order.returnRequest.requested){
            return res.status(STATUS_CODE.BAD_REQUEST).json({suceess:false,message:"No Return Request Found"})
        }
        if(approve){
            order.returnRequest.verified = true;
            order.status = "Return Approved";
            order.orderedItems.forEach(item=>{
                if(item.status === 'Return Requested'){
                    item.status = 'Return Approved'
                }
                });
            
            await order.save();

             if ((order.paymentMethod === "COD" || order.paymentMethod === 'Razorpay') &&
              (order.status === "Return Approved" || order.status === "Partially Returned")) {
            
            await User.findByIdAndUpdate(order.userId, {
            $inc: { wallet: order.totalPrice }  
    });        
    await Transaction.create({
        userId:order.userId,
        orderId:orderId,
        type:'Credit',
        amount:order.totalPrice,
        paymentMethod:order.paymentMethod,
        description:'Order is Returned'
    })
        }
        }else{
            order.returnRequest.verified = false;
            order.status = "Return Rejected"
            await order.save()
        }
        
        return res.status(STATUS_CODE.SUCCESS).json({success:true,message:"Approved Successfully"})
    } catch (error) {
        console.log("error in the approve requst",error);

    }
}

const approveCancelRequest = async(req,res) =>{
    try {
        const {orderId,itemId} = req.params
        const { action } = req.body;
        
        const order = await Order.findOne({orderId}).populate('userId');
        // console.log("ordered item testing is",order.userId._id)
        if(!order){
            return res.status(STATUS_CODE.NOT_FOUND).json({success:false,message:"Order not found"})
        }
        
        console.log("discount amount is ",order.discount)
        
        const item = order.orderedItems.id(itemId);
        if(!item){
            return res.status(STATUS_CODE.NOT_FOUND).json({success:false,message:'Item is not found'})
        }
        if(item.status !== 'Cancellation Requested' ){
            return res.status(STATUS_CODE.NOT_FOUND).json({success:false,message:'NO Cancelation Requested'})
        }
        if( action === 'approve'){
        await Product.findByIdAndUpdate(item.product._id,{
        $inc:{quantity:item.quantity}
             });

        item.status = 'Cancelled';
        const cancelledItems = order.orderedItems.filter(i => i.status ==='Cancelled').length;
                
                if(cancelledItems === order.orderedItems.length ){
                    order.status = 'Cancelled';
                }else if(cancelledItems > 0){
                    order.status = 'Partially Cancelled'
                }else{
                    order.status = 'Pending'
                }
       
            let refundAmount = item.quantity * item.price;    

            //if coupon is applied

            if(order.couponApplied && order.discount >0){
                const totalBeforeDiscount = order.totalPrice + order.discount;
                const discountPercentage = (order.discount / totalBeforeDiscount) * 100;

                const  itemDiscount = (refundAmount * discountPercentage) / 100;
                refundAmount = refundAmount - itemDiscount;

            console.log("itemDiscount",itemDiscount)
            console.log("discountPercentage",discountPercentage)

            }
            console.log("refundAmount is",refundAmount)

            if(order.paymentMethod === 'Razorpay' ){
                
                  order.userId.wallet = (order.userId.wallet || 0) + refundAmount
                  await order.userId.save()
                  await Transaction.create({
                    userId:order.userId._id,
                    orderId:orderId,
                    type:'Credit',
                    amount:refundAmount,
                    paymentMethod:'Razorpay',
                    description:'Order Cancelled',

                  })
                }
                await order.save()
                return  res.status(STATUS_CODE.SUCCESS).json({success:true,message:"approved Successfully"})
            }
            if(action === 'reject'){
                item.status = 'Cancellation Rejected'
                
                await order.save();
                return res.status(STATUS_CODE.SUCCESS).json({ success: true, message: "Cancel request rejected successfully" });
            }
       
    } catch (error) {
        console.log("error in the approvecancel request",error);
        
    }
}

module.exports = {
    getOrderPage,
    viewOrderDetails,
    updateOrderStatus,
    approveReturnRequest,
    approveCancelRequest
}