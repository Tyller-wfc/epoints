/**
 * 网站全局配置（包含备案信息）
 * 
 * 备案说明：
 * 1. icpNumber: 填写管局下发的ICP备案号（例如：'粤ICP备XXXXXXXX号-1'）
 * 2. policeRecordNumber: 填写全国公安联网备案号（例如：'粤公网安备 XXXXXXXXXXXXXX号'），若尚未办理可留空
 * 3. policeCode: 填写公安备案号中的数字部分，用于生成全国公安机关互联网站安全管理服务平台的跳转链接
 */
export const SITE_CONFIG = {
  siteName: '个人日常任务事项管理',
  subtitle: '记录规划日常事项，高效专注每一天',
  kicker: 'PERSONAL TASK MANAGEMENT',
  // ICP备案号：请在通过管局审核后在此填写，例如 '粤ICP备2024000000号'
  icpNumber: '豫ICP备2026042110号',
  icpUrl: 'https://beian.miit.gov.cn/',
  // 公安联网备案号（可选，若有请填写，例如 '粤公网安备 44030000000000号'）
  policeRecordNumber: '',
  policeCode: '',
};
