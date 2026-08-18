/**
 * Story Studio - 项目管理首页
 * 显示最近项目、创建新项目、打开项目
 */

import { useState, useEffect } from 'react'

interface Project {
  name: string
  path: string
  lastOpened: string
}

interface ProjectsPageProps {
  onSelectProject: (projectPath: string) => void
  onCreateProject: (projectName: string) => void
}

export function ProjectsPage({ onSelectProject, onCreateProject }: ProjectsPageProps) {
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  // 加载最近打开的项目
  useEffect(() => {
    const recentProjectsJson = localStorage.getItem('story-studio:recent-projects')
    if (recentProjectsJson) {
      try {
        const projects = JSON.parse(recentProjectsJson)
        setRecentProjects(projects)
      } catch (error) {
        console.error('[ProjectsPage] Failed to parse recent projects:', error)
      }
    }
  }, [])

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return
    onCreateProject(newProjectName)
    setShowCreateDialog(false)
    setNewProjectName('')
  }

  return (
    <div className="ss-projects-page">
      <style>{`
        /* 隐藏DSH主界面，只显示首页 */
        body:has(.ss-projects-page) > *:not(#story-studio-root):not(style):not(script) {
          display: none !important;
        }

        .ss-projects-page {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
          padding: 40px;
        }

        .ss-projects-container {
          width: 100%;
          max-width: 900px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
          padding: 48px;
        }

        .ss-projects-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .ss-projects-logo {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          color: white;
          font-weight: 700;
        }

        .ss-projects-title {
          margin: 0 0 8px;
          font-size: 32px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .ss-projects-subtitle {
          margin: 0;
          font-size: 16px;
          color: #666;
        }

        .ss-projects-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 48px;
        }

        .ss-action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          border: 2px solid #e8ecf1;
          border-radius: 12px;
          background: #fafbfc;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .ss-action-card:hover {
          border-color: #667eea;
          background: #f5f7ff;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
        }

        .ss-action-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 12px;
          background: white;
          border: 2px solid #e8ecf1;
        }

        .ss-action-card:hover .ss-action-icon {
          border-color: #667eea;
          background: #667eea;
          color: white;
        }

        .ss-action-title {
          margin: 0 0 4px;
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .ss-action-desc {
          margin: 0;
          font-size: 14px;
          color: #666;
        }

        .ss-projects-section {
          margin-top: 32px;
        }

        .ss-section-title {
          margin: 0 0 16px;
          font-size: 14px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ss-projects-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ss-project-item {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border: 1px solid #e8ecf1;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .ss-project-item:hover {
          border-color: #667eea;
          background: #f5f7ff;
        }

        .ss-project-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          margin-right: 16px;
          flex-shrink: 0;
        }

        .ss-project-info {
          flex: 1;
        }

        .ss-project-name {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .ss-project-path {
          margin: 0;
          font-size: 13px;
          color: #999;
          font-family: 'SF Mono', Monaco, monospace;
        }

        .ss-project-time {
          font-size: 13px;
          color: #999;
          margin-left: 16px;
        }

        .ss-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .ss-dialog {
          width: 90%;
          max-width: 440px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: dialog-in 200ms ease;
        }

        @keyframes dialog-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .ss-dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #e8ecf1;
        }

        .ss-dialog-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .ss-dialog-close {
          width: 32px;
          height: 32px;
          border: 0;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          transition: all 150ms ease;
        }

        .ss-dialog-close:hover {
          background: #f0f0f0;
          color: #1a1a1a;
        }

        .ss-dialog-body {
          padding: 24px;
        }

        .ss-dialog-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e8ecf1;
          border-radius: 8px;
          font-size: 15px;
          font-family: inherit;
          outline: none;
          transition: border-color 150ms ease;
        }

        .ss-dialog-input:focus {
          border-color: #667eea;
        }

        .ss-dialog-input::placeholder {
          color: #999;
        }

        .ss-dialog-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid #e8ecf1;
        }

        .ss-btn {
          padding: 10px 20px;
          border: 0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .ss-btn-secondary {
          background: #f0f0f0;
          color: #666;
        }

        .ss-btn-secondary:hover {
          background: #e0e0e0;
          color: #1a1a1a;
        }

        .ss-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .ss-btn-primary:hover {
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          transform: translateY(-1px);
        }

        .ss-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>

      <div className="ss-projects-container">
        {/* Logo & 标题 */}
        <div className="ss-projects-header">
          <div className="ss-projects-logo">S</div>
          <h1 className="ss-projects-title">Story Studio</h1>
          <p className="ss-projects-subtitle">AI驱动的剧本创作工作台</p>
        </div>

        {/* 主操作 */}
        <div className="ss-projects-actions">
          <div className="ss-action-card" onClick={() => setShowCreateDialog(true)}>
            <div className="ss-action-icon">➕</div>
            <h3 className="ss-action-title">新建项目</h3>
            <p className="ss-action-desc">创建一个全新的剧本项目</p>
          </div>

          <div className="ss-action-card" onClick={() => {
            // TODO: 实现打开文件夹选择器
            alert('打开项目功能开发中...')
          }}>
            <div className="ss-action-icon">📂</div>
            <h3 className="ss-action-title">打开项目</h3>
            <p className="ss-action-desc">打开已有的项目文件夹</p>
          </div>
        </div>

        {/* 最近项目 */}
        {recentProjects.length > 0 && (
          <div className="ss-projects-section">
            <h2 className="ss-section-title">最近打开</h2>
            <div className="ss-projects-list">
              {recentProjects.map((project) => (
                <div
                  key={project.path}
                  className="ss-project-item"
                  onClick={() => onSelectProject(project.path)}
                >
                  <div className="ss-project-icon">📝</div>
                  <div className="ss-project-info">
                    <h3 className="ss-project-name">{project.name}</h3>
                    <p className="ss-project-path">{project.path}</p>
                  </div>
                  <span className="ss-project-time">{project.lastOpened}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 新建项目对话框 */}
      {showCreateDialog && (
        <div className="ss-dialog-overlay" onClick={() => setShowCreateDialog(false)}>
          <div className="ss-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ss-dialog-header">
              <h3 className="ss-dialog-title">新建项目</h3>
              <button
                className="ss-dialog-close"
                onClick={() => setShowCreateDialog(false)}
              >
                ✕
              </button>
            </div>
            <div className="ss-dialog-body">
              <input
                type="text"
                className="ss-dialog-input"
                placeholder="项目名称（如：霸道总裁爱上我）"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateProject()
                  } else if (e.key === 'Escape') {
                    setShowCreateDialog(false)
                  }
                }}
                autoFocus
              />
            </div>
            <div className="ss-dialog-footer">
              <button
                className="ss-btn ss-btn-secondary"
                onClick={() => setShowCreateDialog(false)}
              >
                取消
              </button>
              <button
                className="ss-btn ss-btn-primary"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
