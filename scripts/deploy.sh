#!/bin/bash

# FireTime Deploy Script
# 用法:
#   ./deploy.sh          # 手动部署（首次运行会启动配置向导）
#   ./deploy.sh check    # 仅检查是否有更新
#   ./deploy.sh auto     # 自动模式：检查更新并部署（静默，适合 cron/面板）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/deploy.config.json"
CONFIG_EXAMPLE="$SCRIPT_DIR/deploy.config.example.json"
VERSION_FILE="$SCRIPT_DIR/.last_run_id"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }
log_debug() { [ "$DEBUG" == "1" ] && echo -e "${BLUE}[DEBUG]${NC} $1" || true; }

# GitHub 代理（中国大陆加速）
GH_PROXY=""
GH_RAW_PROXY=""

# 检测是否在中国大陆
detect_china() {
    # 检测方法：尝试访问 google.com，如果超时则认为在中国大陆
    if ! curl -s --connect-timeout 2 -o /dev/null https://www.google.com 2>/dev/null; then
        GH_PROXY="https://gh-proxy.org/"
        GH_RAW_PROXY="https://gh-proxy.org/"
        log_info "检测到中国大陆网络，使用加速代理"
    fi
}

# 构建 API URL
api_url() {
    echo "${GH_PROXY}https://api.github.com$1"
}

# 构建 Raw URL
raw_url() {
    echo "${GH_RAW_PROXY}https://raw.githubusercontent.com$1"
}

# 检查依赖
check_deps() {
    command -v curl >/dev/null 2>&1 || log_error "需要安装 curl"
    command -v tar >/dev/null 2>&1 || log_error "需要安装 tar"
    command -v jq >/dev/null 2>&1 || log_error "需要安装 jq: apt install jq"
    command -v unzip >/dev/null 2>&1 || log_error "需要安装 unzip"
}

# TUI 配置向导
setup_wizard() {
    echo ""
    echo -e "${BOLD}╭─────────────────────────────────────────╮${NC}"
    echo -e "${BOLD}│  ${CYAN}FireTime Deploy Setup${NC}${BOLD}                  │${NC}"
    echo -e "${BOLD}╰─────────────────────────────────────────╯${NC}"
    echo ""

    # 读取默认值
    local default_repo="lieyanc/FireTime"
    local default_dir="/opt/firetime"
    local default_port="9853"
    local default_pm="pm2"

    # 交互式配置
    echo -e "${BLUE}[1/5]${NC} GitHub 仓库"
    read -p "      (${default_repo}): " input_repo
    local repo="${input_repo:-$default_repo}"

    echo -e "${BLUE}[2/5]${NC} 部署目录"
    read -p "      (${default_dir}): " input_dir
    local deploy_dir="${input_dir:-$default_dir}"

    echo -e "${BLUE}[3/5]${NC} 端口"
    read -p "      (${default_port}): " input_port
    local port="${input_port:-$default_port}"

    echo -e "${BLUE}[4/5]${NC} GitHub Token (私有仓库需要，回车跳过)"
    read -sp "      : " input_token
    echo ""
    local token="${input_token:-}"

    echo -e "${BLUE}[5/5]${NC} 进程管理器"
    echo "      选项: pm2 / systemd / none"
    read -p "      (${default_pm}): " input_pm
    local pm="${input_pm:-$default_pm}"

    # 生成配置文件
    cat > "$CONFIG_FILE" << EOF
{
  "repo": "$repo",
  "artifact_name": "firetime-standalone",
  "deploy_dir": "$deploy_dir",
  "port": $port,
  "github_token": "$token",
  "auto_restart": true,
  "process_manager": "$pm"
}
EOF

    echo ""
    echo -e "${GREEN}✓${NC} 配置已保存到 ${CYAN}deploy.config.json${NC}"
    # 设置配置文件权限（包含敏感的 token）
    chmod 600 "$CONFIG_FILE"
    echo ""
}

