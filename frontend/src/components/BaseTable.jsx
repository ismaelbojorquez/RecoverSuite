import {
  Box,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography
} from '@mui/material';
import { isValidElement } from 'react';
import EmptyState from './EmptyState.jsx';

const ACTION_COLUMN_PATTERN = /^(actions?|acciones?)$/i;

const buildSortDirection = (sortBy, sortDirection, columnId) =>
  sortBy === columnId ? sortDirection || 'asc' : 'asc';

const detectSignedTone = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (normalized.startsWith('+')) {
    return 'positive';
  }
  if (normalized.startsWith('-')) {
    return 'negative';
  }

  return null;
};

const resolveIndicatorTone = (value, column) => {
  if (typeof column?.indicator === 'function') {
    return column.indicator(value);
  }

  if (column?.indicator === true) {
    if (typeof value === 'number') {
      if (value > 0) return 'positive';
      if (value < 0) return 'negative';
      return null;
    }
    return detectSignedTone(value);
  }

  return detectSignedTone(value);
};

const isActionColumn = (column = {}) => {
  if (column.actions === true || column.kind === 'actions') {
    return true;
  }

  const id = typeof column.id === 'string' ? column.id.trim() : '';
  const label = typeof column.label === 'string' ? column.label.trim() : '';

  return ACTION_COLUMN_PATTERN.test(id) || ACTION_COLUMN_PATTERN.test(label);
};

const buildCellClassName = (column, { head = false } = {}) =>
  [
    'crm-table__cell',
    head
      ? 'crm-table__cell--head'
      : column?.footer
        ? 'crm-table__cell--footer'
        : 'crm-table__cell--body',
    isActionColumn(column) ? 'crm-table__cell--actions' : '',
    column?.align === 'right' ? 'crm-table__cell--numeric' : ''
  ]
    .filter(Boolean)
    .join(' ');

const renderCellContent = (value, column) => {
  if (isValidElement(value)) {
    return value;
  }

  const tone = resolveIndicatorTone(value, column);
  if (!tone) {
    return (
      <Typography variant="body2" className="crm-table__cell-value">
        {value ?? '-'}
      </Typography>
    );
  }

  return (
    <Typography variant="body2" className={`crm-table-indicator crm-table-indicator--${tone}`}>
      {value}
    </Typography>
  );
};

