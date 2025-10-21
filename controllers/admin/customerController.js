const { model } = require('mongoose');
const User = require('../../models/userSchema');
const { STATUS_CODE } = require('../../utils/statusCode');



    const customerInfo = async (req,res)=>{
    
    try {
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 6;

        const userData = await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*",$options:"i"}},
                {email:{$regex:".*"+search+".*",$options:"i"}}
            ]
        })
        .sort({ _id: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const count = await User.countDocuments({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*",$options:"i"}},
                {email:{$regex:".*"+search+".*",$options:"i"}}
            ]
        });

        res.render('admin/customers', {
            data:userData,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            searchTerm: search
        });

    } catch (error) {
        console.error("Error in customerInfo:", error);
        res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
}
const customerBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({_id: id}, {$set: {isBlocked: true}});
        res.status(STATUS_CODE.SUCCESS).json({ success: true, message: 'User blocked successfully' });
    } catch (error) {
        console.error('Block error:', error);
        res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server Error' });
    }
}

const customerunBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({_id: id}, {$set: {isBlocked: false}});
        res.status(STATUS_CODE.SUCCESS).json({ success: true, message: 'User unblocked successfully' });
    } catch (error) {
        console.error('Unblock error:', error);
        res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server Error' });
    }
}
// const customerBlocked = async (req,res) =>{
//     try {
//         let id = req.query.id;
//         await User.updateOne({_id:id},{$set:{isBlocked:true}})
//         res.status(200).json({ success: true });
//     } catch (error) {
//         res.status(500).json({ success: false, message: 'Server Error' });
//         // res.redirect('/pageerror')
//     }
// }

// const customerunBlocked = async (req,res) =>{
//     try {
        
//         let id = req.query.id;
//         await User.updateOne({_id:id},{$set:{isBlocked:false}})
//         res.status(200).json({ success: true });
//     } catch (error) {
//         res.status(500).json({ success: false, message: 'Server Error' });
//     }
// }


//  const loadcustomerInfo = async(req,res) =>{
//     console.log("loadcustomer")
//     try {
//         return res.render('/admin/customers')
//     } catch (error) {
//         console.log("error happened in load customers",error);
//         return res.status(500).send("internal error happend")
        
    
// }


    // const customerInfo = async (req,res)=>{
    //     console.log("customers")
    //     try {
    //         let search = "";
    //         if(req.query.search){
    //             search = req.query.search;
    //         }
    //         let page = 1;
    //         if(req.query.page){
    //             page = req.query.page
    //         }
    //         const limit = 3;
    //         const userData = await User.find({
    //             isAdmin:false,
    //             $or:[
    //                 {name:{$regex:".*"+search+".*",$options:"i"}},
    //                 {email:{$regex:".*"+search+".*",$options:"i"}}
    //             ]
    //         })
    //         .limit((limit*1))
    //         .skip((page -1)*limit)
    //         .exec();

    //         const count = await User.find({
    //             isAdmin:false,
    //             $or:[
    //                 {name: { $regex: ".*" + search + ".*" } },
    //                 {email:{$regex:".*" +search+ ".*"}}
    //             ],
    //         }).countDocuments()
            
    //         res.render('admin/customers')
    //     } catch (error) {
            
    //     }
    // }

module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked,
    // loadcustomerInfo
}