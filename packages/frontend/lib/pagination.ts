export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function getPaginationParams(
  page: number = 1,
  limit: number = 10
): PaginationParams {
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function getPaginationInfo(
  total: number,
  page: number,
  limit: number
) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPreviousPage: page > 1,
  };
}

export function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  maxPages: number = 5
): (number | string)[] {
  const pages: (number | string)[] = [];

  if (totalPages <= maxPages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    const halfPages = Math.floor(maxPages / 2);

    let startPage = currentPage - halfPages;
    let endPage = currentPage + halfPages;

    if (startPage < 1) {
      startPage = 1;
      endPage = maxPages;
    }

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = totalPages - maxPages + 1;
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
  }

  return pages;
}
