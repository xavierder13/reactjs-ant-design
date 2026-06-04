"use client";

import { Pagination, Select, Space } from "antd";

interface PaginationControlsProps {
  pagination: any;
  pageSizeOptions: number[];
  isSmallScreen: boolean;
  onChange: (page: number, pageSize: number) => void;
}

export default function PaginationControls({
  pagination,
  pageSizeOptions,
  isSmallScreen,
  onChange
}: PaginationControlsProps) {
  return (
    <div style={{ textAlign: "center", marginTop: 16 }}>
      {isSmallScreen && (
        <Space style={{ marginBottom: 8 }}>
          <span>Items per page:</span>
          <Select
            value={pagination.pageSize}
            style={{ width: 100 }}
            onChange={(size) => onChange(1, size)}
          >
            {pageSizeOptions.map((size) => (
              <Select.Option key={size} value={size}>
                {size}
              </Select.Option>
            ))}
          </Select>
        </Space>
      )}
      <Pagination
        size={isSmallScreen ? "small" : "default"}
        current={pagination.current}
        pageSize={pagination.pageSize}
        total={pagination.total}
        showSizeChanger={!isSmallScreen}
        showLessItems={isSmallScreen}
        onChange={onChange}
        onShowSizeChange={onChange}
      />
    </div>
  );
}