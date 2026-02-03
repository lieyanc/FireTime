#!/bin/bash

# FireTime Bootstrap Script
# 面板/cron 调用此脚本自动检查更新并部署
#
# 用法 (国际):
#   curl -fsSL https://raw.githubusercontent.com/lieyanc/FireTime/master/scripts/bootstrap.sh | bash
#
# 用法 (中国大陆加速):
#   curl -fsSL https://gh-proxy.org/https://raw.githubusercontent.com/lieyanc/FireTime/master/scripts/bootstrap.sh | bash
#
# 调试模式:
#   curl -fsSL ... | bash -s -- --debug
#   或: ./bootstrap.sh --debug

set -e

# 默认值
DEBUG=false
# 默认在脚本运行时的当前目录部署（可用 --dir 覆盖）
SCRIPT_DIR="$(pwd)"

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --debug|-d)
            DEBUG=true
            shift
            ;;
        --dir)
            SCRIPT_DIR="$2"
            shift 2
            ;;
        *)
            # 如果不是选项，当作目录
            if [[ ! "$1" =~ ^- ]]; then
                SCRIPT_DIR="$1"
            fi
            shift
            ;;
    esac
done

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[BOOTSTRAP]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[BOOTSTRAP]${NC} $1"; }
log_error() { echo -e "${RED}[BOOTSTRAP]${NC} $1"; }
log_debug() { 
    if [ "$DEBUG" = true ]; then
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

log_debug "DEBUG=$DEBUG"
log_debug "SCRIPT_DIR=$SCRIPT_DIR"

# GitHub 代理（中国大陆加速）
GH_PROXY=""

# 确保只添加一次 gh-proxy 前缀，避免出现
# https://gh-proxy.org/https://gh-proxy.org/https://...
strip_gh_proxy_prefix() {
    local url="$1"
    local prefix="https://gh-proxy.org/"
    while [[ "$url" == "${prefix}"* ]]; do
        url="${url#${prefix}}"
    done
    echo "$url"
}

proxy_url() {
    local url
    url="$(strip_gh_proxy_prefix "$1")"
    if [ -n "$GH_PROXY" ]; then
        echo "${GH_PROXY}${url}"
    else
        echo "$url"
    fi
}

# 检测是否在中国大陆
detect_china() {
    log_debug "检测网络环境..."
    log_debug "尝试访问 https://www.google.com (超时 2 秒)"
    
    if ! curl -s --connect-timeout 2 -o /dev/null https://www.google.com 2>/dev/null; then
        GH_PROXY="https://gh-proxy.org/"
        log_info "检测到中国大陆网络，使用加速代理"
        log_debug "GH_PROXY=$GH_PROXY"
    else
        log_debug "可直接访问国际网络，不使用代理"
    fi
}

detect_china

# 构建 URL
REPO="lieyanc/FireTime"
BRANCH="master"
DEPLOY_SCRIPT_URL="$(proxy_url "https://raw.githubusercontent.com/${REPO}/${BRANCH}/scripts/deploy.sh")"
CONFIG_EXAMPLE_URL="$(proxy_url "https://raw.githubusercontent.com/${REPO}/${BRANCH}/scripts/deploy.config.example.json")"

log_debug "REPO=$REPO"
log_debug "BRANCH=$BRANCH"
log_debug "DEPLOY_SCRIPT_URL=$DEPLOY_SCRIPT_URL"
log_debug "CONFIG_EXAMPLE_URL=$CONFIG_EXAMPLE_URL"

# 确保目录存在
log_debug "创建目录: $SCRIPT_DIR"
mkdir -p "$SCRIPT_DIR"
cd "$SCRIPT_DIR"
log_debug "当前工作目录: $(pwd)"

# 下载/更新 deploy.sh
log_info "更新 deploy.sh..."
log_debug "执行: curl -fsSL -o deploy.sh \"$DEPLOY_SCRIPT_URL\""

if [ "$DEBUG" = true ]; then
    # 调试模式：显示详细的 curl 输出
    echo -e "${CYAN}[DEBUG]${NC} curl 详细输出:"
    if curl -fsSL -v -o deploy.sh "$DEPLOY_SCRIPT_URL" 2>&1; then
        log_debug "下载成功"
    else
        EXIT_CODE=$?
        log_error "下载失败，退出码: $EXIT_CODE"
        log_debug "尝试不使用代理..."
        FALLBACK_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}/scripts/deploy.sh"
        log_debug "FALLBACK_URL=$FALLBACK_URL"
        curl -fsSL -v -o deploy.sh "$FALLBACK_URL" 2>&1 || {
            log_error "直接下载也失败了"
            exit 1
        }
    fi
else
    curl -fsSL -o deploy.sh "$DEPLOY_SCRIPT_URL" || {
        log_error "下载 deploy.sh 失败"
        exit 1
    }
fi

chmod +x deploy.sh
log_debug "deploy.sh 权限设置完成"
log_debug "deploy.sh 大小: $(wc -c < deploy.sh) 字节"

# 如果没有配置文件，下载示例
if [ ! -f "deploy.config.json" ]; then
    if [ ! -f "deploy.config.example.json" ]; then
        log_info "下载配置模板..."
        log_debug "执行: curl -fsSL -o deploy.config.example.json \"$CONFIG_EXAMPLE_URL\""
        curl -fsSL -o deploy.config.example.json "$CONFIG_EXAMPLE_URL" || {
            log_warn "下载配置模板失败，但不影响运行"
        }
    fi
    log_warn "配置文件不存在，请先运行: cd \"$SCRIPT_DIR\" && ./deploy.sh"
    exit 1
fi

# 以 auto 模式运行
log_info "执行自动更新检查..."
log_debug "执行: ./deploy.sh auto"
./deploy.sh auto