# 加载配置
load_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        return 1
    fi

    # 验证 JSON 格式
    if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
        log_error "配置文件 JSON 格式错误: $CONFIG_FILE"
    fi

    REPO=$(jq -r '.repo' "$CONFIG_FILE")
    ARTIFACT_NAME=$(jq -r '.artifact_name' "$CONFIG_FILE")
    DEPLOY_DIR=$(jq -r '.deploy_dir' "$CONFIG_FILE")
    PORT=$(jq -r '.port' "$CONFIG_FILE")
    # 优先使用环境变量中的 token
    local config_token=$(jq -r '.github_token // ""' "$CONFIG_FILE")
    GITHUB_TOKEN="${GITHUB_TOKEN:-$config_token}"
    AUTO_RESTART=$(jq -r '.auto_restart // true' "$CONFIG_FILE")
    PROCESS_MANAGER=$(jq -r '.process_manager // "pm2"' "$CONFIG_FILE")

    # 验证必要字段
    if [ -z "$REPO" ] || [ "$REPO" == "null" ]; then
        log_error "配置缺少必要字段: repo"
    fi

    # 如果环境变量提供了 token 但配置文件没有，自动保存到配置
    if [ -n "$GITHUB_TOKEN" ] && [ -z "$config_token" ]; then
        log_info "检测到 GITHUB_TOKEN 环境变量，保存到配置文件..."
        save_token_to_config "$GITHUB_TOKEN"
    fi

    log_debug "配置加载完成: repo=$REPO, deploy_dir=$DEPLOY_DIR"
    if [ -n "$GITHUB_TOKEN" ]; then
        log_debug "GITHUB_TOKEN=***${GITHUB_TOKEN: -4}"
    fi
    return 0
}

# 保存 token 到配置文件
save_token_to_config() {
    local token="$1"
    local temp_file=$(mktemp)
    jq --arg token "$token" '.github_token = $token' "$CONFIG_FILE" > "$temp_file"
    mv "$temp_file" "$CONFIG_FILE"
    chmod 600 "$CONFIG_FILE"
    log_info "Token 已保存，配置文件权限已设置为 600"
}

