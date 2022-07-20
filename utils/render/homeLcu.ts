import {champDict} from '../lolData'
import {credentials, champMastery, summonerInfo, homeData} from "../types/lcu";

let currentId:number

// 查询本地召唤师信息
const queryCurrentSummonerInfo = async (credentials:credentials):Promise<summonerInfo> => {
  const summonerInfo = (await  window.lct.createHttp1Request({
    method: "GET",
    url: `/lol-summoner/v1/current-summoner`,
  }, credentials))
  currentId = summonerInfo.summonerId
  const imgUrl:string = `https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/usericon/${summonerInfo.profileIconId}.png`

  return {name:summonerInfo.displayName,imgUrl,lv:"Lv "+summonerInfo.summonerLevel}
}

// 查询本地召唤师英雄熟练度
const queryCurrentChapm = async (credentials:credentials) => {
  const summonerSuperChampData:Array<champMastery> = await window.lct.createHttp1Request({
    method: "GET",
    url: `/lol-collections/v1/inventories/${currentId}/champion-mastery`,
  }, credentials)
  return summonerSuperChampData
}

// 处理本地召唤师英雄熟练度数据
const dealSuperChapm = (summonerSuperChampData:Array<champMastery>,index:number,end:number) => {

  let superChampList = []
  if (end>3){
    for (const summonerSuperChampDatum of summonerSuperChampData.slice(index,end)) {
      // @ts-ignore
      let champImgUrl = `https://game.gtimg.cn/images/lol/act/img/champion/${champDict[String(summonerSuperChampDatum.championId)].alias}.png`
      let championPoints = summonerSuperChampDatum.championPoints
      let champLevel = summonerSuperChampDatum.championLevel
      superChampList.push([champImgUrl,champLevel,championPoints])
    }
    return superChampList
  }else {
    for (const summonerSuperChampDatum of summonerSuperChampData.slice(index,end)) {
      // @ts-ignore
      let champName = champDict[String(summonerSuperChampDatum.championId)].label
      let championPoints = "英雄熟练度：" +summonerSuperChampDatum.championPoints
      superChampList.push(champName,championPoints)
    }
    return superChampList
  }
}

// 查询召唤师排位分数
const queryCurrentRankPoint = async (credentials:credentials) => {
  const rankPoint = (await window.lct.createHttp1Request({
    method:"GET",
    url:'/lol-ranked/v1/current-ranked-stats'
  },credentials)).queues
  // 单双排位/ 灵活排位/ 云顶之亦
  let rankSolo = rankPoint.find((i:any) => i.queueType=="RANKED_SOLO_5x5")
  let rankSr = rankPoint.find((i:any) => i.queueType=="RANKED_FLEX_SR")
  let rankTft = rankPoint.find((i:any) => i.queueType=="RANKED_TFT")

  let RANKED_SOLO =  rankSolo.tier =="NONE" ? '未定级': `${englishToChinese(rankSolo.tier)}${rankSolo.division} ${rankSolo.leaguePoints}`
  let RANKED_FLEX_SR =  rankSr.tier =="NONE" ? '未定级':`${englishToChinese(rankSr.tier)}${rankSr.division} ${rankSr.leaguePoints}`
  let RANKED_TFT =  rankTft.tier =="NONE" ? '未定级':`${englishToChinese(rankTft.tier)}${rankTft.division} ${rankTft.leaguePoints}`

  return [RANKED_SOLO,RANKED_FLEX_SR,RANKED_TFT]
}

// 返回最终需要的数据
export const returnRankData = async (credentials:credentials):Promise<homeData> => {
  const summonerInfo =  await queryCurrentSummonerInfo(credentials)
  const rankList = await queryCurrentRankPoint(credentials)
  const rank =  [summonerInfo.name,summonerInfo.lv,rankList[0],rankList[1],rankList[2],"S12季前赛",summonerInfo.imgUrl]

  const summonerSuperChampData = await queryCurrentChapm(credentials)

  const carry = dealSuperChapm(summonerSuperChampData,0,3)
  const honorData = await querySummonerHonorLevel(credentials)
  const chapmLevel = dealSuperChapm(summonerSuperChampData,0,15)
  return {rank, carry,honorData,chapmLevel}
}


// 查看召唤师荣誉等级
export const querySummonerHonorLevel = async (credentials:credentials) => {
  const summonerHonor = await window.lct.createHttp1Request({
    method: "GET",
    url: `/lol-honor-v2/v1/profile`,
  },credentials)
  return ['荣誉等级 '+summonerHonor.honorLevel,'里程点数 '+summonerHonor.checkpoint]
}

// 英文段位昵称转中文
const englishToChinese = (tier:string) => {
  switch (tier) {
    case 'CHALLENGER' :return '王者';
    case 'GRANDMASTER' :return '宗师';
    case 'MASTER' :return '大师';
    case 'DIAMOND' :return '砖石';
    case 'PLATINUM' :return '铂金';
    case 'GOLD' :return '黄金';
    case 'SILVER' :return '白银';
    case 'BRONZE' :return '青铜';
    case 'IRON' :return '黑铁';
  }
}

// 查询敌方召唤师ID
export const queryEnemySummonerId= async (credentials:credentials) => {
  await queryCurrentSummonerInfo(credentials)
  const mactchSession = await window.lct.createHttp1Request({
    method: "GET",
    url: `/lol-gameflow/v1/session`,
  },credentials)
  let enemyId = []

  if (mactchSession.gameData.teamOne.find((i:any) =>i.accountId === currentId )){
    var enemyInfo = mactchSession.gameData.teamTwo
  }else{
    var enemyInfo = mactchSession.gameData.teamOne
  }

  for (const enemy of enemyInfo) {
    enemyId.push(enemy.accountId)
  }
  return enemyId
}
