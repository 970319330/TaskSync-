// 唤起 TRAE SOLO 桌面版并打开指定项目
// macOS 注册的真实 scheme 为 solo-cn(从 /Applications/TRAE SOLO CN.app/Contents/Info.plist 确认)
const TRAE_SCHEME = 'solo-cn';

export function startDevInTrae(projectPath: string): void {
  if (!projectPath) return;
  window.location.href = `${TRAE_SCHEME}://file/${projectPath}`;
}

// 项目本地路径配置：存于 localStorage，避免改动 Project 数据结构
const PATH_MAP_KEY = 'tasksync.projectPathMap';

export function getProjectPath(projectId: string): string | null {
  try {
    const raw = localStorage.getItem(PATH_MAP_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[projectId] || null;
  } catch {
    return null;
  }
}

export function setProjectPath(projectId: string, projectPath: string): void {
  try {
    const raw = localStorage.getItem(PATH_MAP_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[projectId] = projectPath;
    localStorage.setItem(PATH_MAP_KEY, JSON.stringify(map));
  } catch {
    // 忽略存储错误
  }
}

export function removeProjectPath(projectId: string): void {
  try {
    const raw = localStorage.getItem(PATH_MAP_KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, string>;
    delete map[projectId];
    localStorage.setItem(PATH_MAP_KEY, JSON.stringify(map));
  } catch {
    // 忽略存储错误
  }
}
