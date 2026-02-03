#!/usr/bin/env bash
set -euo pipefail

# FireTime 部署脚本
# 用法: ./deploy.sh [--update-only | --run-only]
#   无参数: 自更新 → 下载最新构建 → 启动服务
#   --update-only: 仅自更新脚本并下载构建产物，不启动服务
#   --run-only: 仅启动已存在的构建产物，不下载

REPO="lieyanc/FireTime"
ARTIFACT_NAME="firetime-standalone"
SCRIPT_SOURCE_URL="https://raw.githubusercontent.com/${REPO}/master/scripts/deploy.sh"

# 部署目录 = 脚本所在目录的父级（即项目根目录），或当前目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$(pwd)"
APP_DIR="${DEPLOY_DIR}/app"
DATA_DIR="${DEPLOY_DIR}/data"
PID_FILE="${DEPLOY_DIR}/firetime.pid"
LOG_FILE="${DEPLOY_DIR}/firetime.log"

PORT="${PORT:-3010}"
HOSTNAME="${HOSTNAME:-0.0.0.0}"

# ─── 颜色输出 ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }

# ─── 前置检查 ───
check_deps() {
  local missing=()
  command -v gh   >/dev/null 2>&1 || missing+=(gh)
  command -v node >/dev/null 2>&1 || missing+=(node)
  command -v tar  >/dev/null 2>&1 || missing+=(tar)
  command -v curl >/dev/null 2>&1 || missing+=(curl)

  if [ ${#missing[@]} -gt 0 ]; then
    err "缺少依赖: ${missing[*]}"
    err "请先安装: gh (GitHub CLI), node (>= 20), tar, curl"
    exit 1
  fi

  # 检查 gh 是否已认证
  if ! gh auth status >/dev/null 2>&1; then
    err "gh 未登录，请先运行: gh auth login"
    exit 1
  fi
}

# ─── 自更新脚本 ───
self_update() {
  log "检查脚本更新..."

  local tmp_script
  tmp_script="$(mktemp)"

  if curl -fsSL "${SCRIPT_SOURCE_URL}" -o "${tmp_script}" 2>/dev/null; then
    local current_hash new_hash
    current_hash="$(md5sum "$0" 2>/dev/null | cut -d' ' -f1 || md5 -q "$0" 2>/dev/null)"
    new_hash="$(md5sum "${tmp_script}" 2>/dev/null | cut -d' ' -f1 || md5 -q "${tmp_script}" 2>/dev/null)"

    if [ "${current_hash}" != "${new_hash}" ]; then
      log "发现新版本脚本，正在更新..."
      cp "${tmp_script}" "$0"
      chmod +x "$0"
      rm -f "${tmp_script}"
      log "脚本已更新，重新执行..."
      exec "$0" "$@"
    else
      log "脚本已是最新版本"
    fi
    rm -f "${tmp_script}"
  else
    warn "无法获取远程脚本，跳过自更新"
  fi
}

# ─── 停止旧进程 ───
stop_existing() {
  if [ -f "${PID_FILE}" ]; then
    local old_pid
    old_pid="$(cat "${PID_FILE}")"
    if kill -0 "${old_pid}" 2>/dev/null; then
      log "停止旧进程 (PID: ${old_pid})..."
      kill "${old_pid}" 2>/dev/null || true
      # 等待进程退出
      local wait_count=0
      while kill -0 "${old_pid}" 2>/dev/null && [ ${wait_count} -lt 10 ]; do
        sleep 1
        wait_count=$((wait_count + 1))
      done
      if kill -0 "${old_pid}" 2>/dev/null; then
        warn "进程未正常退出，强制终止..."
        kill -9 "${old_pid}" 2>/dev/null || true
      fi
    fi
    rm -f "${PID_FILE}"
  fi
}

# ─── 下载最新构建产物 ───
download_artifact() {
  log "从 GitHub Actions 下载最新构建产物..."

  local tmp_dir
  tmp_dir="$(mktemp -d)"

  # 使用 gh 下载最新的 artifact
  if ! gh run download --repo "${REPO}" --name "${ARTIFACT_NAME}" --dir "${tmp_dir}" 2>/dev/null; then
    # 如果直接下载失败，尝试找到最新成功的 run
    log "尝试查找最新成功的构建..."
    local run_id
    run_id="$(gh run list --repo "${REPO}" --workflow "build.yml" --status success --limit 1 --json databaseId --jq '.[0].databaseId')"

    if [ -z "${run_id}" ] || [ "${run_id}" = "null" ]; then
      err "没有找到成功的构建，请确认 GitHub Actions 已运行"
      rm -rf "${tmp_dir}"
      exit 1
    fi

    log "下载构建 #${run_id} 的产物..."
    if ! gh run download "${run_id}" --repo "${REPO}" --name "${ARTIFACT_NAME}" --dir "${tmp_dir}"; then
      err "下载失败"
      rm -rf "${tmp_dir}"
      exit 1
    fi
  fi

  # 查找 tarball
  local tarball
  tarball="$(find "${tmp_dir}" -name '*.tar.gz' -type f | head -1)"

  if [ -z "${tarball}" ]; then
    err "下载的产物中未找到 tar.gz 文件"
    rm -rf "${tmp_dir}"
    exit 1
  fi

  # 解压到 app 目录
  log "解压构建产物到 ${APP_DIR}..."
  rm -rf "${APP_DIR}"
  mkdir -p "${APP_DIR}"
  tar -xzf "${tarball}" -C "${APP_DIR}"

  rm -rf "${tmp_dir}"
  log "构建产物已就绪"
}

# ─── 启动服务 ───
start_server() {
  if [ ! -f "${APP_DIR}/server.js" ]; then
    err "${APP_DIR}/server.js 不存在，请先下载构建产物"
    exit 1
  fi

  stop_existing

  # 确保 data 目录存在，并软链接到 app 内部
  mkdir -p "${DATA_DIR}"
  ln -sfn "${DATA_DIR}" "${APP_DIR}/data"

  log "启动 FireTime (port: ${PORT})..."

  cd "${APP_DIR}"
  PORT="${PORT}" HOSTNAME="${HOSTNAME}" nohup node server.js > "${LOG_FILE}" 2>&1 &
  local new_pid=$!
  echo "${new_pid}" > "${PID_FILE}"
  cd - > /dev/null

  # 等待启动
  sleep 2
  if kill -0 "${new_pid}" 2>/dev/null; then
    log "FireTime 已启动 (PID: ${new_pid})"
    log "地址: http://${HOSTNAME}:${PORT}"
    log "日志: ${LOG_FILE}"
    log "PID 文件: ${PID_FILE}"
  else
    err "启动失败，请检查日志: ${LOG_FILE}"
    exit 1
  fi
}

# ─── 主流程 ───
main() {
  local mode="${1:-full}"

  check_deps

  case "${mode}" in
    --update-only)
      self_update "$@"
      download_artifact
      log "已更新完成（未启动服务）"
      ;;
    --run-only)
      start_server
      ;;
    --stop)
      stop_existing
      log "服务已停止"
      ;;
    *)
      self_update "$@"
      download_artifact
      start_server
      ;;
  esac
}

main "$@"
