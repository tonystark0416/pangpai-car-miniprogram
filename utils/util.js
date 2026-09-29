const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}
function subTen(value) {
  return  value < 10 ? ('0' + value) : value;
}

	//转换为时间格式
 function formatTimestamp(time) {
    var date = new Date(time);
    var YY = date.getFullYear() + '年';
    var MM = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '月';
    var DD = (date.getDate() < 10 ? '0' + (date.getDate()) : date.getDate())+'日';
    var hh = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':';
    var mm = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) ;
    var ss = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds());
    return YY + MM + DD + " " + hh + mm
    // return YY + MM + DD ;
  }


module.exports = {
  formatTime,
  subTen,
  formatTimestamp
}
