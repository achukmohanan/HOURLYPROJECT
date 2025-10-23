const getAboutPage = async (req,res) =>{
    try {
        return res.render('user/about')
    } catch (error) {
        
    }
}
module.exports ={
    getAboutPage
}