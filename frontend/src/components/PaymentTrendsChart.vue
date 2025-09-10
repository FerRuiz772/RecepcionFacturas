<template>
  <div class="chart-container">
    <canvas ref="chartCanvas" :width="width" :height="height"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'

// Registrar todos los componentes de Chart.js
Chart.register(...registerables)

const props = defineProps({
  chartData: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  width: {
    type: Number,
    default: 400
  },
  height: {
    type: Number,
    default: 200
  }
})

const chartCanvas = ref(null)
let chartInstance = null

const createChart = async () => {
  if (!chartCanvas.value || props.loading || !props.chartData.length) return

  // Destruir gráfico existente
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  await nextTick()

  const ctx = chartCanvas.value.getContext('2d')
  
  // Preparar datos
  const labels = props.chartData.map(item => item.month)
  const amounts = props.chartData.map(item => item.amount)
  const counts = props.chartData.map(item => item.count)

  // Encontrar valores máximos para escalas
  const maxAmount = Math.max(...amounts)
  const maxCount = Math.max(...counts)

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Monto Pagado (Q)',
          data: amounts,
          borderColor: '#0f172a',
          backgroundColor: 'rgba(15, 23, 42, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#0f172a',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          yAxisID: 'y'
        },
        {
          label: 'Cantidad de Pagos',
          data: counts,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              weight: '500'
            },
            color: '#64748b'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          displayColors: true,
          callbacks: {
            title: function(context) {
              return `${context[0].label}`
            },
            label: function(context) {
              if (context.datasetIndex === 0) {
                return `Monto: Q${context.parsed.y.toLocaleString('es-GT')}`
              } else {
                return `Pagos: ${context.parsed.y} facturas`
              }
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          border: {
            display: false
          },
          ticks: {
            font: {
              size: 11,
              weight: '500'
            },
            color: '#64748b',
            padding: 8
          }
        },
        y: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          max: maxAmount * 1.1,
          grid: {
            color: 'rgba(226, 232, 240, 0.5)',
            drawBorder: false
          },
          border: {
            display: false
          },
          ticks: {
            font: {
              size: 11,
              weight: '500'
            },
            color: '#64748b',
            padding: 8,
            callback: function(value) {
              return `Q${(value / 1000).toFixed(0)}K`
            }
          },
          title: {
            display: true,
            text: 'Monto (Q)',
            color: '#64748b',
            font: {
              size: 12,
              weight: '600'
            }
          }
        },
        y1: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          max: maxCount * 1.2,
          grid: {
            display: false
          },
          border: {
            display: false
          },
          ticks: {
            font: {
              size: 11,
              weight: '500'
            },
            color: '#10b981',
            padding: 8
          },
          title: {
            display: true,
            text: 'Cantidad',
            color: '#10b981',
            font: {
              size: 12,
              weight: '600'
            }
          }
        }
      },
      elements: {
        point: {
          hoverBorderWidth: 3
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    }
  })
}

// Crear gráfico cuando los datos cambien
watch(() => [props.chartData, props.loading], () => {
  if (!props.loading && props.chartData.length > 0) {
    createChart()
  }
}, { deep: true })

onMounted(() => {
  if (!props.loading && props.chartData.length > 0) {
    createChart()
  }
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 300px;
}

canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>