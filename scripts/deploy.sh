#!/bin/bash

# FireTime Standalone Deploy Script
# 用法: ./deploy.sh [GITHUB_TOKEN]
# 
# 如果是私有仓库，需要传入 GitHub Personal Access Token:
#   ./deploy.sh ghp_xxxxxxxxxxxx
#
# 公开仓库可以直接运行:
#   ./deploy.sh

set -e

# 配置
REPO="lieyanc/FireTime"  # 修改为你的 GitHub 用户名/仓库名
ARTIFACT_NAME="firetime-standalone"
DEPLOY_DIR="/opt/firetime"
PORT=3010

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 检查依赖
command -v curl >/dev/null 2>&1 || log_error "需要安装 curl"
command -v tar >/dev/null 2>&1 || log_error "需要安装 tar"
command -v jq >/dev/null 2>&1 || log_error "需要安装 jq: apt install jq"

# GitHub Token (可选，私有仓库需要)
GITHUB_TOKEN="${1:-}"
AUTH_HEADER=""
if [ -n "$GITHUB_TOKEN" ]; then
    AUTH_HEADER="Authorization: Bearer $GITHUB_TOKEN"
    log_info "使用 GitHub Token 认证"
fi

# 获取最新的 workflow run
log_info "获取最新构建信息..."
if [ -n "$AUTH_HEADER" ]; then
    RUNS_RESPONSE=$(curl -s -H "$AUTH_HEADER" \
        "https://api.github.com/repos/$REPO/actions/runs?status=success&per_page=1")
else
    RUNS_RESPONSE=$(curl -s \
        "https://api.github.com/repos/$REPO/actions/runs?status=success&per_page=1")
fi

RUN_ID=$(echo "$RUNS_RESPONSE" | jq -r '.workflow_runs[0].id')
if [ "$RUN_ID" == "null" ] || [ -z "$RUN_ID" ]; then
    log_error "未找到成功的构建记录"
fi
log_info "最新构建 ID: $RUN_ID"

# 获取 artifact 下载链接
log_info "获取 artifact 下载链接..."
if [ -n "$AUTH_HEADER" ]; then
    ARTIFACTS_RESPONSE=$(curl -s -H "$AUTH_HEADER" \
        "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/artifacts")
else
    ARTIFACTS_RESPONSE=$(curl -s \
        "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/artifacts")
fi

ARTIFACT_URL=$(echo "$ARTIFACTS_RESPONSE" | jq -r ".artifacts[] | select(.name==\"$ARTIFACT_NAME\") | .archive_download_url")
if [ "$ARTIFACT_URL" == "null" ] || [ -z "$ARTIFACT_URL" ]; then
    log_error "未找到 artifact: $ARTIFACT_NAME"
fi

# 下载 artifact
log_info "下载构建产物..."
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

if [ -n "$AUTH_HEADER" ]; then
    curl -sL -H "$AUTH_HEADER" -o artifact.zip "$ARTIFACT_URL"
else
    curl -sL -o artifact.zip "$ARTIFACT_URL"
fi

# 解压
log_info "解压文件..."
unzip -q artifact.zip
tar -xzf firetime-standalone.tar.gz

# 部署
log_info "部署到 $DEPLOY_DIR..."
sudo mkdir -p "$DEPLOY_DIR"
sudo rm -rf "$DEPLOY_DIR"/*
sudo cp -r . "$DEPLOY_DIR"/
sudo rm -f "$DEPLOY_DIR"/artifact.zip "$DEPLOY_DIR"/firetime-standalone.tar.gz

# 清理临时文件
cd /
rm -rf "$TEMP_DIR"

log_info "部署完成!"
echo ""
echo "=========================================="
echo "启动命令:"
echo "  cd $DEPLOY_DIR && PORT=$PORT node server.js"
echo ""
echo "或使用 PM2:"
echo "  cd $DEPLOY_DIR && PORT=$PORT pm2 start server.js --name firetime"
echo "=========================================="
