#!/bin/bash
# =============================================================================
# ePoints 部署脚本
# 用法：bash /opt/deploy.sh
# 执行内容：拉取最新代码 → 构建前端 → 构建后端 → 重启服务
# =============================================================================

set -e  # 任何命令失败立即退出

# ── 配置区（按实际情况修改）────────────────────────────────────────────────
APP_DIR="/opt/epoints"          # 项目根目录
SERVER_DIR="$APP_DIR/server"    # 后端目录
PM2_APP_NAME="epoints-api"      # PM2 应用名称
NPM_REGISTRY="https://registry.npmmirror.com"
# ──────────────────────────────────────────────────────────────────────────────

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()    { echo -e "${GREEN}[✓]${NC} $1"; }
log_step()    { echo -e "${BLUE}[→]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
log_error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   ePoints 部署脚本  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# ── 步骤 1：拉取最新代码 ──────────────────────────────────────────────────
log_step "拉取最新代码..."
cd "$APP_DIR" || log_error "项目目录不存在：$APP_DIR"

# 记录当前 commit，用于回滚提示
PREV_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

git fetch origin

# 丢弃服务器上可能存在的本地修改（如直接 npm install 产生的锁文件变更）
git checkout -- . 2>/dev/null || true

git pull origin main

NEW_COMMIT=$(git rev-parse --short HEAD)
log_info "代码已更新：$PREV_COMMIT → $NEW_COMMIT"

# ── 步骤 2：构建前端 ──────────────────────────────────────────────────────
log_step "安装前端依赖..."
cd "$APP_DIR"
npm install --registry="$NPM_REGISTRY" --prefer-offline

log_step "构建前端..."
npm run build
log_info "前端构建完成 → $APP_DIR/dist/"

# ── 步骤 3：构建后端 ──────────────────────────────────────────────────────
log_step "安装后端依赖..."
cd "$SERVER_DIR"
npm install --registry="$NPM_REGISTRY" --prefer-offline

log_step "构建后端..."
npm run build
log_info "后端构建完成 → $SERVER_DIR/dist/"

# ── 步骤 4：重启后端服务 ──────────────────────────────────────────────────
log_step "重启后端服务（PM2）..."
if pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
    pm2 restart "$PM2_APP_NAME"
    log_info "服务已重启"
else
    log_warn "PM2 中找不到 $PM2_APP_NAME，尝试启动..."
    cd "$SERVER_DIR"
    pm2 start dist/main.js --name "$PM2_APP_NAME"
    pm2 save
    log_info "服务已启动"
fi

# ── 步骤 5：同步 Nginx 配置（含 client_max_body_size 修复）────────────────
log_step "同步 Nginx 配置..."
NGINX_CONF_SRC="$APP_DIR/nginx.conf"
NGINX_CONF_DEST="/etc/nginx/sites-available/epoints"
NGINX_CONF_LINK="/etc/nginx/sites-enabled/epoints"

if [ -f "$NGINX_CONF_SRC" ]; then
    sudo cp "$NGINX_CONF_SRC" "$NGINX_CONF_DEST"
    # 创建软链（已存在则跳过）
    if [ ! -L "$NGINX_CONF_LINK" ]; then
        sudo ln -sf "$NGINX_CONF_DEST" "$NGINX_CONF_LINK"
        log_info "已创建 Nginx sites-enabled 软链"
    fi
    # 测试配置语法
    if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx
        log_info "Nginx 配置已更新并重载"
    else
        log_warn "Nginx 配置语法检查失败，跳过重载（请手动执行 nginx -t 排查）"
    fi
else
    log_warn "未找到 nginx.conf，跳过 Nginx 配置同步"
fi

# ── 步骤 6：等待服务就绪并验证 ───────────────────────────────────────────
log_step "等待服务就绪..."
sleep 3

# 检查后端是否响应
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/auth/me 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
    log_info "后端 API 响应正常（HTTP $HTTP_CODE）"
else
    log_warn "后端 API 响应异常（HTTP $HTTP_CODE），请检查日志：pm2 logs $PM2_APP_NAME"
fi

# ── 完成 ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   部署完成！${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "  当前版本：$NEW_COMMIT"
echo "  前端目录：$APP_DIR/dist/"
echo "  后端状态：$(pm2 describe $PM2_APP_NAME 2>/dev/null | grep status | awk '{print $4}' || echo '未知')"
echo ""
echo "  查看后端日志：pm2 logs $PM2_APP_NAME"
echo "  查看服务状态：pm2 status"
echo ""
