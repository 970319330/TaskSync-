import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  /** 数据总条数 */
  totalItems: number;
  /** 当前页码（从 1 开始） */
  currentPage: number;
  /** 每页条数 */
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** 每页条数可选项 */
  pageSizeOptions?: number[];
  /** 紧凑模式：用于弹窗等空间有限的场景 */
  compact?: boolean;
}

/**
 * 生成页码列表，页数过多时用 'ellipsis' 占位。
 * 始终显示首页、末页及当前页附近的页码。
 */
const buildPageItems = (current: number, total: number): (number | 'ellipsis')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push('ellipsis');
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push('ellipsis');
  items.push(total);
  return items;
};

export const Pagination: React.FC<PaginationProps> = ({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  compact = false,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  // 仅一页且条数不足最小分页档位时无需展示分页控件
  if (totalPages <= 1 && totalItems <= pageSizeOptions[0]) return null;

  const go = (p: number) => onPageChange(Math.min(totalPages, Math.max(1, p)));
  const btnBase =
    'flex items-center justify-center rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const btnSize = compact ? 'w-6 h-6' : 'w-7 h-7';
  const btnStyle = `${btnBase} ${btnSize} border-slate-200 bg-white text-slate-500 hover:border-emerald-400 hover:text-emerald-600 cursor-pointer disabled:hover:border-slate-200 disabled:hover:text-slate-500`;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 ${
        compact ? 'px-2.5 py-2 text-[11px]' : 'px-3.5 py-3 text-xs'
      } bg-slate-50/60 border-t border-slate-200`}
    >
      {/* 左侧：条数区间与每页条数 */}
      <div className="flex items-center gap-3 text-slate-500">
        <span className="font-mono">
          {from}-{to} / 共 <span className="font-bold text-slate-700">{totalItems}</span> 条
        </span>
        <div className="flex items-center gap-1.5">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 右侧：页码导航 */}
      <div className="flex items-center gap-1">
        <button onClick={() => go(1)} disabled={currentPage === 1} className={btnStyle} title="首页">
          <ChevronsLeft className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>
        <button onClick={() => go(currentPage - 1)} disabled={currentPage === 1} className={btnStyle} title="上一页">
          <ChevronLeft className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>

        {buildPageItems(currentPage, totalPages).map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`e${idx}`} className={`${btnSize} flex items-center justify-center text-slate-400`}>
              ···
            </span>
          ) : (
            <button
              key={item}
              onClick={() => go(item)}
              className={`${btnBase} ${btnSize} font-semibold cursor-pointer ${
                item === currentPage
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-600'
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          onClick={() => go(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={btnStyle}
          title="下一页"
        >
          <ChevronRight className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>
        <button
          onClick={() => go(totalPages)}
          disabled={currentPage === totalPages}
          className={btnStyle}
          title="末页"
        >
          <ChevronsRight className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>
      </div>
    </div>
  );
};
