import React from 'react';
import { SITE_CONFIG } from '../config/siteConfig';

export default function SiteFooter({ className = '', style = {} }) {
  const currentYear = new Date().getFullYear();
  const policeUrl = SITE_CONFIG.policeCode 
    ? `http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=${SITE_CONFIG.policeCode}`
    : 'http://www.beian.gov.cn/';

  return (
    <footer className={`site-beian-footer ${className}`} style={style}>
      <div className="site-beian-content">
        <div className="site-beian-copyright">
          <span>&copy; {currentYear} {SITE_CONFIG.siteName}</span>
        </div>

        <div className="site-beian-links">
          {/* 工信部 ICP 备案号 */}
          <a
            href={SITE_CONFIG.icpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="site-beian-link icp-link"
            title="工业和信息化部政务服务平台 ICP / IP 地址 / 域名信息备案管理系统"
          >
            {SITE_CONFIG.icpNumber || 'ICP备案号（待填入）'}
          </a>

          {/* 公安联网备案号（如有） */}
          {SITE_CONFIG.policeRecordNumber && (
            <a
              href={policeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="site-beian-link police-link"
              title="全国公安机关互联网站安全管理服务平台"
            >
              <span className="police-icon" aria-hidden="true">🛡️</span>
              <span>{SITE_CONFIG.policeRecordNumber}</span>
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
