/* 每个表都有 createAt 和 updateAt */

// 渠道表 channel
// channelName: { type: String }, //渠道名称
// channelPkg: { type: String } //渠道包名

// 渠道用户活跃统计表 channelStat
// channelName: { type: String } 渠道名
// totalActive: { type: Number } 总活跃
// statDate: { type: Date } 统计日期

// 订单表 order
// orderId: { type: Number }, // 订单id
// orderName: { type: String }, // 订单名称
// startDate: { type: Date }, // 投放开始日期
// endDate: { type: Date }, // 投放开始日期
// adOwner: { type: String }, // 广告主
// adType: { type: Number }, // 广告类型 1 闪屏 2 插屏
// picUrl: { type: String }, // 广告图片url
// picMd5: { type: String }, // 广告图片md5值
// appName: { type: String }, // 应用名称
// appType: { type: Number }, // 应用类型 1 小程序，2 H5
// wxAppId: { type: String }, // 微信小程序的appid
// wxGameId: { type: String }, // 小程序原始id
// wxAppParams: { type: String }, // 需要传给小程序的自定义参数
// appDescription: { type: String }, // 应用描述
// payType: { type: Number }, // 付费方式 1 CPC，2 CPM
// amount: { type: Number }, // 投放数量
// channelName: { type: String }, // 渠道名称
// showTimes: { type: String }, // 同一用户最多展示次数
// showType: { type: Number }, // 展示类型 1 投放期间，2 每天
// online: { type: Number }, // 上线状态 1 上线 0下线

// 订单统计表 orderStat
// orderId: { type: Number }, // 订单id
// appName: { type: String }, // 应用名称
// appType: { type: Number }, // 应用类型 1 小程序，2 H5
// appType: { type: Number }, // 应用类型 1 小程序，2 H5
// hasData: { type: Number }, // 请求成功数
// show: { type: Number }, // 展示数
// showUser: { type: Number }, // 展示用户去重数
// close: { type: Number }, // 关闭数
// click: { type: Number }, // 点击数
// clickRate: { type: Number }, // 点击率
// statDate: { type: Date } 统计日期
