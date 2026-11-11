import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 text-xs sm:text-sm text-[#A89A91]">
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-semibold text-[#F5F0EA]">{startItem}</span> to{' '}
          <span className="font-semibold text-[#F5F0EA]">{endItem}</span> of{' '}
          <span className="font-semibold text-[#F5F0EA]">{totalItems}</span> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-[#111111] text-[#F5F0EA] border border-[#3A2922] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#7A4930] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          className="p-1.5 min-w-[32px]"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 min-w-[32px]"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <span className="px-3 py-1 bg-[#1F1916] text-[#F5F0EA] rounded border border-[#3A2922] text-xs font-medium">
          Page {currentPage} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages || totalItems === 0}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 min-w-[32px]"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages || totalItems === 0}
          onClick={() => onPageChange(totalPages)}
          className="p-1.5 min-w-[32px]"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