export default function BaseTable({
  columns = [],
  rows = [],
  getRowId = (row) => row?.id ?? row,
  loading = false,
  emptyContent,
  pagination,
  sortBy,
  sortDirection = 'asc',
  onSort,
  size = 'medium',
  stickyHeader = false,
  dense = false,
  toolbar = null,
  footerRows = []
}) {
  const colCount = columns.length || 1;
  const showEmpty = !loading && rows.length === 0;
  const skeletonRowCount = Math.max(3, Math.min(5, pagination?.rowsPerPage || 3));
  const safeFooterRows = Array.isArray(footerRows) ? footerRows : [];
  const EmptyComponent =
    emptyContent || (
      <EmptyState
        title="Sin registros"
        description="No hay informacion para mostrar en este momento."
      />
    );

  const renderHeaderCell = (column) => {
    const sortable = Boolean(onSort) && column.sortable !== false;

    return (
      <TableCell
        key={column.id}
        className={buildCellClassName(column, { head: true })}
        align={column.align || 'left'}
        sx={{
          width: column.width,
          minWidth: column.minWidth
        }}
      >
        {sortable ? (
          <TableSortLabel
            className="crm-table__sort-label"
            active={sortBy === column.id}
            direction={buildSortDirection(sortBy, sortDirection, column.id)}
            onClick={() => {
              const nextDirection =
                sortBy === column.id && sortDirection === 'asc' ? 'desc' : 'asc';
              onSort(column.id, nextDirection);
            }}
          >
            {column.label}
          </TableSortLabel>
        ) : (
          column.label
        )}
      </TableCell>
    );
  };

  return (
    <Paper variant="table" className="crm-table-shell">
      {toolbar ? <Box className="crm-table-shell__toolbar">{toolbar}</Box> : null}
      <TableContainer className="crm-table-container">
        <Table
          className={[
            'crm-table',
            dense ? 'crm-table--dense' : ''
          ]
            .filter(Boolean)
            .join(' ')}
          size={dense ? 'small' : size}
          stickyHeader={stickyHeader}
        >
          <TableHead className="crm-table__head">
            <TableRow className="crm-table__head-row">
              {columns.map((column) => renderHeaderCell(column))}
            </TableRow>
          </TableHead>
          <TableBody className="crm-table__body">
            {loading
              ? Array.from({ length: skeletonRowCount }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`} className="crm-table__row crm-table__row--skeleton">
                    {(columns.length ? columns : [{ id: 'placeholder' }]).map((column, columnIndex) => {
                      const actionColumn = isActionColumn(column);

                      return (
                        <TableCell
                          key={`${column.id}-sk-${index}`}
                          className="crm-table__cell crm-table__cell--body crm-table__cell--skeleton"
                        >
                          {actionColumn ? (
                            <Box className="crm-table__skeleton-actions">
                              <Skeleton variant="rounded" width={30} height={30} />
                              <Skeleton variant="rounded" width={30} height={30} />
                            </Box>
                          ) : (
                            <Box className="crm-table__skeleton-stack">
                              <Skeleton
                                variant="text"
                                width={`${78 - ((columnIndex + index) % 4) * 9}%`}
                              />
                              <Skeleton
                                variant="text"
                                width={`${42 + ((columnIndex + index) % 3) * 12}%`}
                              />
                            </Box>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              : rows.map((row) => {
                  const key = getRowId(row);
                  return (
                    <TableRow key={key} className="crm-table__row" hover>
                      {columns.map((column) => {
                        const cellValue = column.render ? column.render(row) : row[column.id];

                        return (
                          <TableCell
                            key={`${key}-${column.id}`}
                            className={buildCellClassName(column)}
                            align={column.align || 'left'}
                          >
                            <Box className="crm-table__cell-content">
                              {renderCellContent(cellValue, column)}
                            </Box>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}

            {showEmpty && (
              <TableRow className="crm-table__row crm-table__row--empty">
                <TableCell
                  className="crm-table__cell crm-table__cell--body crm-table__cell--empty"
                  colSpan={colCount}
                >
                  {EmptyComponent}
                </TableCell>
              </TableRow>
            )}
          </TableBody>

          {safeFooterRows.length > 0 ? (
            <TableFooter className="crm-table__footer">
              {safeFooterRows.map((row, footerIndex) => {
                const key = row?.id ?? `footer-${footerIndex}`;
                return (
                  <TableRow key={key} className="crm-table__footer-row">
                    {columns.map((column) => {
                      const footerColumn = { ...column, footer: true };
                      const cellValue = column.render ? column.render(row) : row[column.id];

                      return (
                        <TableCell
                          key={`${key}-${column.id}`}
                          className={buildCellClassName(footerColumn)}
                          align={column.align || 'left'}
                        >
                          <Box className="crm-table__cell-content">
                            {renderCellContent(cellValue, footerColumn)}
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableFooter>
          ) : null}
        </Table>
      </TableContainer>

      {pagination ? (
        <TablePagination
          className="crm-table__pagination"
          component="div"
          count={pagination.count}
          page={pagination.page}
          onPageChange={pagination.onPageChange}
          rowsPerPage={pagination.rowsPerPage}
          onRowsPerPageChange={pagination.onRowsPerPageChange}
          rowsPerPageOptions={pagination.rowsPerPageOptions || [10, 20, 50]}
          labelDisplayedRows={pagination.labelDisplayedRows}
        />
      ) : null}
    </Paper>
  );
}