# 获取最新构建信息
# 返回: run_id 或 "null"（无构建）或 "error:原因"（API 错误）
get_latest_run() {
    local auth_header=""
    if [ -n "$GITHUB_TOKEN" ]; then
        auth_header="Authorization: Bearer $GITHUB_TOKEN"
    fi

    local url=$(api_url "/repos/$REPO/actions/runs?status=success&per_page=1")
    log_debug "API URL: $url"

    local response
    local http_code
    if [ -n "$auth_header" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "$auth_header" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" "$url")
    fi

    # 分离响应体和状态码
    http_code=$(echo "$response" | tail -n1)
    response=$(echo "$response" | sed '$d')

    log_debug "HTTP 状态码: $http_code"

    # 检查 HTTP 状态码
    if [ "$http_code" != "200" ]; then
        local error_msg=$(echo "$response" | jq -r '.message // "未知错误"' 2>/dev/null || echo "无法解析响应")
        echo "error:HTTP $http_code - $error_msg"
        return
    fi

    # 检查响应是否为有效 JSON
    if ! echo "$response" | jq empty 2>/dev/null; then
        echo "error:API 返回非 JSON 响应"
        return
    fi

    # 检查是否有 workflow_runs 数组
    local total_count=$(echo "$response" | jq -r '.total_count // 0')
    if [ "$total_count" == "0" ]; then
        echo "null"
        return
    fi

    echo "$response" | jq -r '.workflow_runs[0].id'
}

# 检查更新
# 返回: "none"（无构建）| "current"（已最新）| "error:原因" | run_id（有新版本）
check_update() {
    local latest_run=$(get_latest_run)

    # 检查是否为错误
    if [[ "$latest_run" == error:* ]]; then
        echo "$latest_run"
        return
    fi

    if [ "$latest_run" == "null" ] || [ -z "$latest_run" ]; then
        echo "none"
        return
    fi

    local last_run=""
    if [ -f "$VERSION_FILE" ]; then
        last_run=$(cat "$VERSION_FILE")
    fi

    if [ "$latest_run" == "$last_run" ]; then
        echo "current"
    else
        echo "$latest_run"
    fi
}

# 下载并部署
deploy() {
    local run_id="$1"
    
    log_step "获取 artifact 下载链接..."
    
    local auth_header=""
    if [ -n "$GITHUB_TOKEN" ]; then
        auth_header="Authorization: Bearer $GITHUB_TOKEN"
    fi

    local url=$(api_url "/repos/$REPO/actions/runs/$run_id/artifacts")
    local response
    if [ -n "$auth_header" ]; then
        response=$(curl -s -H "$auth_header" "$url")
    else
        response=$(curl -s "$url")
    fi

    local artifact_id=$(echo "$response" | jq -r ".artifacts[] | select(.name==\"$ARTIFACT_NAME\") | .id")
    
    if [ "$artifact_id" == "null" ] || [ -z "$artifact_id" ]; then
        log_error "未找到 artifact: $ARTIFACT_NAME"
    fi

    # 获取下载 URL（需要通过 API 获取临时下载链接）
    local download_url=$(api_url "/repos/$REPO/actions/artifacts/$artifact_id/zip")

    log_step "下载构建产物..."
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"

    if [ -n "$auth_header" ]; then
        curl -sL -H "$auth_header" -o artifact.zip "$download_url"
    else
        curl -sL -o artifact.zip "$download_url"
    fi

    log_step "解压文件..."
    unzip -q artifact.zip
    tar -xzf firetime-standalone.tar.gz

    # 停止现有进程
    if [ "$AUTO_RESTART" == "true" ]; then
        log_step "停止现有进程..."
        case "$PROCESS_MANAGER" in
            pm2)
                pm2 stop firetime 2>/dev/null || true
                ;;
            systemd)
                sudo systemctl stop firetime 2>/dev/null || true
                ;;
        esac
    fi

    log_step "部署到 $DEPLOY_DIR..."
    sudo mkdir -p "$DEPLOY_DIR"
    sudo rm -rf "$DEPLOY_DIR"/*
    sudo cp -r . "$DEPLOY_DIR"/
    sudo rm -f "$DEPLOY_DIR"/artifact.zip "$DEPLOY_DIR"/firetime-standalone.tar.gz

    # 保存版本号
    echo "$run_id" > "$VERSION_FILE"

    # 清理临时文件
    cd /
    rm -rf "$temp_dir"

    # 重启进程
    if [ "$AUTO_RESTART" == "true" ]; then
        log_step "启动应用..."
        case "$PROCESS_MANAGER" in
            pm2)
                cd "$DEPLOY_DIR" && PORT=$PORT pm2 start server.js --name firetime
                ;;
            systemd)
                sudo systemctl start firetime
                ;;
            none)
                log_info "请手动启动: cd $DEPLOY_DIR && PORT=$PORT node server.js"
                ;;
        esac
    fi

    log_info "部署完成! Run ID: $run_id"
}

# 主逻辑
main() {
    local mode="${1:-deploy}"
    
    check_deps
    detect_china

    # 首次运行检查
    if [ ! -f "$CONFIG_FILE" ]; then
        if [ "$mode" == "auto" ]; then
            log_error "配置文件不存在，请先运行 ./deploy.sh 进行配置"
        fi
        setup_wizard
    fi

    load_config

    case "$mode" in
        check)
            log_info "检查更新..."
            local status=$(check_update)
            case "$status" in
                error:*)
                    log_error "检查更新失败: ${status#error:}"
                    ;;
                none)
                    log_warn "未找到成功的构建记录"
                    exit 1
                    ;;
                current)
                    log_info "已是最新版本"
                    exit 0
                    ;;
                *)
                    log_info "发现新版本: Run ID $status"
                    exit 0
                    ;;
            esac
            ;;
        
        auto)
            local status=$(check_update)
            case "$status" in
                error:*)
                    log_error "检查更新失败: ${status#error:}"
                    ;;
                none)
                    log_info "未找到成功的构建记录，跳过部署"
                    exit 0
                    ;;
                current)
                    log_info "已是最新版本，无需更新"
                    exit 0
                    ;;
                *)
                    log_info "发现新版本: Run ID $status"
                    deploy "$status"
                    ;;
            esac
            ;;
        
        deploy|*)
            log_info "检查更新..."
            local status=$(check_update)
            case "$status" in
                error:*)
                    log_error "检查更新失败: ${status#error:}"
                    ;;
                none)
                    log_error "未找到成功的构建记录"
                    ;;
                current)
                    log_info "已是最新版本"
                    read -p "是否强制重新部署? [y/N] " confirm
                    if [[ "$confirm" =~ ^[Yy]$ ]]; then
                        local run_id=$(get_latest_run)
                        if [[ "$run_id" == error:* ]]; then
                            log_error "获取构建信息失败: ${run_id#error:}"
                        fi
                        deploy "$run_id"
                    fi
                    ;;
                *)
                    log_info "发现新版本: Run ID $status"
                    deploy "$status"
                    ;;
            esac
            ;;
    esac
}

main "$@"
