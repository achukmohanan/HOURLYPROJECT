const { model } = require('mongoose');
const User = require('../../models/userSchema');



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
        res.status(500).send("Internal Server Error");
    }
}

const customerBlocked = async (req,res) =>{
    try {
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const customerunBlocked = async (req,res) =>{
    try {
        
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageerror')
    }
}


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