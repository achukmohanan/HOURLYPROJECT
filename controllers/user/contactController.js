const User = require('../../models/userSchema');
const Concern = require('../../models/concernSchema');
 


const getContactPage = async (req,res) =>{
    try {
        const userId = req.session.user
        const concern = await Concern.findOne({userId})
        console.log("concern got is ",concern)
        const user = await User.findById(userId);
         
        res.render('user/contact',{user,concern})
    } catch (error) {
        
    }
}
const postContact = async (req,res) =>{
    try {
        const userId = req.session.user
        console.log("req.body is ",req.body)
        const {name,email,issueType,message} = req.body;
        console.log("issue  ",issueType)
        console.log("mesage is ",message)
        const concern = await Concern.create({
                userId:userId,
                issueType:issueType,
                description:message,
                status:'Pending',
                adminReply:'',

        })
        await concern.save();

        console.log("concern is",concern)
        return res.status(200).json({success:true,message:'Concern Submitted Successfully'})
    } catch (error) {
        console.log("error  in the post contact ",error);
        
    }
}
module.exports ={
    getContactPage,
    postContact
}