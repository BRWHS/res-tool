/**
 * Table Manager
 * Advanced table component with sorting, filtering, and pagination
 */

export class TableManager {
  constructor(config) {
    this.config = {
      containerId: config.containerId,
      columns: config.columns || [],
      data: config.data || [],
      sortable: config.sortable !== false,
      filterable: config.filterable !== false,
      paginate: config.paginate !== false,
      pageSize: config.pageSize || 20,
      onRowClick: config.onRowClick || null
    };

    this.state = {
      currentPage: 1,
      sortColumn: null,
      sortDirection: 'asc',
      filters: {}
    };

    this.filteredData = [];
    this.sortedData = [];
  }

  render() {
    const container = document.getElementById(this.config.containerId);
    if (!container) return;

    // Process data
    this.applyFilters();
    this.applySort();

    // Create table
    const table = this.createTable();
    container.innerHTML = '';
    container.appendChild(table);

    // Add pagination if needed
    if (this.config.paginate) {
      const pagination = this.createPagination();
      container.appendChild(pagination);
    }
  }

  createTable() {
    const table = document.createElement('table');
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    this.config.columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.label;
      
      if (col.sortable !== false && this.config.sortable) {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => this.sort(col.key));
      }
      
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');
    const pageData = this.getPaginatedData();
    
    pageData.forEach(row => {
      const tr = document.createElement('tr');
      
      if (this.config.onRowClick) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => this.config.onRowClick(row));
      }
      
      this.config.columns.forEach(col => {
        const td = document.createElement('td');
        
        if (col.render) {
          td.innerHTML = col.render(row[col.key], row);
        } else {
          td.textContent = row[col.key] || '-';
        }
        
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    
    return table;
  }

  createPagination() {
    const div = document.createElement('div');
    div.className = 'pagination';
    
    const totalPages = Math.ceil(this.sortedData.length / this.config.pageSize);
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-sm';
    prevBtn.textContent = '←';
    prevBtn.disabled = this.state.currentPage === 1;
    prevBtn.addEventListener('click', () => this.goToPage(this.state.currentPage - 1));
    div.appendChild(prevBtn);
    
    // Page info
    const info = document.createElement('span');
    info.textContent = `Seite ${this.state.currentPage} von ${totalPages}`;
    info.style.margin = '0 var(--space-md)';
    div.appendChild(info);
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-sm';
    nextBtn.textContent = '→';
    nextBtn.disabled = this.state.currentPage === totalPages;
    nextBtn.addEventListener('click', () => this.goToPage(this.state.currentPage + 1));
    div.appendChild(nextBtn);
    
    return div;
  }

  applyFilters() {
    this.filteredData = this.config.data.filter(row => {
      return Object.entries(this.state.filters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = String(row[key] || '').toLowerCase();
        const filterValue = String(value).toLowerCase();
        return rowValue.includes(filterValue);
      });
    });
  }

  applySort() {
    if (!this.state.sortColumn) {
      this.sortedData = [...this.filteredData];
      return;
    }

    this.sortedData = [...this.filteredData].sort((a, b) => {
      const aVal = a[this.state.sortColumn];
      const bVal = b[this.state.sortColumn];
      
      if (aVal === bVal) return 0;
      
      const comparison = aVal > bVal ? 1 : -1;
      return this.state.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  getPaginatedData() {
    if (!this.config.paginate) {
      return this.sortedData;
    }

    const start = (this.state.currentPage - 1) * this.config.pageSize;
    const end = start + this.config.pageSize;
    
    return this.sortedData.slice(start, end);
  }

  sort(column) {
    if (this.state.sortColumn === column) {
      this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.sortColumn = column;
      this.state.sortDirection = 'asc';
    }
    
    this.render();
  }

  filter(column, value) {
    this.state.filters[column] = value;
    this.state.currentPage = 1;
    this.render();
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.sortedData.length / this.config.pageSize);
    
    if (page < 1 || page > totalPages) return;
    
    this.state.currentPage = page;
    this.render();
  }

  updateData(newData) {
    this.config.data = newData;
    this.state.currentPage = 1;
    this.render();
  }
}

export default TableManager;
