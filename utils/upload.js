
//上传函数
function uploadPic(){
  let that = this;
  wx.chooseMedia({
    count:1,
    sizeType:['compressed'],
    mediaType:['image'],
    success:function(res){
      console.log(res)
      //触发文件上传
      wx.uploadFile({
        filePath: res.tempFiles[0].tempFilePath,
        name: 'file',
        url: 'https://pangpai-car.com/car/upload.php',
        success:function(res){
          console.log(JSON.parse(res.data)); //打印上传文件结果
          wx.showLoading({
            title: '正在校验身份证号，请稍等',
            mask:true
          })
          if (JSON.parse(res.data).code==200) {
            wx.request({
              url: 'https://pangpai-car.com/car/route.php',
              data:{
                service:'getIdCard',
                img_url:JSON.parse(res.data).path
              },
              success:function(res){
                console.log(res);
                if (res.data.errcode==0) {
                  wx.hideLoading();
                  wx.showToast({
                    title: '校验成功',
                  })
                }else{
                  wx.showToast({
                    title: '校验失败请重新上传',
                  })
                }
              }
            })
          }
        }
      })
    }

  })
}

module.exports = {
  uploadPic
}