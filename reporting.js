// REPORTING MODULE - Professional Analytics
class ReportingModule {
  constructor(app) {
    this.app = app;
    this.currentChart = null;
    this.reportData = null;
    this.filters = { type: 'revenue', hotel: '', from: null, to: null };
  }

  init() {
    this.setupEventListeners();
    this.setDefaultDates();
  }

  setupEventListeners() {
    const reportType = document.getElementById('reportType');
    if (reportType) {
      reportType.addEventListener('change', (e) => { this.filters.type = e.target.value; });
    }

    const reportHotel = document.getElementById('reportHotel');
    if (reportHotel) {
      reportHotel.addEventListener('change', (e) => { this.filters.hotel = e.target.value; });
    }

    const reportFrom = document.getElementById('reportFrom');
    const reportTo = document.getElementById('reportTo');
    
    if (reportFrom) {
      reportFrom.addEventListener('change', (e) => { this.filters.from = e.target.value; });
    }
    
    if (reportTo) {
      reportTo.addEventListener('change', (e) => { this.filters.to = e.target.value; });
    }

    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="generate-report"]')) { this.generateReport(); }
      if (e.target.closest('[data-action="export-report-pdf"]')) { this.exportPDF(); }
      if (e.target.closest('[data-action="export-report-excel"]')) { this.exportExcel(); }
      if (e.target.closest('[data-action="export-report-csv"]')) { this.exportCSV(); }
    });
  }

  setDefaultDates() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const reportFrom = document.getElementById('reportFrom');
    const reportTo = document.getElementById('reportTo');

    if (reportFrom) {
      reportFrom.value = firstDayOfMonth.toISOString().split('T')[0];
      this.filters.from = reportFrom.value;
    }
    
    if (reportTo) {
      reportTo.value = lastDayOfMonth.toISOString().split('T')[0];
      this.filters.to = reportTo.value;
    }
  }

  async generateReport() {
    try {
      this.app.ui.showToast('Generiere Report...', 'info');
      const allReservations = this.app.state.get('reservations') || [];
      const filteredReservations = this.filterReservations(allReservations);
      this.reportData = this.processReportData(filteredReservations);
      this.renderChart();
      this.renderTable();
      this.app.ui.showToast('Report erfolgreich erstellt', 'success');
    } catch (error) {
      console.error('Error generating report:', error);
      this.app.ui.showToast('Fehler beim Erstellen des Reports', 'error');
    }
  }

  filterReservations(reservations) {
    return reservations.filter(res => {
      if (this.filters.hotel && res.hotel_code !== this.filters.hotel) return false;
      if (this.filters.from || this.filters.to) {
        const arrivalDate = new Date(res.arrival);
        const departureDate = new Date(res.departure);
        const fromDate = this.filters.from ? new Date(this.filters.from) : null;
        const toDate = this.filters.to ? new Date(this.filters.to) : null;
        if (fromDate && arrivalDate < fromDate) return false;
        if (toDate && departureDate > toDate) return false;
      }
      if (res.status === 'canceled') return false;
      return true;
    });
  }

  processReportData(reservations) {
    const hotels = this.app.state.get('hotels') || [];
    const data = {};

    hotels.forEach(hotel => {
      data[hotel.code] = {
        name: hotel.name, code: hotel.code,
        bookings: 0, revenue: 0, totalNights: 0, totalRooms: 0, adr: 0, occupancy: 0
      };
    });

    reservations.forEach(res => {
      const hotelCode = res.hotel_code;
      if (!data[hotelCode]) return;
      data[hotelCode].bookings += 1;
      data[hotelCode].revenue += parseFloat(res.total_price || 0);
      const arrival = new Date(res.arrival);
      const departure = new Date(res.departure);
      const nights = Math.ceil((departure - arrival) / (1000 * 60 * 60 * 24));
      data[hotelCode].totalNights += nights;
      data[hotelCode].totalRooms += 1;
    });

    Object.keys(data).forEach(hotelCode => {
      const hotel = data[hotelCode];
      if (hotel.totalNights > 0) { hotel.adr = hotel.revenue / hotel.totalNights; }
      const daysInPeriod = this.getDaysInPeriod();
      const totalRoomNights = 100 * daysInPeriod;
      hotel.occupancy = (hotel.totalNights / totalRoomNights) * 100;
    });

    return data;
  }

  getDaysInPeriod() {
    if (!this.filters.from || !this.filters.to) return 30;
    const from = new Date(this.filters.from);
    const to = new Date(this.filters.to);
    return Math.ceil((to - from) / (1000 * 60 * 60 * 24));
  }

  renderChart() {
    const canvas = document.getElementById('reportChart');
    if (!canvas) return;
    if (this.currentChart) this.currentChart.destroy();

    const ctx = canvas.getContext('2d');
    const reportData = this.reportData;
    const labels = Object.values(reportData).map(d => d.name);
    let datasets = [];

    switch (this.filters.type) {
      case 'revenue':
        datasets = [{
          label: 'Umsatz (€)',
          data: Object.values(reportData).map(d => d.revenue),
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 2,
          borderRadius: 8
        }];
        break;
      case 'bookings':
        datasets = [{
          label: 'Anzahl Buchungen',
          data: Object.values(reportData).map(d => d.bookings),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
          borderRadius: 8
        }];
        break;
      case 'occupancy':
        datasets = [{
          label: 'Auslastung (%)',
          data: Object.values(reportData).map(d => d.occupancy),
          backgroundColor: 'rgba(249, 115, 22, 0.8)',
          borderColor: 'rgba(249, 115, 22, 1)',
          borderWidth: 2,
          borderRadius: 8
        }];
        break;
      case 'adr':
        datasets = [{
          label: 'ADR (€)',
          data: Object.values(reportData).map(d => d.adr),
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: 'rgba(168, 85, 247, 1)',
          borderWidth: 2,
          borderRadius: 8
        }];
        break;
    }

    this.currentChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#e5e7eb',
              font: { family: 'Inter', size: 12, weight: '600' },
              padding: 20
            }
          },
          title: {
            display: true,
            text: this.getChartTitle(),
            color: '#f9fafb',
            font: { family: 'Inter', size: 18, weight: '700' },
            padding: 20
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            titleColor: '#f9fafb',
            bodyColor: '#e5e7eb',
            borderColor: 'rgba(99, 102, 241, 0.5)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (this.filters.type === 'revenue' || this.filters.type === 'adr') {
                  label += new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
                } else if (this.filters.type === 'occupancy') {
                  label += context.parsed.y.toFixed(1) + '%';
                } else {
                  label += context.parsed.y;
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#9ca3af',
              font: { family: 'Inter', size: 11 },
              callback: (value) => {
                if (this.filters.type === 'revenue' || this.filters.type === 'adr') {
                  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(value);
                } else if (this.filters.type === 'occupancy') {
                  return value + '%';
                }
                return value;
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#9ca3af', font: { family: 'Inter', size: 11 } }
          }
        },
        animation: { duration: 1000, easing: 'easeInOutQuart' }
      }
    });
  }

  getChartTitle() {
    const typeLabels = {
      revenue: 'Umsatzübersicht',
      bookings: 'Buchungsübersicht',
      occupancy: 'Auslastungsübersicht',
      adr: 'ADR Übersicht'
    };
    return typeLabels[this.filters.type] || 'Report';
  }

  renderTable() {
    const tableContainer = document.getElementById('reportTable');
    if (!tableContainer) return;

    const sortedData = Object.values(this.reportData).sort((a, b) => b.revenue - a.revenue);
    let tableHTML = '<div class="report-table-wrapper"><table class="data-table report-table-modern"><thead><tr><th>Hotel</th><th class="text-right">Buchungen</th><th class="text-right">Umsatz</th><th class="text-right">Nächte</th><th class="text-right">ADR</th><th class="text-right">Auslastung</th></tr></thead><tbody>';

    sortedData.forEach((hotel, index) => {
      const isTop = index < 3;
      tableHTML += `<tr class="${isTop ? 'highlight-row' : ''}"><td><div class="hotel-name-cell">${isTop ? `<span class="rank-badge">#${index + 1}</span>` : ''}<strong>${hotel.name}</strong></div></td><td class="text-right">${hotel.bookings}</td><td class="text-right"><span class="currency-value">${this.formatCurrency(hotel.revenue)}</span></td><td class="text-right">${hotel.totalNights}</td><td class="text-right"><span class="currency-value">${this.formatCurrency(hotel.adr)}</span></td><td class="text-right"><div class="occupancy-cell"><span>${hotel.occupancy.toFixed(1)}%</span><div class="occupancy-bar"><div class="occupancy-fill" style="width: ${Math.min(hotel.occupancy, 100)}%"></div></div></div></td></tr>`;
    });

    const totals = this.calculateTotals(sortedData);
    tableHTML += `<tr class="totals-row"><td><strong>GESAMT</strong></td><td class="text-right"><strong>${totals.bookings}</strong></td><td class="text-right"><strong>${this.formatCurrency(totals.revenue)}</strong></td><td class="text-right"><strong>${totals.nights}</strong></td><td class="text-right"><strong>${this.formatCurrency(totals.adr)}</strong></td><td class="text-right"><strong>${totals.occupancy.toFixed(1)}%</strong></td></tr></tbody></table></div>`;
    tableContainer.innerHTML = tableHTML;
  }

  calculateTotals(data) {
    const totals = { bookings: 0, revenue: 0, nights: 0, adr: 0, occupancy: 0 };
    data.forEach(hotel => {
      totals.bookings += hotel.bookings;
      totals.revenue += hotel.revenue;
      totals.nights += hotel.totalNights;
    });
    totals.adr = totals.nights > 0 ? totals.revenue / totals.nights : 0;
    totals.occupancy = data.length > 0 ? data.reduce((sum, h) => sum + h.occupancy, 0) / data.length : 0;
    return totals;
  }

  formatCurrency(value) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value);
  }

  exportCSV() {
    if (!this.reportData) {
      this.app.ui.showToast('Bitte erstellen Sie zuerst einen Report', 'warning');
      return;
    }
    const data = Object.values(this.reportData);
    const headers = ['Hotel', 'Buchungen', 'Umsatz', 'Nächte', 'ADR', 'Auslastung'];
    let csv = headers.join(',') + '\n';
    data.forEach(hotel => {
      csv += [`"${hotel.name}"`, hotel.bookings, hotel.revenue.toFixed(2), hotel.totalNights, hotel.adr.toFixed(2), hotel.occupancy.toFixed(1)].join(',') + '\n';
    });
    const totals = this.calculateTotals(data);
    csv += ['"GESAMT"', totals.bookings, totals.revenue.toFixed(2), totals.nights, totals.adr.toFixed(2), totals.occupancy.toFixed(1)].join(',') + '\n';
    this.downloadFile(csv, 'report.csv', 'text/csv');
    this.app.ui.showToast('CSV exportiert', 'success');
  }

  async exportExcel() {
    if (!this.reportData) {
      this.app.ui.showToast('Bitte erstellen Sie zuerst einen Report', 'warning');
      return;
    }
    const data = Object.values(this.reportData);
    const headers = ['Hotel', 'Buchungen', 'Umsatz', 'Nächte', 'ADR', 'Auslastung'];
    const rows = [headers];
    data.forEach(hotel => {
      rows.push([hotel.name, hotel.bookings, hotel.revenue.toFixed(2), hotel.totalNights, hotel.adr.toFixed(2), hotel.occupancy.toFixed(1) + '%']);
    });
    const totals = this.calculateTotals(data);
    rows.push(['GESAMT', totals.bookings, totals.revenue.toFixed(2), totals.nights, totals.adr.toFixed(2), totals.occupancy.toFixed(1) + '%']);
    let csv = rows.map(row => row.join(',')).join('\n');
    this.downloadFile(csv, 'report.xls', 'application/vnd.ms-excel');
    this.app.ui.showToast('Excel exportiert', 'success');
  }

  async exportPDF() {
    if (!this.reportData) {
      this.app.ui.showToast('Bitte erstellen Sie zuerst einen Report', 'warning');
      return;
    }
    const canvas = document.getElementById('reportChart');
    const chartImage = canvas.toDataURL('image/png');
    const data = Object.values(this.reportData);
    const totals = this.calculateTotals(data);
    const pdfWindow = window.open('', '_blank');
    pdfWindow.document.write(`<!DOCTYPE html><html><head><title>Report - ${new Date().toLocaleDateString('de-DE')}</title><style>body {font-family: Arial, sans-serif;padding: 40px;color: #111827;}h1 {color: #6366f1;margin-bottom: 10px;}.meta {color: #6b7280;margin-bottom: 30px;}img {max-width: 100%;margin: 30px 0;border: 1px solid #e5e7eb;border-radius: 8px;}table {width: 100%;border-collapse: collapse;margin-top: 30px;}th, td {padding: 12px;text-align: left;border-bottom: 1px solid #e5e7eb;}th {background: #f3f4f6;font-weight: 600;}.text-right {text-align: right;}.totals {font-weight: bold;background: #f9fafb;}@media print {body { padding: 20px; }}</style></head><body><h1>${this.getChartTitle()}</h1><div class="meta">Zeitraum: ${this.filters.from} bis ${this.filters.to}<br>Erstellt am: ${new Date().toLocaleString('de-DE')}</div><img src="${chartImage}" alt="Chart"><table><thead><tr><th>Hotel</th><th class="text-right">Buchungen</th><th class="text-right">Umsatz</th><th class="text-right">Nächte</th><th class="text-right">ADR</th><th class="text-right">Auslastung</th></tr></thead><tbody>${data.map(hotel => `<tr><td>${hotel.name}</td><td class="text-right">${hotel.bookings}</td><td class="text-right">${this.formatCurrency(hotel.revenue)}</td><td class="text-right">${hotel.totalNights}</td><td class="text-right">${this.formatCurrency(hotel.adr)}</td><td class="text-right">${hotel.occupancy.toFixed(1)}%</td></tr>`).join('')}<tr class="totals"><td>GESAMT</td><td class="text-right">${totals.bookings}</td><td class="text-right">${this.formatCurrency(totals.revenue)}</td><td class="text-right">${totals.nights}</td><td class="text-right">${this.formatCurrency(totals.adr)}</td><td class="text-right">${totals.occupancy.toFixed(1)}%</td></tr></tbody></table><script>window.onload = function() {window.print();}</script></body></html>`);
    pdfWindow.document.close();
    this.app.ui.showToast('PDF wird vorbereitet', 'success');
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

if (typeof window !== 'undefined') {
  window.ReportingModule = ReportingModule;
}
