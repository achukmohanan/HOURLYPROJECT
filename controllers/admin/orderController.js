const Order = require('../../models/orderSchema')

const getOrderPage = async (req,res) =>{
    try {
        console.log(req.query)
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


        const orders = await Order.find(filter)
            .populate('userId','name email')
            .populate('orderedItems.product','name price')
            .sort({createdOn:-1})
        console.log("orders are ",orders)

        if(req.xhr || req.headers.accept.indexOf('application/json') > -1){
            return res.json({orders});
        }

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