const getContactPage = async (req,res) =>{
    try {
        res.render('user/contact')
    } catch (error) {
        
    }
}
module.exports ={
    getContactPage
}