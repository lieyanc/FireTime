#!/usr/bin/env bash
set -euo pipefail

# FireTime 部署脚本
# 用法: ./deploy.sh [--update-only | --run-only | --daemon | --stop]
#   无参数: 自更新 → 下载最新二进制 → 前台启动服务
#   --update-only: 仅自更新脚本并下载二进制，不启动服务
#   --run-only: 仅启动已存在的二进制（前台），不下载
#   --daemon: 自更新 → 下载最新二进制 → 后台启动服务
#   --stop: 停止后台服务
#
# 环境变量:
#   PORT / BIND_HOST  监听地址 (默认 0.0.0.0:9853)
#   RELEASE_TAG       下载的 Release (默认 dev，即 master 最新构建；也可指定 v1.0.0 等)

REPO="lieyanc/FireTime"
RELEASE_TAG="${RELEASE_TAG:-dev}"
SCRIPT_SOURCE_URL="https://raw.githubusercontent.com/${REPO}/master/scripts/deploy.sh"

DEPLOY_DIR="$(pwd)"
BIN_PATH="${DEPLOY_DIR}/firetime"
DATA_DIR="${DEPLOY_DIR}/data"
PID_FILE="${DEPLOY_DIR}/firetime.pid"
LOG_FILE="${DEPLOY_DIR}/firetime.log"
VERSION_FILE="${DEPLOY_DIR}/.release-version"

PORT="${PORT:-9853}"
BIND_HOST="${BIND_HOST:-0.0.0.0}"

# ─── 颜色输出 ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }

# ─── 前置检查 ───
check_deps() {
  local missing=()
  command -v curl      >/dev/null 2>&1 || missing+=(curl)
  command -v sha256sum >/dev/null 2>&1 || command -v shasum >/dev/null 2>&1 || missing+=(sha256sum)

  if [ ${#missing[@]} -gt 0 ]; then
    err "缺少依赖: ${missing[*]}"
    exit 1
  fi
}

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

# ─── 平台检测 ───
asset_name() {
  local os arch
  case "$(uname -s)" in
    Linux)  os=linux ;;
    Darwin) os=darwin ;;
    *) err "不支持的系统: $(uname -s)"; exit 1 ;;
  esac
  case "$(uname -m)" in
    x86_64|amd64)  arch=amd64 ;;
    aarch64|arm64) arch=arm64 ;;
    riscv64)       arch=riscv64 ;;
    *) err "不支持的架构: $(uname -m)"; exit 1 ;;
  esac
  echo "firetime-${os}-${arch}"
}

# ─── 自更新脚本 ───
self_update() {
  log "检查脚本更新..."

  local tmp_script
  tmp_script="$(mktemp)"

  if curl -fsSL "${SCRIPT_SOURCE_URL}" -o "${tmp_script}" 2>/dev/null; then
    if [ "$(sha256 "$0")" != "$(sha256 "${tmp_script}")" ]; then
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

# ─── 下载最新二进制 ───
# 子 shell 函数体：退出时清理临时目录，失败时退出码传回主流程
download_binary() (
  local base="https://github.com/${REPO}/releases/download/${RELEASE_TAG}"
  local asset
  asset="$(asset_name)"

  log "检查最新版本 (${RELEASE_TAG})..."
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "${tmp_dir}"' EXIT

  if ! curl -fsSL "${base}/SHA256SUMS" -o "${tmp_dir}/SHA256SUMS"; then
    err "获取 ${RELEASE_TAG} 的 SHA256SUMS 失败，请确认 GitHub Actions 已发布该 Release"
    exit 1
  fi
  local expected
  expected="$(awk -v f="${asset}" '$2 == f { print $1 }' "${tmp_dir}/SHA256SUMS")"
  if [ -z "${expected}" ]; then
    err "Release ${RELEASE_TAG} 中没有 ${asset}"
    exit 1
  fi

  if [ -x "${BIN_PATH}" ] && [ "$(sha256 "${BIN_PATH}")" = "${expected}" ]; then
    log "二进制已是最新版本，跳过下载"
    return 0
  fi

  log "下载 ${asset}..."
  if ! curl -fSL --progress-bar "${base}/${asset}" -o "${tmp_dir}/${asset}"; then
    err "下载失败"
    exit 1
  fi
  if [ "$(sha256 "${tmp_dir}/${asset}")" != "${expected}" ]; then
    err "SHA256 校验失败"
    exit 1
  fi

  chmod +x "${tmp_dir}/${asset}"
  mv -f "${tmp_dir}/${asset}" "${BIN_PATH}"
  curl -fsSL "${base}/version.json" -o "${VERSION_FILE}" 2>/dev/null || true
  log "已更新: $("${BIN_PATH}" -v)"

  if [ -d "${DEPLOY_DIR}/app" ]; then
    warn "检测到旧版 Node.js 构建目录 ${DEPLOY_DIR}/app，已不再使用，确认后可手动删除"
  fi
)

require_binary() {
  if [ ! -x "${BIN_PATH}" ]; then
    err "${BIN_PATH} 不存在，请先下载 (./deploy.sh --update-only)"
    exit 1
  fi
}

# ─── 启动服务（前台） ───
start_server() {
  require_binary
  stop_existing
  mkdir -p "${DATA_DIR}"

  log "启动 FireTime (port: ${PORT})..."
  exec "${BIN_PATH}" -addr "${BIND_HOST}:${PORT}" -data "${DATA_DIR}"
}

# ─── 启动服务（后台） ───
start_server_daemon() {
  require_binary
  stop_existing
  mkdir -p "${DATA_DIR}"

  log "启动 FireTime (port: ${PORT}, 后台模式)..."
  nohup "${BIN_PATH}" -addr "${BIND_HOST}:${PORT}" -data "${DATA_DIR}" > "${LOG_FILE}" 2>&1 &
  local new_pid=$!
  echo "${new_pid}" > "${PID_FILE}"

  sleep 1
  if kill -0 "${new_pid}" 2>/dev/null; then
    log "FireTime 已启动 (PID: ${new_pid})"
    log "地址: http://${BIND_HOST}:${PORT}"
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

  case "${mode}" in
    --update-only)
      check_deps
      self_update "$@"
      download_binary
      log "已更新完成（未启动服务）"
      ;;
    --run-only)
      start_server
      ;;
    --daemon)
      check_deps
      self_update "$@"
      download_binary
      start_server_daemon
      ;;
    --stop)
      stop_existing
      log "服务已停止"
      ;;
    *)
      check_deps
      self_update "$@"
      download_binary
      start_server
      ;;
  esac
}

main "$@"
